import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { auth, getUser } from '../firebase';
import { Container, Button, Typography, Card, CardContent, TextField, Box, Modal, Fade } from '@mui/material';
import { styled } from '@mui/system';
import MuiAlert from '@mui/material/Alert';

const StyledContainer = styled(Container)(({ theme }) => ({
  backgroundColor: theme.palette.grey[900],
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  minHeight: '100vh',
  color: theme.palette.common.white,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.grey[800],
  color: theme.palette.common.white,
  textAlign: 'center',
  margin: theme.spacing(1),
  width: '200px',
  height: '200px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  '&.active': {
    backgroundColor: theme.palette.grey[700],
  }
}));

const StyledButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1),
}));

const OvalTable = styled('div')(({ theme }) => ({
  position: 'relative',
  width: '1000px',
  height: '600px',
  backgroundColor: '#3b6e3b',
  borderRadius: '50% / 30%',
  marginBottom: theme.spacing(2),
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  left: '50%',
  transform: 'translateX(-50%)',
  '& > div': {
    position: 'absolute',
    width: '200px',
    height: '200px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    '&:nth-of-type(1)': { top: '0%', left: '25%' },
    '&:nth-of-type(2)': { top: '0%', left: '55%' },
    '&:nth-of-type(3)': { top: '10%', left: '80%' },
    '&:nth-of-type(4)': { top: '45%', left: '80%' },
    '&:nth-of-type(5)': { top: '65%', left: '60%' },
    '&:nth-of-type(6)': { top: '65%', left: '40%' },
    '&:nth-of-type(7)': { top: '65%', left: '20%' },
    '&:nth-of-type(8)': { top: '45%', left: '0%' },
    '&:nth-of-type(9)': { top: '10%', left: '0%' }
  }
}));

const CenterContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[800],
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(2),
}));

const BoardCardsContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
}));

const CardBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: theme.spacing(1),
}));

const PlayingCard = styled('div')(({ theme }) => ({
  width: '30px',
  height: '45px',
  backgroundColor: 'white',
  color: 'black',
  border: '1px solid black',
  borderRadius: '4px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  margin: theme.spacing(0.5),
}));

const suitSymbols = {
  Hearts: <span style={{ color: 'red' }}>♥</span>,
  Diamonds: <span style={{ color: 'red' }}>♦</span>,
  Clubs: '♣',
  Spades: '♠'
};

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const StyledModalBox = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: theme.palette.grey[800],
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  color: theme.palette.common.white,
}));

