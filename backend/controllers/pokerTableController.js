const mongoose = require('mongoose');
const User = require('../models/userModel');
const PokerTable = require('../models/pokerTableModel');
const PokerHandTransaction = require('../models/pokerHandTransactionModel');
const Transaction = require('../models/transactionModel');
const pokerEvaluator = require('poker-evaluator');
const admin = require('firebase-admin');

const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];

const createDeck = () => {
    let deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ value, suit });
        }
    }
    return deck;
};

const shuffleDeck = (deck) => {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

const dealCards = (deck, numberOfPlayers) => {
    let hands = Array(numberOfPlayers).fill().map(() => []);
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < numberOfPlayers; j++) {
            hands[j].push(deck.pop());
        }
    }
    return hands;
};

const determineWinningHand = (players, boardCards) => {
    let bestHand = null;
    let bestPlayers = [];

    players.forEach(player => {
        if (player.hand.length !== 2) {
            console.error(`Invalid hand for player ${player.obkUsername}:`, player.hand);
            return; // Skip this player
        }

        const fullHand = player.hand.concat(boardCards);

        // Map card objects to strings that pokerEvaluator understands
        const handStrings = fullHand.map(card => {
            let value;
            switch (card.value) {
                case '10': value = 'T'; break;
                case 'Jack': value = 'J'; break;
                case 'Queen': value = 'Q'; break;
                case 'King': value = 'K'; break;
                case 'Ace': value = 'A'; break;
                default: value = card.value;
            }
            return `${value[0]}${card.suit[0].toUpperCase()}`;
        });

        if (handStrings.length !== 7) {
            console.error(`Invalid number of cards for player ${player.obkUsername}:`, handStrings);
            return; // Skip this player
        }

        // Evaluate the hand
        let handResult;
        try {
            handResult = pokerEvaluator.evalHand(handStrings);
        } catch (error) {
            console.error(`Error evaluating hand for player ${player.obkUsername}:`, error);
            return; // Skip this player
        }

        // Determine if this hand is better than the current best
        if (!bestHand || handResult.value > bestHand.value) {
            bestHand = handResult;
            bestPlayers = [{ ...player, handResult }];
        } else if (handResult.value === bestHand.value) {
            bestPlayers.push({ ...player, handResult });
        }
    });

    return bestPlayers;
};

let gameState = {};

const rotateBlinds = (table) => {
    table.smallBlindIndex = (table.smallBlindIndex + 1) % table.players.length;
    table.bigBlindIndex = (table.smallBlindIndex + 1) % table.players.length;
};

const startGame = async (io, tableId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(tableId)) {
            throw new Error('Invalid table ID');
        }

        let table = gameState[tableId];

        if (!table) {
            throw new Error('Table not found after loading state');
        }

        if (table.startGameTimeout) {
            clearTimeout(table.startGameTimeout);
            delete table.startGameTimeout;
        }

        if (table.gameInProgress) {
            console.log("Game already in progress, not starting a new one.");
            return;
        }

        // Remove all players who have left before starting a new hand
        await handleAFKPlayers(io, tableId);

        const activePlayers = table.players.filter(player => player.status === 'active');
        if (activePlayers.length < 2) {
            //console.log('Not enough players to start the game.');
            clearTurnTimer(tableId);
            await cleanupTable(tableId, io);
            return;
        }

        table.gameInProgress = true;

        table.handNumber = (table.handNumber || 0) + 1;
        if (table.handNumber % 10 === 0) {
            table.smallBlind *= 2;
            table.bigBlind *= 2;
            //console.log(`Small ${table.smallBlind} Big ${table.bigBlind} handNumber ${table.handNumber}`); important
        }

        const newDeck = shuffleDeck(createDeck());
        const playerHands = dealCards(newDeck, table.players.length);

        rotateBlinds(table);

        table.players = table.players.map((player, index) => ({
            ...player,
            hand: playerHands[index],
            status: player.status === 'left' ? 'left' : 'active', // Preserve 'left' status
            bet: 0,
            hasActed: false,
            bpBalance: Number(player.bpBalance) || 0 // Ensure bpBalance is a number
        }));

        const handTransactions = [];
        handleBlind(table, table.smallBlindIndex, table.smallBlind, handTransactions);
        handleBlind(table, table.bigBlindIndex, table.bigBlind, handTransactions);

        // Save the blind transactions to the PokerHandTransaction model
        const pokerHandTransaction = new PokerHandTransaction({
            tableId,
            handNumber: table.handNumber,
            players: handTransactions,
            totalPot: table.pot,
            adminFeeTotal: 0
        });
        
        await pokerHandTransaction.save();

        table.deck = newDeck;
        table.currentPlayerIndex = (table.bigBlindIndex + 1) % table.players.length;
        table.remainingTime = 30;
        table.boardCards = [];
        table.stage = 'pre-flop';
        table.lastActivity = new Date();

        io.to(tableId).emit('gameState', getPublicGameState(tableId));

        table.players.forEach(player => {
            io.to(player.socketId).emit('gameState', getPublicGameState(tableId, player.uid));
        });

        startTurnTimer(io, tableId);
        
    } catch (error) {
        console.error('Error starting game:', error.message);
        if (gameState[tableId]) {
            gameState[tableId].gameInProgress = false;
        }
        io.to(tableId).emit('error', { message: 'Failed to start game. Please try again.' });
    }
};

