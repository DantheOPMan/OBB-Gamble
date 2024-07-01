import React, { useState, useEffect } from 'react';
import { Container, Box, Button, Snackbar } from '@mui/material';
import AdminApprovalPage from './AdminApprovalPage';
import CloseMarketPage from './CloseMarketPage';
import CreateMarketPage from './CreateMarketPage';
import ApprovedTransactionsPage from './ApprovedTransactionsPage';
import { fetchPendingTransactions, approveTransaction, rejectTransaction } from '../firebase';

const AdminPage = () => {
  const [currentSection, setCurrentSection] = useState('create');
  const [transactions, setTransactions] = useState([]);
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

    fetchTransactions();
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
        }}
      >
        <Box sx={{ display: 'flex', mb: 4 }}>
          <Button variant="contained" onClick={() => setCurrentSection('create')} sx={{ mr: 2 }}>
            Create Market
          </Button>
          <Button variant="contained" onClick={() => setCurrentSection('close')} sx={{ mr: 2 }}>
            Close Market
          </Button>
          <Button variant="contained" onClick={() => setCurrentSection('approve')} sx={{ mr: 2 }}>
            Admin Approval
          </Button>
          <Button variant="contained" onClick={() => setCurrentSection('approvedTransactions')}>
            Approved Transactions
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
