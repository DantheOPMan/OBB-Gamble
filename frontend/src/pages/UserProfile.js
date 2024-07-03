import React, { useState, useEffect } from 'react';
import { getUser, updateUser, fetchUserTransactions, auth } from '../firebase';
import {
  Container,
  Box,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  List,
  ListItem,
  ListItemText
} from '@mui/material';

const UserProfile = () => {
  const [userData, setUserData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [targetUsers, setTargetUsers] = useState({});
  const [openUpdateUsernames, setOpenUpdateUsernames] = useState(false);
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

      const fetchUserTransactionsData = async () => {
        try {
          const transactionsData = await fetchUserTransactions(currentUser.uid);
          setTransactions(transactionsData);

          const targetUsersData = {};
          for (const transaction of transactionsData) {
            if (transaction.targetUserId && !targetUsersData[transaction.targetUserId]) {
              const targetUserData = await getUser(transaction.targetUserId);
              if (targetUserData) {
                targetUsersData[transaction.targetUserId] = targetUserData;
              }
            }
          }
          setTargetUsers(targetUsersData);
        } catch (error) {
          console.error('Error fetching user transactions: ', error);
        }
      };

      fetchUserData();
      fetchUserTransactionsData();
    }
  }, []);

  const handleOpenUpdateUsernames = () => {
    setOpenUpdateUsernames(true);
  };

  const handleCloseUpdateUsernames = () => {
    setOpenUpdateUsernames(false);
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
      </Box>
      <Box
        sx={{
          marginTop: 4,
          bgcolor: '#333',
          padding: 4,
          borderRadius: 2,
          color: '#fff',
        }}
      >
        <Typography component="h1" variant="h5" sx={{ color: '#ff7961', marginBottom: 2 }}>
          Transactions
        </Typography>
        <List>
          {transactions.map((transaction) => {
            const targetUser = targetUsers[transaction.targetUserId];
            return (
              <ListItem key={transaction._id}>
                <ListItemText
                  primary={`Amount: ${transaction.amount} BP`}
                  secondary={
                    <>
                      <Typography variant="body2" component="span">
                        Status: {transaction.status}
                      </Typography>
                      <br />
                      <Typography variant="body2" component="span">
                        Date: {new Date(transaction.timestamp).toLocaleString()}
                      </Typography>
                      {transaction.targetUserId && (
                        <>
                          <br />
                          <Typography variant="body2" component="span">
                            Target User ID: {transaction.targetUserId}
                          </Typography>
                          <br />
                          <Typography variant="body2" component="span">
                            Target Discord Username: {targetUser?.discordUsername || 'N/A'}
                          </Typography>
                          <br />
                          <Typography variant="body2" component="span">
                            Target OBK Username: {targetUser?.obkUsername || 'N/A'}
                          </Typography>
                        </>
                      )}
                      {transaction.marketId && (
                        <>
                          <br />
                          <Typography variant="body2" component="span">
                            Market ID: {transaction.marketId}
                          </Typography>
                        </>
                      )}
                      {transaction.competitorName && (
                        <>
                          <br />
                          <Typography variant="body2" component="span">
                            Competitor Name: {transaction.competitorName}
                          </Typography>
                        </>
                      )}
                      {transaction.discordUsername && (
                        <>
                          <br />
                          <Typography variant="body2" component="span">
                            Discord Username: {transaction.discordUsername}
                          </Typography>
                        </>
                      )}
                      {transaction.obkUsername && (
                        <>
                          <br />
                          <Typography variant="body2" component="span">
                            OBK Username: {transaction.obkUsername}
                          </Typography>
                        </>
                      )}
                    </>
                  }
                />
              </ListItem>
            );
          })}
        </List>
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
    </Container>
  );
};

export default UserProfile;
