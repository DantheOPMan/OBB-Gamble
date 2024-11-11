const admin = require('firebase-admin');
const User = require('../models/userModel');

const verifyFirebaseToken = async (token) => {
  if (!token) {
    throw new Error('No token provided');
  }

  const decodedToken = await admin.auth().verifyIdToken(token);
  const user = await User.findOne({ uid: decodedToken.uid });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  try {
    const user = await verifyFirebaseToken(token);
    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication error:', err.message);
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

module.exports = { verifyFirebaseToken, verifyToken, isAdmin };
