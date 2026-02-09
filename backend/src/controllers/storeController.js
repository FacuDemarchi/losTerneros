const { pool } = require('../config/db');

const getStores = async (req, res) => {
  console.log('GET /api/stores - Iniciando consulta');
  try {
    const result = await pool.query("SELECT * FROM stores ORDER BY name ASC");
    console.log(`GET /api/stores - Éxito: ${result.rows.length} locales encontrados`);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/stores - ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};

const saveStore = async (req, res) => {
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
};

const deleteStore = async (req, res) => {
  try {
    await pool.query("DELETE FROM stores WHERE id = $1", [req.params.id]);
    res.json({ message: 'Store deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getStores, saveStore, deleteStore };
