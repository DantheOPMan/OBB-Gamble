const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { placeBet, getCurrentRound, initializeRoulette } = require('../controllers/rouletteController');

const router = express.Router();

router.post('/place-bet', verifyToken, placeBet);
router.get('/current-round', verifyToken, getCurrentRound);

module.exports = { router, initializeRoulette };
