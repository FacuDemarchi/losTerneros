const { pool } = require('../config/db');

const searchClients = async (req, res) => {
  const { q } = req.query;
  try {
    let queryText = "SELECT * FROM clients ORDER BY name ASC";
    let queryParams = [];

    if (q) {
      queryText = "SELECT * FROM clients WHERE name ILIKE $1 OR cuit ILIKE $1 ORDER BY name ASC LIMIT 50";
      queryParams = [`%${q}%`];
    }

    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/clients - ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};

const saveClient = async (req, res) => {
  const { name, cuit } = req.body;
  
  // Nota: Mantenemos validación mínima como solicitado, sin agregar extras de formato por ahora.
  if (!name || !cuit) {
    return res.status(400).json({ error: 'Name and CUIT are required' });
  }

  try {
    // Upsert: Insertar o actualizar si el CUIT ya existe
    const result = await pool.query(`
      INSERT INTO clients (name, cuit) 
      VALUES ($1, $2)
      ON CONFLICT(cuit) DO UPDATE SET name = excluded.name
      RETURNING *
    `, [name, cuit]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/clients - ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { searchClients, saveClient };
