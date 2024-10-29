const mongoose = require('mongoose');

const marketSchema = new mongoose.Schema({
  name: { type: String, required: true },
  competitors: [
    {
      name: { type: String, required: true },
      value: { type: Number, required: true, default: 0 }
    }
  ],
  status: { type: String, enum: ['open', 'paused', 'closed'], default: 'open' },
  winner: { type: String },
  marketType: { type: String, default: 'single' }, // 'single' or 'combination'
  combinationSize: { type: Number, default: 1 },
});

const Market = mongoose.model('Market', marketSchema);

module.exports = Market;