const handleBlind = (table, playerIndex, blindAmount, handTransactions) => {
    const player = table.players[playerIndex];
    const actualBet = Math.min(blindAmount, player.bpBalance);
    
    player.bet = actualBet;
    table.pot += actualBet;
    player.bpBalance -= actualBet;
    
    if (player.bpBalance === 0) {
        player.status = 'all-in';
    }
    
    handTransactions.push({
        uid: player.uid,
        betAmount: actualBet,
        winnings: 0,
        adminFee: 0
    });
};

const clearTurnTimer = (tableId) => {
    const table = gameState[tableId];
    if (table && table.intervalId) {
        clearInterval(table.intervalId);
        table.intervalId = null;
    }
};

const startTurnTimer = (io, tableId) => {
    clearTurnTimer(tableId);

    const table = gameState[tableId];
    
    const activePlayers = table.players.filter(player => player.status === 'active');
    if (activePlayers.length < 2) {
        //console.log('Not enough active players to continue the game.');
        return;
    }

    const intervalId = setInterval(async () => {
            if (!table) return;


        for (const player of table.players) {
            if (player.bpBalance <= 0 && player.status !== 'left' && player.status !== 'all-in') {
                player.status = 'left';
                player.hand = [];
                io.to(player.socketId).emit('message', 'You have been removed due to insufficient bpBalance.');
            }
        }

        const currentPlayer = table.players[table.currentPlayerIndex];

        if (table.remainingTime > 0) {
            table.remainingTime -= 1;
        } else {
            if (currentPlayer && currentPlayer.status === 'active') {
                const highestBet = Math.max(...table.players.map(p => p.bet));
                if (currentPlayer.bet < highestBet) {
                    handlePlayerAction(io, tableId, table.currentPlayerIndex, 'fold');
                    io.to(currentPlayer.socketId).emit('message', 'You have been folded due to timeout.');
                } else {
                    handlePlayerAction(io, tableId, table.currentPlayerIndex, 'check');
                    io.to(currentPlayer.socketId).emit('message', 'You have been checked due to timeout.');
                }
            }
            moveToNextPlayer(io, tableId);

            const activePlayers = table.players.filter(p => p.status === 'active');
            if (activePlayers.length <= 1) {
                endRound(io, tableId);
            }
        }
        io.to(`${tableId}-spectators`).emit('gameState', getPublicGameState(tableId));
        table.players.forEach(player => {
            io.to(player.socketId).emit('gameState', getPublicGameState(tableId, player.uid));
        });
    }, 1000);

    gameState[tableId].intervalId = intervalId;
};

const moveToNextPlayer = (io, tableId) => {
    clearTurnTimer(tableId);
    const table = gameState[tableId];
    const highestBet = Math.max(...table.players.map(p => p.bet));

    const activePlayers = table.players.filter(player => player.status === 'active');

    const allActedOnce = activePlayers.every(player => player.hasActed);
    const allBetsEqual = activePlayers.every(player => player.bet === highestBet || player.status === 'all-in');
    if (allActedOnce && allBetsEqual) {
        // All players have acted and all bets are equal, proceed to the next stage
        dealerAction(io, tableId);
    } else {
        do {
            table.currentPlayerIndex = (table.currentPlayerIndex + 1) % table.players.length;
        } while (table.players[table.currentPlayerIndex].status !== 'active' || table.players[table.currentPlayerIndex].status === 'all-in');

        table.remainingTime = 30;

        io.to(tableId).emit('gameState', getPublicGameState(tableId));

        table.players.forEach(player => {
            io.to(player.socketId).emit('gameState', getPublicGameState(tableId, player.uid));
        });

        startTurnTimer(io, tableId);
    }
};


