const Plinko = require('../models/plinkoModel');
const User = require('../models/userModel');

const numBuckets = 15;
const stdDev = 1.9;
const multipliers = [100, 20, 8, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 8, 20, 100];

// Helper function to generate a random number from a custom distribution
function customDistribution() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Function to calculate odds and expected return
function calculateOddsAndReturn(numBuckets, stdDev) {
  const mean = (numBuckets - 1) / 2;
  const odds = [];
  let totalProbability = 0;
  let expectedReturn = 0;

  for (let i = 0; i < numBuckets; i++) {
    const z = (i - mean) / stdDev;
    const probability = Math.exp(-0.5 * z * z);
    odds.push(probability);
    totalProbability += probability;
  }

  // Normalize probabilities to sum to 1
  for (let i = 0; i < numBuckets; i++) {
    odds[i] /= totalProbability;
    expectedReturn += odds[i] * multipliers[i];
  }

  // Round expected return to 1 decimal place
  expectedReturn = expectedReturn.toFixed(3);

  return { odds, expectedReturn };
}

// Main function to play Plinko
const playPlinko = async (req, res) => {
  const { userId, amount } = req.body;

  if (userId !== req.user.uid) {
    return res.status(403).json({ message: 'Forbidden: Cannot perform this action for another user' });
  }

  try {
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.bpBalance < amount || amount <= 0) {
      return res.status(400).json({ message: 'Insufficient balance or invalid amount' });
    }

    // Deduct the amount from user balance
    user.bpBalance -= amount;
    await user.save();

    // Simulate the Plinko result using a custom distribution
    const mean = (numBuckets - 1) / 2; // Center bucket
    let position = Math.round(customDistribution() * stdDev + mean);
    position = Math.max(0, Math.min(position, numBuckets - 1)); // Ensure position is within bounds

    const multiplier = multipliers[position];
    const winnings = (amount * multiplier).toFixed(1); // Round winnings to 1 decimal place

    // Update user balance with winnings
    user.bpBalance += parseFloat(winnings); // Convert back to number for accuracy
    await user.save();

    const newPlinkoResult = new Plinko({ userId, amount, result: winnings, position });
    await newPlinkoResult.save();

    res.status(200).json({ result: winnings, position, multiplier, message: 'Bet placed successfully' });
  } catch (error) {
    console.error('Error playing Plinko:', error.message);
    res.status(500).json({ message: error.message });
  }
};

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

module.exports = { playPlinko, getPlinkoResults };
