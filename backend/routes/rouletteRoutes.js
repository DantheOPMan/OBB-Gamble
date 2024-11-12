const express = require('express');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { placeBet, getCurrentRound, initializeRoulette, getRouletteStats, claimRouletteProfits } = require('../controllers/rouletteController');

const router = express.Router();

router.post('/place-bet', verifyToken, placeBet);
router.get('/current-round', verifyToken, getCurrentRound);
router.get('/stats', verifyToken, isAdmin, getRouletteStats);
router.post('/claim-profits', verifyToken, isAdmin, claimRouletteProfits);

module.exports = { router, initializeRoulette };