const handlePlayerAction = async (io, tableId, playerIndex, action, amount) => {
    const table = gameState[tableId];

    if (!table || !table.gameInProgress || table.currentPlayerIndex !== playerIndex) {
        io.to(table.players[playerIndex].socketId).emit('error', { message: 'Invalid action: Not your turn or no active game.' });
        return;
    }

    const player = table.players[playerIndex];
    const highestBet = Math.max(...table.players.map(p => p.bet));

    let betAmount = 0;
    let handTransaction = null;

    switch (action) {
        case 'bet':
            if (player.bet < highestBet) {
                io.to(player.socketId).emit('error', 'Cannot bet, must call or raise if there is a higher bet.');
                return;
            }
            betAmount = amount;
            if (betAmount === player.bpBalance) {
                player.status = 'all-in';
            }
            break;
        case 'call':
            if (player.bet >= highestBet) {
                io.to(player.socketId).emit('error', 'Cannot call, you already have the highest bet.');
                return;
            }
            const callAmount = highestBet - player.bet;
            betAmount = Math.min(callAmount, player.bpBalance); // Set to the lesser of the call amount or player's balance
            if (betAmount === player.bpBalance) {
                player.status = 'all-in'; // Set to all-in if calling the entire balance
            }
            break;
        case 'raise':
            if (player.bet >= highestBet) {
                io.to(player.socketId).emit('error', 'Cannot raise, you already have the highest bet.');
                return;
            }
            const totalRaiseAmount = (highestBet - player.bet) + amount;
            betAmount = Math.min(totalRaiseAmount, player.bpBalance); // Set to the lesser of the raise amount or player's balance
            if (betAmount === player.bpBalance) {
                player.status = 'all-in'; // Set to all-in if raising the entire balance
            }
            break;
        case 'fold':
            player.status = 'folded';
            break;
        case 'check':
            if (player.bet < highestBet) {
                io.to(player.socketId).emit('error', 'Cannot check, must call or raise.');
                return;
            }
            break;
        case 'all-in':
            betAmount = player.bpBalance; // All-in bet amount is the player's entire balance
            player.status = 'all-in';
            break;
        default:
            console.error('Unknown action:', action);
            return;
    }

    if (betAmount > 0) {
        if (betAmount > player.bpBalance) {
            io.to(player.socketId).emit('error', 'Insufficient bpBalance for this action.');
            return;
        }

        player.bet += betAmount;
        table.pot += betAmount;
        player.bpBalance -= betAmount;

        // Create a hand transaction record
        handTransaction = {
            uid: player.uid,
            betAmount,
            winnings: 0, // To be updated at the end of the round
            adminFee: 0 // To be updated at the end of the round
        };
    }

    player.hasActed = true;
    table.lastActivity = new Date();

    const activePlayers = table.players.filter(p => p.status === 'active' || p.status === 'all-in');
    if (activePlayers.length <= 1) {
        if (handTransaction) {
            // Save the hand transaction to the database before ending the round
            const pokerHandTransaction = new PokerHandTransaction({
                tableId,
                handNumber: table.handNumber || 0,
                players: [handTransaction],
                totalPot: table.pot,
                adminFeeTotal: 0 // Admin fee will be calculated at the end of the round
            });
            await pokerHandTransaction.save();
        }
        await endRound(io, tableId);
        return;
    }

    io.to(`${tableId}-spectators`).emit('gameState', getPublicGameState(tableId));
    table.players.forEach(player => {
        io.to(player.socketId).emit('gameState', getPublicGameState(tableId, player.uid));
    });

    moveToNextPlayer(io, tableId);

    if (handTransaction) {
        // Save the hand transaction to the database after moving to the next player
        const pokerHandTransaction = new PokerHandTransaction({
            tableId,
            handNumber: table.handNumber || 0,
            players: [handTransaction],
            totalPot: table.pot,
            adminFeeTotal: 0 // Admin fee will be calculated at the end of the round
        });
        await pokerHandTransaction.save();
    }
};

const saveTableState = async (tableId) => {
    const table = gameState[tableId];
    if (!table) {
        console.error(`Table ${tableId} not found in gameState`);
        return;
    }

    try {
        const updateData = {
            players: table.players.map(player => ({
                uid: player.uid,
                socketId: player.socketId,
                status: player.status,
                bet: player.bet,
                handVisible: player.handVisible,
                obkUsername: player.obkUsername,
                hasActed: player.hasActed,
                bpBalance: player.bpBalance,
            })),
            pot: table.pot,
            currentPlayerIndex: table.currentPlayerIndex,
            //remainingTime: table.remainingTime,
            boardCards: table.boardCards,
            stage: table.stage,
            bigBlind: table.bigBlind,
            smallBlind: table.smallBlind,
            smallBlindIndex: table.smallBlindIndex,
            bigBlindIndex: table.bigBlindIndex,
            handNumber: table.handNumber,
            lastActivity: new Date()
        };

        await PokerTable.findByIdAndUpdate(tableId, updateData, { new: true });
        //console.log(`Table ${tableId} state saved. Hand: ${table.handNumber}, Small Blind: ${table.smallBlind}, Big Blind: ${table.bigBlind}`); important
    } catch (error) {
        console.error(`Error saving state for table ${tableId}:`, error);
    }
};

const resetTableState = (table) => {
    table.pot = 0;
    table.boardCards = [];
    table.stage = 'pre-flop';
    table.currentPlayerIndex = -1;
    table.remainingTime = 30;
    table.gameInProgress = false;
    table.players.forEach(player => {
        player.hand = [];
        player.bet = 0;
        player.status = player.status === 'left' ? 'left' : 'active';
        player.hasActed = false;
    });
};

