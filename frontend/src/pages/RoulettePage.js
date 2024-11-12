import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Snackbar, Alert, Modal, Fade, Backdrop, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { initializeSocket } from '../socket'; // Import the socket module
import { placeRouletteBet, auth, getUser, getCurrentRoulette } from '../firebase';
import RouletteWheel from '../components/roulette/RouletteWheel.js';
import RouletteTable from '../components/roulette/RouletteTable';
import ChipSelector from '../components/roulette/ChipSelector';
import BetsDisplay from '../components/roulette/BetsDisplay';
import AllBetsDisplay from '../components/roulette/AllBetsDisplay';

const RoulettePage = () => {
  const [bets, setBets] = useState([]);
  const [roundInfo, setRoundInfo] = useState(null);
  const [winningNumber, setWinningNumber] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [userBalance, setUserBalance] = useState(0);
  const [selectedChip, setSelectedChip] = useState(1); // Default chip value
  const [bettingClosed, setBettingClosed] = useState(false);
  const [playerBets, setPlayerBets] = useState([]); // Track player's bets
  const [closedTimeRemaining, setClosedTimeRemaining] = useState(0);
  const [userId, setUserId] = useState(null); // Add this line

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info'); // 'success', 'error', 'warning', 'info'

  // Outcome Popup state
  const [outcomePopupOpen, setOutcomePopupOpen] = useState(false);
  const [outcomeMessage, setOutcomeMessage] = useState('');

  // **Remove references to betResultsRef and outcomeTimerSetRef**
  // const betResultsRef = useRef([]);
  // const outcomeTimerSetRef = useRef(false);

  // Function to show Snackbar
  const showSnackbar = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Handle Snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // Fetch user balance
  const fetchUserBalance = async () => {
    try {
      const userId = auth.currentUser.uid;
      const user = await getUser(userId);
      setUserBalance(Number(user.bpBalance));
    } catch (error) {
      console.error('Error fetching user balance:', error);
      showSnackbar('Failed to fetch user balance.', 'error');
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      setUserId(auth.currentUser.uid);
      fetchUserBalance();
    }
  }, [auth.currentUser]);

  // Fetch current roulette round on component mount
  useEffect(() => {
    const fetchCurrentRound = async () => {
      try {
        const data = await getCurrentRoulette();
        if (data.isActive) {
          setRoundInfo(data);
          setBets(data.bets);

          // Filter and set player's own bets
          const userSpecificBets = data.bets.filter(bet => bet.userId === userId);
          setPlayerBets(userSpecificBets);

          // Calculate time remaining
          const bettingDuration = 30; // 30 seconds
          const timeElapsed = (Date.now() - new Date(data.startTime).getTime()) / 1000;
          const timeRem = Math.max(Math.floor(bettingDuration - timeElapsed), 0);
          setTimeRemaining(timeRem);
          if (timeRem <= 0) {
            setBettingClosed(true);
            setClosedTimeRemaining(20); // Adjust as needed
          }
        } else {
          setRoundInfo(null);
          setBets([]);
          setPlayerBets([]);
        }
      } catch (error) {
        console.error('Error fetching current roulette round:', error);
        showSnackbar('Failed to fetch current roulette round.', 'error');
      }
    };

    if (userId) {
      fetchCurrentRound();
    }
  }, [userId]);

  useEffect(() => {
    if (roundInfo && userId) {
      const userSpecificBets = roundInfo.bets.filter(bet => bet.userId === userId);
      setPlayerBets(userSpecificBets);
    }
  }, [roundInfo, userId]);

  useEffect(() => {
    const setupSocket = async () => {
      if (!auth.currentUser) {
        console.error('User is not authenticated');
        return;
      }

      try {
        const socket = await initializeSocket(); // Initialize the singleton socket

        const handleConnect = () => {
          console.log('Connected to socket server');
          showSnackbar('Connected to server.', 'success');
        };

        const handleNewRound = (data) => {
          setRoundInfo(data);
          console.log("handle new round");
          setBets(data.bets);
          const userSpecificBets = data.bets.filter(bet => bet.userId === userId);
          setPlayerBets(userSpecificBets);
          setWinningNumber(null);
          setTimeRemaining(30);
          setBettingClosed(false);
          setWheelRotation(0);
          showSnackbar('A new round has started!', 'info');

          // Automatically close the outcome popup when a new round starts
          setOutcomePopupOpen(false);
          setOutcomeMessage('');

          // **Remove references to betResultsRef and outcomeTimerSetRef**
          // betResultsRef.current = [];
          // outcomeTimerSetRef.current = false;
        };

        const handleNewBet = (data) => {
          setBets((prevBets) => [...prevBets, data.bet]);

          // If the new bet is from the current user, add it to playerBets
          if (data.bet.userId === userId) {
            setPlayerBets((prevPlayerBets) => [...prevPlayerBets, data.bet]);
            showSnackbar('Your bet has been placed!', 'success');
          } else {
            showSnackbar('A new bet has been placed!', 'info');
          }
        };

        const handleBettingClosed = () => {
          setTimeRemaining(0);
          setBettingClosed(true);
          setClosedTimeRemaining(20); // Adjust as needed
          showSnackbar('Betting is now closed.', 'warning');
        };


        const handleOutcome = (data) => {
          setWinningNumber(data.winningNumber);
        };

        const handleTotalPayout = (data) => {
          console.log("payout reset");

          if (data.totalPayout > 0) {
            setOutcomeMessage(`Congratulations! You won ${data.totalPayout} BP!`);
          } else {
            setOutcomeMessage('Sorry, you lost everything.');
          }
          setOutcomePopupOpen(true);

          // **Keep the popup open for at least 5 seconds**
          setTimeout(() => {
            setOutcomePopupOpen(false);
          }, 10000);
        };

        const handleRoundReset = (data) => {
          console.log("round reset");
          setRoundInfo(null);
          setBets([]);
          setPlayerBets([]);
          setWinningNumber(null);
          setTimeRemaining(0);
          setBettingClosed(false);
          setWheelRotation(0);
          setClosedTimeRemaining(0);
          showSnackbar('Round has been reset.', 'info');

          // **Ensure that outcome references are reset**
          // betResultsRef.current = [];
          // outcomeTimerSetRef.current = false;
        };

        // Event listeners
        socket.on('connect', handleConnect);
        socket.on('rouletteNewRound', handleNewRound);
        socket.on('rouletteNewBet', handleNewBet);
        socket.on('rouletteBettingClosed', handleBettingClosed);
        socket.on('rouletteOutcome', handleOutcome);
        socket.on('rouletteTotalPayout', handleTotalPayout);
        socket.on('rouletteRoundReset', handleRoundReset);

        // Handle connection errors
        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          showSnackbar('Failed to connect to server.', 'error');
        });

        // Clean up on unmount
        return () => {
          if (socket) {
            socket.off('connect', handleConnect);
            socket.off('rouletteNewRound', handleNewRound);
            socket.off('rouletteNewBet', handleNewBet);
            socket.off('rouletteBettingClosed', handleBettingClosed);
            socket.off('rouletteOutcome', handleOutcome);
            socket.off('rouletteTotalPayout', handleTotalPayout);
            socket.off('rouletteRoundReset', handleRoundReset);
            socket.disconnect();
          }
        };
      } catch (error) {
        console.error('Error setting up socket connection:', error);
        showSnackbar('Failed to set up socket connection.', 'error');
      }
    };

    if (userId) {
      setupSocket();
    }
  }, [userId]);

  useEffect(() => {
    let timer = null;
    if (timeRemaining > 0 && !bettingClosed) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setBettingClosed(true);
            setClosedTimeRemaining(20); // Adjust as needed
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeRemaining, bettingClosed]);

  useEffect(() => {
    if (winningNumber !== null) {
      // Calculate rotation to stop at the winning number
      const numberPositions = [
        0, 32, 15, 19, 4, 21, 2, 25,
        17, 34, 6, 27, 13, 36, 11, 30,
        8, 23, 10, 5, 24, 16, 33, 1,
        20, 14, 31, 9, 22, 18, 29, 7,
        28, 12, 35, 3, 26
      ]; // Standard European wheel

      const index = numberPositions.indexOf(winningNumber);
      const degreePerNumber = 360 / 37;
      const randomSpins = 3; // Number of full spins before stopping
      const stopAngle = randomSpins * 360 + index * degreePerNumber + (degreePerNumber / 2);

      setWheelRotation(stopAngle);
    }
  }, [winningNumber]);

  const handleBetClick = async (betType, betValue) => {
    if (bettingClosed) {
      showSnackbar('Betting is closed for this round.', 'warning');
      return;
    }
    if (selectedChip > userBalance) {
      showSnackbar('Insufficient balance for this bet.', 'error');
      return;
    }

    // Send bet to backend
    try {
      await placeRouletteBet(betType, betValue, selectedChip);
      setUserBalance(userBalance - selectedChip);

      // Removed the direct update to playerBets
      // The UI will be updated via the 'rouletteNewBet' Socket.io event
    } catch (error) {
      console.error('Error placing roulette bet:', error);
      showSnackbar('Failed to place bet. Please try again.', 'error');
    }
  };

  // Calculate total bets on a betting option
  const getTotalBetAmount = (betType, betValue) => {
    return bets.reduce((total, bet) => {
      if (
        bet.betType === betType &&
        JSON.stringify(bet.betValue) === JSON.stringify(betValue)
      ) {
        return total + bet.betAmount;
      }
      return total;
    }, 0);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ marginBottom: 2 }}>
        <Typography variant="h6">
          Balance: {userBalance.toLocaleString()} BP
        </Typography>
      </Box>
      <Typography variant="h4" gutterBottom>Roulette</Typography>
      {roundInfo === null ? (
        <Typography variant="h6">No active round. Place a bet to start a new round.</Typography>
      ) : bettingClosed ? (
        closedTimeRemaining > 0 ? (
          <Typography variant="h6">Waiting for outcome... {closedTimeRemaining} seconds</Typography>
        ) : (
          <Typography variant="h6">Waiting for next round...</Typography>
        )
      ) : timeRemaining > 0 ? (
        <Typography variant="h6">Time remaining to place bets: {timeRemaining} seconds</Typography>
      ) : (
        <Typography variant="h6">Waiting for outcome...</Typography>
      )}

      {/* Chip Selection */}
      <ChipSelector selectedChip={selectedChip} setSelectedChip={setSelectedChip} />

      <Box
        sx={{
          marginTop: 2,
          marginBottom: 2,
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {/* Roulette Table */}
        <RouletteTable
          handleBetClick={handleBetClick}
          renderTotalBet={(betType, betValue) => getTotalBetAmount(betType, betValue)}
          renderPlayerBet={(betType, betValue) => {
            const bet = playerBets.find(
              (b) =>
                b.betType === betType &&
                JSON.stringify(b.betValue) === JSON.stringify(betValue)
            );
            if (bet) {
              return (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: '5px',
                    right: '5px',
                    backgroundColor: 'yellow',
                    color: 'black',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                  }}
                >
                  {bet.betAmount}
                </Box>
              );
            }
            return null;
          }}
        />

        {/* Roulette Wheel */}
        <RouletteWheel
          wheelRotation={wheelRotation}
          winningNumber={winningNumber}
        />
      </Box>

      {/* Display bets */}
      <BetsDisplay playerBets={playerBets} />

      {/* Display all bets */}
      <AllBetsDisplay allBets={bets} currentUserId={userId} />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Outcome Popup */}
      <Modal
        open={outcomePopupOpen}
        onClose={() => setOutcomePopupOpen(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
        aria-labelledby="outcome-popup-title"
        aria-describedby="outcome-popup-description"
      >
        <Fade in={outcomePopupOpen}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 300,
              bgcolor: '#333', // Dark gray background
              border: '2px solid #444', // Dark gray border
              boxShadow: 24,
              p: 4,
              textAlign: 'center',
              color: '#fff', // White text
              borderRadius: 2, // Optional: rounded corners for better aesthetics
            }}
          >
            {/* Close Button */}
            <IconButton
              aria-label="close"
              onClick={() => setOutcomePopupOpen(false)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: '#fff',
              }}
            >
              <CloseIcon />
            </IconButton>

            <Typography id="outcome-popup-title" variant="h6" component="h2">
              Round Result
            </Typography>
            <Typography id="outcome-popup-description" sx={{ mt: 2 }}>
              {outcomeMessage}
            </Typography>
          </Box>
        </Fade>
      </Modal>
    </Container>
  );
};

export default RoulettePage;
