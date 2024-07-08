const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');

const requestDeposit = async (req, res) => {
  const { userId, amount, discordUsername, obkUsername } = req.body;

  if (!userId || !amount || !discordUsername || !obkUsername) {
    return res.status(400).json({ message: 'User ID, amount, Discord username, and OBK username are required' });
  }
  if (userId !== req.user.uid) {
    return res.status(403).json({ message: 'Forbidden: Cannot perform this action for another user' });
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
  if (userId !== req.user.uid) {
    return res.status(403).json({ message: 'Forbidden: Cannot perform this action for another user' });
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

    const user = await User.findOne({ uid: transaction.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!transaction.discordUsername || !transaction.obkUsername) {
      return res.status(400).json({ message: 'Discord and OBK usernames are required' });
    }

    // Check if the transaction is a withdrawal
    if (transaction.amount < 0 && user.bpBalance < Math.abs(transaction.amount)) {
      transaction.status = 'rejected';
      await transaction.save();  
      return res.status(400).json({ message: 'Insufficient balance for withdrawal' });
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

const requestTip = async (req, res) => {
  const { userId, targetUserId, amount, discordUsername, obkUsername } = req.body;

  if (!userId || !targetUserId || !amount || !discordUsername || !obkUsername) {
    return res.status(400).json({ message: 'User ID, target user ID, amount, Discord username, and OBK username are required' });
  }
  if (userId !== req.user.uid) {
    return res.status(403).json({ message: 'Forbidden: Cannot perform this action for another user' });
  }
  try {
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.bpBalance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    user.bpBalance -= amount;
    await user.save();

    const transaction = new Transaction({
      userId,
      targetUserId,
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

const approveTip = async (req, res) => {
  const { transactionId } = req.params;

  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if(transaction.status !== 'pending'){
      return res.status(400).json({ message: 'Transaction is already confirmed/rejected' });
    }

    const user = await User.findOne({ uid: transaction.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const targetUser = await User.findOne({ uid: transaction.targetUserId });
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    transaction.status = 'approved';
    await transaction.save();

    const adminUsers = await User.find({ role: 'admin' });
    const adminFee = Math.ceil(Math.abs(transaction.amount) * 0.05);
    const burnAmount = Math.ceil(adminFee * 0.2);
    const netAdminFee = adminFee - burnAmount;
    const netAmount = Math.abs(transaction.amount) - adminFee;
    const adminFeePerUser = netAdminFee / adminUsers.length;

    for (const admin of adminUsers) {
      admin.bpBalance += adminFeePerUser;
      await admin.save();
    }

    const burnTransaction = new Transaction({
      userId: 'burn',
      amount: burnAmount,
      marketId: transaction.marketId,
      competitorName: 'Burn',
      status: 'approved',
      discordUsername: 'Burn',
      obkUsername: 'Burn'
    });
    await burnTransaction.save();

    targetUser.bpBalance += netAmount;
    await targetUser.save();

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const rejectTip = async (req, res) => {
  const { transactionId } = req.params;

  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if(transaction.status != 'pending'){
      return res.status(404).json({ message: 'Transaction is already confirmed/rejected' });
    }

    const user = await User.findOne({ uid: transaction.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.bpBalance += Math.abs(transaction.amount);
    await user.save();

    transaction.status = 'rejected';
    await transaction.save();

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  requestDeposit,
  requestWithdraw,
  requestTip,
  approveTip,
  rejectTip,
  approveTransaction,
  rejectTransaction,
  getPendingTransactions,
  getApprovedTransactions
};
