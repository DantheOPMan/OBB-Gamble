const express = require('express');
const { requestDeposit, approveTransaction, rejectTransaction, getPendingTransactions, requestWithdraw, getApprovedTransactions, requestTip, approveTip, rejectTip } = require('../controllers/transactionController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/deposit', verifyToken, requestDeposit);
router.post('/withdraw', verifyToken, requestWithdraw);
router.post('/tip', verifyToken, requestTip);
router.put('/approveTip/:transactionId', verifyToken, isAdmin, approveTip);
router.put('/rejectTip/:transactionId', verifyToken, isAdmin, rejectTip);
router.put('/approve/:transactionId', verifyToken, isAdmin, approveTransaction);
router.put('/reject/:transactionId', verifyToken, isAdmin, rejectTransaction);
router.get('/pending', verifyToken, isAdmin, getPendingTransactions);
router.get('/approved', verifyToken, isAdmin, getApprovedTransactions);

module.exports = router;
