const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },  // Change type to String
  amount: { type: Number, required: true },
  marketName: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
