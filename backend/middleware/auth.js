const admin = require('firebase-admin');
const User = require('../models/userModel');

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    console.error('No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    const user = await User.findOne({ uid: decodedToken.uid });

    if (!user) {
      console.error('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ message: 'Unauthorized' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    console.error('Forbidden: Admins only');
    return res.status(403).json({ message: 'Forbidden: Admins only' });
  }
  next();
};

module.exports = { verifyToken, isAdmin };
