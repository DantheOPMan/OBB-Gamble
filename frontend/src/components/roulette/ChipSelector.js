import React from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton } from '@mui/material';

const ChipSelector = ({ selectedChip, setSelectedChip }) => {
  const handleChipSelect = (event, newChip) => {
    if (newChip !== null) {
      setSelectedChip(newChip);
    }
  };

  return (
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
  );
};

export default ChipSelector;
