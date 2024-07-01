// backend/app.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./db/conn');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const marketRoutes = require('./routes/marketRoutes'); // Import market routes

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes); 
app.use('/api/markets', marketRoutes);

module.exports = app;
