const mongoose = require('mongoose');

const rouletteBetSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String }, // Optional: Store username for convenience
  betAmount: { type: Number, required: true },
  betType: { type: String, required: true }, // e.g., 'number', 'color', 'split'
  betValue: { type: mongoose.Schema.Types.Mixed, required: true }, // e.g., 'red', 7, [2,5]
});

const rouletteRoundSchema = new mongoose.Schema({
  roundId: { type: String, required: true },
  startTime: { type: Date, required: true },
  bets: [rouletteBetSchema],
  winningNumber: { type: Number },
  outcomeTime: { type: Date },
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model('RouletteRound', rouletteRoundSchema);
