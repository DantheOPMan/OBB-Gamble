const express = require('express');
const { playPlinko, getPlinkoResults } = require('../controllers/plinkoController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/play', verifyToken, playPlinko);
router.get('/results', verifyToken, isAdmin, getPlinkoResults);

module.exports = router;
