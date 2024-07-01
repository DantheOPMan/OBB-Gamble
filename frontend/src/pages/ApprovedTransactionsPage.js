import React, { useEffect, useState } from 'react';
import { fetchApprovedTransactions, getUser } from '../firebase'; // Assuming getUser fetches user details
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const ApprovedTransactionsPage = () => {
  const [groupedTransactions, setGroupedTransactions] = useState({});
  const [userDetails, setUserDetails] = useState({});

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

  return (
    <div>
      <Typography variant="h6" sx={{ marginBottom: 2, textAlign: 'center' }}>
        Approved Transactions
      </Typography>
      {Object.keys(groupedTransactions).map(userId => (
        <div key={userId} style={{ marginBottom: '2rem' }}>
          <Typography variant="subtitle1" sx={{ textAlign: 'center' }}>
            User: {userDetails[userId]?.username}
          </Typography>
          <Typography variant="subtitle2" sx={{ textAlign: 'center' }}>
            Discord: {userDetails[userId]?.discordUsername}
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