const endRound = async (io, tableId) => {
    const table = gameState[tableId];

    if (!table) {
        throw new Error('Table not found in gameState');
    }

    let activePlayers = table.players.filter(player => player.status === 'active' || player.status === 'all-in');

    let allHandParticipants = [...table.players];

    let payouts = {};
    let totalPot = table.pot;
    const adminFeeTotal = Math.ceil(totalPot * 0); // Admin fee is 0.5% of the pot, rounded up

    // Ensure that adminFeeTotal is a valid number
    if (isNaN(adminFeeTotal) || adminFeeTotal < 0) {
        console.warn(`Invalid admin fee calculated: ${adminFeeTotal}. Setting adminFeeTotal to 0.`);
        adminFeeTotal = 0;
    }

    // Subtract the admin fee from the total pot before any calculations
    totalPot -= adminFeeTotal;

    if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        payouts[winner.uid] = {
            winnings: totalPot,
            hand: winner.hand,
            handDescription: 'Last player remaining'
        };
    } else {
        activePlayers.sort((a, b) => a.bet - b.bet);
        
        let pots = [];
        let previousBet = 0;
        
        for (let i = 0; i < activePlayers.length; i++) {
            const player = activePlayers[i];
            const currentBet = player.bet;
            const betDifference = currentBet - previousBet;
            
            if (betDifference > 0) {
                const potSize = betDifference * (activePlayers.length - i);
                pots.push({
                    amount: potSize,
                    eligiblePlayers: activePlayers.slice(i)
                });
            }
            
            previousBet = currentBet;
        }
        
        // Adjust pot sizes to account for admin fee
        const totalPotSize = pots.reduce((sum, pot) => sum + pot.amount, 0);
        let remainingAdminFee = adminFeeTotal;
        
        pots = pots.map((pot, index) => {
            const potRatio = pot.amount / totalPotSize;
            let potAdminFee = index === pots.length - 1 ? remainingAdminFee : Math.floor(adminFeeTotal * potRatio);
            remainingAdminFee -= potAdminFee;
            return {
                ...pot,
                amount: pot.amount - potAdminFee
            };
        });
        
        for (const pot of pots) {
            const winners = determineWinningHand(pot.eligiblePlayers, table.boardCards);
            const winShare = Math.floor(pot.amount / winners.length);
            let remainder = pot.amount % winners.length;
            
            winners.forEach((winner) => {
                if (!payouts[winner.uid]) {
                    payouts[winner.uid] = {
                        winnings: 0,
                        hand: winner.hand,
                        handDescription: winner.handResult.handName
                    };
                }
                const share = winShare + (remainder > 0 ? 1 : 0);
                payouts[winner.uid].winnings += share;
                remainder--;
            });
        }
    }
    
    const handTransactions = [];

    const adminUsers = await User.find({ role: 'admin' });
    let remainingAdminFee = adminFeeTotal;
    
    for (let i = 0; i < adminUsers.length; i++) {
        const adminUser = adminUsers[i];
        const adminFeeShare = i === adminUsers.length - 1 ? remainingAdminFee : adminFeeTotal / adminUsers.length;
        remainingAdminFee -= adminFeeShare;
        
        await User.findOneAndUpdate(
            { uid: adminUser.uid },
            { $inc: { bpBalance: adminFeeShare } }
        );
    }

    for (const player of allHandParticipants) {
        if (payouts[player.uid]) {
            player.bpBalance += payouts[player.uid].winnings;
        }
    
        const betAmount = player.bet;
        const winnings = payouts[player.uid] ? payouts[player.uid].winnings : 0;
    
        handTransactions.push({
            uid: player.uid,
            betAmount,
            winnings,
            adminFee: Math.ceil((betAmount / table.pot) * adminFeeTotal)
        });

        if (player.pendingRemoval || player.status === 'left' || (player.status === 'all-in' && player.bpBalance === 0)) {
            player.status = 'left';
        } else {
            player.bet = 0;
            player.status = player.status === 'all-in' ? 'active' : player.status;
            player.hasActed = false;
            player.hand = [];
        }
    }


    const pokerHandTransaction = new PokerHandTransaction({
        tableId,
        handNumber: table.handNumber || 0,
        players: handTransactions,
        totalPot: table.pot,
        adminFeeTotal
    });

    await pokerHandTransaction.save();

    table.pot = 0;
    table.boardCards = [];
    table.stage = 'pre-flop';

    for (const player of table.players) {
        if (player.status === 'left' || player.pendingRemoval || player.bpBalance <= 0) {
            try {
                // Create a refund transaction
                if (player.bpBalance > 0) {
                    await createTransaction({
                        userId: player.uid,
                        amount: player.bpBalance,
                        discordUsername: 'Poker',
                        obkUsername: 'Poker',
                        status: 'approved',
                    });
                }

                // Update user's balance in the database
                const user = await User.findOneAndUpdate(
                    { uid: player.uid },
                    { $inc: { bpBalance: player.bpBalance } },
                    { new: true }
                );

                if (user) {
                    //console.log(`Updated balance for player ${player.uid}. New balance: ${user.bpBalance}`); important
                } else {
                    //console.log(`User not found for player ${player.uid} when processing leave`); important
                }
            } catch (error) {
                console.error(`Error processing leave for player ${player.uid}:`, error);
            }
        }
    }

    table.players = table.players.filter(player => player.status !== 'left' && !player.pendingRemoval);

    try {
        const updateData = {
            players: table.players.map(player => ({
                uid: player.uid,
                socketId: player.socketId,
                status: player.status,
                bet: player.bet,
                handVisible: player.handVisible,
                obkUsername: player.obkUsername,
                hasActed: player.hasActed,
                bpBalance: player.bpBalance,
            })),
            pot: table.pot,
            currentPlayerIndex: table.currentPlayerIndex,
            remainingTime: table.remainingTime,
            boardCards: table.boardCards,
            stage: table.stage,
            bigBlind: table.bigBlind,
            smallBlind: table.smallBlind,
            smallBlindIndex: table.smallBlindIndex,
            bigBlindIndex: table.bigBlindIndex,
            handNumber: table.handNumber,
            lastActivity: new Date()
        };

        await PokerTable.findByIdAndUpdate(tableId, updateData, { new: true });
        //console.log(`PokerTable ${tableId} state saved to database after hand ${table.handNumber}`);
    } catch (error) {
        //console.error(`Error saving PokerTable ${tableId} state to database:`, error);
    }

    table.gameInProgress = false;
    table.currentPlayerIndex = -1; // Set to -1 to indicate no active player

    io.to(tableId).emit('gameState', getPublicGameState(tableId, null));
    io.to(tableId).emit('roundEnd', {
        payouts: Object.entries(payouts).map(([uid, data]) => {
            const player = allHandParticipants.find(p => p.uid === uid);
            return {
                obkUsername: player ? player.obkUsername : 'Unknown Player',
                winnings: data.winnings,
                hand: data.hand,
                handDescription: data.handDescription
            };
        })
    });
    
    handleAFKPlayers(io, tableId);

    setTimeout(() => {
        const remainingPlayers = table.players.filter(player => player.status !== 'left');
        if (remainingPlayers.length >= 2) {
            startGame(io, tableId);
        } else {
            io.to(tableId).emit('message', 'Not enough players to start the game.');
            resetTableState(table);
        }
        io.to(tableId).emit('gameState', getPublicGameState(tableId));
        table.players.forEach(player => {
            io.to(player.socketId).emit('gameState', getPublicGameState(tableId, player.uid));
        });
        saveTableState(tableId);
    }, 7000);
};

