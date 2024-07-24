const express = require('express');
const { createPokerTable, listPokerTables, setupPokerController } = require('../controllers/pokerTableController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.post('/create', verifyToken, createPokerTable);
router.get('/list', verifyToken, listPokerTables);

const initializeSocket = (io) => {
  setupPokerController(io);
};

module.exports = { router, initializeSocket };
