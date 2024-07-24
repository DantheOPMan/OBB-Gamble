const mongoose = require('mongoose');
const User = require('../models/userModel');
const PokerTable = require('../models/pokerTableModel');
const pokerEvaluator = require('poker-evaluator');

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
            return `${value[0]}${card.suit[0]}`;
        });

        // Evaluate the hand
        const handResult = pokerEvaluator.evalHand(handStrings);
        
        // Determine if this hand is better than the current best
        if (!bestHand || handResult.value > bestHand.value) {
            bestHand = handResult;
            bestPlayers = [player];
        } else if (handResult.value === bestHand.value) {
            bestPlayers.push(player);
        }
    });

    return bestPlayers;
};

let gameState = {};

const rotateBlinds = (table) => {
    table.smallBlindIndex = (table.smallBlindIndex + 1) % table.players.length;
    table.bigBlindIndex = (table.bigBlindIndex + 1) % table.players.length;
};

const startGame = async (io, tableId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(tableId)) {
            throw new Error('Invalid table ID');
        }

        const table = gameState[tableId];

        const activePlayers = table.players.filter(player => player.status === 'waiting' || player.status === 'active');
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
        }));

        table.players[table.smallBlindIndex].bet = table.smallBlind;
        table.players[table.bigBlindIndex].bet = table.bigBlind;
        table.pot = table.smallBlind + table.bigBlind;

        table.deck = newDeck;
        table.currentPlayerIndex = (table.bigBlindIndex + 1) % table.players.length;
        table.remainingTime = 15;
        table.boardCards = [];
        table.stage = 'pre-flop';

        io.to(tableId).emit('gameState', getPublicGameState(tableId));

        startTurnTimer(io, tableId);
    } catch (error) {
        console.error('Error starting game:', error.message);
    }
};

const startTurnTimer = (io, tableId) => {
    const intervalId = setInterval(() => {
        const table = gameState[tableId];
        if (!table) return;

        const currentPlayer = table.players[table.currentPlayerIndex];

        if (table.remainingTime > 0) {
            table.remainingTime -= 1;
        } else {
            if (currentPlayer && currentPlayer.status === 'active') {
                currentPlayer.status = 'folded';
            }
            moveToNextPlayer(io, tableId);

            const activePlayers = table.players.filter(p => p.status === 'active');
            if (activePlayers.length <= 1) {
                endRound(io, tableId);
            }
        }
        table.players.forEach(player => {
            io.to(player.socketId).emit('gameState', getPublicGameState(tableId, player.uid));
        });
    }, 1000);

    gameState[tableId].intervalId = intervalId;
};

const moveToNextPlayer = (io, tableId) => {
    const table = gameState[tableId];

    do {
        table.currentPlayerIndex = (table.currentPlayerIndex + 1) % table.players.length;
    } while (table.players[table.currentPlayerIndex].status !== 'active' && table.players[table.currentPlayerIndex].status !== 'all-in');

    table.remainingTime = 15;

    table.players.forEach(player => {
        io.to(player.socketId).emit('gameState', getPublicGameState(tableId, player.uid));
    });
};

const handlePlayerAction = (io, tableId, playerIndex, action, amount) => {
    const table = gameState[tableId];
    const player = table.players[playerIndex];
    const highestBet = Math.max(...table.players.map(p => p.bet));

    switch (action) {
        case 'bet':
            player.bet += amount;
            table.pot += amount;
            break;
        case 'call':
            const callAmount = highestBet - player.bet;
            player.bet += callAmount;
            table.pot += callAmount;
            break;
        case 'raise':
            const raiseAmount = amount;
            player.bet += raiseAmount;
            table.pot += raiseAmount;
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

    table.lastActivity = new Date();

    if (table.players.every(p => p.status !== 'active' || p.bet === highestBet || p.status === 'all-in')) {
        dealerAction(io, tableId);
    } else {
        moveToNextPlayer(io, tableId);
    }
};

const endRound = async (io, tableId) => {
    const table = gameState[tableId];
    const activePlayers = table.players.filter(player => player.status === 'active');
    if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        winner.status = 'waiting';
        winner.bet = 0;

        const user = await User.findOne({ uid: winner.uid });
        user.handsWon += 1;
        await user.save();

        table.pot = 0;
    } else {
        const winners = determineWinningHand(activePlayers, table.boardCards);

        const splitPot = table.pot / winners.length;
        for (const winner of winners) {
            const user = await User.findOne({ uid: winner.uid });
            user.handsWon += 1;
            await user.save();
        }
        table.pot = 0;
    }

    for (const player of table.players) {
        const user = await User.findOne({ uid: player.uid });
        user.handsPlayed += 1;
        await user.save();

        player.bet = 0;
        player.status = 'waiting';
    }

    table.stage = 'pre-flop';
    table.boardCards = [];
    table.deck = shuffleDeck(createDeck());
    const playerHands = dealCards(table.deck, table.players.length);
    table.players.forEach((player, index) => {
        player.hand = playerHands[index];
    });

    table.players.forEach(player => {
        io.to(player.socketId).emit('gameState', getPublicGameState(tableId, player.uid));
    });

    setTimeout(() => {
        startGame(io, tableId);
    }, 5000);
};

