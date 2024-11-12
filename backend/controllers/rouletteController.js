const RouletteRound = require('../models/rouletteRoundModel');
const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { verifyFirebaseToken } = require('../middleware/auth');

let currentRound = null;
let bettingTimeout = null;
let outcomeTimeout = null;
let ioInstance = null;
let isClosing = false;

// Initialize Roulette with Socket.io instance
const initializeRoulette = (io) => {
  ioInstance = io;
  console.log('Roulette initialized with Socket.io instance.');

  // Apply authentication middleware
  ioInstance.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    try {
      const user = await verifyFirebaseToken(token);
      socket.user = user; // Attach user to socket instance
      next();
    } catch (err) {
      console.error('Socket authentication error:', err.message);
      next(new Error('Authentication error'));
    }
  });

  ioInstance.on('connection', async (socket) => {
    const userId = socket.user.uid; // Securely obtained from authenticated user
    socket.join(userId);
    console.log(`User connected: ${userId}`);

    // Send current round info to the newly connected client
    if (currentRound && currentRound.isActive) {
      const bettingDuration = 30000; // 30 seconds
      const elapsedTime = Date.now() - currentRound.startTime.getTime();
      const timeRemaining = Math.max(Math.floor((bettingDuration - elapsedTime) / 1000), 0);

      socket.emit('rouletteNewRound', {
        roundId: currentRound.roundId,
        startTime: currentRound.startTime,
        bets: currentRound.bets,
        isActive: currentRound.isActive,
        timeRemaining,
      });
    }

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};

// Start a new roulette round
const startNewRound = async (session = null) => {
  if (isClosing) {
    console.log('Currently closing a round. Cannot start a new round.');
    return;
  }
  const localSession = session || await mongoose.startSession();
  if (!session) {
    localSession.startTransaction();
  }

  try {
    const existingActiveRound = await RouletteRound.findOne({ isActive: true }).session(localSession);

    if (existingActiveRound) {
      currentRound = existingActiveRound;
      console.log(`Found existing active round: ${currentRound.roundId}`);
    } else {
      const newRoundId = uuidv4();
      currentRound = new RouletteRound({
        roundId: newRoundId,
        startTime: new Date(),
        bets: [],
        isActive: true,
      });

      await currentRound.save({ session: localSession });
      console.log(`Started new roulette round: ${currentRound.roundId}`);
    }

    const bettingDuration = 30000; // 30 seconds
    const timeRemaining = Math.max(Math.floor((bettingDuration - (Date.now() - currentRound.startTime)) / 1000), 0);

    if (!session) {
      await localSession.commitTransaction();
    }

    ioInstance.emit('rouletteNewRound', {
      roundId: currentRound.roundId,
      startTime: currentRound.startTime,
      bets: currentRound.bets,
      isActive: currentRound.isActive,
      timeRemaining,
    });

    if (bettingTimeout) clearTimeout(bettingTimeout);
    bettingTimeout = setTimeout(closeBetting, bettingDuration);
    return currentRound;
  } catch (error) {
    if (!session) {
      await localSession.abortTransaction();
    }
    console.error('Error starting new roulette round:', error);
    throw error;
  } finally {
    if (!session) {
      localSession.endSession();
    }
  }
};


const closeBetting = async () => {
  if (!currentRound || isClosing) return;
  isClosing = true;

  try {
    currentRound.isActive = false;
    await currentRound.save();
    clearTimeout(bettingTimeout);

    ioInstance.emit('rouletteBettingClosed', { roundId: currentRound.roundId });

    await determineOutcome();
  } catch (error) {
    console.error('Error in closeBetting:', error);
  } finally {
    isClosing = false;
  }
};


// Determine the outcome and process payouts
const determineOutcome = async () => {
  try {
    if (!currentRound) {
      console.warn('determineOutcome called but currentRound is null');
      return;
    }
    console.log("Determining outcome");

    // Generate a winning number between 0 and 36
    const winningNumber = Math.floor(Math.random() * 37);
    currentRound.winningNumber = winningNumber;
    currentRound.outcomeTime = new Date();
    await currentRound.save();
    clearTimeout(outcomeTimeout);

    ioInstance.emit('rouletteOutcome', {
      roundId: currentRound.roundId,
      winningNumber,
    });

    console.log(`Round Outcome - ID: ${currentRound.roundId}, Winning Number: ${winningNumber}`);

    setTimeout(async () => {
      // Process bets and update user balances
      await processPayouts(currentRound);
      ioInstance.emit('rouletteRoundEnded', { roundId: currentRound.roundId });

      outcomeTimeout = setTimeout(() => {
        console.log(`Round ${currentRound.roundId} has been ended and reset.`);
        currentRound = null;
        ioInstance.emit('rouletteRoundReset', { roundId: null });
      }, 10000);
    }, 10000);
  } catch (error) {
    console.error('Error in determineOutcome:', error);
  }
};


const processPayouts = async (round) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Group bets by userId
    const betsByUser = round.bets.reduce((acc, bet) => {
      acc[bet.userId] = acc[bet.userId] || [];
      acc[bet.userId].push(bet);
      return acc;
    }, {});

    let roundTotalPayout = 0; // Initialize total payout for the round

    const dozenMappings = {
      first: [1, 2, 3, 4, 13, 14, 15, 16, 25, 26, 27, 28],
      second: [5, 6, 7, 8, 17, 18, 19, 20, 29, 30, 31, 32],
      third: [9, 10, 11, 12, 21, 22, 23, 24, 33, 34, 35, 36],
    };

    const columnMappings = {
      first: Array.from({ length: 12 }, (_, i) => i + 1),   // 1-12
      second: Array.from({ length: 12 }, (_, i) => i + 13), // 13-24
      third: Array.from({ length: 12 }, (_, i) => i + 25),  // 25-36
    };

    // Process each user's bets
    for (const userId in betsByUser) {
      const userBets = betsByUser[userId];
      const user = await User.findOne({ uid: userId }).session(session);
      if (!user) continue;

      let totalPayout = 0;

      // Process all bets for this user
      for (const bet of userBets) {
        let won = false;
        let payout = 0;

        // Determine if the bet wins
        const winningNumber = round.winningNumber;
        const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

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
            if (bet.betValue in dozenMappings && dozenMappings[bet.betValue].includes(winningNumber)) {
              won = true;
              payout = bet.betAmount * 2;
            }
            break;
          case 'column':
            if (bet.betValue in columnMappings && columnMappings[bet.betValue].includes(winningNumber)) {
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
          totalPayout += payout + bet.betAmount; // Return bet amount plus winnings
        }
      }

      // Update user's balance once after processing all bets
      user.bpBalance += totalPayout;
      await user.save({ session });

      const payoutTransaction = new Transaction({
        userId: 'rouletteController', 
        targetUserId: user.uid,
        amount: totalPayout,
        marketId: round._id, 
        competitorName: 'RoulettePayout',
        status: 'approved',
        discordUsername: user.discordUsername || '',
        obkUsername: user.obkUsername || '',
      });
      await payoutTransaction.save({ session });

      // Emit total payout for the user
      ioInstance.to(userId).emit('rouletteTotalPayout', {
        roundId: round.roundId,
        totalPayout,
        newBalance: user.bpBalance,
      });
      console.log(`${user.obkUsername} total payout: ${totalPayout}`);

      // Accumulate total payout for the round
      roundTotalPayout += totalPayout;
    }

    // Update the round with totalPayout
    round.totalPayout = roundTotalPayout;
    await round.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Emit round ended event
    ioInstance.emit('rouletteRoundEnded', { roundId: round.roundId });
    console.log(`Round ${round.roundId} has been ended and reset.`);
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
    console.log("Placing bet");

    // Start or resume a round atomically
    if (currentRound == null) {
      await startNewRound(session); // Pass the session to ensure consistency
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
    console.log(`Bet placed: Amount: ${betAmount}, Type: ${betType}, Value: ${betValue}`);

    const betTransaction = new Transaction({
      userId: user.uid,
      targetUserId: 'rouletteController', 
      amount: betAmount,
      marketId: currentRound._id, 
      competitorName: 'RouletteBet',
      status: 'approved',
      discordUsername: user.discordUsername || '',
      obkUsername: user.obkUsername || '',
    });
    await betTransaction.save({ session });

    // Store the username for convenience
    const username = user.discordUsername || user.obkUsername || user.email;

    const bet = {
      userId,
      username,
      betAmount,
      betType,
      betValue,
    };

    // Atomically add the bet to the current round in both database and in-memory
    await RouletteRound.findOneAndUpdate(
      { _id: currentRound._id },
      { $push: { bets: bet } },
      { session, new: true } // new: true returns the updated document
    ).then(updatedRound => {
      if (updatedRound && updatedRound.isActive) {
        currentRound = updatedRound; // Update in-memory with the latest data
      }
    });


    console.log(`Current roulette round ID: ${currentRound._id}`);

    await session.commitTransaction();
    session.endSession();

    ioInstance.emit('rouletteNewBet', {
      roundId: currentRound.roundId,
      bet,
      currentBets: currentRound.bets, // Now includes the newly added bet
    });

    res.status(200).json({ message: 'Bet placed successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error placing roulette bet:', error);
    res.status(500).json({ message: error.message });
  }
};

const getCurrentRound = async (req, res) => {
  try {
    const currentRound = await RouletteRound.findOne({ isActive: true });
    if (!currentRound) {
      return res.status(200).json({ message: 'No active round' });
    }

    // Calculate time remaining
    const bettingDuration = 30000; // 30 seconds
    const elapsedTime = Date.now() - currentRound.startTime.getTime();
    const timeRemaining = Math.max(Math.floor((bettingDuration - elapsedTime) / 1000), 0);

    res.status(200).json({
      roundId: currentRound.roundId,
      startTime: currentRound.startTime,
      bets: currentRound.bets,
      isActive: currentRound.isActive,
      timeRemaining,
    });
  } catch (error) {
    console.error('Error fetching current round:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
const initializeCurrentRound = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Fetch the active round within the session
    const activeRound = await RouletteRound.findOne({ isActive: true }).session(session);
    
    if (activeRound) {
      currentRound = activeRound;
      console.log(`Loaded active round: ${currentRound.roundId}`);

      // Calculate remaining time and set the betting timeout if necessary
      const bettingDuration = 30000; // 30 seconds
      const elapsedTime = Date.now() - currentRound.startTime.getTime();
      const timeRemaining = bettingDuration - elapsedTime;

      if (timeRemaining > 0) {
        bettingTimeout = setTimeout(() => {
          closeBetting(session);
        }, timeRemaining);
        console.log(`Betting will close in ${Math.floor(timeRemaining / 1000)} seconds.`);
      } else if (activeRound.winningNumber === undefined) {
        // If betting time has passed but outcome hasn't been determined
        closeBetting(session);
      } else {
        // Outcome already determined, reset the round
        currentRound = null;
        ioInstance.emit('rouletteRoundReset', { roundId: null });
        console.log('Active round has already been processed. Resetting.');
      }
    } else {
      console.log('No active round found. Waiting for the first bet to start a new round.');
    }

    // Commit the transaction if all operations are successful
    await session.commitTransaction();
  } catch (error) {
    // If any error occurs, abort the transaction
    await session.abortTransaction();
    console.error('Error initializing current round:', error);
  } finally {
    // End the session
    session.endSession();
  }
};

initializeCurrentRound();

const getRouletteStats = async (req, res) => {
  try {
    // Total number of roulette rounds
    const totalRounds = await RouletteRound.countDocuments();

    // Total amount bet
    const totalBetsAgg = await RouletteRound.aggregate([
      { $unwind: '$bets' },
      { $group: { _id: null, totalBets: { $sum: '$bets.betAmount' } } },
    ]);
    const totalBets = totalBetsAgg[0] ? totalBetsAgg[0].totalBets : 0;

    // Total amount returned
    const totalReturnedAgg = await RouletteRound.aggregate([
      { $match: { winningNumber: { $exists: true } } },
      { $group: { _id: null, totalReturned: { $sum: '$totalPayout' } } },
    ]);
    const totalReturned = totalReturnedAgg[0] ? totalReturnedAgg[0].totalReturned : 0;

    // Net profit
    const netAmount = totalBets - totalReturned;

    // Total admin claimed (assuming 'AdminProfitRoulette' transactions are used)
    const adminClaimedAgg = await Transaction.aggregate([
      { $match: { competitorName: 'AdminProfitRoulette' } },
      { $group: { _id: null, totalAdminClaimed: { $sum: '$amount' } } },
    ]);
    const totalAdminClaimed = adminClaimedAgg[0] ? adminClaimedAgg[0].totalAdminClaimed : 0;

    res.status(200).json({
      totalRounds,
      totalBets,
      totalReturned: totalReturned.toFixed(1),
      netAmount: netAmount.toFixed(1),
      totalAdminClaimed: totalAdminClaimed.toFixed(1),
    });
  } catch (error) {
    console.error('Error fetching roulette stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Function to claim Roulette Profits
const claimRouletteProfits = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Calculate total bets and total payouts
    const totalBetsAgg = await RouletteRound.aggregate([
      { $unwind: '$bets' },
      { $group: { _id: null, totalBets: { $sum: '$bets.betAmount' } } },
    ]);
    const totalBets = totalBetsAgg[0] ? totalBetsAgg[0].totalBets : 0;

    const totalReturnedAgg = await RouletteRound.aggregate([
      { $match: { winningNumber: { $exists: true } } },
      { $group: { _id: null, totalReturned: { $sum: '$totalPayout' } } },
    ]);
    const totalReturned = totalReturnedAgg[0] ? totalReturnedAgg[0].totalReturned : 0;

    const netProfits = totalBets - totalReturned;

    if (netProfits <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'No profits to claim' });
    }

    // Calculate burn amount and net profits after burn
    const burnAmount = netProfits * 0.2;
    const netProfitsAfterBurn = netProfits - burnAmount;

    // Get all admin users
    const adminUsers = await User.find({ role: 'admin' }).session(session);
    if (adminUsers.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'No admin users found to distribute profits' });
    }

    const adminProfitPerUser = netProfitsAfterBurn / adminUsers.length;

    // Distribute profits to admin users
    for (const admin of adminUsers) {
      // Create a transaction for each admin
      const adminTransaction = new Transaction({
        userId: 'rouletteController', // Source of funds
        targetUserId: admin.uid, // Admin's ID
        amount: adminProfitPerUser,
        marketId: null, // No specific round associated
        competitorName: 'AdminProfitRoulette',
        status: 'approved',
        discordUsername: admin.discordUsername || '',
        obkUsername: admin.obkUsername || '',
      });
      await adminTransaction.save({ session });

      // Update admin's balance
      admin.bpBalance += adminProfitPerUser;
      await admin.save({ session });
    }

    // Create a burn transaction
    const burnTransaction = new Transaction({
      userId: 'rouletteController', // Source of funds
      targetUserId: 'burn', // Represents the burn
      amount: burnAmount,
      marketId: null,
      competitorName: 'BurnRoulette',
      status: 'approved',
      discordUsername: 'Burn',
      obkUsername: 'Burn',
    });
    await burnTransaction.save({ session });

    // Create a transaction for net profits after burn (if needed)
    // This depends on how you want to track net profits in your system

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: 'Roulette profits claimed successfully',
      netProfits: netProfits.toFixed(1),
      burnAmount: burnAmount.toFixed(1),
      netProfitsAfterBurn: netProfitsAfterBurn.toFixed(1),
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error claiming roulette profits:', error.message);
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
  initializeRoulette,
  placeBet,
  getCurrentRound,
  getRouletteStats,
  claimRouletteProfits,
};
