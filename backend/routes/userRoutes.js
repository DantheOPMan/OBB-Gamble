const express = require('express');
const { registerUser, getUser, updateUser, getUsers, getUserTransactions } = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerUser);
router.get('/:uid', verifyToken, getUser);
router.put('/:uid', verifyToken, updateUser);
router.get('/', getUsers);
router.get('/:uid/transactions', verifyToken, getUserTransactions);

module.exports = router;
