const RouletteRound = require('../models/rouletteRoundModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

let currentRound = null;
let bettingTimeout = null;
let outcomeTimeout = null;
let ioInstance = null;

// Initialize Roulette with Socket.io instance
const initializeRoulette = (io) => {
  ioInstance = io;
  // Remove the immediate start of a new round
  // startNewRound();

  ioInstance.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.join(userId);
    }
  });
};

// Start a new roulette round
const startNewRound = () => {
  const roundId = uuidv4();
  currentRound = new RouletteRound({
    roundId,
    startTime: new Date(),
    bets: [],
  });

  currentRound.save();

  ioInstance.emit('rouletteNewRound', { roundId, startTime: currentRound.startTime });

  // Betting remains open until closeBetting is called
};

// Close betting and prepare for outcome
const closeBetting = () => {
  if (!currentRound) return;

  currentRound.isActive = false;
  currentRound.save();

  ioInstance.emit('rouletteBettingClosed', { roundId: currentRound.roundId });

  // Wait 10 seconds before determining outcome
  outcomeTimeout = setTimeout(() => {
    determineOutcome();
  }, 10000);
};

// Determine the outcome and process payouts
const determineOutcome = async () => {
  if (!currentRound) return;

  // Generate a winning number between 0 and 36
  const winningNumber = Math.floor(Math.random() * 37);
  currentRound.winningNumber = winningNumber;
  currentRound.outcomeTime = new Date();
  await currentRound.save();

  ioInstance.emit('rouletteOutcome', {
    roundId: currentRound.roundId,
    winningNumber,
  });

  // Process bets and update user balances
  await processPayouts(currentRound);

  // Reset currentRound to null so that a new round starts when the next bet is placed
  currentRound = null;
};

// Process payouts for the round
const processPayouts = async (round) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const bet of round.bets) {
      const user = await User.findOne({ uid: bet.userId }).session(session);
      if (!user) continue;

      let won = false;
      let payout = 0;

      // Determine if the bet wins
      const winningNumber = round.winningNumber;
      const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
      const blackNumbers = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

      switch (bet.betType) {
        case 'number':
          if (bet.betValue === winningNumber) {
            won = true;
            payout = bet.betAmount * 35;
          }
          break;

        case 'split':
          if (bet.betValue.includes(winningNumber)) {
            won = true;
            payout = bet.betAmount * 17;
          }
          break;

        case 'street':
          if (bet.betValue.includes(winningNumber)) {
            won = true;
            payout = bet.betAmount * 11;
          }
          break;

        case 'corner':
          if (bet.betValue.includes(winningNumber)) {
            won = true;
            payout = bet.betAmount * 8;
          }
          break;

        case 'line':
          if (bet.betValue.includes(winningNumber)) {
            won = true;
            payout = bet.betAmount * 5;
          }
          break;

        case 'dozen':
          if (
            (bet.betValue === 'first' && winningNumber >= 1 && winningNumber <= 12) ||
            (bet.betValue === 'second' && winningNumber >= 13 && winningNumber <= 24) ||
            (bet.betValue === 'third' && winningNumber >= 25 && winningNumber <= 36)
          ) {
            won = true;
            payout = bet.betAmount * 2;
          }
          break;

        case 'column':
          if (
            (bet.betValue === 'first' && winningNumber !== 0 && winningNumber % 3 === 1) ||
            (bet.betValue === 'second' && winningNumber % 3 === 2) ||
            (bet.betValue === 'third' && winningNumber !== 0 && winningNumber % 3 === 0)
          ) {
            won = true;
            payout = bet.betAmount * 2;
          }
          break;

        case 'evenOdd':
          if (
            (bet.betValue === 'even' && winningNumber !== 0 && winningNumber % 2 === 0) ||
            (bet.betValue === 'odd' && winningNumber !== 0 && winningNumber % 2 === 1)
          ) {
            won = true;
            payout = bet.betAmount * 1;
          }
          break;

        case 'color':
          if (
            (bet.betValue === 'red' && redNumbers.includes(winningNumber)) ||
            (bet.betValue === 'black' && blackNumbers.includes(winningNumber))
          ) {
            won = true;
            payout = bet.betAmount * 1;
          }
          break;

        case 'half':
          if (
            (bet.betValue === 'low' && winningNumber >= 1 && winningNumber <= 18) ||
            (bet.betValue === 'high' && winningNumber >= 19 && winningNumber <= 36)
          ) {
            won = true;
            payout = bet.betAmount * 1;
          }
          break;

        default:
          // Handle any other bet types
          break;
      }

      if (won) {
        user.bpBalance += payout + bet.betAmount; // Return bet amount plus winnings
        await user.save({ session });
      }

      // Emit result to the user
      ioInstance.to(bet.userId).emit('rouletteBetResult', {
        roundId: round.roundId,
        bet,
        won,
        payout: won ? payout + bet.betAmount : 0,
        newBalance: user.bpBalance,
      });
    }

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error processing roulette payouts:', error);
  }
};

// Handle placing a bet
const placeBet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { betAmount, betType, betValue } = req.body;
    const userId = req.user.uid;

    // If there's no active round, start a new round
    if (!currentRound) {
      startNewRound();

      // Start the betting timeout to close betting before outcome
      // Betting remains open until 10 seconds before the outcome
      bettingTimeout = setTimeout(() => {
        closeBetting();
      }, 20000); // Adjust this duration as needed
    }

    if (!currentRound || !currentRound.isActive) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Betting is closed' });
    }

    const user = await User.findOne({ uid: userId }).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.bpBalance < betAmount || betAmount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Insufficient balance or invalid amount' });
    }

    // Deduct the bet amount from user's balance
    user.bpBalance -= betAmount;
    await user.save({ session });

    // Store the username for convenience
    const username = user.discordUsername || user.obkUsername || user.email;

    const bet = {
      userId,
      username,
      betAmount,
      betType,
      betValue,
    };

    currentRound.bets.push(bet);
    await currentRound.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Notify others about the new bet
    ioInstance.emit('rouletteNewBet', {
      roundId: currentRound.roundId,
      bet,
    });

    res.status(200).json({ message: 'Bet placed successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error placing roulette bet:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  initializeRoulette,
  placeBet,
};
