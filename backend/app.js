const cors = require('cors');
const connectDB = require('./db/conn');
const router = require('./routes');
const express = require('express');
const firebaseAuth = require('./middleware/firebaseAuth');

const app = express();

app.use(cors());
app.use(express.json());

connectDB();
app.use('/api', firebaseAuth); // Protect your API routes
app.use('/', router); // Public routes

module.exports = app;
