import React, { useEffect, useState } from 'react';
import { fetchApprovedTransactions, getUser } from '../firebase'; // Assuming getUser fetches user details
import { List, ListItem, ListItemText, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const ApprovedTransactionsPage = () => {
  const [approvedTransactions, setApprovedTransactions] = useState([]);
  const [userDetails, setUserDetails] = useState({});

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetchApprovedTransactions();
        const filteredTransactions = response.filter(
          (transaction) => !transaction.competitorName && !transaction.marketId
        );

        if (filteredTransactions.length > 0) {
          const userId = filteredTransactions[0].userId; // Assuming all transactions belong to the same user
          const userResponse = await getUser(userId);
          setUserDetails(userResponse);
        }

        setApprovedTransactions(filteredTransactions);
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
      {userDetails && (
        <div>
          <Typography variant="subtitle1" sx={{ textAlign: 'center' }}>
            User: {userDetails.username}
          </Typography>
          <Typography variant="subtitle2" sx={{ textAlign: 'center' }}>
            Discord: {userDetails.discordUsername}
          </Typography>
        </div>
      )}
      <TableContainer component={Paper} sx={{ marginTop: 4, backgroundColor: '#424242' }}>
        <Table sx={{ backgroundColor: '#424242' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'white' }}>Amount</TableCell>
              <TableCell sx={{ color: 'white' }}>Timestamp</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {approvedTransactions.map((transaction) => (
              <TableRow key={transaction._id}>
                <TableCell sx={{ color: 'white' }}>{transaction.amount}</TableCell>
                <TableCell sx={{ color: 'white' }}>{new Date(transaction.timestamp).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default ApprovedTransactionsPage;
