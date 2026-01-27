require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Usamos 'pg' en lugar de 'sqlite3'
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const os = require('os');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001; // Importante para despliegues (Vercel/Render)

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Obtener IP Local
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const LOCAL_IP = getLocalIp();

// Variable global para URL pública (puede ser inyectada desde fuera)
let PUBLIC_URL = process.env.PUBLIC_URL || null;

// Database setup (PostgreSQL / Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necesario para Neon
  }
});

// Inicializar DB
async function initDb() {
  try {
    const client = await pool.connect();
    
    // Tabla para configuración (Categorías y Productos guardados como JSON)
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Tabla para Ventas
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        timestamp BIGINT,
        total REAL,
        type TEXT,
        items TEXT
      );
    `);
    
    console.log('✅ Connected to Neon PostgreSQL database and tables verified.');
    client.release();
  } catch (err) {
    console.error('❌ Error initializing database:', err);
  }
}

initDb();

// Routes

// POST Login (Auth)
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    const hash = crypto.createHash('sha256').update(password).digest('hex');

    if (hash === process.env.MASTER_HASH) {
        console.log('🔑 Login exitoso: MAESTRO');
        res.json({ success: true, role: 'master', token: 'session-master' });
    } else if (hash === process.env.ADMIN_HASH) {
        console.log('🔑 Login exitoso: ADMIN');
        res.json({ success: true, role: 'admin', token: 'session-admin' });
    } else {
        console.warn('⛔ Intento de login fallido');
        res.status(401).json({ error: 'Contraseña incorrecta' });
    }
});

// GET Configuration (Categories & Products)
app.get('/api/config', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM app_config WHERE key = $1", ['categories']);
    const row = result.rows[0];

    // Si no hay configuración guardada, devolver null o array vacío
    const categories = row ? JSON.parse(row.value) : null;
    
    // Si existe una URL pública inyectada (ngrok), la enviamos preferentemente
    const serverUrl = PUBLIC_URL || `http://${LOCAL_IP}:${PORT}`;
    
    res.json({ 
        categories, 
        serverIp: LOCAL_IP, 
        port: PORT,
        publicUrl: serverUrl 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST Configuration (Save Categories & Products)
app.post('/api/config', async (req, res) => {
  const { categories } = req.body;
  if (!categories) {
    res.status(400).json({ error: 'Categories data required' });
    return;
  }

  const jsonVal = JSON.stringify(categories);
  
  try {
    await pool.query(`
      INSERT INTO app_config (key, value) VALUES ($1, $2)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `, ['categories', jsonVal]);

    // Notificar a todos los clientes conectados que hubo cambios
    io.emit('config_updated', categories);
    
    res.json({ message: 'Configuration saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET Sales
app.get('/api/sales', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM sales ORDER BY timestamp DESC LIMIT 1000");
    const rows = result.rows;
    
    // Parse items JSON for each row
    const sales = rows.map(row => ({
      ...row,
      items: JSON.parse(row.items),
      timestamp: Number(row.timestamp) // Asegurar que sea número (BigInt puede venir como string)
    }));
    res.json(sales);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST Sale (New Ticket)
app.post('/api/sales', async (req, res) => {
  const sale = req.body;
  // sale object expected: { id, timestamp, total, type, items: [] }
  
  if (!sale || !sale.id || !sale.items) {
    res.status(400).json({ error: 'Invalid sale data' });
    return;
  }

  const itemsJson = JSON.stringify(sale.items);
  
  try {
    await pool.query(
      `INSERT INTO sales (id, timestamp, total, type, items) VALUES ($1, $2, $3, $4, $5)`,
      [sale.id, sale.timestamp, sale.total, sale.type, itemsJson]
    );
    res.json({ message: 'Sale saved successfully', id: sale.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST Sync (Batch Sales)
app.post('/api/sync', async (req, res) => {
  if (CLOUD_MODE) return res.json({ message: 'Cloud mode: Sync disabled', added: 0, total: 0 }); // Ignoramos sync en nube
  const { tickets } = req.body; // Expecting { tickets: [...] }
  
  if (!tickets || !Array.isArray(tickets)) {
    res.status(400).json({ error: 'Invalid tickets data' });
    return;
  }

  // MODO DEMO: Simular sincronización exitosa sin guardar en DB (Para evitar complejidad en este paso rápido)
  // En producción, aquí haríamos un INSERT masivo.
  console.log(`📥 Recibidos ${tickets.length} tickets para sincronizar. Emitiendo al visor...`);
  
  // Emitir al visor para que se vea la animación
  io.emit('new_data', tickets);
  
  // Guardado Real en PostgreSQL (Iterativo simple)
  let addedCount = 0;
  for (const sale of tickets) {
      if (!sale.id || !sale.items) continue;
      try {
          const itemsJson = JSON.stringify(sale.items);
          await pool.query(
              `INSERT INTO sales (id, timestamp, total, type, items) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
              [sale.id, sale.timestamp, sale.total, sale.type, itemsJson]
          );
          addedCount++;
      } catch (e) {
          console.error(`Error syncing ticket ${sale.id}`, e);
      }
  }

  res.json({ 
    message: 'Sync completed', 
    added: addedCount, 
    total: tickets.length
  });
});

// Serve Viewer
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

app.get('/viewer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);

    // Sync: Client asks for Master
    socket.on('sync:request_master', () => {
        console.log(`📢 [Sync] Cliente ${socket.id} busca al Maestro...`);
        // Broadcast to everyone EXCEPT sender
        socket.broadcast.emit('sync:ask_master', { requesterId: socket.id });
    });

    // Sync: Master responds with data
    socket.on('sync:master_upload', async (data) => {
        if (!data || !data.categories) return;
        console.log(`📥 [Sync] Maestro ha enviado configuración actualizada (${data.categories.length} categorías).`);
        
        const categories = data.categories;
        const jsonVal = JSON.stringify(categories);
        
        try {
            await pool.query(`
              INSERT INTO app_config (key, value) VALUES ($1, $2)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `, ['categories', jsonVal]);
            
            // Broadcast update to ALL clients
            io.emit('config_updated', categories);
            console.log('✅ Configuración sincronizada y distribuida a todos.');
        } catch (err) {
             console.error('Error saving master config:', err.message);
        }
    });
});

// Start server
server.listen(PORT, () => {
  const displayUrl = PUBLIC_URL || `http://${LOCAL_IP}:${PORT}`;
  console.log(`\n🚀 SERVIDOR POS (Neon/Postgres) LISTO`);
  console.log(`📡 API & Socket: http://localhost:${PORT}`);
  console.log(`📺 Visor Web:    http://localhost:${PORT}/`);
  console.log(`📱 QR Apunta a:  ${displayUrl}/api/sync\n`);
});
