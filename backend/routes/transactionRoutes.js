// backend/routes/transactionRoutes.js
const express = require('express');
const { requestDeposit, requestWithdraw, approveTransaction, getPendingTransactions } = require('../controllers/transactionController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/deposit', verifyToken, requestDeposit);
router.post('/withdraw', verifyToken, requestWithdraw);
router.put('/approve/:transactionId', verifyToken, isAdmin, approveTransaction);
router.get('/pending', verifyToken, isAdmin, getPendingTransactions);

module.exports = router;
