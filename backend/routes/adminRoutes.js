// backend/routes/adminRoutes.js
const express = require('express');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);
router.use(isAdmin);

router.get('/some-admin-endpoint', (req, res) => {
  res.json({ message: 'This is a protected admin endpoint' });
});

module.exports = router;
