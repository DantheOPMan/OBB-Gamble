import React from 'react';
import { Box, Typography, Button, List, ListItem, ListItemText } from '@mui/material';

const AdminApprovalPage = ({ transactions, handleApprove, handleReject }) => (
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
      {transactions
        .filter(transaction => !transaction.targetUserId)
        .map((transaction) => (
          <ListItem key={transaction._id}>
            <ListItemText
              primary={`User: ${transaction.userId}, Amount: ${transaction.amount}, Market: ${transaction.marketName || 'N/A'}, Discord: ${transaction.discordUsername}, OBK: ${transaction.obkUsername}`}
              secondary={`Requested on: ${new Date(transaction.timestamp).toLocaleString()}`}
            />
            <Button variant="contained" color="primary" onClick={() => handleApprove(transaction._id)}>
              Approve
            </Button>
            <Button variant="contained" color="secondary" onClick={() => handleReject(transaction._id)}>
              Reject
            </Button>
          </ListItem>
        ))}
    </List>
  </Box>
);

export default AdminApprovalPage;
