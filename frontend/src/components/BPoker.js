import React, { useState, useEffect } from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import io from 'socket.io-client';
import Player from './Player';

const socket = io('http://localhost:3001');

const StyledContainer = styled(Container)(({ theme }) => ({
  marginTop: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  backgroundColor: theme.palette.grey[800],
  color: theme.palette.common.white,
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[5]
}));

const BPoker = () => {
  const [gameState, setGameState] = useState({
    deck: [],
    players: [],
    pot: 0,
    currentPlayerIndex: 0,
    remainingTime: 30
  });

  useEffect(() => {
    socket.on('gameState', (state) => {
      setGameState(state);
    });

    return () => {
      socket.off('gameState');
    };
  }, []);

  useEffect(() => {
    if (gameState.remainingTime === 0) {
      handlePlayerAction(gameState.currentPlayerIndex, 'fold');
    }
  }, [gameState.remainingTime]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (gameState.remainingTime > 0) {
        setGameState((prevState) => ({
          ...prevState,
          remainingTime: prevState.remainingTime - 1
        }));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameState.remainingTime]);

  const handlePlayerAction = (playerIndex, action) => {
    socket.emit('playerAction', { playerIndex, action });
  };

  const joinGame = (userId) => {
    socket.emit('playerJoin', userId);
  };

  const leaveGame = () => {
    socket.emit('playerLeave');
  };

  return (
    <StyledContainer>
      <Typography variant="h3" align="center" gutterBottom>
        Poker Game
      </Typography>
      <Typography variant="h6" align="center" gutterBottom>
        Pot: {gameState.pot}
      </Typography>
      <Typography variant="h6" align="center" gutterBottom>
        Current Player: {gameState.players[gameState.currentPlayerIndex]?.name}
      </Typography>
      <Typography variant="h6" align="center" gutterBottom>
        Time Remaining: {gameState.remainingTime} seconds
      </Typography>
      <Box display="flex" flexWrap="wrap" justifyContent="center">
        {gameState.players.map((player, index) => (
          <Player
            key={index}
            player={player}
            onFold={() => handlePlayerAction(index, 'fold')}
            onCall={() => handlePlayerAction(index, 'call')}
            onRaise={() => handlePlayerAction(index, 'raise')}
          />
        ))}
      </Box>
      <Button variant="contained" color="primary" onClick={() => joinGame('user-id')}>
        Join Game
      </Button>
      <Button variant="contained" color="secondary" onClick={leaveGame}>
        Leave Game
      </Button>
    </StyledContainer>
  );
};

export default BPoker;