const dealerAction = async (io, tableId) => {
    const table = gameState[tableId];

    // Adjust bets only if one player has bet more than everyone else
    const bets = table.players.filter(player => player.status === 'active' || player.status === 'all-in').map(player => player.bet);
    const highestBet = Math.max(...bets);
    const secondHighestBet = Math.max(...bets.filter(bet => bet < highestBet));

    const highestBetPlayers = table.players.filter(player => player.bet === highestBet);
    if (highestBetPlayers.length === 1 && highestBetPlayers[0].bet > secondHighestBet) {
        const player = highestBetPlayers[0];
        const excessAmount = player.bet - secondHighestBet;
        player.bet = secondHighestBet;
        player.bpBalance += excessAmount;
        table.pot -= excessAmount;
    }

    // Proceed with the dealer action (e.g., moving to the next stage)
    switch (table.stage) {
        case 'pre-flop':
            table.boardCards.push(...table.deck.splice(0, 3));
            table.stage = 'flop';
            break;
        case 'flop':
            table.boardCards.push(table.deck.pop());
            table.stage = 'turn';
            break;
        case 'turn':
            table.boardCards.push(table.deck.pop());
            table.stage = 'river';
            break;
        case 'river':
            await endRound(io, tableId);
            return;
        default:
            return;
    }

    // Reset hasActed for all players for the new betting round
    table.players = table.players.map(player => ({
        ...player,
        hasActed: false
    }));

    table.currentPlayerIndex = -1;

    // Show the new table state with the updated board cards to all players
    table.players.forEach(player => {
        io.to(player.socketId).emit('gameState', getPublicGameState(tableId, player.uid));
    });

    setTimeout(() => {
        table.currentPlayerIndex = table.bigBlindIndex;
        moveToNextPlayer(io, tableId);
    }, 5000);
};

const playerJoin = async (io, socket, userId, tableId, buyInAmount) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(tableId)) {
            throw new Error('Invalid table ID');
        }

        if (isNaN(buyInAmount) || buyInAmount < 0) {
            socket.emit('error', { message: 'Invalid buy-in amount.', details: 'Buy-in amount must be a positive number.' });
            //console.log(buyInAmount);
            return;
        }

        let table = gameState[tableId];

        const user = await User.findOne({ uid: userId });
        if (!user) {
            socket.emit('error', { message: 'User not found.', details: '' });
            return;
        }

        if (user.bpBalance < buyInAmount) {
            socket.emit('error', { message: 'Insufficient BP balance or invalid buy-in amount.', details: '' });
            return;
        }

        try {
            await createTransaction({
                userId: userId,
                amount: -buyInAmount,
                discordUsername: 'Poker',
                obkUsername: 'Poker',
                status: 'approved',
            });

            user.bpBalance -= buyInAmount;
            await user.save();
        } catch (transactionError) {
            //console.error('Failed to create transaction:', transactionError);
            socket.emit('error', { message: 'Failed to process buy-in.', details: 'Please try again.' });
            return;
        }

        if (!table) {
            const dbTable = await PokerTable.findById(tableId).populate('players');
            if (!dbTable) {
                socket.emit('error', { message: 'Table not found.', details: '' });
                return;
            }

            gameState[tableId] = {
                ...dbTable.toObject(),
                name: dbTable.name,
                players: dbTable.players.map(player => ({
                    uid: player.uid,
                    socketId: player.socketId,
                    hand: player.hand,
                    status: player.status,
                    bet: player.bet,
                    handVisible: player.handVisible,
                    obkUsername: player.obkUsername,
                    bpBalance: player.bpBalance,
                })),
                spectators: dbTable.spectators,
                pot: dbTable.pot,
                currentPlayerIndex: dbTable.currentPlayerIndex,
                remainingTime: dbTable.remainingTime,
                boardCards: dbTable.boardCards,
                stage: dbTable.stage,
                bigBlind: dbTable.bigBlind,
                smallBlind: dbTable.smallBlind,
                smallBlindIndex: dbTable.smallBlindIndex,
                bigBlindIndex: dbTable.bigBlindIndex,
                lastActivity: dbTable.lastActivity
            };
            table = gameState[tableId];
        }

        const existingPlayer = table.players.find(player => player.uid === userId);
        if (existingPlayer) {
            existingPlayer.socketId = socket.id;
            existingPlayer.status = existingPlayer.status !== 'folded' ? 'active' : existingPlayer.status;
            existingPlayer.bpBalance += buyInAmount; // Add the buy-in amount to the existing player's internal balance
        } else {
            if (buyInAmount <= 0) {
                socket.emit('error', { message: 'Invalid buy-in amount. Cannot join with 0 BP.', details: '' });
                return;
            }
            const isHandInProgress = table.gameInProgress;
            table.players.push({
                uid: userId,
                socketId: socket.id,
                hand: [],
                status: isHandInProgress ? 'folded' : 'active',
                bet: 0,
                obkUsername: user.obkUsername,
                hasActed: false,
                bpBalance: buyInAmount, // Initialize with the buy-in amount
            });
        }

        table.lastActivity = new Date();

        socket.join(tableId);

        io.to(tableId).emit('gameState', getPublicGameState(tableId));

        if (!table.gameInProgress) {
            const activePlayers = table.players.filter(player => player.status === 'active');
            if (activePlayers.length >= 2) {
                if (table.startGameTimeout) {
                    clearTimeout(table.startGameTimeout);
                }
                scheduleGameStart(io, tableId);
            }
        }
    } catch (error) {
        console.error('Error joining player:', error.message);
        socket.emit('error', { message: 'Failed to join table.', details: error.message });
    }
};

