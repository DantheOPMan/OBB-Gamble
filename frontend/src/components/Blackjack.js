import React from 'react';
import { Button, Typography, Card, CardContent, Grid, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
    backgroundColor: theme.palette.grey[900],
    color: theme.palette.common.white,
    textAlign: 'center',
    marginBottom: theme.spacing(3),
}));

const StyledButton = styled(Button)(({ theme }) => ({
    margin: theme.spacing(1),
    padding: theme.spacing(1.5),
    fontSize: '16px',
    color: theme.palette.common.white,
    backgroundColor: theme.palette.primary.main,
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
    },
}));

const TopAlignedBox = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: '100vh',
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(3),
}));

// Utility function to calculate hand value
const calculateHandValue = (hand) => {
    let value = 0;
    let aceCount = 0;

    hand.forEach(card => {
        if (card.hidden) return; // Skip hidden cards
        if (['Jack', 'Queen', 'King'].includes(card.value)) {
            value += 10;
        } else if (card.value === 'Ace') {
            value += 11;
            aceCount += 1;
        } else {
            value += parseInt(card.value, 10);
        }
    });

    while (value > 21 && aceCount > 0) {
        value -= 10;
        aceCount -= 1;
    }

    return value;
};

// Main Blackjack component
const Blackjack = ({ hand, onHit, onStand, onDoubleDown, onSplit, gameOutcome }) => {
    const isGameOngoing = hand?.playerHands?.some(playerHand => playerHand.status === 'ongoing');
    const currentHandIndex = hand?.playerHands?.findIndex(playerHand => playerHand.status === 'ongoing');

    return (
        <TopAlignedBox>
            {gameOutcome && (
                <Box my={2}>
                    <Typography variant="h5" gutterBottom>
                        {gameOutcome === 'player_wins' && 'You Win!'}
                        {gameOutcome === 'dealer_wins' && 'Dealer Wins!'}
                        {gameOutcome === 'tie' && 'It\'s a Tie!'}
                        {gameOutcome === 'dealer_blackjack' && 'Dealer has Blackjack!'}
                        {gameOutcome === 'player_blackjack' && 'You have Blackjack!'}
                    </Typography>
                </Box>
            )}
            <Grid container spacing={3} justifyContent="center">
                <Grid item xs={12}>
                    <StyledCard>
                        <CardContent>
                            <Typography variant="h5">Dealer Hand</Typography>
                            {hand?.dealerVisibleCards?.map((card, i) => (
                                <Typography key={i}>
                                    {card.value} of {card.suit}
                                </Typography>
                            ))}
                            <Typography variant="h6">
                                Total: {isGameOngoing ? '?' : calculateHandValue(hand.dealerVisibleCards)}
                            </Typography>
                        </CardContent>
                    </StyledCard>
                </Grid>
                <Grid item xs={12}>
                    <StyledCard>
                        <CardContent>
                            <Typography variant="h5">Player Hands</Typography>
                            {hand?.playerHands?.map((playerHand, index) => (
                                <Box key={index} my={2}>
                                    <Typography variant="h6">Hand {index + 1}:</Typography>
                                    {playerHand.cards.map((card, i) => (
                                        <Typography key={i}>{card.value} of {card.suit}</Typography>
                                    ))}
                                    <Typography variant="h6">Total: {playerHand.value}</Typography>
                                    {isGameOngoing && index === currentHandIndex && (
                                        <Box mt={2}>
                                            <StyledButton onClick={() => onHit(hand.handId, index)}>Hit Hand {index + 1}</StyledButton>
                                            <StyledButton onClick={() => onStand(hand.handId, index)}>Stand Hand {index + 1}</StyledButton>
                                            <StyledButton onClick={() => onDoubleDown(hand.handId, index)}>Double Down Hand {index + 1}</StyledButton>
                                            <StyledButton
                                                onClick={() => onSplit(hand.handId, index)}
                                                disabled={playerHand.cards.length !== 2 || playerHand.cards[0].value !== playerHand.cards[1].value}
                                            >
                                                Split Hand {index + 1}
                                            </StyledButton>
                                        </Box>
                                    )}
                                </Box>
                            ))}
                        </CardContent>
                    </StyledCard>
                </Grid>
            </Grid>
        </TopAlignedBox>
    );
};

export default Blackjack;
