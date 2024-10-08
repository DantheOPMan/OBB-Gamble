const express = require('express');
const { createHand, hit, stand, doubleDown, split, getCurrentHand, claimBlackjackProfits } = require('../controllers/blackjackController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/create-hand', verifyToken, createHand);
router.post('/hit/:handId/:handIndex', verifyToken, hit);
router.post('/stand/:handId/:handIndex', verifyToken, stand);
router.post('/double-down/:handId/:handIndex', verifyToken, doubleDown);
router.post('/split/:handId/:handIndex', verifyToken, split);
router.get('/current-hand', verifyToken, getCurrentHand);
router.post('/claim-profits', verifyToken, isAdmin, claimBlackjackProfits);

module.exports = router;
