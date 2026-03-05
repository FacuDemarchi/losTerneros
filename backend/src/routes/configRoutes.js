const express = require('express');
const router = express.Router();
const { getConfig, saveConfig } = require('../controllers/configController');
const authMiddleware = require('../middleware/authMiddleware');

// Aplicar middleware a todas las rutas de config
router.use('/config', authMiddleware);

router.get('/config', getConfig);
router.post('/config', saveConfig);

module.exports = router;
