// backend/app.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./db/conn');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const marketRoutes = require('./routes/marketRoutes');
const plinkoRoutes = require('./routes/plinkoRoutes');
const statsRoutes = require('./routes/statsRoutes');

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes); 
app.use('/api/markets', marketRoutes);
app.use('/api/plinko', plinkoRoutes);
app.use('/api/stats', statsRoutes);

module.exports = app;
