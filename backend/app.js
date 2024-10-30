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
const { router: pokerTableRoutes, initializeSocket } = require('./routes/pokerTableRoutes');
const rouletteRoutes = require('./routes/rouletteRoutes');
const { initializeRoulette } = require('./controllers/rouletteController');

const app = express();

// Use environment variable for frontend URL
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';

const corsOptions = {
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

connectDB();

app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/plinko', plinkoRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/blackjack', blackjackRoutes);
app.use('/api/pokertables', pokerTableRoutes);
app.use('/api/roulette', rouletteRoutes);

const server = http.createServer(app);
const io = socketIo(server, {
    path: '/socket.io',
    cors: {
        origin: allowedOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
    }
});

initializeSocket(io);
initializeRoulette(io);

module.exports = { app, server };
