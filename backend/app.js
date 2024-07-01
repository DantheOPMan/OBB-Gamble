// backend/app.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./db/conn');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes'); // Adjust path as necessary

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes); 

module.exports = app;
