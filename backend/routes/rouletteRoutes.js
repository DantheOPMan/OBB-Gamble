const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { placeBet } = require('../controllers/rouletteController');

const router = express.Router();

router.post('/place-bet', verifyToken, placeBet);

module.exports = router;
