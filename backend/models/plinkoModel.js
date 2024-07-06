const mongoose = require('mongoose');

const plinkoSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  result: { type: Number, required: true },
  position: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Plinko = mongoose.model('Plinko', plinkoSchema);

module.exports = Plinko;
