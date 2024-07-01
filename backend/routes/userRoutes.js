// backend/routes/userRoutes.js
const express = require('express');
const { registerUser, getUser, updateUser } = require('../controllers/userController');

const router = express.Router();

router.post('/register', registerUser);
router.get('/:uid', getUser);
router.put('/:uid', updateUser);  // Add the new route for updating usernames

module.exports = router;
