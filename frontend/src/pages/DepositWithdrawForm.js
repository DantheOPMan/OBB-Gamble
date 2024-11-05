import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { auth, requestDeposit, requestWithdraw, getUser } from '../firebase';

const DepositWithdrawForm = ({ onClose, onShowToast }) => {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [transactionType, setTransactionType] = useState('deposit');
  const [userBalance, setUserBalance] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const data = await getUser(currentUser.uid);
          setUserBalance(data.bpBalance);
          setUser(data);
        }
      } catch (error) {
        console.error('Error fetching user details: ', error);
      }
    };

    fetchUserDetails();
  }, []);

  const handleTransaction = async () => {
    const numAmount = Number(amount);

    if (numAmount < 100 || numAmount > 50000) {
      setMessage('Amount must be between 100 and 50000 BP');
      return;
    }

    if (transactionType === 'withdraw' && numAmount > userBalance) {
      setMessage('Insufficient balance for withdrawal');
      return;
    }

    if (!user.discordUsername || !user.obkUsername) {
      setMessage('Discord and OBK usernames are required');
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      if (transactionType === 'deposit') {
        await requestDeposit(userId, numAmount, user.discordUsername, user.obkUsername);
        onShowToast('Deposit request submitted successfully and is pending');
      } else {
        await requestWithdraw(userId, numAmount, user.discordUsername, user.obkUsername); // Keep value positive for request
        onShowToast('Withdraw request submitted successfully and is pending');
      }
      setAmount('');
      onClose();
    } catch (error) {
      setMessage('Failed to submit request');
    }
  };

  const handleToggleChange = (event, newType) => {
    if (newType !== null) {
      setTransactionType(newType);
      setMessage(''); // Clear the message when toggling
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 2,
        bgcolor: '#333',
        borderRadius: 2,
        color: '#fff',
      }}
    >
      <Typography component="h1" variant="h5" sx={{ color: '#ff7961', marginBottom: 2 }}>
        {transactionType === 'deposit' ? 'Deposit BP' : 'Withdraw BP'}
      </Typography>
      <ToggleButtonGroup
        color="primary"
        value={transactionType}
        exclusive
        onChange={handleToggleChange}
        aria-label="transaction type"
        sx={{ marginBottom: 2 }}
      >
        <ToggleButton value="deposit" sx={{ color: '#ff7961' }}>Deposit</ToggleButton>
        <ToggleButton value="withdraw" sx={{ color: '#ff7961' }}>Withdraw</ToggleButton>
      </ToggleButtonGroup>
      <TextField
        margin="normal"
        fullWidth
        label="Amount"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        InputProps={{ inputProps: { min: 100, max: 50000 } }}
        sx={{
          input: { color: '#fff' },
          label: { color: '#ff7961' },
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: '#ff7961' },
            '&:hover fieldset': { borderColor: '#ff7961' },
            '&.Mui-focused fieldset': { borderColor: '#ff7961' },
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#333',
          },
        }}
      />
      <Button
        fullWidth
        variant="contained"
        color="primary"
        onClick={handleTransaction}
        sx={{ mt: 3, mb: 2, backgroundColor: '#ff7961' }}
      >
        Submit
      </Button>
      {message && <Typography color="error" sx={{ marginTop: 2 }}>{message}</Typography>}
    </Box>
  );
};

export default DepositWithdrawForm;
