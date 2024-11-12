// src/components/StatsPage.jsx

import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Paper, 
  Button, 
  CircularProgress, 
  Snackbar, 
  Alert 
} from '@mui/material';
import { 
  getPlinkoResults, 
  getBurnTransactions, 
  getBlackjackStats, 
  getRouletteStats, 
  claimPlinkoProfits, 
  claimBlackjackProfits, 
  claimRouletteProfits 
} from '../firebase'; // Adjust the path as necessary

const StatsPage = () => {
  // State variables for storing stats
  const [plinkoStats, setPlinkoStats] = useState(null);
  const [burnStats, setBurnStats] = useState(null);
  const [blackjackStats, setBlackjackStats] = useState(null);
  const [rouletteStats, setRouletteStats] = useState(null);
  
  // State variables for loading and error handling
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State variables for Snackbar notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success', // 'success' | 'error' | 'warning' | 'info'
  });

  // Function to fetch all stats
  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plinkoResponse, burnResponse, blackjackResponse, rouletteResponse] = await Promise.all([
        getPlinkoResults(),
        getBurnTransactions(),
        getBlackjackStats(),
        getRouletteStats(),
      ]);
      
      setPlinkoStats(plinkoResponse);
      setBurnStats(burnResponse);
      setBlackjackStats(blackjackResponse);
      setRouletteStats(rouletteResponse);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load statistics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Handler functions for claiming profits
  const handleClaimPlinkoProfits = async () => {
    try {
      const response = await claimPlinkoProfits();
      setSnackbar({
        open: true,
        message: response.message || 'Plinko profits claimed successfully.',
        severity: 'success',
      });
      fetchStats();
    } catch (err) {
      console.error('Failed to claim Plinko profits:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Failed to claim Plinko profits.',
        severity: 'error',
      });
    }
  };

  const handleClaimBlackjackProfits = async () => {
    try {
      const response = await claimBlackjackProfits();
      setSnackbar({
        open: true,
        message: response.message || 'Blackjack profits claimed successfully.',
        severity: 'success',
      });
      fetchStats();
    } catch (err) {
      console.error('Failed to claim Blackjack profits:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Failed to claim Blackjack profits.',
        severity: 'error',
      });
    }
  };

  const handleClaimRouletteProfits = async () => {
    try {
      const response = await claimRouletteProfits();
      setSnackbar({
        open: true,
        message: response.message || 'Roulette profits claimed successfully.',
        severity: 'success',
      });
      fetchStats();
    } catch (err) {
      console.error('Failed to claim Roulette profits:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Failed to claim Roulette profits.',
        severity: 'error',
      });
    }
  };

  // Handler to close the Snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Render loading state
  if (loading) {
    return (
      <Grid container justifyContent="center" alignItems="center" style={{ minHeight: '80vh' }}>
        <CircularProgress />
      </Grid>
    );
  }

  // Render error state
  if (error) {
    return (
      <Typography color="error" variant="h6" align="center">
        {error}
      </Typography>
    );
  }

  return (
    <Paper sx={{ mt: 4, p: 3, bgcolor: '#424242' }}>
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Burn Stats Section */}
      <Typography variant="h4" gutterBottom sx={{ color: 'white' }}>
        Burn Stats
      </Typography>
      <Grid container spacing={3}>
        {/* Burn Transaction Count */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Burn Transaction Count
              </Typography>
              <Typography variant="body1">
                {burnStats.transactionCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Total Burned */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Total Burned
              </Typography>
              <Typography variant="body1">
                {burnStats.totalBurned}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* BPlinko Stats Section */}
      <Typography variant="h4" gutterBottom sx={{ color: 'white', mt: 4 }}>
        BPlinko Stats
      </Typography>
      <Grid container spacing={3}>
        {/* Transaction Count */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Transaction Count
              </Typography>
              <Typography variant="body1">
                {plinkoStats.transactionCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Total Wagered */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Total Wagered
              </Typography>
              <Typography variant="body1">
                {plinkoStats.totalWagered}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Total Returned */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Total Returned
              </Typography>
              <Typography variant="body1">
                {plinkoStats.totalReturned}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Net Amount */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Net Amount
              </Typography>
              <Typography variant="body1">
                {plinkoStats.netAmount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Admin Claimed */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Admin Claimed
              </Typography>
              <Typography variant="body1">
                {Math.abs(plinkoStats.totalAdminClaimed)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Claim Plinko Profits Button */}
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleClaimPlinkoProfits}
          >
            Claim Plinko Profits
          </Button>
        </Grid>
      </Grid>

      {/* Blackjack Stats Section */}
      <Typography variant="h4" gutterBottom sx={{ color: 'white', mt: 4 }}>
        Blackjack Stats
      </Typography>
      <Grid container spacing={3}>
        {/* Hand Count */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Hand Count
              </Typography>
              <Typography variant="body1">
                {blackjackStats.handCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Total Wagered */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Total Wagered
              </Typography>
              <Typography variant="body1">
                {blackjackStats.totalWagered}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Total Returned */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Total Returned
              </Typography>
              <Typography variant="body1">
                {blackjackStats.totalReturned}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Net Amount */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Net Amount
              </Typography>
              <Typography variant="body1">
                {blackjackStats.netAmount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Admin Claimed */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Admin Claimed
              </Typography>
              <Typography variant="body1">
                {blackjackStats.totalAdminClaimed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Claim Blackjack Profits Button */}
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleClaimBlackjackProfits}
          >
            Claim Blackjack Profits
          </Button>
        </Grid>
      </Grid>

      {/* Roulette Stats Section */}
      <Typography variant="h4" gutterBottom sx={{ color: 'white', mt: 4 }}>
        Roulette Stats
      </Typography>
      <Grid container spacing={3}>
        {/* Total Rounds */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Total Rounds
              </Typography>
              <Typography variant="body1">
                {rouletteStats.totalRounds}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Bets */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Total Bets
              </Typography>
              <Typography variant="body1">
                {rouletteStats.totalBets}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Returned */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Total Returned
              </Typography>
              <Typography variant="body1">
                {rouletteStats.totalReturned}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Net Amount */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Net Amount
              </Typography>
              <Typography variant="body1">
                {rouletteStats.netAmount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Admin Claimed */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Admin Claimed
              </Typography>
              <Typography variant="body1">
                {rouletteStats.totalAdminClaimed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Claim Roulette Profits Button */}
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleClaimRouletteProfits}
          >
            Claim Roulette Profits
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default StatsPage;
