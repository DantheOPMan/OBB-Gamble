const express = require('express');
const { getPlinkoResults, getBurnTransactions, getBlackjackStats } = require('../controllers/statsController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/plinko-results', verifyToken, isAdmin, getPlinkoResults);
router.get('/burn-transactions', verifyToken, isAdmin, getBurnTransactions);
router.get('/blackjack-stats', verifyToken, isAdmin, getBlackjackStats); // New route for Blackjack stats

module.exports = router;
