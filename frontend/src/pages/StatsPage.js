import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Paper } from '@mui/material';
import { getPlinkoResults } from '../firebase';

const StatsPage = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getPlinkoResults();
        setStats(response);
      } catch (error) {
        console.error('Failed to fetch stats', error);
      }
    };

    fetchStats();
  }, []);

  if (!stats) {
    return <Typography>Loading stats...</Typography>;
  }

  return (
    <Paper sx={{ mt: 4, p: 3, bgcolor: '#424242' }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'white' }}>
        Plinko Stats
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#616161', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" component="div">
                Transaction Count
              </Typography>
              <Typography variant="body1">
                {stats.transactionCount}
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
                {stats.totalWagered}
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
                {stats.totalReturned}
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
                {stats.netAmount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default StatsPage;