const PokerTablePage = () => {
  const { tableId } = useParams();
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [errorOpen, setErrorOpen] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [roundEndInfo, setRoundEndInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (tableId && auth.currentUser) {
      const newSocket = io('http://localhost:3001', {
        path: '/socket.io'
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('spectatorJoin', { tableId });
      });

      newSocket.on('gameState', (state) => {
        console.log('Game State:', state);
        setGameState(state);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        setErrorMessage(error.message || 'An error occurred');
        setErrorDetails(error.details || '');
        setErrorOpen(true);
        setTimeout(() => {
          setErrorOpen(false);
        }, 7000);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connect_error:', error);
        setErrorMessage('Failed to connect to the server');
        setErrorOpen(true);
        setTimeout(() => {
          setErrorOpen(false);
        }, 7000);
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log(`Socket reconnected after ${attemptNumber} attempts`);
      });
 
      newSocket.on('winners', ({ winningUsernames }) => {
        console.log('Winning Players:', winningUsernames);
        setErrorMessage(`Winning Players: ${winningUsernames.join(', ')}`);
        setErrorOpen(true);
        setTimeout(() => {
          setErrorOpen(false);
        }, 7000);
      });

      newSocket.on('roundEnd', ({ winners, pot }) => {
        setRoundEndInfo({ winners, pot });
        setTimeout(() => {
          setRoundEndInfo(null);
        }, 7000);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [tableId]);

  const handleJoinTable = async () => {
    try {
      const user = await getUser(auth.currentUser.uid);
      if (socket) {
        socket.emit('playerJoin', { userId: user.uid, tableId });
      }
    } catch (error) {
      console.error('Failed to join table:', error);
      setErrorMessage('Failed to join table');
      setErrorOpen(true);
      setTimeout(() => {
        setErrorOpen(false);
      }, 7000);
    }
  };

  const handlePlayerAction = (action, amount = 0) => {
    if (socket && gameState) {
      const playerIndex = gameState.players.findIndex(player => player.uid === auth.currentUser.uid);
      if (playerIndex !== -1) {
        socket.emit('playerAction', { tableId, playerIndex, action, amount });
      } else {
        console.error('Player not found in game state.');
        setErrorMessage('Player not found in game state');
        setErrorOpen(true);
        setTimeout(() => {
          setErrorOpen(false);
        }, 7000);
      }
    }
  };

  const handleBack = () => {
    navigate('/casino/poker');
  };

  const handleCloseError = () => {
    setErrorOpen(false);
  };

  const handleCloseRoundEnd = () => {
    setRoundEndInfo(null);
  };

  const isPlayerTurn = () => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    return currentPlayer && currentPlayer.uid === auth.currentUser.uid;
  };

  const renderPlayer = (player, index) => {
    const isActive = gameState.currentPlayerIndex === index;
    const isSmallBlind = gameState.smallBlindIndex === index;
    const isBigBlind = gameState.bigBlindIndex === index;

    return (
      <StyledCard key={index} className={isActive ? 'active' : ''}>
        <CardContent>
          {player ? (
            <>
              <Typography variant="subtitle1" noWrap>{player.obkUsername || '?'}</Typography>
              <Typography variant="body2">Status: {player.status || '?'}</Typography>
              <Typography variant="body2">Bet: {player.bet || '?'}</Typography>
              <Typography variant="body2">Balance: {player.bpBalance || '?'}</Typography> {/* Display bpBalance */}
              {isSmallBlind && <Typography variant="body2" color="secondary">(Small Blind)</Typography>}
              {isBigBlind && <Typography variant="body2" color="primary">(Big Blind)</Typography>}
              {auth.currentUser.uid === player.uid && player.hand && (
                <CardBox>
                  {player.hand.map((card, idx) => (
                    <PlayingCard key={idx}>
                      <Typography variant="caption">{card.value}</Typography>
                      <Typography variant="caption">{suitSymbols[card.suit]}</Typography>
                    </PlayingCard>
                  ))}
                </CardBox>
              )}
              {auth.currentUser.uid !== player.uid && player.status === 'active' && (
                <CardBox>
                  <PlayingCard>
                    <Typography variant="caption">?</Typography>
                    <Typography variant="caption">?</Typography>
                  </PlayingCard>
                  <PlayingCard>
                    <Typography variant="caption">?</Typography>
                    <Typography variant="caption">?</Typography>
                  </PlayingCard>
                </CardBox>
              )}
              {isActive && <Typography variant="body2" color="error">Time left: {gameState.remainingTime}s</Typography>}
            </>
          ) : (
            <Typography variant="subtitle1">Empty</Typography>
          )}
        </CardContent>
      </StyledCard>
    );
  };

  return (
    <StyledContainer>
      <StyledButton variant="contained" color="secondary" onClick={handleBack}>
        Back
      </StyledButton>
      {gameState ? (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <Typography variant="h5">Table: {gameState.name || '?'}</Typography>
          <CenterContainer>
            <Typography variant="body1">Pot: {gameState.pot || '?'}</Typography>
            <BoardCardsContainer>
              {gameState.boardCards && gameState.boardCards.map((card, index) => (
                <PlayingCard key={index}>
                  <Typography variant="caption">{card.value}</Typography>
                  <Typography variant="caption">{suitSymbols[card.suit]}</Typography>
                </PlayingCard>
              ))}
            </BoardCardsContainer>
          </CenterContainer>
          <OvalTable>
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index}>
                {renderPlayer(gameState.players[index], index)}
              </div>
            ))}
          </OvalTable>
          <div>
            <StyledButton
              variant="contained"
              color="primary"
              onClick={handleJoinTable}
              disabled={gameState.players.some(player => player.uid === auth.currentUser.uid)}
            >
              Join Table
            </StyledButton>
            <TextField
              type="number"
              label="Raise Amount"
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(Number(e.target.value))}
              variant="filled"
              InputProps={{ style: { color: 'white' } }}
              InputLabelProps={{ style: { color: 'grey' } }}
              disabled={!isPlayerTurn()}
            />
            <StyledButton
              variant="contained"
              color="secondary"
              onClick={() => handlePlayerAction('bet', raiseAmount)}
              disabled={!isPlayerTurn()}
            >
              Bet
            </StyledButton>
            <StyledButton
              variant="contained"
              color="secondary"
              onClick={() => handlePlayerAction('call')}
              disabled={!isPlayerTurn()}
            >
              Call
            </StyledButton>
            <StyledButton
              variant="contained"
              color="secondary"
              onClick={() => handlePlayerAction('fold')}
              disabled={!isPlayerTurn()}
            >
              Fold
            </StyledButton>
            <StyledButton
              variant="contained"
              color="secondary"
              onClick={() => handlePlayerAction('check')}
              disabled={!isPlayerTurn()}
            >
              Check
            </StyledButton>
            <StyledButton
              variant="contained"
              color="secondary"
              onClick={() => handlePlayerAction('all-in')}
              disabled={!isPlayerTurn()}
            >
              All in
            </StyledButton>
          </div>
        </div>
      ) : (
        <Typography variant="h6">Loading table...</Typography>
      )}
      <Modal open={errorOpen} onClose={handleCloseError} closeAfterTransition>
        <Fade in={errorOpen}>
          <StyledModalBox>
            <Alert onClose={handleCloseError} severity="error" sx={{ bgcolor: 'grey.900' }}>
              {errorMessage}
              {errorDetails && (
                <Typography variant="body2" sx={{ mt: 2 }}>
                  {errorDetails}
                </Typography>
              )}
            </Alert>
          </StyledModalBox>
        </Fade>
      </Modal>
      <Modal open={roundEndInfo !== null} onClose={handleCloseRoundEnd} closeAfterTransition>
        <Fade in={roundEndInfo !== null}>
          <StyledModalBox>
            <Alert onClose={handleCloseRoundEnd} severity="info" sx={{ bgcolor: 'grey.900' }}>
              {roundEndInfo && `Winners: ${roundEndInfo.winners.join(', ')} | Pot: ${roundEndInfo.pot}`}
            </Alert>
          </StyledModalBox>
        </Fade>
      </Modal>
    </StyledContainer>
  );
};

export default PokerTablePage;