const scheduleGameStart = (io, tableId) => {
    const table = gameState[tableId];
    
    // Cancel any existing timeout
    if (table.startGameTimeout) {
        clearTimeout(table.startGameTimeout);
    }

    // Schedule a new game start
    table.startGameTimeout = setTimeout(() => {
        const activePlayers = table.players.filter(player => player.status === 'active');
        if (activePlayers.length >= 2 && !table.gameInProgress) {
            startGame(io, tableId);
        }
        delete table.startGameTimeout;
    }, 5000); // 5 seconds delay

    // Notify players that the game will start soon
    io.to(tableId).emit('message', 'Game will start in 5 seconds. Waiting for more players to join...');
};

const adjustBlinds = (table) => {
    const activePlayers = table.players.filter(player => player.status !== 'left');
    if (activePlayers.length >= 2) {
        table.smallBlindIndex = table.smallBlindIndex % activePlayers.length;
        table.bigBlindIndex = (table.smallBlindIndex + 1) % activePlayers.length;
    } else {
        table.smallBlindIndex = -1;
        table.bigBlindIndex = -1;
    }
};

const playerLeave = async (io, socketId, tableId) => {
    const table = gameState[tableId];

    if (!table) {
        //console.log(`Attempt to leave non-existent table: ${tableId}`);
        return; 
    }
    const playerIndex = table.players.findIndex(player => player.socketId === socketId);

    if (playerIndex !== -1) {
        const player = table.players[playerIndex];

        // Check if no hand is currently going on (pre-flop stage with no active players)
        const noActiveHand = table.stage === 'pre-flop' && table.players.every(p => p.bet === 0 && p.hand.length === 0);

        const amountToReturn = player.bpBalance;

        if (noActiveHand) {
            table.players.splice(playerIndex, 1); // Remove player from the table
            try {
                await createTransaction({
                    userId: player.uid,
                    amount: amountToReturn,
                    discordUsername: 'Poker',
                    obkUsername: 'Poker',
                    status: 'approved',
                });
    
                const user = await User.findOne({ uid: player.uid });
                if (user) {
                    user.bpBalance += amountToReturn;
                    await user.save();
                    //console.log(`Player ${player.uid} left the table. Returned ${amountToReturn} BP. New balance: ${user.bpBalance}`);
                } else {
                    //console.log(`User not found for player ${player.uid} when leaving table`);
                }
            }catch{
                //console.error(`Error processing leave transaction for player ${player.uid}:`, error);
            }
            if (table.players.length < 2) {
                resetTableState(table);
            } else {
                adjustBlinds(table); 
            }
        } else {
            if (player.status === 'all-in') {
                player.pendingRemoval = true;
            } else {
                player.status = 'left';
            }
            //console.log(`Player ${player.uid} marked as left. Will return ${amountToReturn} BP at the end of the hand.`);
        }

        io.to(tableId).emit('gameState', getPublicGameState(tableId));
        table.players.forEach(player => {
            io.to(player.socketId).emit('gameState', getPublicGameState(tableId, player.uid));
        });
    }
};

