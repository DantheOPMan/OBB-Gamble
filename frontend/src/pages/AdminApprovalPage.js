// src/pages/AdminApprovalPage.js
import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Button, List, ListItem, ListItemText } from '@mui/material';
import { makeRequest, approveTransaction } from '../firebase';

const AdminApprovalPage = () => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await makeRequest('/api/transactions/pending', 'GET');
        setTransactions(response);
      } catch (error) {
        console.error('Failed to fetch transactions', error);
      }
    };

    fetchTransactions();
  }, []);

  const handleApprove = async (transactionId) => {
    try {
      await approveTransaction(transactionId);
      setTransactions(transactions.filter((transaction) => transaction._id !== transactionId));
    } catch (error) {
      console.error('Failed to approve transaction', error);
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          bgcolor: 'background.default',
          padding: 4,
          borderRadius: 2,
        }}
      >
        <Typography component="h1" variant="h5">
          Pending Transactions
        </Typography>
        <List>
          {transactions.map((transaction) => (
            <ListItem key={transaction._id}>
              <ListItemText
                primary={`User: ${transaction.userId.email}, Amount: ${transaction.amount}, Market: ${transaction.marketName || 'N/A'}`}
                secondary={`Requested on: ${new Date(transaction.timestamp).toLocaleString()}`}
              />
              <Button variant="contained" color="primary" onClick={() => handleApprove(transaction._id)}>
                Approve
              </Button>
            </ListItem>
          ))}
        </List>
      </Box>
    </Container>
  );
};

export default AdminApprovalPage;
