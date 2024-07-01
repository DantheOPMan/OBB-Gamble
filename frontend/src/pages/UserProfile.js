import React, { useState, useEffect } from 'react';
import { getUser, updateUser, auth } from '../firebase';
import { Container, Box, Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import DepositWithdrawForm from './DepositWithdrawForm';

const UserProfile = () => {
  const [userData, setUserData] = useState(null);
  const [openUpdateUsernames, setOpenUpdateUsernames] = useState(false);
  const [openDepositWithdraw, setOpenDepositWithdraw] = useState(false);
  const [discordUsername, setDiscordUsername] = useState('');
  const [obkUsername, setObkUsername] = useState('');

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (currentUser) {
      const fetchUserData = async () => {
        try {
          const data = await getUser(currentUser.uid);
          setUserData(data);
          setDiscordUsername(data.discordUsername || '');
          setObkUsername(data.obkUsername || '');
        } catch (error) {
          console.error('Error fetching user data: ', error);
        }
      };

      fetchUserData();
    }
  }, []);

  const handleOpenUpdateUsernames = () => {
    setOpenUpdateUsernames(true);
  };

  const handleCloseUpdateUsernames = () => {
    setOpenUpdateUsernames(false);
  };

  const handleOpenDepositWithdraw = () => {
    setOpenDepositWithdraw(true);
  };

  const handleCloseDepositWithdraw = () => {
    setOpenDepositWithdraw(false);
  };

  const handleUpdateUsernames = async () => {
    try {
      await updateUser(userData.uid, discordUsername, obkUsername);
      setUserData({ ...userData, discordUsername, obkUsername });
      setOpenUpdateUsernames(false);
    } catch (error) {
      console.error('Error updating usernames: ', error);
    }
  };

  if (!userData) {
    return <div>Loading...</div>;
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          bgcolor: '#333',
          padding: 4,
          borderRadius: 2,
          color: '#fff',
        }}
      >
        <Typography component="h1" variant="h5" sx={{ color: '#ff7961', marginBottom: 2 }}>
          User Profile
        </Typography>
        <Typography variant="body1">
          Email: {userData.email}
        </Typography>
        <Typography variant="body1">
          Role: {userData.role}
        </Typography>
        <Typography variant="body1">
          BP Balance: {userData.bpBalance}
        </Typography>
        <Typography variant="body1">
          Discord Username: {userData.discordUsername || 'N/A'}
        </Typography>
        <Typography variant="body1">
          OBK Username: {userData.obkUsername || 'N/A'}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenUpdateUsernames}
          sx={{ mt: 3, backgroundColor: '#ff7961' }}
        >
          Update Usernames
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenDepositWithdraw}
          sx={{ mt: 3, backgroundColor: '#ff7961' }}
        >
          Deposit/Withdraw BP
        </Button>
      </Box>
      <Dialog open={openUpdateUsernames} onClose={handleCloseUpdateUsernames}>
        <DialogTitle sx={{ bgcolor: '#333', color: '#fff' }}>Update Usernames</DialogTitle>
        <DialogContent sx={{ bgcolor: '#333', color: '#fff' }}>
          <TextField
            margin="dense"
            id="discordUsername"
            label="Discord Username"
            type="text"
            fullWidth
            variant="outlined"
            value={discordUsername}
            onChange={(e) => setDiscordUsername(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="obkUsername"
            label="OBK Username"
            type="text"
            fullWidth
            variant="outlined"
            value={obkUsername}
            onChange={(e) => setObkUsername(e.target.value)}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#333', color: '#fff' }}>
          <Button onClick={handleCloseUpdateUsernames} color="primary" sx={{ color: '#ff7961' }}>
            Cancel
          </Button>
          <Button onClick={handleUpdateUsernames} color="primary" sx={{ color: '#ff7961' }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openDepositWithdraw} onClose={handleCloseDepositWithdraw}>
        <DialogTitle sx={{ bgcolor: '#333', color: '#fff' }}>Deposit/Withdraw BP</DialogTitle>
        <DialogContent sx={{ bgcolor: '#333', color: '#fff' }}>
          <DepositWithdrawForm onClose={handleCloseDepositWithdraw} />
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#333', color: '#fff' }}>
          <Button onClick={handleCloseDepositWithdraw} color="primary" sx={{ color: '#ff7961' }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserProfile;
