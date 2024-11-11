// src/components/roulette/AllBetsDisplay.js
import React from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';

const AllBetsDisplay = ({ allBets, currentUserId }) => {
    // Filter out the current user's bets
    const filteredBets = allBets.filter(bet => bet.userId !== currentUserId);

    return (
        <Box>
            <Typography variant="h6">All Bets</Typography>
            {filteredBets.length === 0 ? (
                <Typography>No bets placed yet.</Typography>
            ) : (
                filteredBets.map((bet, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                        <Typography>{bet.username || bet.userId}</Typography>
                        <Typography>{bet.betType} - {JSON.stringify(bet.betValue)}</Typography>
                        <Typography>{bet.betAmount} BP</Typography>
                    </Box>
                ))
            )}
        </Box>
    );
};

export default AllBetsDisplay;
