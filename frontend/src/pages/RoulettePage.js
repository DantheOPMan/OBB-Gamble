import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Button, Box, Grid, Dialog, DialogTitle,
  DialogContent, DialogActions, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import io from 'socket.io-client';
import { APIURL } from '../constants';
import { placeRouletteBet, auth, getUser } from '../firebase';

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

  useEffect(() => {
    fetchUserBalance();
  }, []);

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
      const randomSpins = 5; // Number of full spins before stopping
      const stopAngle = randomSpins * 360 - index * degreePerNumber;

      setWheelRotation(stopAngle);
    }
  }, [winningNumber]);

  useEffect(() => {
    const userId = auth.currentUser.uid;
    const newSocket = io(APIURL, {
      path: '/socket.io',
      transports: ['websocket'],
      query: {
        userId,
      },
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    newSocket.on('rouletteNewRound', (data) => {
      setRoundInfo(data);
      setBets([]);
      setPlayerBets([]);
      setWinningNumber(null);
      // Set timeRemaining to total betting duration (e.g., 20 seconds)
      setTimeRemaining(20);
      setBettingClosed(false);
    });

    newSocket.on('rouletteNewBet', (data) => {
      setBets((prevBets) => [...prevBets, data.bet]);
    });

    newSocket.on('rouletteBettingClosed', (data) => {
      setTimeRemaining(0);
      setBettingClosed(true);
    });

    newSocket.on('rouletteOutcome', (data) => {
      setWinningNumber(data.winningNumber);
      fetchUserBalance();
    });

    newSocket.on('rouletteBetResult', (data) => {
      if (data.roundId === roundInfo.roundId) {
        setUserBalance(data.newBalance);
        if (data.won) {
          alert(`You won ${data.payout} BP!`);
        } else {
          alert('You lost your bet.');
        }
      }
    });

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, [roundInfo]);

  useEffect(() => {
    let timer = null;
    if (timeRemaining > 0) {
      timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [timeRemaining]);

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

  const generateWheelNumbers = () => {
    const numberPositions = [
      0, 32, 15, 19, 4, 21, 2, 25,
      17, 34, 6, 27, 13, 36, 11, 30,
      8, 23, 10, 5, 24, 16, 33, 1,
      20, 14, 31, 9, 22, 18, 29, 7,
      28, 12, 35, 3, 26
    ]; // Standard European wheel sequence

    return numberPositions.map((number, index) => {
      const angle = (360 / 37) * index;
      const isRed = [32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12, 3].includes(number);
      const isGreen = number === 0;

      return (
        <Box
          key={number}
          sx={{
            position: 'absolute',
            transform: `rotate(${angle}deg) translate(0, -130px)`,
            transformOrigin: 'center center',
            color: isGreen ? '#388E3C' : isRed ? '#D32F2F' : '#424242',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {number}
        </Box>
      );
    });
  };
  // Generate the roulette table
  const generateRouletteTable = () => {
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

    const cells = [];

    // Set up grid dimensions
    const cellWidth = 50;
    const cellHeight = 60;

    // Left column with 0
    cells.push(
      <Box
        key="0"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${cellWidth}px`,
          height: `${cellHeight * 3}px`,
          border: '1px solid white',
          backgroundColor: '#388E3C', // Softer green for zero
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        onClick={() => handleBetClick('number', 0)}
      >
        0
        {renderPlayerBet('number', 0)}
      </Box>
    );

    // Numbers 1-36 in 12 columns and 3 rows
    for (let col = 0; col < 12; col++) {
      for (let row = 0; row < 3; row++) {
        // Calculate the number based on the new layout
        const number = col + 1 + row * 12;
        const isRed = redNumbers.includes(number);
        cells.push(
          <Box
            key={`number-${number}`}
            sx={{
              position: 'absolute',
              top: `${row * cellHeight}px`,
              left: `${(col + 1) * cellWidth}px`,
              width: `${cellWidth}px`,
              height: `${cellHeight}px`,
              border: '1px solid white',
              backgroundColor: isRed ? '#D32F2F' : '#424242',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onClick={() => handleBetClick('number', number)}
          >
            {number}
            {renderPlayerBet('number', number)}
          </Box>
        );

        // Add vertical splits (between numbers in the same column)
        if (row < 2) {
          const betValue = [number, number + 12];
          cells.push(
            <Box
              key={`split-v-${number}`}
              sx={{
                position: 'absolute',
                top: `${(row + 1) * cellHeight - 5}px`,
                left: `${(col + 1) * cellWidth}px`,
                width: `${cellWidth}px`,
                height: '10px',
                cursor: 'pointer',
              }}
              onClick={() => handleBetClick('split', betValue)}
            >
              {/* Split indicator */}
            </Box>
          );
        }

        // Add horizontal splits (between numbers in adjacent columns)
        if (col < 11) {
          const betValue = [number, number + 1];
          cells.push(
            <Box
              key={`split-h-${number}`}
              sx={{
                position: 'absolute',
                top: `${row * cellHeight}px`,
                left: `${(col + 1) * cellWidth + cellWidth - 5}px`,
                width: '10px',
                height: `${cellHeight}px`,
                cursor: 'pointer',
              }}
              onClick={() => handleBetClick('split', betValue)}
            >
              {/* Split indicator */}
            </Box>
          );
        }

        // Add corners
        if (col < 11 && row < 2) {
          const betValue = [number, number + 1, number + 12, number + 13];
          cells.push(
            <Box
              key={`corner-${number}`}
              sx={{
                position: 'absolute',
                top: `${(row + 1) * cellHeight - 5}px`,
                left: `${(col + 1) * cellWidth + cellWidth - 5}px`,
                width: '10px',
                height: '10px',
                cursor: 'pointer',
              }}
              onClick={() => handleBetClick('corner', betValue)}
            >
              {/* Corner indicator */}
            </Box>
          );
        }
      }
    }

    // Bottom betting options (Dozens)
    const bottomOptions = [
      { label: '1st 12', betType: 'dozen', betValue: 'first', left: cellWidth, width: cellWidth * 4 },
      { label: '2nd 12', betType: 'dozen', betValue: 'second', left: cellWidth * 5, width: cellWidth * 4 },
      { label: '3rd 12', betType: 'dozen', betValue: 'third', left: cellWidth * 9, width: cellWidth * 4 },
    ];

    bottomOptions.forEach((option, index) => {
      cells.push(
        <Box
          key={`bottom-${index}`}
          sx={{
            position: 'absolute',
            top: `${cellHeight * 3}px`,
            left: `${option.left}px`,
            width: `${option.width}px`,
            height: `${cellHeight / 2}px`,
            border: '1px solid white',
            backgroundColor: 'gray',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => handleBetClick(option.betType, option.betValue)}
        >
          {option.label}
          {renderPlayerBet(option.betType, option.betValue)}
        </Box>
      );
    });

    // Side betting options (Columns)
    const sideOptions = [
      { label: '2 to 1', betType: 'column', betValue: 'third', top: 0 },
      { label: '2 to 1', betType: 'column', betValue: 'second', top: cellHeight },
      { label: '2 to 1', betType: 'column', betValue: 'first', top: cellHeight * 2 },
    ];

    sideOptions.forEach((option, index) => {
      cells.push(
        <Box
          key={`side-${index}`}
          sx={{
            position: 'absolute',
            top: `${option.top}px`,
            left: `${(cellWidth * 13)}px`,
            width: `${cellWidth}px`,
            height: `${cellHeight}px`,
            border: '1px solid white',
            backgroundColor: 'gray',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => handleBetClick(option.betType, option.betValue)}
        >
          {option.label}
          {renderPlayerBet(option.betType, option.betValue)}
        </Box>
      );
    });

    // Additional betting options at the bottom
    const bottomOptions2 = [
      { label: '1 to 18', betType: 'half', betValue: 'low' },
      { label: 'EVEN', betType: 'evenOdd', betValue: 'even' },
      { label: 'RED', betType: 'color', betValue: 'red', bgColor: 'red' },
      { label: 'BLACK', betType: 'color', betValue: 'black', bgColor: 'black' },
      { label: 'ODD', betType: 'evenOdd', betValue: 'odd' },
      { label: '19 to 36', betType: 'half', betValue: 'high' },
    ];

    bottomOptions2.forEach((option, index) => {
      cells.push(
        <Box
          key={`bottom2-${index}`}
          sx={{
            position: 'absolute',
            top: `${cellHeight * 3 + cellHeight / 2}px`,
            left: `${(cellWidth) + (cellWidth * index * 2)}px`,
            width: `${cellWidth * 2}px`,
            height: `${cellHeight / 2}px`,
            border: '1px solid white',
            backgroundColor: option.bgColor || 'gray',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => handleBetClick(option.betType, option.betValue)}
        >
          {option.label}
          {renderPlayerBet(option.betType, option.betValue)}
        </Box>
      );
    });

    return (
      <Box
        sx={{
          position: 'relative',
          width: `${cellWidth * 14}px`,
          height: `${cellHeight * 4}px`,
          backgroundColor: 'green',
          margin: '0 auto',
        }}
      >
        {cells}
      </Box>
    );
  };

  // Render player's bet on the table
  const renderPlayerBet = (betType, betValue) => {
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
  };

  // Handle chip selection
  const handleChipSelect = (event, newChip) => {
    if (newChip !== null) {
      setSelectedChip(newChip);
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4">Roulette</Typography>
      {timeRemaining > 0 ? (
        <Typography variant="h6">Time remaining to place bets: {timeRemaining} seconds</Typography>
      ) : (
        <Typography variant="h6">Betting is closed</Typography>
      )}
      <Typography variant="h6">Your Balance: {userBalance.toFixed(2)} BP</Typography>
      {winningNumber !== null && (
        <Typography variant="h5">Winning Number: {winningNumber}</Typography>
      )}
      {/* Chip Selection */}
      <Box sx={{ marginTop: 2 }}>
        <Typography variant="h6">Select Chip Amount:</Typography>
        <ToggleButtonGroup
          value={selectedChip}
          exclusive
          onChange={handleChipSelect}
          aria-label="Chip Selection"
          sx={{ marginTop: 1 }}
        >
          {[1, 5, 10, 25, 50, 100].map((chipValue) => (
            <ToggleButton key={chipValue} value={chipValue} aria-label={`${chipValue} BP`}>
              {chipValue} BP
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      <Box
        sx={{
          marginTop: 2,
          marginBottom: 2,
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {/* Roulette Table */}
        <Box sx={{ flexGrow: 1, position: 'relative' }}>
          {generateRouletteTable()}
        </Box>
        {/* Roulette Wheel Placeholder */}
        <Box
          sx={{
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            border: '10px solid #8B4513', // Brown border to resemble wood
            backgroundImage: `conic-gradient(
      from 0deg,
      #388E3C 0deg 9.7297297297deg,
      #D32F2F 9.7297297297deg 19.4594594595deg,
      #424242 19.4594594595deg 29.1891891892deg,
      #D32F2F 29.1891891892deg 38.9189189189deg,
      #424242 38.9189189189deg 48.6486486486deg,
      #D32F2F 48.6486486486deg 58.3783783784deg,
      #424242 58.3783783784deg 68.1081081081deg,
      #D32F2F 68.1081081081deg 77.8378378378deg,
      #424242 77.8378378378deg 87.5675675676deg,
      #D32F2F 87.5675675676deg 97.2972972973deg,
      #424242 97.2972972973deg 107.027027027deg,
      #D32F2F 107.027027027deg 116.756756757deg,
      #424242 116.756756757deg 126.486486486deg,
      #D32F2F 126.486486486deg 136.216216216deg,
      #424242 136.216216216deg 145.945945946deg,
      #D32F2F 145.945945946deg 155.675675676deg,
      #424242 155.675675676deg 165.405405405deg,
      #D32F2F 165.405405405deg 175.135135135deg,
      #424242 175.135135135deg 184.864864865deg,
      #D32F2F 184.864864865deg 194.594594595deg,
      #424242 194.594594595deg 204.324324324deg,
      #D32F2F 204.324324324deg 214.054054054deg,
      #424242 214.054054054deg 223.783783784deg,
      #D32F2F 223.783783784deg 233.513513514deg,
      #424242 233.513513514deg 243.243243243deg,
      #D32F2F 243.243243243deg 252.972972973deg,
      #424242 252.972972973deg 262.702702703deg,
      #D32F2F 262.702702703deg 272.432432432deg,
      #424242 272.432432432deg 282.162162162deg,
      #D32F2F 282.162162162deg 291.891891892deg,
      #424242 291.891891892deg 301.621621622deg,
      #D32F2F 301.621621622deg 311.351351351deg,
      #424242 311.351351351deg 321.081081081deg,
      #D32F2F 321.081081081deg 330.810810811deg,
      #424242 330.810810811deg 340.540540541deg,
      #D32F2F 340.540540541deg 350.27027027deg,
      #388E3C 350.27027027deg 360deg
    )`,
            marginLeft: 2,
            position: 'relative',
            overflow: 'hidden',
            transform: `rotate(${wheelRotation}deg)`,
            transition: winningNumber !== null ? 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
          }}
        >
          {/* Ball Indicator */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -140px)',
              width: '10px',
              height: '10px',
              backgroundColor: 'white',
              borderRadius: '50%',
              zIndex: 1,
            }}
          ></Box>
          {/* Wheel Numbers */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {generateWheelNumbers()}
          </Box>
        </Box>
      </Box>
      {/* Display bets */}
      <Box>
        <Typography variant="h6">Your Bets:</Typography>
        {playerBets.map((bet, index) => (
          <Typography key={index}>
            {bet.betType} {Array.isArray(bet.betValue) ? bet.betValue.join(',') : bet.betValue} - {bet.betAmount} BP
          </Typography>
        ))}
      </Box>
    </Container>
  );
};


export default RoulettePage;
