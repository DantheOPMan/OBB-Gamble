const mongoose = require('mongoose');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected!');
  } catch (err) {
    console.log(err.message);
  }

  try {
    const serviceAccountPath = path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin Initialized!');
  } catch (err) {
    console.log('Error initializing Firebase Admin:', err.message);
  }
};

module.exports = connectDB;
