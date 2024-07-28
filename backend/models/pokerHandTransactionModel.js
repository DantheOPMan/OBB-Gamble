const mongoose = require('mongoose');

const pokerHandTransactionSchema = new mongoose.Schema({
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'PokerTable', required: true },
    handNumber: { type: Number, required: true },
    players: [
        {
            uid: { type: String, ref: 'User' },
            betAmount: { type: Number, default: 0 },
            winnings: { type: Number, default: 0 },
            adminFee: { type: Number, default: 0 }
        }
    ],
    totalPot: { type: Number, required: true },
    adminFeeTotal: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});

const PokerHandTransaction = mongoose.model('PokerHandTransaction', pokerHandTransactionSchema);

module.exports = PokerHandTransaction;
