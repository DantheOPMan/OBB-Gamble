const express = require('express');
const { createMarket, getMarkets, pauseMarket, closeMarket, resumeMarket, getMarketById, placeBet, getBetTransactions } = require('../controllers/marketController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', verifyToken, isAdmin, createMarket);
router.get('/', verifyToken, getMarkets);
router.post('/pause/:marketId', verifyToken, isAdmin, pauseMarket);
router.post('/close/:marketId', verifyToken, isAdmin, closeMarket);
router.post('/resume/:marketId', verifyToken, isAdmin, resumeMarket);
router.get('/:marketId', verifyToken, getMarketById);
router.post('/bet/:marketId', verifyToken, placeBet);
router.get('/transactions/:marketId', verifyToken, getBetTransactions);

module.exports = router;
