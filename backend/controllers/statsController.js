const Plinko = require('../models/plinkoModel');
const Transaction = require('../models/transactionModel');

// Function to get Plinko results
const getPlinkoResults = async (req, res) => {
  try {
    const results = await Plinko.find({});
    
    const totalWagered = results.reduce((sum, transaction) => sum + transaction.amount, 0).toFixed(1);
    const totalReturned = results.reduce((sum, transaction) => sum + transaction.result, 0).toFixed(1);
    const netAmount = (totalWagered - totalReturned).toFixed(1);

    res.status(200).json({
      transactionCount: results.length,
      totalWagered: parseFloat(totalWagered),
      totalReturned: parseFloat(totalReturned),
      netAmount: parseFloat(netAmount)
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

module.exports = { getPlinkoResults, getBurnTransactions };
