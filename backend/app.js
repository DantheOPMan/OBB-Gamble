// backend/app.js
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./db/conn');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const marketRoutes = require('./routes/marketRoutes');
const plinkoRoutes = require('./routes/plinkoRoutes');
const statsRoutes = require('./routes/statsRoutes');
const blackjackRoutes = require('./routes/blackjackRoutes');
const setupPokerController = require('./controllers/pokerController');

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes); 
app.use('/api/markets', marketRoutes);
app.use('/api/plinko', plinkoRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/blackjack', blackjackRoutes);

const server = http.createServer(app);
const io = socketIo(server);

setupPokerController(io);

module.exports = { app, server };
