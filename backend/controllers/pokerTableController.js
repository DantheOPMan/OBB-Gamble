const mongoose = require('mongoose');
const User = require('../models/userModel');
const PokerTable = require('../models/pokerTableModel');
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
    console.log('determine winning hand');
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

    console.log('Best hand:', bestHand);
    console.log('Best players:', bestPlayers.map(p => p.obkUsername));

    return bestPlayers;
};

let gameState = {};

const rotateBlinds = (table) => {
    table.smallBlindIndex = (table.smallBlindIndex + 1) % table.players.length;
    table.bigBlindIndex = (table.smallBlindIndex + 1) % table.players.length;
};

const startGame = async (io, tableId) => {
    console.log('start game');
    try {
        if (!mongoose.Types.ObjectId.isValid(tableId)) {
            throw new Error('Invalid table ID');
        }

        let table = gameState[tableId];

        // Remove all players who have left before starting a new hand
        table.players = table.players.filter(player => player.status !== 'left');

        const activePlayers = table.players.filter(player => player.status === 'active');
        if (activePlayers.length < 2) {
            console.log('Not enough players to start the game.');
            return;
        }

        const newDeck = shuffleDeck(createDeck());
        const playerHands = dealCards(newDeck, table.players.length);

        rotateBlinds(table);

        table.players = table.players.map((player, index) => ({
            ...player,
            hand: playerHands[index],
            status: 'active',
            bet: 0,
            hasActed: false // Initialize hasActed
        }));

        table.players[table.smallBlindIndex].bet = table.smallBlind;
        table.players[table.bigBlindIndex].bet = table.bigBlind;
        table.pot = table.smallBlind + table.bigBlind;

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
    }
};

const clearTurnTimer = (tableId) => {
    const table = gameState[tableId];
    if (table && table.intervalId) {
        clearInterval(table.intervalId);
        table.intervalId = null;
    }
};

