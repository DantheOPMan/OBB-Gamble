import React, { useState, useEffect } from 'react';
import { Container, Box, Button, Snackbar } from '@mui/material';
import AdminApprovalPage from './AdminApprovalPage';
import CloseMarketPage from './CloseMarketPage';
import CreateMarketPage from './CreateMarketPage';
import ApprovedTransactionsPage from './ApprovedTransactionsPage';
import AdminTipsPage from './AdminTipsPage'; // Import the new AdminTipsPage
import { fetchPendingTransactions, approveTransaction, rejectTransaction, fetchPendingTips, approveTip, rejectTip } from '../firebase';

const AdminPage = () => {
  const [currentSection, setCurrentSection] = useState('create');
  const [transactions, setTransactions] = useState([]);
  const [tips, setTips] = useState([]); // State for tips
  const [toastMessage, setToastMessage] = useState('');
  const [openToast, setOpenToast] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetchPendingTransactions();
        setTransactions(response);
      } catch (error) {
        console.error('Failed to fetch transactions', error);
      }
    };

    const fetchTips = async () => {
      try {
        const response = await fetchPendingTips();
        setTips(response);
      } catch (error) {
        console.error('Failed to fetch tips', error);
      }
    };

    fetchTransactions();
    fetchTips(); // Fetch tips on load
  }, []);

  const handleApprove = async (transactionId) => {
    try {
      await approveTransaction(transactionId);
      setTransactions(transactions.filter((transaction) => transaction._id !== transactionId));
      setToastMessage('Transaction approved');
      setOpenToast(true);
    } catch (error) {
      console.error('Failed to approve transaction', error);
      setToastMessage('Failed to approve transaction');
      setOpenToast(true);
    }
  };

  const handleReject = async (transactionId) => {
    try {
      await rejectTransaction(transactionId);
      setTransactions(transactions.filter((transaction) => transaction._id !== transactionId));
      setToastMessage('Transaction rejected');
      setOpenToast(true);
    } catch (error) {
      console.error('Failed to reject transaction', error);
      setToastMessage('Failed to reject transaction');
      setOpenToast(true);
    }
  };

  const handleApproveTip = async (transactionId) => {
    try {
      await approveTip(transactionId);
      setTips(tips.filter((transaction) => transaction._id !== transactionId));
      setToastMessage('Tip approved');
      setOpenToast(true);
    } catch (error) {
      console.error('Failed to approve tip', error);
      setToastMessage('Failed to approve tip');
      setOpenToast(true);
    }
  };

  const handleRejectTip = async (transactionId) => {
    try {
      await rejectTip(transactionId);
      setTips(tips.filter((transaction) => transaction._id !== transactionId));
      setToastMessage('Tip rejected');
      setOpenToast(true);
    } catch (error) {
      console.error('Failed to reject tip', error);
      setToastMessage('Failed to reject tip');
      setOpenToast(true);
    }
  };

  const handleCloseToast = () => {
    setOpenToast(false);
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
          width:'100%',
        }}
      >
        <Box sx={{ display: 'flex', mb: 4, justifyContent: 'space-between', width: '100%' }}>
          <Button
            variant="contained"
            onClick={() => setCurrentSection('create')}
            sx={{
              flex: 1,
              marginRight: 1,
              padding: '10px 0',
              fontSize: '14px',
              minWidth: 0,
              '&:last-child': {
                marginRight: 0,
              },
            }}
          >
            Create Market
          </Button>
          <Button
            variant="contained"
            onClick={() => setCurrentSection('close')}
            sx={{
              flex: 1,
              marginRight: 1,
              padding: '10px 0',
              fontSize: '14px',
              minWidth: 0,
              '&:last-child': {
                marginRight: 0,
              },
            }}
          >
            Close Market
          </Button>
          <Button
            variant="contained"
            onClick={() => setCurrentSection('approve')}
            sx={{
              flex: 1,
              marginRight: 1,
              padding: '10px 0',
              fontSize: '14px',
              minWidth: 0,
              '&:last-child': {
                marginRight: 0,
              },
            }}
          >
            Admin Approval
          </Button>
          <Button
            variant="contained"
            onClick={() => setCurrentSection('approvedTransactions')}
            sx={{
              flex: 1,
              marginRight: 1,
              padding: '10px 0',
              fontSize: '14px',
              minWidth: 0,
              '&:last-child': {
                marginRight: 0,
              },
            }}
          >
            Approved Transactions
          </Button>
          <Button
            variant="contained"
            onClick={() => setCurrentSection('tips')}
            sx={{
              flex: 1,
              marginRight: 1,
              padding: '10px 0',
              fontSize: '14px',
              minWidth: 0,
              '&:last-child': {
                marginRight: 0,
              },
            }}
          >
            Tips
          </Button>
        </Box>

        {currentSection === 'create' && <CreateMarketPage />}
        {currentSection === 'close' && <CloseMarketPage />}
        {currentSection === 'approve' && (
          <AdminApprovalPage
            transactions={transactions}
            handleApprove={handleApprove}
            handleReject={handleReject}
          />
        )}
        {currentSection === 'approvedTransactions' && <ApprovedTransactionsPage />}
        {currentSection === 'tips' && (
          <AdminTipsPage
            transactions={tips}
            handleApprove={handleApproveTip}
            handleReject={handleRejectTip}
          />
        )}
      </Box>

      <Snackbar
        open={openToast}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        message={toastMessage}
      />
    </Container>
  );
};

export default AdminPage;
