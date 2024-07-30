import React, { useEffect, useState } from 'react';
import { Typography, Card, CardContent, Grid, Paper, Button } from '@mui/material';
import { getPlinkoResults, getBurnTransactions, claimPlinkoProfits, getBlackjackStats, claimBlackjackProfits } from '../firebase';

const StatsPage = () => {
  const [plinkoStats, setPlinkoStats] = useState(null);
  const [burnStats, setBurnStats] = useState(null);
  const [blackjackStats, setBlackjackStats] = useState(null);

  const fetchStats = async () => {
    try {
      const plinkoResponse = await getPlinkoResults();
      setPlinkoStats(plinkoResponse);

      const burnResponse = await getBurnTransactions();
      setBurnStats(burnResponse);

      const blackjackResponse = await getBlackjackStats();
      setBlackjackStats(blackjackResponse);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleClaimPlinkoProfits = async () => {
    try {
      await claimPlinkoProfits();
      // Refresh stats after claiming profits
      fetchStats();
    } catch (error) {
      console.error('Failed to claim Plinko profits', error);
    }
  };

  const handleClaimBlackjackProfits = async () => {
    try {
      await claimBlackjackProfits();
      // Refresh stats after claiming profits
      fetchStats();
    } catch (error) {
      console.error('Failed to claim Blackjack profits', error);
    }
  };

  if (!plinkoStats || !burnStats || !blackjackStats) {
    return <Typography>Loading stats...</Typography>;
  }

  return (
    <Paper sx={{ mt: 4, p: 3, bgcolor: '#424242' }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'white' }}>
        Burn Stats
      </Typography>
      <Grid container spacing={3}>
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

      <Typography variant="h4" gutterBottom sx={{ color: 'white', mt: 4 }}>
        Blackjack Stats
      </Typography>
      <Grid container spacing={3}>
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

      <Typography variant="h4" gutterBottom sx={{ color: 'white', mt: 4 }}>
        Blackjack Stats
      </Typography>
      <Grid container spacing={3}>
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
    </Paper>
  );
};

export default StatsPage;
