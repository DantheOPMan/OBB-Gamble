// src/components/roulette/BetsDisplay.js
import React from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';

const BetsDisplay = ({ playerBets }) => {
  return (
    <Box sx={{ marginTop: 2 }}>
      <Typography variant="h6">Your Bets:</Typography>
      {playerBets.length === 0 ? (
        <Typography>No bets placed yet.</Typography>
      ) : (
        <List>
          {playerBets.map((bet, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={`${capitalizeBetType(bet.betType)} ${formatBetValue(bet.betValue)} - ${bet.betAmount} BP`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

// Helper functions for formatting
const capitalizeBetType = (betType) => {
  return betType.charAt(0).toUpperCase() + betType.slice(1);
};

const formatBetValue = (betValue) => {
  if (Array.isArray(betValue)) {
    return betValue.join(', ');
  }
  return betValue;
};

export default BetsDisplay;
