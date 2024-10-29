const Market = require('../models/marketModel');
const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');
const mongoose = require('mongoose');

const createMarket = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const { marketName, competitors, marketType = 'single', combinationSize = 1 } = req.body;

  try {
    const newMarket = new Market({
      name: marketName,
      competitors,
      marketType,
      combinationSize,
    });

    await newMarket.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(newMarket);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

const getMarkets = async (req, res) => {
  try {
    const markets = await Market.find();
    res.status(200).json(markets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const pauseMarket = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const { marketId } = req.params;

  try {
    const market = await Market.findById(marketId).session(session);
    if (!market) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Market not found' });
    }

    market.status = 'paused';
    await market.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(market);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

const resumeMarket = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const { marketId } = req.params;

  try {
    const market = await Market.findById(marketId).session(session);
    if (!market) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Market not found' });
    }

    market.status = 'open';
    await market.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(market);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

const closeMarket = async (req, res) => {
  const { marketId } = req.params;
  let { winner } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const market = await Market.findById(marketId).session(session);
    if (!market) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Market not found' });
    }

    let winningCombination = winner ? winner.split(',') : [];

    if (market.marketType === 'combination' && winner) {
      if (winningCombination.length !== market.combinationSize) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: `Winning combination must have ${market.combinationSize} competitors`,
        });
      }

      // Validate competitors and sort the winning combination
      const sortedWinningCombination = winningCombination.map(name => name.trim()).sort();

      for (const name of sortedWinningCombination) {
        const exists = market.competitors.find((c) => c.name === name);
        if (!exists) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ message: `Competitor ${name} not found` });
        }
      }

      // Join the sorted combination into a string to store
      winner = sortedWinningCombination.join(', ');
    } else if (market.marketType === 'single') {
      // For single-option markets, validate the winner
      const exists = market.competitors.find((c) => c.name === winner);
      if (!exists) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: `Competitor ${winner} not found` });
      }
    }

    const transactions = await Transaction.find({ marketId, status: 'approved' }).session(session);

    const totalPool = transactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

    let totalWinningBets = 0;
    if (winner) {
      totalWinningBets = transactions
        .filter((transaction) => {
          if (market.marketType === 'combination') {
            // For combination bets, compare sorted combinations
            const transactionCombination = transaction.competitorName.split(',').map(name => name.trim()).sort().join(', ');
            return transactionCombination === winner;
          } else {
            return transaction.competitorName === winner;
          }
        })
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    }

    // Admin fee calculations
    const adminFee = Math.ceil(totalPool * 0.05);
    const burnAmount = Math.ceil(adminFee * 0.2);
    const netAdminFee = adminFee - burnAmount;
    const netPool = totalPool - adminFee;

    // Distribute admin fees
    const adminUsers = await User.find({ role: 'admin' }).session(session);
    const adminFeePerUser = netAdminFee / adminUsers.length;

    for (const admin of adminUsers) {
      const adminTransaction = new Transaction({
        userId: admin.uid,
        amount: adminFeePerUser,
        marketId: market._id,
        competitorName: 'AdminFee',
        status: 'approved',
        discordUsername: admin.discordUsername,
        obkUsername: admin.obkUsername,
      });

      admin.bpBalance += adminFeePerUser;
      await adminTransaction.save({ session });
      await admin.save({ session });
    }

    // Burn transaction
    const burnTransaction = new Transaction({
      userId: 'burn',
      amount: burnAmount,
      marketId: market._id,
      competitorName: 'Burn',
      status: 'approved',
      discordUsername: 'Burn',
      obkUsername: 'Burn',
    });
    await burnTransaction.save({ session });

    // Distribute winnings
    if (totalWinningBets === 0) {
      // No winners, distribute net pool to admins
      const netPoolPerAdmin = Math.floor(netPool / adminUsers.length);
      for (const admin of adminUsers) {
        admin.bpBalance += netPoolPerAdmin;
        await admin.save({ session });
      }
    } else {
      for (const transaction of transactions) {
        let isWinningBet = false;

        if (market.marketType === 'combination') {
          const transactionCombination = transaction.competitorName.split(',').map(name => name.trim()).sort().join(', ');
          isWinningBet = transactionCombination === winner;
        } else {
          isWinningBet = transaction.competitorName === winner;
        }

        if (isWinningBet) {
          const user = await User.findOne({ uid: transaction.userId }).session(session);
          if (user) {
            const userPayout = Math.round((Math.abs(transaction.amount) / totalWinningBets) * netPool);
            user.bpBalance += userPayout;

            const payoutTransaction = new Transaction({
              userId: user.uid,
              amount: userPayout,
              marketId: market._id,
              competitorName: 'Payout',
              status: 'approved',
              discordUsername: user.discordUsername,
              obkUsername: user.obkUsername,
            });

            await payoutTransaction.save({ session });
            await user.save({ session });
          }
        }
      }
    }

    // Update market status and winner
    market.status = 'closed';
    market.winner = winner;
    await market.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(market);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

const getMarketById = async (req, res) => {
  const { marketId } = req.params;

  try {
    const market = await Market.findById(marketId);
    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }

    res.status(200).json(market);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const placeBet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const { marketId } = req.params;
  const { userId, amount, competitorName = '' } = req.body;

  // Authorization check
  if (userId !== req.user.uid) {
    await session.abortTransaction();
    session.endSession();
    return res.status(403).json({ message: 'Forbidden: Cannot perform this action for another user' });
  }

  try {
    const market = await Market.findById(marketId).session(session);
    if (!market) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Market not found' });
    }

    if (market.status !== 'open') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Cannot place bet. Market is not open.' });
    }

    const user = await User.findOne({ uid: userId }).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.bpBalance < amount || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Insufficient balance or invalid amount' });
    }

    let standardizedCompetitorName = competitorName;

    if (market.marketType === 'combination') {
      const selectedCompetitors = competitorName.split(',').map(name => name.trim());
      if (selectedCompetitors.length !== market.combinationSize) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: `You must select exactly ${market.combinationSize} competitors`,
        });
      }

      // Validate and sort each competitor
      const sortedSelectedCompetitors = [];
      for (const name of selectedCompetitors) {
        const exists = market.competitors.find((c) => c.name === name);
        if (!exists) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ message: `Competitor ${name} not found` });
        }
        sortedSelectedCompetitors.push(name);
      }

      // Sort the competitor names and join them into a standardized string
      standardizedCompetitorName = sortedSelectedCompetitors.sort().join(', ');
    } else {
      const competitor = market.competitors.find((c) => c.name === competitorName);
      if (!competitor) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Competitor not found' });
      }
      // Update the competitor's value
      competitor.value += amount;
      await market.save({ session });
    }

    // Deduct the amount from user balance
    user.bpBalance -= amount;
    await user.save({ session });

    // Create a new transaction
    const newTransaction = new Transaction({
      userId,
      amount: -amount,
      marketId,
      competitorName: standardizedCompetitorName,
      status: 'approved',
      discordUsername: user.discordUsername,
      obkUsername: user.obkUsername,
    });

    await newTransaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Bet placed successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

const getBetTransactions = async (req, res) => {
  const { marketId } = req.params;

  try {
    const transactions = await Transaction.find({ marketId, status: 'approved' });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createMarket,
  getMarkets,
  pauseMarket,
  resumeMarket,
  closeMarket,
  getMarketById,
  placeBet,
  getBetTransactions,
};