const handleAFKPlayers = async (io, tableId) => {
    const table = gameState[tableId];
    const afkPlayers = table.players.filter(player => player.status === 'left');

    for (const player of afkPlayers) {
        const amountToReturn = player.bpBalance;
        
        try {
            if (amountToReturn > 0) {
                await createTransaction({
                    userId: player.uid,
                    amount: amountToReturn,
                    discordUsername: 'Poker',
                    obkUsername: 'Poker',
                    status: 'approved',
                });

                const user = await User.findOneAndUpdate(
                    { uid: player.uid },
                    { $inc: { bpBalance: amountToReturn } },
                    { new: true }
                );

                if (user) {
                    //console.log(`Refunded ${amountToReturn} BP to player ${player.uid}. New balance: ${user.bpBalance}`);
                } else {
                    //console.log(`User not found for player ${player.uid} during handleAFKPlayers`);
                }
            }
        } catch (error) {
            console.error(`Error processing refund for player ${player.uid}:`, error);
        }

        table.players = table.players.filter(p => p.socketId !== player.socketId);
    }

    if (table.players.length >= 2) {
        adjustBlinds(table);
    } else {
        resetTableState(table);
    }

    await PokerTable.findByIdAndUpdate(tableId, { players: table.players });

    io.to(tableId).emit('gameState', getPublicGameState(tableId));
};

const spectatorJoin = async (io, socket, tableId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(tableId)) {
            throw new Error('Invalid table ID');
        }

        let table = gameState[tableId];

        if (!table) {
            const dbTable = await PokerTable.findById(tableId).populate('players');
            if (!dbTable) {
                socket.emit('error', 'Table not found.');
                return;
            }

            gameState[tableId] = {
                name: dbTable.name,
                players: dbTable.players.map(player => ({
                    uid: player.uid,
                    hand: [],
                    status: 'active',
                    bet: 0,
                    obkUsername: player.obkUsername,
                })),
                spectators: [],
                pot: 0,
                currentPlayerIndex: 0,
                remainingTime: 30,
                boardCards: [],
                stage: 'pre-flop',
                bigBlind: dbTable.bigBlind,
                smallBlind: dbTable.smallBlind,
                smallBlindIndex: dbTable.smallBlindIndex,
                bigBlindIndex: dbTable.bigBlindIndex,
                lastActivity: new Date(),
            };
            table = gameState[tableId];
        }

        const existingPlayer = table.players.find(player => player.uid === socket.userId); // Use socket.userId instead of socket.request.user.id
        if (existingPlayer) {
            existingPlayer.socketId = socket.id;
            if (existingPlayer.status !== 'folded') {
                existingPlayer.status = 'active';
            }
        } else {
            table.spectators.push({
                socketId: socket.id,
            });
        }

        socket.join(tableId);
        socket.emit('gameState', getPublicGameState(tableId));

    } catch (error) {
        console.error('Error joining spectator:', error.message);
        socket.emit('error', 'An error occurred while joining as a spectator.');
    }
};

const spectatorLeave = (io, socketId, tableId) => {
    const table = gameState[tableId];
    table.spectators = table.spectators.filter(spectator => spectator.socketId !== socketId);

    io.to(tableId).emit('gameState', getPublicGameState(tableId));
};

const getPublicGameState = (tableId, userId) => {
    const table = gameState[tableId];
    if (!table) {
        return null;
    }
    return {
        name: table.name,
        players: table.players.map(player => ({
            uid: player.uid,
            status: player.status,
            bet: player.bet,
            hand: player.uid === userId ? player.hand : null,
            obkUsername: player.obkUsername,
            bpBalance: player.bpBalance
        })),
        pot: table.pot,
        currentPlayerIndex: table.currentPlayerIndex,
        remainingTime: table.remainingTime,
        boardCards: table.boardCards,
        stage: table.stage,
        bigBlind: table.bigBlind,
        smallBlind: table.smallBlind,
        smallBlindIndex: table.smallBlindIndex,
        bigBlindIndex: table.bigBlindIndex
    };
};

const cleanupInactiveTables = async (io) => {
    const passedTime = new Date(Date.now() - 720 * 60 * 1000);

    try {
        const inactiveTables = await PokerTable.find({ lastActivity: { $lt: passedTime } });

        for (const table of inactiveTables) {
            const tableId = table._id.toString();
            const tableState = gameState[tableId];

            if (tableState && tableState.lastActivity >= passedTime) {
                continue;
            }

            //console.log(`Cleaning up inactive table: ${table.name} (${tableId})`);
            await cleanupTable(tableId, io);
        }
    } catch (err) {
        console.error('Failed to clean up inactive tables:', err);
    }
};

const createTransaction = async (transactionData) => {
    try {
        // Validate required fields
        if (!transactionData.userId || !transactionData.amount || !transactionData.discordUsername || !transactionData.obkUsername) {
            console.error('Missing required fields for transaction:', transactionData);
            throw new Error('Missing required fields for transaction');
        }

        // Ensure amount is a number
        const amount = Number(transactionData.amount);
        if (isNaN(amount)) {
            console.error('Invalid amount for transaction:', transactionData.amount);
            throw new Error('Invalid transaction amount');
        }

        // Create and save the transaction
        const transaction = new Transaction({
            userId: transactionData.userId,
            amount: amount,
            discordUsername: transactionData.discordUsername,
            obkUsername: transactionData.obkUsername,
            status: transactionData.status || 'approved', // Default to 'approved' if not provided
        });

        await transaction.save();
        //console.log('Transaction created successfully:', transaction);
        return transaction;
    } catch (error) {
        //console.error('Error creating transaction:', error);
        throw error; // Re-throw the error for the caller to handle
    }
};

