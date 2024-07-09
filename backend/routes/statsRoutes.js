const express = require('express');
const { getPlinkoResults, getBurnTransactions } = require('../controllers/statsController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/plinko-results', verifyToken, isAdmin, getPlinkoResults);
router.get('/burn-transactions', verifyToken, isAdmin, getBurnTransactions);
    
module.exports = router;
