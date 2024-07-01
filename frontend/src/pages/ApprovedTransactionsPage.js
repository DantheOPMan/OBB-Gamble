import React, { useEffect, useState } from 'react';
import { fetchApprovedTransactions, getUser } from '../firebase'; // Assuming getUser fetches user details
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Box } from '@mui/material';

const ApprovedTransactionsPage = () => {
  const [groupedTransactions, setGroupedTransactions] = useState({});
  const [userDetails, setUserDetails] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetchApprovedTransactions();
        const filteredTransactions = response.filter(
          (transaction) => !transaction.competitorName && !transaction.marketId
        );

        // Group transactions by userId
        const transactionsByUser = filteredTransactions.reduce((acc, transaction) => {
          const { userId } = transaction;
          if (!acc[userId]) acc[userId] = [];
          acc[userId].push(transaction);
          return acc;
        }, {});

        setGroupedTransactions(transactionsByUser);

        // Fetch user details for each userId
        const userDetailsPromises = Object.keys(transactionsByUser).map(userId => getUser(userId));
        const userDetailsArray = await Promise.all(userDetailsPromises);
        const userDetailsObject = userDetailsArray.reduce((acc, userDetails) => {
          acc[userDetails.uid] = userDetails;
          return acc;
        }, {});

        setUserDetails(userDetailsObject);
      } catch (error) {
        console.error('Failed to fetch approved transactions', error);
      }
    };

    fetchTransactions();
  }, []);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const filteredUsers = Object.keys(groupedTransactions).filter(userId => {
    const user = userDetails[userId];
    if (!user) return false;
    const username = user.username ? user.username.toLowerCase() : '';
    const discordUsername = user.discordUsername ? user.discordUsername.toLowerCase() : '';
    const obkUsername = user.obkUsername ? user.obkUsername.toLowerCase() : '';
    const query = searchQuery.toLowerCase();
    return username.includes(query) || discordUsername.includes(query) || obkUsername.includes(query);
  });

  return (
    <div>
      <Typography variant="h6" sx={{ marginBottom: 2, textAlign: 'center' }}>
        Approved Transactions
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
        <TextField
          label="Search Users"
          value={searchQuery}
          onChange={handleSearchChange}
          variant="outlined"
          sx={{ width: '300px' }}
        />
      </Box>
      {filteredUsers.map(userId => (
        <div key={userId} style={{ marginBottom: '2rem' }}>
          <Typography variant="subtitle1" sx={{ textAlign: 'center' }}>
            User: {userDetails[userId]?.username}
          </Typography>
          <Typography variant="subtitle2" sx={{ textAlign: 'center' }}>
            UserID: {userId}
          </Typography>
          <Typography variant="subtitle2" sx={{ textAlign: 'center' }}>
            Discord: {userDetails[userId]?.discordUsername}
          </Typography>
          <Typography variant="subtitle2" sx={{ textAlign: 'center' }}>
            OBK Username: {userDetails[userId]?.obkUsername}
          </Typography>
          <Typography variant="subtitle2" sx={{ textAlign: 'center' }}>
            Current BP Balance: {userDetails[userId]?.bpBalance}
          </Typography>
          <TableContainer component={Paper} sx={{ marginTop: 4, backgroundColor: '#424242' }}>
            <Table sx={{ backgroundColor: '#424242' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'white' }}>Amount</TableCell>
                  <TableCell sx={{ color: 'white' }}>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedTransactions[userId].map((transaction) => (
                  <TableRow key={transaction._id}>
                    <TableCell sx={{ color: 'white' }}>{transaction.amount}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{new Date(transaction.timestamp).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      ))}
    </div>
  );
};

export default ApprovedTransactionsPage;
