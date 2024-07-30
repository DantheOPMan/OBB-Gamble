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
    // Get all completed hands
    const hands = await BlackjackHand.find({ status: 'completed' });

    // Calculate total wagered and returned for player hands
    const playerStats = hands.reduce((stats, hand) => {
      hand.playerHands.forEach(playerHand => {
        stats.totalWagered += playerHand.bpCharged;
        stats.totalReturned += playerHand.payout || 0;
      });
      return stats;
    }, { totalWagered: 0, totalReturned: 0 });

    // Get admin claim hands
    const adminClaimHands = await BlackjackHand.find({ status: 'adminClaim' });

    // Calculate total admin claimed
    const totalAdminClaimed = adminClaimHands.reduce((sum, hand) => {
      return sum + hand.playerHands.reduce((handSum, playerHand) => handSum + playerHand.payout, 0);
    }, 0);

    // Calculate net amount (profit before admin claim)
    const netAmount = playerStats.totalWagered - playerStats.totalReturned;

    res.status(200).json({
      handCount: hands.length,
      totalWagered: parseFloat(playerStats.totalWagered.toFixed(1)),
      totalReturned: parseFloat(playerStats.totalReturned.toFixed(1)),
      netAmount: parseFloat(netAmount.toFixed(1)),
      totalAdminClaimed: parseFloat(totalAdminClaimed.toFixed(1)),
    });
  } catch (error) {
    console.error('Error fetching blackjack stats:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPlinkoResults, getBurnTransactions, getBlackjackStats };
