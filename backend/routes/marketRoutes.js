const express = require('express');
const { createMarket, getMarkets, closeMarket, getMarketById, placeBet } = require('../controllers/marketController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', verifyToken, isAdmin, createMarket);
router.get('/', verifyToken, getMarkets);
router.post('/close/:marketId', verifyToken, isAdmin, closeMarket);
router.get('/:marketId', verifyToken, getMarketById);
router.post('/bet/:marketId', verifyToken, placeBet);

module.exports = router;
