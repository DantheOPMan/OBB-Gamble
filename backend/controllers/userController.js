const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');

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

module.exports = {
  registerUser,
  getUser,
  updateUser,
  getUsers,
  getUserTransactions,
};
