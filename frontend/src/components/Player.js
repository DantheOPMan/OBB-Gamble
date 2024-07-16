import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { styled } from '@mui/material/styles';

const PlayerContainer = styled(Box)(({ theme }) => ({
  margin: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[800],
  color: theme.palette.common.white,
  borderRadius: theme.shape.borderRadius,
  textAlign: 'center'
}));

const Player = ({ player, onFold, onCall, onRaise }) => {
  return (
    <PlayerContainer>
      <Typography variant="h6">{player.name}</Typography>
      <Box>
        {player.hand.map((card, i) => (
          <Typography key={i}>
            {card.value} of {card.suit}
          </Typography>
        ))}
      </Box>
      <Button onClick={onFold}>Fold</Button>
      <Button onClick={onCall}>Call</Button>
      <Button onClick={onRaise}>Raise</Button>
    </PlayerContainer>
  );
};

export default Player;
