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

// Database setup (PostgreSQL / Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necesario para Neon
  }
});

// Inicializar DB
async function initDb() {
  const start = Date.now();
  try {
    const client = await pool.connect();
    console.log('📡 Database connection established in', Date.now() - start, 'ms');
    
    // Tabla para configuración (Categorías y Productos guardados como JSON)
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Tabla para Locales (Stores)
    await client.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password TEXT
      );
    `);

    // Crear local default si no hay ninguno
    const storesCount = await client.query("SELECT COUNT(*) FROM stores");
    if (parseInt(storesCount.rows[0].count) === 0) {
      console.log('📝 Creando local por defecto: Alemanes');
      await client.query(`
        INSERT INTO stores (id, name, password) VALUES ($1, $2, $3)
      `, ['alemanes', 'Alemanes', '']);
    }
    
    console.log('✅ Connected to Neon PostgreSQL database and tables verified.');
    client.release();
  } catch (err) {
    console.error('❌ Error initializing database:', err);
  }
}

initDb();

// Routes

// Health Check / Keep-Alive (Lightweight)
app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

// GET Stores
app.get('/api/stores', async (req, res) => {
  console.log('GET /api/stores - Iniciando consulta');
  try {
    const result = await pool.query("SELECT * FROM stores ORDER BY name ASC");
    console.log(`GET /api/stores - Éxito: ${result.rows.length} locales encontrados`);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/stores - ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST Store (Save/Update)
app.post('/api/stores', async (req, res) => {
  const { id, name, password } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'ID and Name are required' });
  try {
    await pool.query(`
      INSERT INTO stores (id, name, password) VALUES ($1, $2, $3)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, password = excluded.password
    `, [id, name, password]);
    res.json({ message: 'Store saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE Store
app.delete('/api/stores/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM stores WHERE id = $1", [req.params.id]);
    res.json({ message: 'Store deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET Configuration (Categories & Products)
app.get('/api/config', async (req, res) => {
  const { storeId } = req.query;
  const configKey = storeId ? `categories_${storeId}` : 'categories';
  
  try {
    const result = await pool.query("SELECT value FROM app_config WHERE key = $1", [configKey]);
    const row = result.rows[0];

    // Si no hay configuración guardada para el local, devolver vacío
    let categories = row ? JSON.parse(row.value) : null;
    
    if (!categories && storeId) {
      categories = []; // No heredar de la configuración global
    }
    
    res.json({ 
        categories, 
        serverIp: LOCAL_IP, 
        port: PORT
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST Configuration (Save Categories & Products)
app.post('/api/config', async (req, res) => {
  const { categories, storeId } = req.body;
  if (!categories) {
    res.status(400).json({ error: 'Categories data required' });
    return;
  }

  const configKey = storeId ? `categories_${storeId}` : 'categories';
  const jsonVal = JSON.stringify(categories);
  
  try {
    await pool.query(`
      INSERT INTO app_config (key, value) VALUES ($1, $2)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `, [configKey, jsonVal]);

    // Notificar a todos los clientes conectados que hubo cambios
    io.emit('config_updated', { categories, storeId });
    
    res.json({ message: 'Configuration saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);
});

// Start server
server.listen(PORT, () => {
  console.log(`\n🚀 SERVIDOR POS (Neon/Postgres) LISTO`);
  console.log(`📡 API & Socket: http://localhost:${PORT}`);
});
