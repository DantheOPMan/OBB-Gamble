const express = require('express');
const { registerUser, getUser, updateUser, getUsers, getUserTransactions } = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerUser);
router.get('/:uid', verifyToken, getUser);
router.put('/:uid', verifyToken, updateUser);  // Add the new route for updating usernames
router.get('/', getUsers); // Add this route to get all users
router.get('/:uid/transactions', verifyToken, getUserTransactions); // New route for fetching user transactions

module.exports = router;
