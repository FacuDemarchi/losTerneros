const { Pool } = require('pg');

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

    // Tabla para Clientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        cuit TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

module.exports = { pool, initDb };
