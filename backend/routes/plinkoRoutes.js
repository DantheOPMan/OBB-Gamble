const express = require('express');
const { playPlinko, claimProfits } = require('../controllers/plinkoController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/play', verifyToken, playPlinko);
router.post('/claim-profits', verifyToken, isAdmin, claimProfits);

module.exports = router;
