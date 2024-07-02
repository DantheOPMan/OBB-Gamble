// backend/routes/userRoutes.js
const express = require('express');
const { registerUser, getUser, updateUser, getUsers, getUserTransactions } = require('../controllers/userController');

const router = express.Router();

router.post('/register', registerUser);
router.get('/:uid', getUser);
router.put('/:uid', updateUser);  // Add the new route for updating usernames
router.get('/', getUsers); // Add this route to get all users
router.get('/:uid/transactions', getUserTransactions); // New route for fetching user transactions

module.exports = router;
