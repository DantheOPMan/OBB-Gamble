import React, { useState, useEffect } from 'react';
import { Box, TextField, List, ListItem, ListItemText, Typography, Paper, Snackbar } from '@mui/material';
import { fetchUsers, fetchUserTransactions, getUser } from '../firebase';

const UserHistoryPage = () => {
  const [users, setUsers] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [openToast, setOpenToast] = useState(false);

  useEffect(() => {
    const fetchAllUsersAndTransactions = async () => {
      try {
        const usersResponse = await fetchUsers();
        setUsers(usersResponse);

        const allUserTransactions = await Promise.all(
          usersResponse.map(async (user) => {
            const transactions = await fetchUserTransactions(user.uid);
            return await Promise.all(
              transactions.map(async (transaction) => {
                if (transaction.targetUserId) {
                  const targetUser = await getUser(transaction.targetUserId);
                  return { ...transaction, user, targetUser };
                }
                return { ...transaction, user };
              })
            );
          })
        );

        const flattenedTransactions = allUserTransactions.flat();
        setAllTransactions(flattenedTransactions);
        setFilteredTransactions(flattenedTransactions);
      } catch (error) {
        console.error('Failed to fetch users or transactions', error);
      }
    };

    fetchAllUsersAndTransactions();
  }, []);

  useEffect(() => {
    const filtered = allTransactions.filter((transaction) =>
      transaction.user.obkUsername.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTransactions(filtered);
  }, [searchTerm, allTransactions]);

  const handleCloseToast = () => {
    setOpenToast(false);
    setToastMessage('');
  };

  return (
    <Box sx={{ width: '100%' }}>
      <TextField
        label="Filter by OBK Username"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Paper sx={{ padding: 2, marginBottom: 4, backgroundColor: '#333', color: '#fff' }}>
        <Typography variant="h6" sx={{ marginBottom: 2 }}>
          Transactions
        </Typography>
        <List>
          {filteredTransactions.map((transaction) => (
            <ListItem key={transaction._id}>
              <ListItemText
                primary={`Amount: ${transaction.amount} BP`}
                secondary={
                  <>
                    <Typography variant="body2" component="span">
                      User: {transaction.user.obkUsername}
                    </Typography>
                    <br />
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
                          Target User OBK Username: {transaction.targetUser?.obkUsername || 'N/A'}
                        </Typography>
                        <br />
                        <Typography variant="body2" component="span">
                          Target User Discord Username: {transaction.targetUser?.discordUsername || 'N/A'}
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
          ))}
        </List>
      </Paper>
      <Snackbar
        open={openToast}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        message={toastMessage}
      />
    </Box>
  );
};

export default UserHistoryPage;
