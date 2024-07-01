// src/pages/DepositWithdrawForm.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { auth, requestDeposit, requestWithdraw, getUser } from '../firebase';

const DepositWithdrawForm = ({ onClose }) => {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [transactionType, setTransactionType] = useState('deposit');
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    const fetchUserBalance = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const data = await getUser(currentUser.uid);
          setUserBalance(data.bpBalance);
        }
      } catch (error) {
        console.error('Error fetching user balance: ', error);
      }
    };

    fetchUserBalance();
  }, []);

  const handleTransaction = async () => {
    const numAmount = Number(amount);

    if (numAmount < 100 || numAmount > 1000) {
      setMessage('Amount must be between 100 and 1000 BP');
      return;
    }

    if (transactionType === 'withdraw' && numAmount > userBalance) {
      setMessage('Insufficient balance for withdrawal');
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      if (transactionType === 'deposit') {
        await requestDeposit(userId, numAmount);
        setMessage('Deposit request submitted successfully');
      } else {
        await requestWithdraw(userId, numAmount); // Keep value positive for request
        setMessage('Withdraw request submitted successfully');
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
        InputProps={{ inputProps: { min: 100, max: 1000 } }}
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