const cleanupTable = async (tableId, io) => {
    const table = gameState[tableId];
    if (!table) {
        //console.log(`Table ${tableId} not found in gameState during cleanup.`);
        return;
    }

    if (table.startGameTimeout) {
        clearTimeout(table.startGameTimeout);
        delete table.startGameTimeout;
    }
    //console.log(`Cleaning up table ${tableId}`);

    for (const player of table.players) {
        if (player.bpBalance > 0) {
            try {
                // Create a refund transaction
                const refundTransaction = new Transaction({
                    userId: player.uid,
                    amount: player.bpBalance,
                    discordUsername: 'Poker',
                    obkUsername: 'Poker',
                    status: 'approved',
                });
                await refundTransaction.save();

                // Update user's balance in the database
                const user = await User.findOne({ uid: player.uid });
                if (user) {
                    user.bpBalance += player.bpBalance;
                    await user.save();
                    //console.log(`Refunded ${player.bpBalance} BP to player ${player.uid}. New balance: ${user.bpBalance}`);
                } else {
                    //console.log(`User not found for player ${player.uid} during table cleanup`);
                }
            } catch (error) {
                console.error(`Error processing refund for player ${player.uid}:`, error);
            }
        }

        // Notify the player that they've been removed from the table
        const socket = io.sockets.sockets.get(player.socketId);
        if (socket) {
            socket.emit('tableDeleted', { message: 'The table has been closed due to inactivity. Your balance has been refunded.' });
            socket.leave(tableId);
        }
    }

    // Notify all spectators that the table has been deleted
    io.to(`${tableId}-spectators`).emit('tableDeleted', { message: 'The table has been closed due to inactivity.' });

    // Clear the table from gameState
    delete gameState[tableId];

    // Delete the table from the database
    try {
        await PokerTable.findByIdAndDelete(tableId);
        //console.log(`Table ${tableId} has been deleted from the database.`);
    } catch (error) {
        console.error(`Error deleting poker table ${tableId} from database:`, error);
    }
};

const setupPokerController = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decodedToken = await admin.auth().verifyIdToken(token);
            const user = await User.findOne({ uid: decodedToken.uid });
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.userId = decodedToken.uid; // Attach userId to the socket object
            socket.user = user; // Attach user object to the socket object
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        socket.on('playerJoin', async ({ tableId, buyInAmount }) => {
            try {
                await playerJoin(io, socket, socket.userId, tableId, buyInAmount);
            } catch (error) {
                console.error('Error handling playerJoin:', error.message);
            }
        });

        socket.on('playerLeave', ({ tableId }) => {
            try {
                playerLeave(io, socket.id, tableId);
            } catch (error) {
                console.error('Error handling playerLeave:', error.message);
            }
        });

        socket.on('spectatorJoin', async ({ tableId }) => {
            try {
                await spectatorJoin(io, socket, tableId);
            } catch (error) {
                console.error('Error handling spectatorJoin:', error.message);
            }
        });

        socket.on('spectatorLeave', ({ tableId }) => {
            try {
                spectatorLeave(io, socket.id, tableId);
            } catch (error) {
                console.error('Error handling spectatorLeave:', error.message);
            }
        });

        socket.on('startGame', ({ tableId }) => {
            try {
                startGame(io, tableId);
            } catch (error) {
                console.error('Error handling startGame:', error.message);
            }
        });

        socket.on('playerAction', (data) => {
            try {
                const { tableId, action, amount } = data;
                const playerIndex = gameState[tableId]?.players.findIndex(p => p.uid === socket.userId);
                if (playerIndex === -1 || playerIndex === undefined) {
                    return console.error('Player not found');
                }
                handlePlayerAction(io, tableId, playerIndex, action, amount);
            } catch (error) {
                console.error('Error handling playerAction:', error.message);
            }
        });

        socket.on('endHand', async ({ tableId }) => {
            try {
                await handleAFKPlayers(io, tableId);
            } catch (error) {
                console.error('Error handling endHand:', error.message);
            }
        });

        socket.on('disconnect', () => {
            try {
                for (const tableId in gameState) {
                    if (gameState[tableId]) {
                        playerLeave(io, socket.id, tableId);
                    }
                }
            } catch (error) {
                console.error('Error handling disconnect:', error.message);
            }
        });
    });

    setInterval(() => cleanupInactiveTables(io), 60 * 1000);
};

// RESTful API functions
const getTableState = async (tableId) => {
    try {
        const table = await PokerTable.findById(tableId).populate('players');
        if (!table) {
            console.error('Table not found:', tableId);
            return null;
        }
        return {
            id: table._id,
            name: table.name,
            players: table.players.length,
            maxPlayers: 9,
        };
    } catch (err) {
        console.error('Error fetching table state:', err);
        return null;
    }
};

const listPokerTables = async (req, res) => {
    try {
        const tables = await PokerTable.find();
        const tableStates = await Promise.all(tables.map(table => getTableState(table._id)));
        res.status(200).json(tableStates.filter(state => state !== null));
    } catch (err) {
        console.error('Failed to fetch tables:', err);
        res.status(500).json({ error: 'Failed to fetch tables' });
    }
};

const createPokerTable = async (req, res) => {
    try {
        const { tableName } = req.body;
        const newPokerTable = new PokerTable({ name: tableName });
        await newPokerTable.save();
        res.status(201).json(newPokerTable);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create table' });
    }
};

module.exports = { setupPokerController, createPokerTable, listPokerTables };