const startTurnTimer = (io, tableId) => {
    console.log('start turn timer');
    clearTurnTimer(tableId); // Clear any existing timer before starting a new one

    const intervalId = setInterval(() => {
        const table = gameState[tableId];
        if (!table) return;

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
    console.log('move to next player');
    const table = gameState[tableId];
    console.log(table.currentPlayerIndex);
    const highestBet = Math.max(...table.players.map(p => p.bet));
    clearTurnTimer(tableId);

    const allActedOnce = table.players.every((player) => player.status !== 'active' || player.hasActed);
    if (allActedOnce && table.players.every(p => p.bet === highestBet || p.status === 'all-in')) {
        // All players have acted and all bets are equal, proceed to the next stage
        dealerAction(io, tableId);
    } else {
        do {
            table.currentPlayerIndex = (table.currentPlayerIndex + 1) % table.players.length;
        } while (table.players[table.currentPlayerIndex].status !== 'active' || table.players[table.currentPlayerIndex].status === 'all-in');

        console.log(table.currentPlayerIndex);

        table.remainingTime = 30;

        io.to(tableId).emit('gameState', getPublicGameState(tableId));
        
        table.players.forEach(player => {
            io.to(player.socketId).emit('gameState', getPublicGameState(tableId, player.uid));
        });

        startTurnTimer(io, tableId);
    }
};


const handlePlayerAction = (io, tableId, playerIndex, action, amount) => {
    console.log('handle player action');
    const table = gameState[tableId];
    const player = table.players[playerIndex];
    const highestBet = Math.max(...table.players.map(p => p.bet));

    switch (action) {
        case 'bet':
            if (player.bet < highestBet) {
                io.to(player.socketId).emit('error', 'Cannot bet, must call or raise if there is a higher bet.');
                return;
            }
            player.bet += amount;
            table.pot += amount;
            break;
        case 'call':
            if (player.bet >= highestBet) {
                io.to(player.socketId).emit('error', 'Cannot call, you already have the highest bet.');
                return;
            }
            const callAmount = highestBet - player.bet;
            player.bet += callAmount;
            table.pot += callAmount;
            break;
        case 'raise':
            if (player.bet >= highestBet) {
                io.to(player.socketId).emit('error', 'Cannot raise, you already have the highest bet.');
                return;
            }
            const totalRaiseAmount = (highestBet - player.bet) + amount;
            player.bet += totalRaiseAmount;
            table.pot += totalRaiseAmount;
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
            table.pot += player.bet;
            player.bet = 0;
            player.status = 'all-in';
            break;
        default:
            console.error('Unknown action:', action);
    }

    player.hasActed = true;

    table.lastActivity = new Date();

    const activePlayers = table.players.filter(p => p.status === 'active');
    if (activePlayers.length <= 1) {
        endRound(io, tableId);
        return;
    }

    io.to(`${tableId}-spectators`).emit('gameState', getPublicGameState(tableId));

    table.players.forEach(player => {
        io.to(player.socketId).emit('gameState', getPublicGameState(tableId, player.uid));
    });

    moveToNextPlayer(io, tableId);
};

const resetTableState = (table) => {
    table.pot = 0;
    table.boardCards = [];
    table.stage = 'pre-flop';
    table.currentPlayerIndex = -1;
    table.remainingTime = 30;
    table.players.forEach(player => {
        player.hand = [];
        player.bet = 0;
        player.status = player.status === 'left' ? 'left' : 'active';
        player.hasActed = false;
    });
};

const endRound = async (io, tableId) => {
    console.log('end round');
    const table = gameState[tableId];
    let activePlayers = table.players.filter(player => player.status === 'active' || player.status === 'all-in');
    
    let payouts = {};

    // Check if there's only one player left
    if (activePlayers.length === 1) {
        // The last remaining player wins the entire pot
        const winner = activePlayers[0];
        payouts[winner.uid] = table.pot;
    } else {
        // Sort players by their bet amount (ascending)
        activePlayers.sort((a, b) => a.bet - b.bet);
        
        let pots = [];
        let totalBet = 0;
        
        // Calculate side pots
        for (let i = 0; i < activePlayers.length; i++) {
            const player = activePlayers[i];
            const betDifference = player.bet - totalBet;
            if (betDifference > 0) {
                pots.push({
                    amount: betDifference * (activePlayers.length - i),
                    eligiblePlayers: activePlayers.slice(i)
                });
                totalBet = player.bet;
            }
        }
        
        // Distribute each pot
        for (const pot of pots) {
            const winners = determineWinningHand(pot.eligiblePlayers, table.boardCards);
            const winShare = pot.amount / winners.length;
            console.log(pot.amount)
            console.log(winShare)
            winners.forEach(winner => {
                payouts[winner.uid] = (payouts[winner.uid] || 0) + winShare;
                console.log(winner.obkUsername)
            });
        }
        
        // Return uncalled bets
        activePlayers.forEach(player => {
            const uncalledBet = player.bet - totalBet;
            if (uncalledBet > 0) {
                payouts[player.uid] = (payouts[player.uid] || 0) + uncalledBet;
            }
        });
    }
    
    // Update player balances and reset for next round
    for (const player of table.players) {
        if (payouts[player.uid]) {
            player.bpBalance += payouts[player.uid];
        }
        player.bet = 0;
        player.status = player.status === 'left' ? 'left' : 'active';
        player.hasActed = false;
        player.hand = [];
    }
    
    table.pot = 0;
    table.boardCards = [];
    table.stage = 'pre-flop';
    
    // Emit updated game state and payout information
    io.to(tableId).emit('gameState', getPublicGameState(tableId, null));
    io.to(tableId).emit('roundEnd', {
        payouts: Object.entries(payouts).map(([uid, winnings]) => ({
            obkUsername: table.players.find(p => p.uid === uid).obkUsername,
            winnings
        }))
    });
    
    // Prepare for next round
    setTimeout(() => {
        handleAFKPlayers(io, tableId);
        const remainingPlayers = table.players.filter(player => player.status !== 'left');
        if (remainingPlayers.length >= 2) {
            startGame(io, tableId);
        } else {
            io.to(tableId).emit('message', 'Not enough players to start the game.');
        }
        io.to(tableId).emit('gameState', getPublicGameState(tableId));
        table.players.forEach(player => {
            io.to(player.socketId).emit('gameState', getPublicGameState(tableId, player.uid));
        });
    }, 7000);
};

const dealerAction = (io, tableId) => {
    console.log('dealer action');

    const table = gameState[tableId];
    const previousPlayerIndex = table.currentPlayerIndex;

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
            endRound(io, tableId);
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
        // Restore the previous player index
        table.currentPlayerIndex = previousPlayerIndex;
        moveToNextPlayer(io, tableId);
    }, 5000);

};

