const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');

const requestDeposit = async (req, res) => {
  const { userId, amount, discordUsername, obkUsername } = req.body;

  if (!userId || !amount || !discordUsername || !obkUsername) {
    return res.status(400).json({ message: 'User ID, amount, Discord username, and OBK username are required' });
  }

  try {
    const user = await User.findOne({ uid: userId });  // Use findOne with uid
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (amount > 2000) {
      return res.status(400).json({ message: 'Deposit amount cannot exceed 2000 BP' });
    }

    const transaction = new Transaction({
      userId,
      amount,
      discordUsername,
      obkUsername,
      status: 'pending',
    });
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const requestWithdraw = async (req, res) => {
  const { userId, amount, discordUsername, obkUsername } = req.body;

  if (!userId || !amount || !discordUsername || !obkUsername) {
    return res.status(400).json({ message: 'User ID, amount, Discord username, and OBK username are required' });
  }

  try {
    const user = await User.findOne({ uid: userId });  // Use findOne with uid
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.bpBalance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const transaction = new Transaction({
      userId,
      amount: -amount,
      discordUsername,
      obkUsername,
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

    const user = await User.findOne({ uid: transaction.userId });  // Use findOne with uid
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!transaction.discordUsername || !transaction.obkUsername) {
      return res.status(400).json({ message: 'Discord and OBK usernames are required' });
    }

    transaction.status = 'approved';
    await transaction.save();

    user.bpBalance += transaction.amount;
    await user.save();

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const rejectTransaction = async (req, res) => {
  const { transactionId } = req.params;

  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    transaction.status = 'rejected';
    await transaction.save();

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

const getApprovedTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: 'approved' }).populate('userId');
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  requestDeposit,
  requestWithdraw,
  approveTransaction,
  rejectTransaction,
  getPendingTransactions,
  getApprovedTransactions
};
