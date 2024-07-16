// backend/controllers/pokerController.js
const User = require('../models/userModel');

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

let gameState = {
  deck: [],
  players: [],
  spectators: [],
  pot: 0,
  currentPlayerIndex: 0,
  remainingTime: 30,
  boardCards: [],
  bigBlind: 0,
  smallBlind: 0,
};

const startGame = (io) => {
  const newDeck = shuffleDeck(createDeck());
  const playerHands = dealCards(newDeck, gameState.players.length);
  gameState.players = gameState.players.map((player, index) => ({
    ...player,
    hand: playerHands[index],
    status: 'active',
    bet: 0,
  }));
  gameState.deck = newDeck;
  gameState.pot = 0;
  gameState.currentPlayerIndex = 0;
  gameState.remainingTime = 30;
  gameState.boardCards = [];
  io.emit('gameState', getPublicGameState());
};

const handlePlayerAction = (io, playerIndex, action, amount) => {
  // Implement player action logic here
  // Move to the next player's turn
  gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  gameState.remainingTime = 30;
  io.emit('gameState', getPublicGameState());
};

const playerJoin = (io, socket, userId) => {
  if (gameState.players.length >= 9) {
    socket.emit('error', 'Game is full.');
    return;
  }

  User.findById(userId, (err, user) => {
    if (err || !user) {
      socket.emit('error', 'User not found.');
      return;
    }

    gameState.players.push({
      id: userId,
      socketId: socket.id,
      email: user.email,
      hand: [],
      status: 'waiting',
      bet: 0,
    });

    io.emit('gameState', getPublicGameState());
  });
};

const playerLeave = (io, socketId) => {
  gameState.players = gameState.players.filter(player => player.socketId !== socketId);
  gameState.spectators = gameState.spectators.filter(spectator => spectator.socketId !== socketId);
  io.emit('gameState', getPublicGameState());
};

const spectatorJoin = (io, socket) => {
  gameState.spectators.push({
    socketId: socket.id,
  });

  io.emit('gameState', getPublicGameState());
};

const spectatorLeave = (io, socketId) => {
  gameState.spectators = gameState.spectators.filter(spectator => spectator.socketId !== socketId);
  io.emit('gameState', getPublicGameState());
};

const getPublicGameState = () => {
  return {
    players: gameState.players.map(player => ({
      id: player.id,
      email: player.email,
      status: player.status,
      bet: player.bet,
      // Only include hand if player is active and it's their own hand
      hand: player.handVisible ? player.hand : null,
    })),
    pot: gameState.pot,
    currentPlayerIndex: gameState.currentPlayerIndex,
    remainingTime: gameState.remainingTime,
    boardCards: gameState.boardCards,
    bigBlind: gameState.bigBlind,
    smallBlind: gameState.smallBlind,
  };
};

const setupPokerController = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('playerJoin', (userId) => {
      playerJoin(io, socket, userId);
    });

    socket.on('playerLeave', () => {
      playerLeave(io, socket.id);
    });

    socket.on('spectatorJoin', () => {
      spectatorJoin(io, socket);
    });

    socket.on('spectatorLeave', () => {
      spectatorLeave(io, socket.id);
    });

    socket.on('startGame', () => {
      startGame(io);
    });

    socket.on('playerAction', (data) => {
      const { playerIndex, action, amount } = data;
      handlePlayerAction(io, playerIndex, action, amount);
    });

    socket.on('disconnect', () => {
      playerLeave(io, socket.id);
      spectatorLeave(io, socket.id);
      console.log('Client disconnected');
    });
  });
};

module.exports = setupPokerController;
