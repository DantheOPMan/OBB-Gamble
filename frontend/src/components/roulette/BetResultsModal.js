// BetResultsModal.js
import React from 'react';
import { Modal, Box, Typography, List, ListItem } from '@mui/material';

const BetResultsModal = ({ open, onClose, betResults }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          border: '2px solid #000',
          boxShadow: 24,
          p: 4,
        }}
      >
        <Typography variant="h6">Bet Results</Typography>
        <List>
          {betResults.map((result, index) => (
            <ListItem key={index}>
              <Typography>
                Bet on {result.bet.betType} {Array.isArray(result.bet.betValue) ? result.bet.betValue.join(', ') : result.bet.betValue}: {result.won ? 'Won' : 'Lost'} - Payout: {result.payout} BP
              </Typography>
            </ListItem>
          ))}
        </List>
      </Box>
    </Modal>
  );
};

export default BetResultsModal;
