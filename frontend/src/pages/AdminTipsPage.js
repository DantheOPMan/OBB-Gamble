import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, List, ListItem, Grid } from '@mui/material';
import { getUser } from '../firebase'; // Import the getUser function

const AdminTipsPage = ({ transactions = [], handleApprove, handleReject }) => {
  const [userDetails, setUserDetails] = useState({});

  useEffect(() => {
    const fetchUserDetails = async () => {
      const details = {};
      for (const transaction of transactions) {
        if (transaction.targetUserId && !details[transaction.targetUserId]) {
          const userInfo = await getUser(transaction.targetUserId);
          details[transaction.targetUserId] = userInfo;
        }
      }
      setUserDetails(details);
    };

    fetchUserDetails();
  }, [transactions]);

  return (
    <Box
      sx={{
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: '#333', // Set background color to dark grey
        padding: 4,
        borderRadius: 2,
        width: '120%', // Increase the width
        maxWidth: '1200px' // Set max width to limit the spread on very large screens
      }}
    >
      <Typography component="h1" variant="h5" sx={{ marginBottom: 2, color: 'white' }}>
        Pending Tips
      </Typography>
      <List sx={{ width: '100%' }}>
        {transactions.filter(transaction => transaction.targetUserId).map((transaction) => {
          const targetUser = userDetails[transaction.targetUserId] || {};
          return (
            <ListItem
              key={transaction._id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                backgroundColor: '#424242', // Set background color to a slightly lighter grey for contrast
                marginBottom: 2,
                padding: 3,
                borderRadius: 1,
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle1" sx={{ color: 'white', marginBottom: 1 }}><strong>From User:</strong> {transaction.userId}</Typography>
                  <Typography variant="body2" sx={{ color: 'white', marginBottom: 1 }}>Discord: {transaction.discordUsername}</Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>OBK: {transaction.obkUsername}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle1" sx={{ color: 'white', marginBottom: 1 }}><strong>To User:</strong> {targetUser.uid}</Typography>
                  <Typography variant="body2" sx={{ color: 'white', marginBottom: 1 }}>Discord: {targetUser.discordUsername}</Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>OBK: {targetUser.obkUsername}</Typography>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Typography variant="subtitle1" sx={{ color: 'white', marginBottom: 1 }}><strong>Amount:</strong> {Math.abs(transaction.amount)}</Typography>
                </Grid>
                <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="contained" color="primary" onClick={() => handleApprove(transaction._id)} sx={{ marginRight: 1 }}>
                    Approve
                  </Button>
                  <Button variant="contained" color="secondary" onClick={() => handleReject(transaction._id)}>
                    Reject
                  </Button>
                </Grid>
              </Grid>
              <Typography variant="body2" sx={{ marginTop: 2, color: 'gray' }}>
                Requested on: {new Date(transaction.timestamp).toLocaleString()}
              </Typography>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};

export default AdminTipsPage;
