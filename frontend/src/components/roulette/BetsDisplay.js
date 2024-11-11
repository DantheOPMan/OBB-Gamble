import React from 'react';
import { Box, Typography } from '@mui/material';

const BetsDisplay = ({ playerBets }) => {
  return (
    <Box sx={{ marginTop: 2 }}>
      <Typography variant="h6">Your Bets:</Typography>
      {playerBets.length === 0 ? (
        <Typography>No bets placed yet.</Typography>
      ) : (
        playerBets.map((bet, index) => (
          <Typography key={index}>
            {bet.betType.charAt(0).toUpperCase() + bet.betType.slice(1)}{' '}
            {Array.isArray(bet.betValue) ? bet.betValue.join(', ') : bet.betValue} - {bet.betAmount} BP
          </Typography>
        ))
      )}
    </Box>
  );
};

export default BetsDisplay;