const dealerAction = (io, tableId) => {
    const table = gameState[tableId];

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

    moveToNextPlayer(io, tableId);
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
                players: dbTable.players.map(player => ({
                    uid: player.uid,
                    hand: [],
                    status: 'waiting',
                    bet: 0,
                    obkUsername: player.obkUsername
                })),
                spectators: [],
                pot: 0,
                currentPlayerIndex: 0,
                remainingTime: 15,
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

        const existingPlayer = table.players.find(player => player.uid === userId);
        if (existingPlayer) {
            existingPlayer.socketId = socket.id;
            existingPlayer.status = 'active';
        } else {
            table.players.push({
                uid: userId,
                socketId: socket.id,
                hand: [],
                status: 'waiting',
                bet: 0,
                obkUsername: user.obkUsername
            });
        }

        table.lastActivity = new Date();

        socket.join(tableId);

        table.players.forEach(player => {
            io.to(player.socketId).emit('gameState', getPublicGameState(tableId, player.uid));
        });

        const activePlayers = table.players.filter(player => player.status === 'waiting' || player.status === 'active');
        if (activePlayers.length >= 2) {
            startGame(io, tableId);
        }
    } catch (error) {
        console.error('Error joining player:', error.message);
    }
};

const playerLeave = async (io, socketId, tableId) => {
    const table = gameState[tableId];
    const player = table.players.find(player => player.socketId === socketId);
    if (player) {
        player.status = 'left';
        io.to(tableId).emit('gameState', getPublicGameState(tableId, player.uid));
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
                players: dbTable.players.map(player => ({
                    uid: player.uid,
                    hand: [],
                    status: 'waiting',
                    bet: 0,
                    obkUsername: player.obkUsername,
                })),
                spectators: [],
                pot: 0,
                currentPlayerIndex: 0,
                remainingTime: 15,
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

        table.spectators.push({
            socketId: socket.id,
        });

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
        players: table.players.map(player => ({
            uid: player.uid,
            status: player.status,
            bet: player.bet,
            hand: player.uid === userId ? player.hand : null,
            obkUsername: player.obkUsername,
        })),
        pot: table.pot,
        currentPlayerIndex: table.currentPlayerIndex,
        remainingTime: table.remainingTime,
        boardCards: table.boardCards,
        stage: table.stage,
        bigBlind: table.bigBlind,
        smallBlind: table.smallBlind,
    };
};

const cleanupInactiveTables = async () => {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    try {
        const inactiveTables = await PokerTable.find({ lastActivity: { $lt: fifteenMinutesAgo } });

        for (const table of inactiveTables) {
            delete gameState[table._id];
            await PokerTable.findByIdAndDelete(table._id);
            console.log(`Deleted inactive table: ${table.name} (${table._id})`);
        }
    } catch (err) {
        console.error('Failed to clean up inactive tables:', err);
    }
};

const setupPokerController = (io) => {
    io.on('connection', (socket) => {
        socket.on('playerJoin', async ({ userId, tableId }) => {
            try {
                await playerJoin(io, socket, userId, tableId);
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
                const { tableId, playerIndex, action, amount } = data;
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
                    spectatorLeave(io, socket.id, tableId);
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
        const inMemoryTable = gameState[tableId];
        if (inMemoryTable) {
            return {
                id: tableId,
                name: inMemoryTable.name || 'Unnamed Table',
                players: inMemoryTable.players.length,
                maxPlayers: 9,
            };
        }

        const table = await PokerTable.findById(tableId).populate('players');
        if (!table) {
            console.error('Table not found:', tableId);
            return null;
        }
        let name = table.name ? table.name : 'Unnamed';
        return {
            id: table._id,
            name,
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
