const mongoose = require('mongoose');

const marketSchema = new mongoose.Schema({
  name: { type: String, required: true },
  competitors: [
    {
      name: { type: String, required: true },
      value: { type: Number, required: true }
    }
  ],
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  winner: { type: String }
});

const Market = mongoose.model('Market', marketSchema);

module.exports = Market;
