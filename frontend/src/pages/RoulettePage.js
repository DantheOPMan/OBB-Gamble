// src/pages/RoulettePage.js
import React, { useEffect, useState } from 'react';
import { Container, Typography, Box } from '@mui/material';
import io from 'socket.io-client';
import { APIURL } from '../constants';
import { placeRouletteBet, auth, getUser, getCurrentRoulette } from '../firebase';
import RouletteWheel from '../components/roulette/RouletteWheel.js';
import RouletteTable from '../components/roulette/RouletteTable';
import ChipSelector from '../components/roulette/ChipSelector';
import BetsDisplay from '../components/roulette/BetsDisplay';

const RoulettePage = () => {
  const [socket, setSocket] = useState(null);
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

  // Fetch user balance
  const fetchUserBalance = async () => {
    try {
      const userId = auth.currentUser.uid;
      const user = await getUser(userId);
      setUserBalance(Number(user.bpBalance));
    } catch (error) {
      console.error('Error fetching user balance:', error);
    }
  };

  // Fetch current roulette round on component mount
  useEffect(() => {
    const fetchCurrentRound = async () => {
      try {
        const data = await getCurrentRoulette();
        if (data.isActive) {
          setRoundInfo(data);
          setBets(data.bets);
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
        }
      } catch (error) {
        console.error('Error fetching current roulette round:', error);
      }
    };

    fetchCurrentRound();
  }, []);

  useEffect(() => {
    fetchUserBalance();
  }, []);

  useEffect(() => {
    const setupSocket = async () => {
      if (!auth.currentUser) {
        console.error('User is not authenticated');
        return;
      }

      try {
        const token = await auth.currentUser.getIdToken();

        const newSocket = io(process.env.REACT_APP_BACKEND_URL || APIURL, {
          path: '/socket.io',
          transports: ['websocket'],
          auth: {
            token,
          },
        });
        setSocket(newSocket);

        const handleConnect = () => {
          console.log('Connected to socket server');
          // Optionally, emit an event to join a specific room or namespace
          newSocket.emit('rouletteJoin', { userId: auth.currentUser.uid });
        };

        const handleNewRound = (data) => {
          setRoundInfo(data);
          setBets([]);
          setPlayerBets([]);
          setWinningNumber(null);
          setTimeRemaining(30);
          setBettingClosed(false);
          setWheelRotation(0);
        };

        const handleNewBet = (data) => {
          setBets((prevBets) => [...prevBets, data.bet]);
        };

        const handleBettingClosed = () => {
          setTimeRemaining(0);
          setBettingClosed(true);
          setClosedTimeRemaining(20); // Adjust as needed
        };

        const handleOutcome = (data) => {
          setWinningNumber(data.winningNumber);
          fetchUserBalance();
        };

        const handleBetResult = (data) => {
          setRoundInfo((currentRound) => {
            if (data.roundId === currentRound?.roundId) {
              setUserBalance(data.newBalance);
              if (data.won) {
                alert(`You won ${data.payout} BP!`);
              } else {
                alert('You lost your bet.');
              }
            }
            return currentRound;
          });
        };
        const handleRoundReset = (data) => {
          console.log('Round reset received:', data);
          setRoundInfo(null);
          setBets([]);
          setPlayerBets([]);
          setWinningNumber(null);
          setTimeRemaining(0);
          setBettingClosed(false);
          setWheelRotation(0);
          setClosedTimeRemaining(0);
        };

        // Event listeners
        newSocket.on('connect', handleConnect);
        newSocket.on('rouletteNewRound', handleNewRound);
        newSocket.on('rouletteNewBet', handleNewBet);
        newSocket.on('rouletteBettingClosed', handleBettingClosed);
        newSocket.on('rouletteOutcome', handleOutcome);
        newSocket.on('rouletteBetResult', handleBetResult);
        newSocket.on('rouletteRoundReset', handleRoundReset);

        // Handle connection errors
        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
        });

        // Clean up on unmount
        return () => {
          if (newSocket) {
            newSocket.off('connect', handleConnect);
            newSocket.off('rouletteNewRound', handleNewRound);
            newSocket.off('rouletteNewBet', handleNewBet);
            newSocket.off('rouletteBettingClosed', handleBettingClosed);
            newSocket.off('rouletteOutcome', handleOutcome);
            newSocket.off('rouletteBetResult', handleBetResult);
            newSocket.off('rouletteRoundReset', handleRoundReset);
            newSocket.disconnect();
          }
        };
      } catch (error) {
        console.error('Error setting up socket connection:', error);
      }
    };

    setupSocket();
  }, []);

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
    if (bettingClosed) return;
    if (selectedChip > userBalance) {
      alert('Insufficient balance for this bet');
      return;
    }

    // Send bet to backend
    try {
      await placeRouletteBet(betType, betValue, selectedChip);
      setUserBalance(userBalance - selectedChip);

      // Add bet to player's bets
      setPlayerBets((prevBets) => [
        ...prevBets,
        { betType, betValue, betAmount: selectedChip },
      ]);
    } catch (error) {
      console.error('Error placing roulette bet:', error);
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
    </Container>
  );
};

export default RoulettePage;