const playerJoin = async (io, socket, userId, tableId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(tableId)) {
            throw new Error('Invalid table ID');
        }

        let table = gameState[tableId];

        const user = await User.findOne({ uid: userId });
        if (!user) {
            socket.emit('error', 'User not found.');
            return;
        }

        if (!table) {
            const dbTable = await PokerTable.findById(tableId).populate('players');
            if (!dbTable) {
                socket.emit('error', 'Table not found.');
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
                    bpBalance: player.bpBalance // Include bpBalance
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
            if (existingPlayer.status !== 'folded') {
                existingPlayer.status = 'active';
            }
        } else {
            const isHandInProgress = table.players.some(player => player.hand.length > 0);
            table.players.push({
                uid: userId,
                socketId: socket.id,
                hand: [],
                status: isHandInProgress ? 'folded' : 'active',
                bet: 0,
                obkUsername: user.obkUsername,
                bpBalance: user.bpBalance // Include bpBalance
            });
        }

        table.lastActivity = new Date();

        socket.join(tableId);

        io.to(tableId).emit('gameState', getPublicGameState(tableId));

        const activePlayers = table.players.filter(player => player.status === 'active');
        const isHandInProgress = table.players.some(player => player.hand.length > 0);
        if (activePlayers.length >= 2 && !isHandInProgress) {
            startGame(io, tableId);
        }
    } catch (error) {
        console.error('Error joining player:', error.message);
    }
};


const playerLeave = (io, socketId, tableId) => {
    const table = gameState[tableId];
    const playerIndex = table.players.findIndex(player => player.socketId === socketId);

    if (playerIndex !== -1) {
        const player = table.players[playerIndex];

        // If no hand is currently going on (pre-flop stage with no active players)
        const noActiveHand = table.stage === 'pre-flop' && table.players.every(player => player.bet === 0 && player.hand.length === 0);

        if (noActiveHand) {
            table.players.splice(playerIndex, 1);
            if (table.players.length < 2) {
                resetTableState(table);
            }
        } else {
            player.status = 'left';
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

    afkPlayers.forEach(player => {
        table.players = table.players.filter(p => p.socketId !== player.socketId);
    });

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

const cleanupInactiveTables = async () => {
    const passedTime = new Date(Date.now() - 30 * 60 * 1000);

    try {
        const inactiveTables = await PokerTable.find({ lastActivity: { $lt: passedTime } });

        for (const table of inactiveTables) {
            const tableId = table._id;
            const tableState = gameState[tableId];
            
            if (tableState && tableState.lastActivity >= passedTime) {
                continue;
            }

            delete gameState[tableId];
            await PokerTable.findByIdAndDelete(tableId);
            console.log(`Deleted inactive table: ${table.name} (${tableId})`);
        }
    } catch (err) {
        console.error('Failed to clean up inactive tables:', err);
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
        socket.on('playerJoin', async ({ tableId }) => {
            try {
                await playerJoin(io, socket, socket.userId, tableId);
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
                    playerLeave(io, socket.id, tableId); // Handle disconnection
                }
            } catch (error) {
                console.error('Error handling disconnect:', error.message);
            }
        });
    });

    setInterval(cleanupInactiveTables, 60 * 1000);
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
