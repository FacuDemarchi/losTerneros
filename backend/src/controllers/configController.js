const { pool } = require('../config/db');
const os = require('os');

// Helper para IP local (copiado de index.js original, útil para la respuesta de config)
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
const PORT = process.env.PORT || 3001;

const getConfig = async (req, res) => {
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
};

const saveConfig = async (req, res) => {
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

    // Obtener io desde app (inyectado en index.js)
    const io = req.app.get('io');
    if (io) {
        // Notificar a todos los clientes conectados que hubo cambios
        io.emit('config_updated', { categories, storeId });
    }
    
    res.json({ message: 'Configuration saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getConfig, saveConfig };
