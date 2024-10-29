const express = require('express');
const { registerUser, getUser, updateUser, getUsers, getUserTransactions, getUserStats } = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerUser);
router.get('/:uid', verifyToken, getUser);
router.put('/:uid', verifyToken, updateUser);
router.get('/', getUsers);
router.get('/:uid/transactions', verifyToken, getUserTransactions);
router.get('/:uid/stats', verifyToken, getUserStats);

module.exports = router;
