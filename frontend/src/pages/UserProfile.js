import React, { useState, useEffect } from 'react';
import { getUser, updateUser, fetchUserTransactions, getUserStats, auth } from '../firebase';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  Divider,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CasinoIcon from '@mui/icons-material/Casino';
import PaymentIcon from '@mui/icons-material/Payment';
import UpdateIcon from '@mui/icons-material/Update';
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CircularProgress from '@mui/material/CircularProgress';

const UserProfile = () => {
  const [userData, setUserData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [targetUsers, setTargetUsers] = useState({});
  const [openUpdateUsernames, setOpenUpdateUsernames] = useState(false);
  const [discordUsername, setDiscordUsername] = useState('');
  const [obkUsername, setObkUsername] = useState('');
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (currentUser) {
      const fetchData = async () => {
        try {
          // Fetch user data
          const data = await getUser(currentUser.uid);
          setUserData(data);
          setDiscordUsername(data.discordUsername || '');
          setObkUsername(data.obkUsername || '');

          // Fetch user transactions
          const transactionsData = await fetchUserTransactions(currentUser.uid);
          setTransactions(transactionsData);

          // Fetch target users for transactions
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

          // Fetch user statistics
          const stats = await getUserStats(currentUser.uid);
          setUserStats(stats);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };

      fetchData();
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
      console.error('Error updating usernames:', error);
    }
  };

  if (!userData) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          bgcolor: '#333',
        }}
      >
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return (
    <Container component="main" maxWidth="lg">
      {/* User Information Card */}
      <Box sx={{ mt: 4 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: '#444',
            padding: 3,
            borderRadius: 2,
            boxShadow: 3,
            flexWrap: 'wrap',
          }}
        >
          <AccountCircleIcon sx={{ fontSize: 60, color: '#ff7961', mr: 2 }} />
          <Box sx={{ flex: 1, minWidth: '250px' }}>
            <Typography variant="h5" component="h1" sx={{ color: '#fff' }}>
              {userData.obkUsername ? userData.obkUsername.toUpperCase() : 'USERNAME'}
            </Typography>
            <Typography variant="body1" sx={{ color: '#ccc' }}>
              Email: {userData.email}
            </Typography>
            <Typography variant="body1" sx={{ color: '#ccc' }}>
              Role: {userData.role}
            </Typography>
            <Typography variant="body1" sx={{ color: '#ccc' }}>
              BP Balance: {userData.bpBalance}
            </Typography>
            <Typography variant="body1" sx={{ color: '#ccc' }}>
              Discord Username: {userData.discordUsername || 'N/A'}
            </Typography>
            <Typography variant="body1" sx={{ color: '#ccc' }}>
              OBK Username: {userData.obkUsername || 'N/A'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenUpdateUsernames}
            sx={{ ml: 'auto', backgroundColor: '#ff7961', mt: { xs: 2, sm: 0 } }}
            startIcon={<UpdateIcon />}
          >
            Update
          </Button>
        </Box>
      </Box>

      {/* User Stats Card */}
      <Box sx={{ mt: 4 }}>
        <Box
          sx={{
            bgcolor: '#444',
            padding: 3,
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <Typography variant="h6" sx={{ color: '#ff7961', mb: 2 }}>
            <AttachMoneyIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Statistics
          </Typography>
          <Divider sx={{ bgcolor: '#555', mb: 2 }} />
          <Grid container spacing={2}>
            {/* Total Gambled */}
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  bgcolor: '#555',
                  padding: 2,
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <CasinoIcon sx={{ fontSize: 40, color: '#ff7961' }} />
                <Typography variant="subtitle1" sx={{ color: '#fff', mt: 1 }}>
                  Total Gambled
                </Typography>
                <Typography variant="h6" sx={{ color: '#fff' }}>
                  {userStats ? userStats.totalGambled.toFixed(2) : <CircularProgress size={24} color="secondary" />}
                  BP
                </Typography>
              </Box>
            </Grid>

            {/* Total Won */}
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  bgcolor: '#555',
                  padding: 2,
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <CasinoIcon sx={{ fontSize: 40, color: '#ff7961', transform: 'rotate(45deg)' }} />
                <Typography variant="subtitle1" sx={{ color: '#fff', mt: 1 }}>
                  Total Won
                </Typography>
                <Typography variant="h6" sx={{ color: '#fff' }}>
                  {userStats ? userStats.totalWon.toFixed(2) : <CircularProgress size={24} color="secondary" />}
                  BP
                </Typography>
              </Box>
            </Grid>

            {/* Total Tipped */}
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  bgcolor: '#555',
                  padding: 2,
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <PaymentIcon sx={{ fontSize: 40, color: '#ff7961' }} />
                <Typography variant="subtitle1" sx={{ color: '#fff', mt: 1 }}>
                  Total Tipped
                </Typography>
                <Typography variant="h6" sx={{ color: '#fff' }}>
                  {userStats ? userStats.totalTipped.toFixed(2) : <CircularProgress size={24} color="secondary" />}
                  BP
                </Typography>
              </Box>
            </Grid>

            {/* Total Tips Received */}
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  bgcolor: '#555',
                  padding: 2,
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <EmojiPeopleIcon sx={{ fontSize: 40, color: '#ff7961' }} />
                <Typography variant="subtitle1" sx={{ color: '#fff', mt: 1 }}>
                  Tips Received
                </Typography>
                <Typography variant="h6" sx={{ color: '#fff' }}>
                  {userStats ? userStats.totalTipsReceived.toFixed(2) : <CircularProgress size={24} color="secondary" />}
                  BP
                </Typography>
              </Box>
            </Grid>

            {/* Total Bet in Markets */}
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  bgcolor: '#555',
                  padding: 2,
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <TrendingDownIcon sx={{ fontSize: 40, color: '#ff7961' }} />
                <Typography variant="subtitle1" sx={{ color: '#fff', mt: 1 }}>
                  Bet in Markets
                </Typography>
                <Typography variant="h6" sx={{ color: '#fff' }}>
                  {userStats ? userStats.totalBetInMarkets.toFixed(2) : <CircularProgress size={24} color="secondary" />}
                  BP
                </Typography>
              </Box>
            </Grid>

            {/* Total Won in Markets */}
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  bgcolor: '#555',
                  padding: 2,
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <TrendingUpIcon sx={{ fontSize: 40, color: '#ff7961' }} />
                <Typography variant="subtitle1" sx={{ color: '#fff', mt: 1 }}>
                  Won in Markets
                </Typography>
                <Typography variant="h6" sx={{ color: '#fff' }}>
                  {userStats ? userStats.totalWonInMarkets.toFixed(2) : <CircularProgress size={24} color="secondary" />}
                  BP
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Transactions Card */}
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            bgcolor: '#444',
            padding: 3,
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <Typography variant="h6" sx={{ color: '#ff7961', mb: 2 }}>
            <AttachMoneyIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Transactions
          </Typography>
          <Divider sx={{ bgcolor: '#555', mb: 2 }} />
          {transactions.length === 0 ? (
            <Typography variant="body1" sx={{ color: '#ccc' }}>
              No transactions found.
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ bgcolor: '#333' }}>
              <Table aria-label="transactions table">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#fff' }}>Amount (BP)</TableCell>
                    <TableCell sx={{ color: '#fff' }}>Status</TableCell>
                    <TableCell sx={{ color: '#fff' }}>Date</TableCell>
                    <TableCell sx={{ color: '#fff' }}>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction) => {
                    const targetUser = targetUsers[transaction.targetUserId];
                    return (
                      <TableRow
                        key={transaction._id}
                        sx={{
                          '&:hover': { backgroundColor: '#555' },
                        }}
                      >
                        <TableCell sx={{ color: transaction.amount < 0 ? '#f44336' : '#4caf50' }}>
                          {transaction.amount} BP
                        </TableCell>
                        <TableCell sx={{ color: '#fff' }}>{transaction.status}</TableCell>
                        <TableCell sx={{ color: '#fff' }}>
                          {new Date(transaction.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ color: '#fff' }}>
                          {transaction.targetUserId && (
                            <Typography variant="body2">
                              <strong>Target:</strong> {targetUser?.discordUsername || 'N/A'} (
                              {targetUser?.obkUsername || 'N/A'})
                            </Typography>
                          )}
                          {transaction.marketId && (
                            <Typography variant="body2">
                              <strong>Market ID:</strong> {transaction.marketId}
                            </Typography>
                          )}
                          {transaction.competitorName && (
                            <Typography variant="body2">
                              <strong>Competitor:</strong> {transaction.competitorName}
                            </Typography>
                          )}
                          {transaction.discordUsername && (
                            <Typography variant="body2">
                              <strong>Discord:</strong> {transaction.discordUsername}
                            </Typography>
                          )}
                          {transaction.obkUsername && (
                            <Typography variant="body2">
                              <strong>OBK:</strong> {transaction.obkUsername}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>

      {/* Update Usernames Dialog */}
      <Dialog open={openUpdateUsernames} onClose={handleCloseUpdateUsernames}>
        <DialogTitle sx={{ bgcolor: '#333', color: '#fff' }}>
          <UpdateIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Update Usernames
        </DialogTitle>
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
            InputLabelProps={{
              style: { color: '#fff' },
            }}
            InputProps={{
              style: { color: '#fff' },
            }}
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
            InputLabelProps={{
              style: { color: '#fff' },
            }}
            InputProps={{
              style: { color: '#fff' },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#333', color: '#fff' }}>
          <Button onClick={handleCloseUpdateUsernames} sx={{ color: '#ff7961' }}>
            Cancel
          </Button>
          <Button onClick={handleUpdateUsernames} sx={{ color: '#ff7961' }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserProfile;
