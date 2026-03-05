const express = require('express');
const router = express.Router();
const { getStores, saveStore, deleteStore } = require('../controllers/storeController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/stores', authMiddleware, getStores);
router.post('/stores', authMiddleware, saveStore);
router.delete('/stores/:id', authMiddleware, deleteStore);

module.exports = router;
