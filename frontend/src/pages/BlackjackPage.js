import React, { useEffect, useState, useCallback } from 'react';
import { Typography, CircularProgress, Button, TextField, Container, Paper, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { styled } from '@mui/material/styles';
import { auth, createBlackjackHand, getCurrentBlackjack, hitBlackjack, standBlackjack, doubleDownBlackjack, splitBlackjack, getUser } from '../firebase';
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

const DarkDialogContent = styled(DialogContent)(({ theme }) => ({
    backgroundColor: theme.palette.grey[800],
    color: theme.palette.common.white,
}));

const DarkDialogTitle = styled(DialogTitle)(({ theme }) => ({
    backgroundColor: theme.palette.grey[900],
    color: theme.palette.common.white,
}));

const DarkDialogActions = styled(DialogActions)(({ theme }) => ({
    backgroundColor: theme.palette.grey[900],
    color: theme.palette.common.white,
}));

const BlackjackPage = () => {
    const [loading, setLoading] = useState(true);
    const [hand, setHand] = useState(null);
    const [handId, setHandId] = useState(null);
    const [betAmount, setBetAmount] = useState('');
    const [error, setError] = useState('');
    const [bpBalance, setBpBalance] = useState(0);
    const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);
    const [totalPayout, setTotalPayout] = useState(0);

    const fetchBpBalance = async () => {
        try {
            const user = await getUser(auth.currentUser.uid);
            setBpBalance(user.bpBalance);
        } catch (error) {
            console.error('Error fetching BP balance:', error);
        }
    };

    const checkGameOutcome = useCallback(async (currentHand) => {
        await fetchBpBalance();
        if (!handId) return;

        try {
            if (currentHand.status !== 'ongoing') {
                calculateTotalPayout(currentHand);
                setHand(currentHand);
                setShowOutcomeDialog(true);            
            }
        } catch (error) {
            console.error('Error checking game outcome:', error);
        }
    }, [handId]);

    const calculateTotalPayout = (currentHand) => {
        let payout = 0;
        currentHand.playerHands.forEach(playerHand => {
            payout += playerHand.payout;
        });
        setTotalPayout(payout);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                await fetchBpBalance();
                const currentHand = await getCurrentBlackjack();
                if (currentHand) {
                    setHand(currentHand);
                    setHandId(currentHand.handId);
                    await checkGameOutcome(currentHand);
                } else {
                    console.log("hand reset")
                    setHand(null);
                    setHandId(null);
                }

                // Retrieve the last bet amount from local storage
                const savedBetAmount = localStorage.getItem('betAmount');
                if (savedBetAmount) {
                    setBetAmount(savedBetAmount);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [checkGameOutcome]);

    useEffect(() => {
        if (hand) {
            checkGameOutcome(hand);
        }
    }, [hand, checkGameOutcome]);

    const handleBetAmountChange = (event) => {
        const value = event.target.value;
        if (value <= 30) {
            setBetAmount(value);
            setError('');
        } else {
            setError('Bet amount cannot exceed 30.');
        }
    };

    const handlePlayHand = async () => {
        if (!betAmount || isNaN(betAmount) || Number(betAmount) <= 0) {
            setError('Please enter a valid bet amount.');
            return;
        }

        try {
            localStorage.setItem('betAmount', betAmount);

            const newHand = await createBlackjackHand({ initialBPCharge: Number(betAmount) });
            setHand(newHand);
            setHandId(newHand.handId);
            setError('');
            await fetchBpBalance();
        } catch (error) {
            setError('Error creating hand or ongoing hand exists.');
            console.error('Error creating hand:', error);
        }
    };

    const handleHit = async (handId, handIndex) => {
        try {
            const updatedHand = await hitBlackjack(handId, handIndex);
            setHand(updatedHand);
        } catch (error) {
            console.error('Error hitting:', error);
        }
    };

    const handleStand = async (handId, handIndex) => {
        try {
            const updatedHand = await standBlackjack(handId, handIndex);
            setHand(updatedHand);
        } catch (error) {
            console.error('Error standing:', error);
        }
    };

    const handleDoubleDown = async (handId, handIndex) => {
        try {
            const updatedHand = await doubleDownBlackjack(handId, handIndex);
            setHand(updatedHand);
        } catch (error) {
            console.error('Error doubling down:', error);
        }
    };

    const handleSplit = async (handId, handIndex) => {
        try {
            const updatedHand = await splitBlackjack(handId, handIndex);
            setHand(updatedHand);
        } catch (error) {
            console.error('Error splitting:', error);
        }
    };

    const handleCloseOutcomeDialog = async () => {
        setShowOutcomeDialog(false);
        try {
            setHand(null);
            setHandId(null);
            await fetchBpBalance();  // Refresh the balance after the game outcome
            const currentHand = await getCurrentBlackjack();
            if (currentHand) {
                setHand(currentHand);
                setHandId(currentHand.handId);
            }
        } catch (error) {
            console.error('Error getting current hand:', error);
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
                />
            ) : (
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
            )}
            <Dialog open={showOutcomeDialog} onClose={handleCloseOutcomeDialog}>
                <DarkDialogContent>
                    <Typography variant="h6">
                        Total Payout: {totalPayout} BP
                    </Typography>
                    {hand && hand.playerHands.map((playerHand, index) => (
                        <Typography key={index}>
                            Hand {index + 1}: {playerHand.status.replace('_', ' ')} - Payout: {playerHand.payout} BP
                        </Typography>
                    ))}
                </DarkDialogContent>
                <DarkDialogActions>
                    <Button onClick={handleCloseOutcomeDialog} color="primary">
                        Continue
                    </Button>
                </DarkDialogActions>
            </Dialog>
        </StyledContainer>
    );
};

export default BlackjackPage;
