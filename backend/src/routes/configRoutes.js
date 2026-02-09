const express = require('express');
const router = express.Router();
const { getConfig, saveConfig } = require('../controllers/configController');

router.get('/config', getConfig);
router.post('/config', saveConfig);

module.exports = router;
