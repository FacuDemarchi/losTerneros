const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
    res.json({ categories });
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

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
