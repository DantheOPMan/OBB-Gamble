import React, { useState, useEffect } from 'react';
import { TextField, List, ListItem, ListItemText, Typography, Paper, Snackbar, Autocomplete, Container } from '@mui/material';
import { fetchUsers, fetchUserTransactions } from '../firebase';

const UserHistoryPage = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [openToast, setOpenToast] = useState(false);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const usersResponse = await fetchUsers();
        setUsers(usersResponse);
      } catch (error) {
        console.error('Failed to fetch users', error);
      }
    };

    fetchAllUsers();
  }, []);

  const handleUserChange = async (event, value) => {
    setSelectedUser(value);
    if (value) {
      try {
        const transactionsResponse = await fetchUserTransactions(value.uid);
        setTransactions(transactionsResponse);
      } catch (error) {
        console.error('Failed to fetch transactions', error);
      }
    } else {
      setTransactions([]);
    }
  };

  const handleCloseToast = () => {
    setOpenToast(false);
    setToastMessage('');
  };

  return (
    <Container component="main" maxWidth="md">
      <Paper sx={{ marginTop: 8, padding: 4, backgroundColor: '#424242', color: 'white' }}>
        <Typography component="h1" variant="h5" sx={{ marginBottom: 2 }}>
          User Transactions
        </Typography>
        <Autocomplete
          options={users}
          getOptionLabel={(option) => option.obkUsername || ''}
          value={selectedUser}
          onChange={handleUserChange}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select User"
              variant="outlined"
              fullWidth
              sx={{
                marginBottom: 2,
                '& .MuiInputBase-root': { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'white' },
                },
                '& .MuiFormLabel-root': { color: 'white' },
              }}
            />
          )}
          PaperComponent={({ children }) => (
            <Paper sx={{ backgroundColor: '#424242', color: 'white' }}>{children}</Paper>
          )}
          sx={{
            width: '100%',
            marginBottom: 2,
            '& .MuiAutocomplete-inputRoot[class*="MuiOutlinedInput-root"]': {
              backgroundColor: '#424242',
              color: 'white',
            },
            '& .MuiAutocomplete-listbox': {
              backgroundColor: '#424242',
              color: 'white',
            },
            '& .MuiAutocomplete-option': {
              '&[data-focus="true"]': {
                backgroundColor: '#616161',
              },
              '&[aria-selected="true"]': {
                backgroundColor: '#757575',
              },
            },
          }}
        />
        <Paper sx={{ padding: 2, marginBottom: 4, backgroundColor: '#333', color: '#fff' }}>
          <Typography variant="h6" sx={{ marginBottom: 2 }}>
            Transactions
          </Typography>
          <List>
            {transactions.map((transaction) => (
              <ListItem key={transaction._id}>
                <ListItemText
                  primary={`Amount: ${transaction.amount} BP`}
                  secondary={
                    <>
                      <Typography variant="body2" component="span">
                        User: {selectedUser?.obkUsername}
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
                            Target User ID: {transaction.targetUserId}
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
      </Paper>
      <Snackbar
        open={openToast}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        message={toastMessage}
      />
    </Container>
  );
};

export default UserHistoryPage;
