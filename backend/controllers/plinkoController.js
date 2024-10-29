const Plinko = require('../models/plinkoModel');
const User = require('../models/userModel');
const Transaction = require('../models/transactionModel'); 

const numBuckets = 15;
const stdDev = 1.994;
const multipliers = [100, 20, 8, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 8, 20, 100];

// Helper function to generate a random number from a custom distribution
function customDistribution() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Function to run Plinko simulation
function runPlinkoSimulation(numSimulations) {
  const results = Array(numBuckets).fill(0);

  for (let i = 0; i < numSimulations; i++) {
    const mean = (numBuckets - 1) / 2; // Center bucket
    let position = Math.round(customDistribution() * stdDev + mean);
    position = Math.max(0, Math.min(position, numBuckets - 1)); // Ensure position is within bounds

    results[position]++;
  }

  const probabilities = results.map(count => count / numSimulations);
  const empiricalExpectedReturn = probabilities.reduce((sum, prob, index) => sum + prob * multipliers[index], 0).toFixed(3);

  console.log('Empirical Probabilities:', probabilities);
  console.log('Empirical Expected Return:', empiricalExpectedReturn);
}

// Run the simulation 10 million times when the code is initialized
runPlinkoSimulation(10000000);

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

    // Round the user balance to 1 decimal place
    user.bpBalance = parseFloat(user.bpBalance.toFixed(1));
    
    await user.save();

    const newPlinkoResult = new Plinko({ userId, amount, result: winnings, position });
    await newPlinkoResult.save();

    res.status(200).json({ result: winnings, position, multiplier, message: 'Bet placed successfully' });
  } catch (error) {
    console.error('Error playing Plinko:', error.message);
    res.status(500).json({ message: error.message });
  }
};

const claimProfits = async (req, res) => {
  try {
    // Get all Plinko results
    const results = await Plinko.find({});

    // Calculate total wagered and total returned
    const totalWagered = results.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);
    const totalReturned = results.reduce((sum, transaction) => sum + parseFloat(transaction.result), 0);
    const netProfits = totalWagered - totalReturned;

    if (netProfits <= 0) {
      return res.status(400).json({ message: 'No profits to claim' });
    }

    // Calculate burn amount and net profits after burn
    const burnAmount = netProfits * 0.2;
    const netProfitsAfterBurn = netProfits - burnAmount;

    // Get all admin users
    const adminUsers = await User.find({ role: 'admin' });
    if (adminUsers.length === 0) {
      return res.status(400).json({ message: 'No admin users found to distribute profits' });
    }
    const adminProfitPerUser = netProfitsAfterBurn / adminUsers.length;

    // Create transactions for burn and distribute profits to admins
    for (const admin of adminUsers) {
      // Admin profit transaction
      const adminTransaction = new Transaction({
        userId: admin.uid,
        amount: adminProfitPerUser,
        marketId: null,
        competitorName: 'AdminProfit',
        status: 'approved',
        discordUsername: admin.discordUsername,
        obkUsername: admin.obkUsername
      });
      admin.bpBalance += adminProfitPerUser;
      await adminTransaction.save();
      await admin.save();
    }

    // Burn transaction
    const burnTransaction = new Transaction({
      userId: 'burn',
      amount: burnAmount,
      marketId: null,
      competitorName: 'Burn',
      status: 'approved',
      discordUsername: 'Burn',
      obkUsername: 'Burn'
    });
    await burnTransaction.save();

    // Create Plinko transaction to subtract the claimed profits
    const plinkoTransaction = new Plinko({
      userId: 'adminClaim',
      amount: -netProfits,
      result: 0,
      position: 0,
    });
    await plinkoTransaction.save();

    res.status(200).json({ message: 'Profits claimed successfully', netProfits, burnAmount, netProfitsAfterBurn });
  } catch (error) {
    console.error('Error claiming profits:', error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { playPlinko, claimProfits };
