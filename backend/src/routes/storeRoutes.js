const express = require('express');
const router = express.Router();
const { getStores, saveStore, deleteStore } = require('../controllers/storeController');

router.get('/stores', getStores);
router.post('/stores', saveStore);
router.delete('/stores/:id', deleteStore);

module.exports = router;
