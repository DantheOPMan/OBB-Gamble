const express = require('express');
const router = express.Router();

// Public route
router.get('/', (req, res) => {
  res.send('Hello from the public API!');
});

// Protected route
router.get('/protected', (req, res) => {
  res.send(`Hello ${req.user.name}, you are authenticated!`);
});

module.exports = router;
