const mongoose = require('mongoose');

const pokerTableSchema = new mongoose.Schema({
    name: { type: String, required: true },
    players: [
        {
            uid: { type: String, ref: 'User' },
            socketId: { type: String },
            hand: [{ value: String, suit: String }],
            status: { type: String, default: 'waiting' },
            bet: { type: Number, default: 0 },
            handVisible: { type: Boolean, default: false },
            obkUsername: { type: String }
        }
    ],
    spectators: [{ socketId: String }],
    pot: { type: Number, default: 0 },
    currentPlayerIndex: { type: Number, default: 0 },
    remainingTime: { type: Number, default: 15 },
    boardCards: [{ value: String, suit: String }],
    stage: { type: String, default: 'pre-flop' },
    bigBlind: { type: Number, default: 10 },
    smallBlind: { type: Number, default: 5 },
    smallBlindIndex: { type: Number, default: 0 },
    bigBlindIndex: { type: Number, default: 1 },
    lastActivity: { type: Date, default: Date.now }
});

const PokerTable = mongoose.model('PokerTable', pokerTableSchema);

module.exports = PokerTable;
