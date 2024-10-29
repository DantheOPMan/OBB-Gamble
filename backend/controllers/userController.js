const Plinko = require('../models/plinkoModel');
const BlackjackHand = require('../models/blackjackHandModel');
const PokerHandTransaction = require('../models/pokerHandTransactionModel');
const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');

const registerUser = async (req, res) => {
  const { uid, email } = req.body;

  try {
    let user = await User.findOne({ uid });

    if (!user) {
      user = new User({ uid, email });
      await user.save();
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUser = async (req, res) => {
  const { uid } = req.params;
  if (uid !== req.user.uid && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Cannot access another user\'s data' });
  }
  try {
    const user = await User.findOne({ uid });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  const { uid } = req.params;
  const { discordUsername, obkUsername } = req.body;
  if (uid !== req.user.uid) {
    return res.status(403).json({ message: 'Forbidden: Cannot update another user\'s data' });
  }
  try {
    const user = await User.findOneAndUpdate(
      { uid },
      { discordUsername, obkUsername },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'uid username discordUsername obkUsername'); // Select only necessary fields
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserTransactions = async (req, res) => {
  const { uid } = req.params;

  if (uid !== req.user.uid && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Cannot access another user\'s transactions' });
  }
  
  try {
    const transactions = await Transaction.find({ userId: uid });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserStats = async (req, res) => {
  const { uid } = req.params;

  // Ensure the user is authorized to access these stats
  if (uid !== req.user.uid && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Cannot access another user\'s data' });
  }

  try {
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // **Total Gambled**

    // Plinko: Sum of 'amount' (amounts bet)
    const plinkoResults = await Plinko.find({ userId: uid });
    const totalPlinkoGambled = plinkoResults.reduce((sum, result) => sum + parseFloat(result.amount), 0);

    // Blackjack: Sum of 'bpCharged' in 'playerHands'
    const blackjackHands = await BlackjackHand.find({ userId: user._id });
    const totalBlackjackGambled = blackjackHands.reduce((sum, hand) => {
      return sum + hand.playerHands.reduce((handSum, playerHand) => handSum + playerHand.bpCharged, 0);
    }, 0);

    // Poker: Sum of 'betAmount' in 'PokerHandTransaction's
    const pokerTransactions = await PokerHandTransaction.find({ 'players.uid': uid });
    const totalPokerGambled = pokerTransactions.reduce((sum, handTransaction) => {
      const player = handTransaction.players.find(p => p.uid === uid);
      return sum + (player ? player.betAmount : 0);
    }, 0);

    const totalGambled = totalPlinkoGambled + totalBlackjackGambled + totalPokerGambled;

    // **Total Won**

    // Plinko: Sum of 'result' (amounts won)
    const totalPlinkoWon = plinkoResults.reduce((sum, result) => sum + parseFloat(result.result), 0);

    // Blackjack: Sum of 'payout' in 'playerHands'
    const totalBlackjackWon = blackjackHands.reduce((sum, hand) => {
      return sum + hand.playerHands.reduce((handSum, playerHand) => handSum + (playerHand.payout || 0), 0);
    }, 0);

    // Poker: Sum of 'winnings' in 'PokerHandTransaction's
    const totalPokerWon = pokerTransactions.reduce((sum, handTransaction) => {
      const player = handTransaction.players.find(p => p.uid === uid);
      return sum + (player ? player.winnings : 0);
    }, 0);

    const totalWon = totalPlinkoWon + totalBlackjackWon + totalPokerWon;

    // **Total Tipped**

    // Transactions where userId is uid, targetUserId is not null, and status is 'approved'
    const tipTransactions = await Transaction.find({
      userId: uid,
      targetUserId: { $ne: null },
      status: 'approved',
    });

    const totalTipped = tipTransactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

    // Respond with the computed stats
    res.status(200).json({
      totalGambled,
      totalWon,
      totalTipped,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registerUser,
  getUser,
  updateUser,
  getUsers,
  getUserTransactions,
  getUserStats,
};
