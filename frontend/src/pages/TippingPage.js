import React, { useState, useEffect } from 'react';
import { TextField, Button, Snackbar, Container, Typography, Paper, Autocomplete } from '@mui/material';
import { requestTip, fetchUsers, getUser, auth } from '../firebase';

const TippingPage = () => {
  const [amount, setAmount] = useState('');
  const [targetUser, setTargetUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [openToast, setOpenToast] = useState(false);
  const [currentUserBP, setCurrentUserBP] = useState(0);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersList = await fetchUsers();
        // Filter out users without obkUsername or users that match the current user's uid
        const validUsers = usersList.filter(user => user.obkUsername && user.uid !== auth.currentUser.uid);
        setUsers(validUsers);
      } catch (error) {
        console.error('Failed to fetch users', error);
      }
    };

    const loadCurrentUser = async () => {
      try {
        const currentUserData = await getUser(auth.currentUser.uid);
        setCurrentUserBP(currentUserData.bpBalance);
      } catch (error) {
        console.error('Failed to fetch current user data', error);
      }
    };

    loadUsers();
    loadCurrentUser();
  }, []);

  const handleTip = async () => {
    if (!amount || isNaN(amount) || amount <= 0) {
      setMessage('Please enter a valid positive amount');
      setOpenToast(true);
      return;
    }

    if (!targetUser) {
      setMessage('Please select a target user');
      setOpenToast(true);
      return;
    }

    try {
      await requestTip({ userId: auth.currentUser.uid, targetUserId: targetUser.uid, amount: Number(amount), discordUsername: auth.currentUser.displayName, obkUsername: auth.currentUser.email });
      setMessage(`Tip of ${amount} BP requested successfully`);
      setOpenToast(true);
      setAmount('');
      setTargetUser(null);
    } catch (error) {
      setMessage('Failed to request tip');
      setOpenToast(true);
    }
  };

  const handleCloseToast = () => {
    setOpenToast(false);
    setMessage('');
  };

  return (
    <Container component="main" maxWidth="sm">
      <Paper sx={{ marginTop: 8, padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#424242' }}>
        <Typography component="h1" variant="h5" sx={{ marginBottom: 2, color: 'white' }}>
          Tip a User
        </Typography>
        <Typography variant="body1" sx={{ marginBottom: 2, color: 'white' }}>
          Your BP: {currentUserBP}
        </Typography>
        <Autocomplete
          options={users}
          getOptionLabel={(option) => option.obkUsername}
          value={targetUser}
          onChange={(event, newValue) => setTargetUser(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Target User" variant="outlined" fullWidth sx={{ marginBottom: 2, '& .MuiInputBase-root': { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } }, '& .MuiFormLabel-root': { color: 'white' } }} />
          )}
          PaperComponent={({ children }) => (
            <Paper sx={{ backgroundColor: '#424242', color: 'white' }}>{children}</Paper>
          )}
          sx={{ width: '100%', marginBottom: 2 }}
        />
        <TextField
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          fullWidth
          sx={{ marginBottom: 2, '& .MuiInputBase-root': { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } }, '& .MuiFormLabel-root': { color: 'white' } }}
        />
        <Button variant="contained" color="primary" onClick={handleTip} fullWidth>
          Send Tip
        </Button>
      </Paper>
      <Snackbar
        open={openToast}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        message={message}
      />
    </Container>
  );
};

export default TippingPage;
