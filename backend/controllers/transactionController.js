const mongoose = require('mongoose');
const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');

const requestDeposit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, amount, discordUsername, obkUsername } = req.body;

    if (!userId || !amount || !discordUsername || !obkUsername) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'User ID, amount, Discord username, and OBK username are required' });
    }
    if (userId !== req.user.uid) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'Forbidden: Cannot perform this action for another user' });
    }

    const user = await User.findOne({ uid: userId }).session(session); // Use findOne with uid
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    if (amount > 10000) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Deposit amount cannot exceed 10000 BP' });
    }

    const transaction = new Transaction({
      userId,
      amount,
      discordUsername,
      obkUsername,
      status: 'pending',
    });
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(transaction);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

const requestWithdraw = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, amount, discordUsername, obkUsername } = req.body;

    if (!userId || !amount || !discordUsername || !obkUsername) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'User ID, amount, Discord username, and OBK username are required' });
    }
    if (userId !== req.user.uid) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'Forbidden: Cannot perform this action for another user' });
    }

    const user = await User.findOne({ uid: userId }).session(session); // Use findOne with uid
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.bpBalance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const transaction = new Transaction({
      userId,
      amount: -amount,
      discordUsername,
      obkUsername,
      status: 'pending',
    });
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(transaction);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

const approveTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId).session(session);
    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const user = await User.findOne({ uid: transaction.userId }).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    if (!transaction.discordUsername || !transaction.obkUsername) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Discord and OBK usernames are required' });
    }

    // Check if the transaction is a withdrawal
    if (transaction.amount < 0 && user.bpBalance < Math.abs(transaction.amount)) {
      transaction.status = 'rejected';
      await transaction.save({ session });
      await session.commitTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Insufficient balance for withdrawal' });
    }

    transaction.status = 'approved';
    await transaction.save({ session });

    user.bpBalance += transaction.amount;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(transaction);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

const rejectTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId).session(session);
    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Transaction not found' });
    }

    transaction.status = 'rejected';
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(transaction);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, targetUserId, amount, discordUsername, obkUsername } = req.body;

    if (!userId || !targetUserId || !amount || !discordUsername || !obkUsername) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: 'User ID, target user ID, amount, Discord username, and OBK username are required',
      });
    }
    if (userId !== req.user.uid) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'Forbidden: Cannot perform this action for another user' });
    }

    const user = await User.findOne({ uid: userId }).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.bpBalance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Deduct the amount from the user's balance
    user.bpBalance -= amount;
    await user.save({ session });

    const transaction = new Transaction({
      userId,
      targetUserId,
      amount: -amount,
      discordUsername,
      obkUsername,
      status: 'pending',
    });
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(transaction);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

const approveTip = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId).session(session);
    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Transaction is already confirmed/rejected' });
    }

    const user = await User.findOne({ uid: transaction.userId }).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    const targetUser = await User.findOne({ uid: transaction.targetUserId }).session(session);
    if (!targetUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Calculate admin fee and burn amount
    const adminUsers = await User.find({ role: 'admin' }).session(session);
    const adminFee = Math.ceil(Math.abs(transaction.amount) * 0.03);
    const burnAmount = Math.ceil(adminFee * 0.33);
    const netAdminFee = adminFee - burnAmount;
    const netAmount = Math.abs(transaction.amount) - adminFee;
    const adminFeePerUser = netAdminFee / adminUsers.length;

    // Distribute admin fees
    for (const admin of adminUsers) {
      admin.bpBalance += adminFeePerUser;
      await admin.save({ session });
    }

    // Burn transaction
    const burnTransaction = new Transaction({
      userId: 'burn',
      amount: burnAmount,
      marketId: transaction.marketId,
      competitorName: 'Burn',
      status: 'approved',
      discordUsername: 'Burn',
      obkUsername: 'Burn',
    });
    await burnTransaction.save({ session });

    // Credit the net amount to the target user
    targetUser.bpBalance += netAmount;
    await targetUser.save({ session });

    transaction.status = 'approved';
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(transaction);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

const rejectTip = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId).session(session);
    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Transaction is already confirmed/rejected' });
    }

    const user = await User.findOne({ uid: transaction.userId }).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    // Refund the amount to the user
    user.bpBalance += Math.abs(transaction.amount);
    await user.save({ session });

    transaction.status = 'rejected';
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(transaction);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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
  getApprovedTransactions,
};
