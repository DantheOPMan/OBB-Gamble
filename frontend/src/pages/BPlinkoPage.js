import React, { useState, useEffect, useCallback } from 'react';
import { Container, Box, Typography } from '@mui/material';
import { getUser, auth } from '../firebase';
import PlinkoBoard from '../components/PlinkoBoard';

const BPLinkoPage = () => {
  const [balance, setBalance] = useState(0);

  const fetchUserBalance = useCallback(async () => {
    try {
      const userId = auth.currentUser.uid;
      const user = await getUser(userId);
      setBalance(Number(user.bpBalance));
    } catch (error) {
      console.error('Error fetching user balance:', error);
    }
  }, []);

  useEffect(() => {
    fetchUserBalance();
  }, [fetchUserBalance]);

  const handleDropBalls = (amount) => {
    const val = parseFloat(amount);
    setBalance(prevBalance => {
      const newBalance = prevBalance - val;
      return newBalance
    });
  };

  const handleBallLanded = (result) => {
    const numericResult = parseFloat(result);

    setBalance(prevBalance => {
      const newBalance = prevBalance + numericResult;
      return newBalance;
    });
  };

  return (
    <Container component="main" maxWidth="lg">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          bgcolor: 'background.default',
          padding: 4,
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" component="p" gutterBottom>
          Current Balance: {balance.toFixed(2)} BP
        </Typography>
        <PlinkoBoard
          onDropBalls={handleDropBalls}
          onBallLanded={handleBallLanded}
        />
      </Box>
    </Container>
  );
};

export default BPLinkoPage;
