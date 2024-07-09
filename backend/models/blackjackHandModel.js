const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema({
  suit: String,
  value: String,
});

const PlayerHandSchema = new mongoose.Schema({
  cards: [CardSchema],
  value: Number,
  status: { type: String, default: 'ongoing' }, // 'ongoing', 'bust', 'stand', etc.
  bpCharged: { type: Number, required: true }, // BP amount charged for this hand
  payout: { type: Number, default: 0 }, // Payout for this hand
});

const BlackjackHandSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deck: [CardSchema],
  playerHands: [PlayerHandSchema],
  dealerHand: [CardSchema],
  dealerValue: Number,
  dealerVisibleCards: [CardSchema],
  status: { type: String, default: 'ongoing' }, // 'ongoing', 'player_blackjack', 'dealer_blackjack', 'tie', 'player_wins', 'dealer_wins', 'bust'
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BlackjackHand', BlackjackHandSchema);
