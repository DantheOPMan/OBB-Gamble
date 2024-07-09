const Plinko = require('../models/plinkoModel');
const Transaction = require('../models/transactionModel');
const BlackjackHand = require('../models/blackjackHandModel');

// Function to get Plinko results
const getPlinkoResults = async (req, res) => {
  try {
    const results = await Plinko.find({});

    // Filter out transactions related to 'burn' and 'adminClaim'
    const filteredResults = results.filter(transaction => transaction.userId !== 'burn' && transaction.userId !== 'adminClaim');

    const totalWagered = filteredResults.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0).toFixed(1);
    const totalReturned = filteredResults.reduce((sum, transaction) => sum + parseFloat(transaction.result), 0).toFixed(1);
    const netAmount = (totalWagered - totalReturned).toFixed(1);

    const adminClaimedTransactions = results.filter(transaction => transaction.userId === 'adminClaim');
    const totalAdminClaimed = adminClaimedTransactions.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0).toFixed(1);

    res.status(200).json({
      transactionCount: filteredResults.length,
      totalWagered: parseFloat(totalWagered),
      totalReturned: parseFloat(totalReturned),
      netAmount: parseFloat(netAmount),
      totalAdminClaimed: parseFloat(totalAdminClaimed)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Function to get burn transactions
const getBurnTransactions = async (req, res) => {
  try {
    const burnTransactions = await Transaction.find({ competitorName: 'Burn' });
    
    const totalBurned = burnTransactions.reduce((sum, transaction) => sum + transaction.amount, 0).toFixed(1);

    res.status(200).json({
      transactionCount: burnTransactions.length,
      totalBurned: parseFloat(totalBurned),
      transactions: burnTransactions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getBlackjackStats = async (req, res) => {
  try {
    const hands = await BlackjackHand.find({ status: 'completed' });

    const totalWagered = hands.reduce((sum, hand) => {
      return sum + hand.playerHands.reduce((handSum, playerHand) => handSum + playerHand.bpCharged, 0);
    }, 0).toFixed(1);

    const totalReturned = hands.reduce((sum, hand) => {
      return sum + hand.playerHands.reduce((handSum, playerHand) => handSum + (playerHand.payout || 0), 0);
    }, 0).toFixed(1);

    const netAmount = (totalWagered - totalReturned).toFixed(1);

    res.status(200).json({
      handCount: hands.length,
      totalWagered: parseFloat(totalWagered),
      totalReturned: parseFloat(totalReturned),
      netAmount: parseFloat(netAmount),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPlinkoResults, getBurnTransactions, getBlackjackStats };
