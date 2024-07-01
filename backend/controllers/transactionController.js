// backend/controllers/transactionController.js
const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');

const requestDeposit = async (req, res) => {
  const { userId, amount, marketName } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({ message: 'User ID and amount are required' });
  }

  if (amount > 2000) {
    return res.status(400).json({ message: 'Deposit amount cannot exceed 2000 BP' });
  }

  try {
    const transaction = new Transaction({
      userId,  // Use Firebase UID directly
      amount,
      marketName,
      status: 'pending',
    });
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const requestWithdraw = async (req, res) => {
  const { userId, amount, marketName } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({ message: 'User ID and amount are required' });
  }

  try {
    const user = await User.findOne({ uid: userId });  // Find user by Firebase UID
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.bpBalance < amount) return res.status(400).json({ message: 'Insufficient balance' });

    const transaction = new Transaction({
      userId,  // Use Firebase UID directly
      amount: -amount,
      marketName,
      status: 'pending',
    });
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const approveTransaction = async (req, res) => {
  const { transactionId } = req.params;

  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    transaction.status = 'approved';
    await transaction.save();

    const user = await User.findById(transaction.userId);
    user.bpBalance += transaction.amount; // Update balance
    await user.save();

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPendingTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: 'pending' }).populate('userId');
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  requestDeposit,
  requestWithdraw,
  approveTransaction,
  getPendingTransactions,
};
