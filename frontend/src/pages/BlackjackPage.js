import React, { useEffect, useState, useCallback } from 'react';
import { Typography, CircularProgress, Box, Button, TextField, Container, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import { auth, createBlackjackHand, getCurrentBlackjack, hitBlackjack, standBlackjack, doubleDownBlackjack, splitBlackjack, getHandStatus, getUser } from '../firebase';
import Blackjack from '../components/Blackjack';

// Styled components
const StyledContainer = styled(Container)(({ theme }) => ({
    marginTop: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: theme.palette.grey[800], // Dark grey background
    color: theme.palette.common.white,
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[5],
}));

const BetInput = styled(TextField)(({ theme }) => ({
    marginBottom: theme.spacing(2),
    '& .MuiInputBase-root': {
        color: theme.palette.common.white,
        backgroundColor: theme.palette.grey[700], // Dark grey background
    },
    '& .MuiInputLabel-root': {
        color: theme.palette.grey[500],
    },
    '& .MuiFormHelperText-root': {
        color: theme.palette.error.main,
    },
}));

const ActionButton = styled(Button)(({ theme }) => ({
    margin: theme.spacing(1),
    padding: theme.spacing(1.5),
    fontSize: '16px',
    color: theme.palette.common.white,
    backgroundColor: theme.palette.primary.main,
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
    },
}));

const BlackjackPage = () => {
    const [loading, setLoading] = useState(true);
    const [hand, setHand] = useState(null);
    const [betAmount, setBetAmount] = useState('');
    const [error, setError] = useState('');
    const [bpBalance, setBpBalance] = useState(0);
    const [gameOutcome, setGameOutcome] = useState(null);

    const fetchBpBalance = async () => {
        try {
            const user = await getUser(auth.currentUser.uid);
            setBpBalance(user.bpBalance);
        } catch (error) {
            console.error('Error fetching BP balance:', error);
        }
    };

    const checkGameOutcome = useCallback(async (handId) => {
        try {
            const response = await getHandStatus(handId);
            const { status } = response;
            if (status !== 'ongoing') {
                setGameOutcome(status);
                await fetchBpBalance(); // Update BP balance immediately
                setTimeout(() => {
                    setGameOutcome(null);
                    setHand(null);
                }, 2000);
            }
        } catch (error) {
            console.error('Error checking game outcome:', error);
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                await fetchBpBalance();

                const currentHand = await getCurrentBlackjack();
                if (currentHand) {
                    setHand(currentHand);
                    checkGameOutcome(currentHand.handId); // Check game outcome if hand is already completed
                } else {
                    setHand(null);
                }
            } catch (error) {
                if (!error.message.includes('No ongoing hand found')) {
                    console.error('Error fetching data:', error);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [checkGameOutcome]);

    const handleBetAmountChange = (event) => {
        const value = event.target.value;
        if (value <= 10) {
            setBetAmount(value);
            setError('');
        } else {
            setError('Bet amount cannot exceed 10.');
        }
    };

    const handlePlayHand = async () => {
        if (!betAmount || isNaN(betAmount) || Number(betAmount) <= 0) {
            setError('Please enter a valid bet amount.');
            return;
        }

        try {
            const newHand = await createBlackjackHand({ initialBPCharge: Number(betAmount) });
            setHand(newHand);
            setBetAmount('');
            setError('');
            checkGameOutcome(newHand.handId); // Immediately check game outcome for the new hand
            await fetchBpBalance(); // Update BP balance after creating a new hand
        } catch (error) {
            setError('Error creating hand or ongoing hand exists.');
            console.error('Error creating hand:', error);
        }
    };

    const handleHit = async (handId, handIndex) => {
        try {
            const updatedHand = await hitBlackjack(handId, handIndex);
            setHand(updatedHand);
            checkGameOutcome(handId);
        } catch (error) {
            console.error('Error hitting:', error);
        }
    };

    const handleStand = async (handId, handIndex) => {
        try {
            const updatedHand = await standBlackjack(handId, handIndex);
            setHand(updatedHand);
            checkGameOutcome(handId);
        } catch (error) {
            console.error('Error standing:', error);
        }
    };

    const handleDoubleDown = async (handId, handIndex) => {
        try {
            const updatedHand = await doubleDownBlackjack(handId, handIndex);
            setHand(updatedHand);
            checkGameOutcome(handId);
        } catch (error) {
            console.error('Error doubling down:', error);
        }
    };

    const handleSplit = async (handId, handIndex) => {
        try {
            const updatedHand = await splitBlackjack(handId, handIndex);
            setHand(updatedHand);
            checkGameOutcome(handId);
        } catch (error) {
            console.error('Error splitting:', error);
        }
    };

    if (loading) {
        return <CircularProgress />;
    }

    return (
        <StyledContainer maxWidth="sm">
            <Typography variant="h3" align="center" gutterBottom>
                Blackjack
            </Typography>
            <Typography variant="h6" align="center" gutterBottom>
                BP Balance: {bpBalance}
            </Typography>
            {hand ? (
                <Blackjack
                    hand={hand}
                    onHit={handleHit}
                    onStand={handleStand}
                    onDoubleDown={handleDoubleDown}
                    onSplit={handleSplit}
                    gameOutcome={gameOutcome}
                />
            ) : (
                !gameOutcome && (
                    <Paper elevation={3} sx={{ p: 3, mt: 4, width: '100%', backgroundColor: 'inherit' }}>
                        <BetInput
                            label="Bet Amount"
                            value={betAmount}
                            onChange={handleBetAmountChange}
                            error={!!error}
                            helperText={error}
                            fullWidth
                        />
                        <ActionButton variant="contained" color="primary" onClick={handlePlayHand}>
                            Play Hand
                        </ActionButton>
                    </Paper>
                )
            )}
        </StyledContainer>
    );
};

export default BlackjackPage;
