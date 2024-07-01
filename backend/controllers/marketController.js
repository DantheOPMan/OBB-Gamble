const Market = require('../models/marketModel');
const User = require('../models/userModel');

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

const closeMarket = async (req, res) => {
  const { marketId } = req.params;
  const { winner } = req.body;

  try {
    const market = await Market.findById(marketId);
    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }

    market.status = 'closed';
    market.winner = winner;
    await market.save();

    // Handle reward calculations here
    // ...

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
  const { userId, amount } = req.body;

  try {
    const market = await Market.findById(marketId);
    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }

    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.bpBalance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Handle bet placement and update market values
    // ...

    res.status(200).json({ message: 'Bet placed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createMarket, getMarkets, closeMarket, getMarketById, placeBet };
