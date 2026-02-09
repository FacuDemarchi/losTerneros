const express = require('express');
const router = express.Router();
const { searchClients, saveClient } = require('../controllers/clientController');

router.get('/clients', searchClients);
router.post('/clients', saveClient);

module.exports = router;
