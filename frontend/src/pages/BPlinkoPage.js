import React, { useState, useEffect } from 'react';
import { Container, Box, Typography } from '@mui/material';
import { getUser, auth } from '../firebase';
import PlinkoBoard from '../components/PlinkoBoard';

const BPLinkoPage = () => {
  const [balance, setBalance] = useState(0);


  const fetchUserBalance = async () => {
    try {
      const userId = auth.currentUser.uid;
      const user = await getUser(userId);
      setBalance(user.bpBalance);
    } catch (error) {
      console.error('Error fetching user balance:', error);
    }
  };

  useEffect(() => {
    fetchUserBalance();
  }, []);

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
          Current Balance: {balance} BP
        </Typography>
        <PlinkoBoard
          onResultUpdate={() => {
            fetchUserBalance();
          }}
        />
      </Box>
    </Container>
  );
};

export default BPLinkoPage;
