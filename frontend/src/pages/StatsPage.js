// components/StatsPage.jsx
import React, { useEffect, useState } from 'react';
import { Typography, Card, CardContent, Grid, Paper, Button } from '@mui/material';
import { 
  getPlinkoResults, 
  getBurnTransactions, 
  claimPlinkoProfits, 
  getBlackjackStats, 
  claimBlackjackProfits, 
  getRouletteStats, 
  claimRouletteProfits 
} from '../firebase';

const StatsPage = () => {
  const [plinkoStats, setPlinkoStats] = useState(null);
  const [burnStats, setBurnStats] = useState(null);
  const [blackjackStats, setBlackjackStats] = useState(null);
  const [rouletteStats, setRouletteStats] = useState(null);

  const fetchStats = async () => {
    try {
      const plinkoResponse = await getPlinkoResults();
      setPlinkoStats(plinkoResponse);

      const burnResponse = await getBurnTransactions();
      setBurnStats(burnResponse);

      const blackjackResponse = await getBlackjackStats();
      setBlackjackStats(blackjackResponse);

      const rouletteResponse = await getRouletteStats();
      setRouletteStats(rouletteResponse);
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

  const handleClaimRouletteProfits = async () => {
    try {
      await claimRouletteProfits();
      // Refresh stats after claiming profits
      fetchStats();
    } catch (error) {
      console.error('Failed to claim Roulette profits', error);
    }
  };

  if (!plinkoStats || !burnStats || !blackjackStats || !rouletteStats) {
    return <Typography>Loading stats...</Typography>;
  }

  return (
    <Paper sx={{ mt: 4, p: 3, bgcolor: '#424242' }}>
      {/* Burn Stats Section */}
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

      {/* Plinko Stats Section */}
      <Typography variant="h4" gutterBottom sx={{ color: 'white', mt: 4 }}>
        BPlinko Stats
      </Typography>
      <Grid container spacing={3}>
        {/* Add Plinko Stats Cards here */}
        {/* Example Plinko Stat Card */}
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
        {/* Add more Plinko Stat Cards as needed */}
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
        {/* Add Blackjack Stats Cards here */}
        {/* Example Blackjack Stat Card */}
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
        {/* Add more Blackjack Stat Cards as needed */}
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
