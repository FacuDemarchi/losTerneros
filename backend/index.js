const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 3001;

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

// Database setup
const dbPath = path.resolve(__dirname, 'pos.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // Tabla para configuración (Categorías y Productos guardados como JSON)
    db.run(`CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    // Tabla para Ventas
    db.run(`CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      timestamp INTEGER,
      total REAL,
      type TEXT,
      items TEXT
    )`);
  });
}

// Routes

// GET Configuration (Categories & Products)
app.get('/api/config', (req, res) => {
  db.get("SELECT value FROM app_config WHERE key = ?", ['categories'], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Si no hay configuración guardada, devolver null o array vacío
    const categories = row ? JSON.parse(row.value) : null;
    res.json({ categories, serverIp: LOCAL_IP, port: PORT });
  });
});

// POST Configuration (Save Categories & Products)
app.post('/api/config', (req, res) => {
  const { categories } = req.body;
  if (!categories) {
    res.status(400).json({ error: 'Categories data required' });
    return;
  }

  const jsonVal = JSON.stringify(categories);
  db.run(`INSERT INTO app_config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ['categories', jsonVal],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Notificar a todos los clientes conectados que hubo cambios
      io.emit('config_updated', categories);
      
      res.json({ message: 'Configuration saved successfully' });
    }
  );
});

// GET Sales
app.get('/api/sales', (req, res) => {
  db.all("SELECT * FROM sales ORDER BY timestamp DESC LIMIT 1000", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Parse items JSON for each row
    const sales = rows.map(row => ({
      ...row,
      items: JSON.parse(row.items)
    }));
    res.json(sales);
  });
});

// POST Sale (New Ticket)
app.post('/api/sales', (req, res) => {
  const sale = req.body;
  // sale object expected: { id, timestamp, total, type, items: [] }
  
  if (!sale || !sale.id || !sale.items) {
    res.status(400).json({ error: 'Invalid sale data' });
    return;
  }

  const itemsJson = JSON.stringify(sale.items);
  
  db.run(`INSERT INTO sales (id, timestamp, total, type, items) VALUES (?, ?, ?, ?, ?)`,
    [sale.id, sale.timestamp, sale.total, sale.type, itemsJson],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Sale saved successfully', id: sale.id });
    }
  );
});

// POST Sync (Batch Sales)
app.post('/api/sync', (req, res) => {
  const { tickets } = req.body; // Expecting { tickets: [...] }
  
  if (!tickets || !Array.isArray(tickets)) {
    res.status(400).json({ error: 'Invalid tickets data' });
    return;
  }

  let addedCount = 0;
  let errors = [];

  const stmt = db.prepare(`INSERT OR IGNORE INTO sales (id, timestamp, total, type, items) VALUES (?, ?, ?, ?, ?)`);

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    tickets.forEach(sale => {
      if (!sale.id || !sale.items) return;
      
      const itemsJson = JSON.stringify(sale.items);
      stmt.run([sale.id, sale.timestamp, sale.total, sale.type, itemsJson], function(err) {
        if (err) {
          errors.push({ id: sale.id, error: err.message });
        } else if (this.changes > 0) {
          addedCount++;
        }
      });
    });

    db.run("COMMIT", (err) => {
      stmt.finalize();
      if (err) {
        res.status(500).json({ error: 'Transaction commit failed' });
      } else {
        res.json({ 
          message: 'Sync completed', 
          added: addedCount, 
          total: tickets.length,
          errors: errors.length > 0 ? errors : undefined 
        });

        // Notificar al visor web si hay nuevos tickets
        if (addedCount > 0) {
            io.emit('new_data', tickets);
        }
      }
    });
  });
});

// Serve Viewer
app.get('/viewer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);
});

// Start server
server.listen(PORT, () => {
  console.log(`\n🚀 SERVIDOR POS LISTO`);
  console.log(`📡 API & Socket: http://localhost:${PORT}`);
  console.log(`📺 Visor Web:    http://localhost:${PORT}/viewer.html`);
  console.log(`📱 IP Local:     http://${LOCAL_IP}:${PORT}\n`);
});
