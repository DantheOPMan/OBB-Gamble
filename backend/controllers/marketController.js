const Market = require('../models/marketModel');
const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');

const createMarket = async (req, res) => {
  const { marketName, competitors } = req.body;

  try {
    const newMarket = new Market({ name: marketName, competitors });
    await newMarket.save();
    res.status(201).json(newMarket);
  } catch (error) {
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
  const { marketId } = req.params;

  try {
    const market = await Market.findById(marketId);
    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }

    market.status = 'paused';
    await market.save();

    res.status(200).json(market);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resumeMarket = async (req, res) => {
  const { marketId } = req.params;

  try {
    const market = await Market.findById(marketId);
    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }

    market.status = 'open';
    await market.save();

    res.status(200).json(market);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const closeMarket = async (req, res) => {
  const { marketId } = req.params;
  const { winner } = req.body;

  try {
    const market = await Market.findById(marketId);
    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }

    const winningCompetitor = market.competitors.find(c => c.name === winner);
    if (!winningCompetitor && winner) {
      return res.status(404).json({ message: 'Winning competitor not found' });
    }

    const transactions = await Transaction.find({ marketId, status: 'approved' });

    const totalPool = transactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    const totalWinningBets = winner
      ? transactions.filter(transaction => transaction.competitorName === winner).reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)
      : 0;
    const adminFee = Math.ceil(totalPool * 0.05);
    const burnAmount = Math.ceil(adminFee * 0.2);
    const netAdminFee = adminFee - burnAmount;
    const netPool = totalPool - adminFee;
    const adminUsers = await User.find({ role: 'admin' });
    const adminFeePerUser = netAdminFee / adminUsers.length;

    for (const admin of adminUsers) {
      const adminTransaction = new Transaction({
        userId: admin.uid,
        amount: adminFeePerUser,
        marketId: market._id,
        competitorName: 'AdminFee',
        status: 'approved',
        discordUsername: admin.discordUsername,
        obkUsername: admin.obkUsername
      });
      admin.bpBalance += adminFeePerUser;
      await adminTransaction.save();
      await admin.save();
    }

    const burnTransaction = new Transaction({
      userId: 'burn',
      amount: burnAmount,
      marketId: market._id,
      competitorName: 'Burn',
      status: 'approved',
      discordUsername: 'Burn',
      obkUsername: 'Burn'
    });
    await burnTransaction.save();

    if (totalWinningBets === 0) {
      const netPoolPerAdmin = Math.floor(netPool / adminUsers.length);
      for (const admin of adminUsers) {
        admin.bpBalance += netPoolPerAdmin;
        await admin.save();
      }
    } else {
      for (const transaction of transactions) {
        if (transaction.competitorName === winner) {
          const user = await User.findOne({ uid: transaction.userId });
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
              obkUsername: user.obkUsername
            });
            await payoutTransaction.save();
            await user.save();
          }
        }
      }
    }

    market.status = 'closed';
    market.winner = winner;
    await market.save();

    res.status(200).json(market);
  } catch (error) {
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
  const { marketId } = req.params;
  const { userId, amount, competitorName = '' } = req.body;
  if (userId !== req.user.uid) {
    return res.status(403).json({ message: 'Forbidden: Cannot perform this action for another user' });
  }
  try {
    const market = await Market.findById(marketId);
    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }

    if (market.status !== 'open') {
      return res.status(400).json({ message: 'Cannot place bet. Market is not open.' });
    }

    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.bpBalance < amount || amount <= 0) {
      return res.status(400).json({ message: 'Insufficient balance or invalid amount' });
    }

    // Deduct the amount from user balance
    user.bpBalance = user.bpBalance - amount;
    await user.save();

    if (competitorName) {
      const competitor = market.competitors.find(c => c.name === competitorName);
      if (!competitor) {
        return res.status(404).json({ message: 'Competitor not found' });
      }
      // Update the competitor's value
      competitor.value += amount;
    }
    await market.save();

    // Create a new transaction document
    const newTransaction = new Transaction({
      userId,
      amount: -amount,
      marketId,
      competitorName,
      status: 'approved',
      discordUsername: user.discordUsername,
      obkUsername: user.obkUsername
    });

    await newTransaction.save();
    console.log("Transaction saved successfully");

    res.status(200).json({ message: 'Bet placed successfully' });
  } catch (error) {
    console.error('Error placing bet:', error.message);
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


module.exports = { createMarket, getMarkets, pauseMarket, resumeMarket, closeMarket, getMarketById, placeBet, getBetTransactions };
