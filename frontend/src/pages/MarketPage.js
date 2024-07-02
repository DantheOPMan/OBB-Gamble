import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Container, Box, Typography, Paper, List, ListItem, ListItemText, TextField, Button, MenuItem, Select, Snackbar, Grid } from '@mui/material';
import { auth, getMarketById, placeBet, getBetTransactions, getUser } from '../firebase';

// Import and register necessary components from Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const MarketPage = () => {
  const { marketId } = useParams();
  const [marketData, setMarketData] = useState({});
  const [betAmount, setBetAmount] = useState('');
  const [selectedCompetitor, setSelectedCompetitor] = useState('');
  const [message, setMessage] = useState('');
  const [openToast, setOpenToast] = useState(false);
  const [betTransactions, setBetTransactions] = useState([]);
  const [userBP, setUserBP] = useState(0);
  const chartRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!marketId) {
        console.warn('No marketId provided');
        return;
      }

      try {
        const data = await getMarketById(marketId);
        setMarketData(data);

        const transactions = await getBetTransactions(marketId);
        const filteredTransactions = transactions.filter(
          (transaction) => transaction.competitorName !== 'AdminFee' && transaction.competitorName !== 'Payout'
        );
        setBetTransactions(Array.isArray(filteredTransactions) ? filteredTransactions : []);

        const currentUser = await getUser(auth.currentUser.uid);
        setUserBP(currentUser.bpBalance);
      } catch (error) {
        console.error('Failed to fetch market data', error);
        setBetTransactions([]);
      }
    };

    fetchData();
  }, [marketId]);

  useEffect(() => {
    const chartInstance = chartRef.current;
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, []);
  

  const calculateTotalBPBet = (transactions) => {
    return transactions.reduce((total, transaction) => total + Math.abs(transaction.amount), 0);
  };

  const totalBPBet = calculateTotalBPBet(betTransactions);

  const calculateLikelihoods = (competitors) => {
    const totalValue = competitors.reduce((sum, competitor) => sum + competitor.value, 0) || 1;
    return competitors.map(competitor => ({
      ...competitor,
      likelihood: (competitor.value / totalValue) * 100,
    }));
  };

  const calculateDominance = (competitors, transactions) => {
    const competitorDominance = {};

    competitors.forEach(competitor => {
      competitorDominance[competitor.name] = [];
    });

    transactions.forEach((transaction, index) => {
      const updatedCompetitors = [...competitors];
      const currentTransaction = transactions[index];

      // Update competitor values based on transactions up to the current point
      updatedCompetitors.forEach(competitor => {
        const relevantTransactions = transactions
          .filter(tx => tx.competitorName === competitor.name && new Date(tx.timestamp) <= new Date(currentTransaction.timestamp));
        competitor.value = relevantTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      });

      const totalValue = updatedCompetitors.reduce((sum, competitor) => sum + competitor.value, 0) || 1;
      updatedCompetitors.forEach(competitor => {
        const value = updatedCompetitors.find(c => c.name === competitor.name).value || 0;
        const dominance = (value / totalValue) * 100;
        competitorDominance[competitor.name].push({ timestamp: currentTransaction.timestamp, dominance });
      });
    });

    return competitorDominance;
  };

  const competitorsWithLikelihoods = marketData.competitors ? calculateLikelihoods(marketData.competitors) : [];
  const competitorsWithDominance = marketData.competitors ? calculateDominance(marketData.competitors, betTransactions) : {};

  const data = {
    labels: betTransactions.map(tx => new Date(tx.timestamp).toLocaleString()),
    datasets: Object.keys(competitorsWithDominance).map(competitor => ({
      label: competitor,
      data: competitorsWithDominance[competitor].map(d => d.dominance),
      fill: false,
      backgroundColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.2)`,
      borderColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`,
    })),
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  const handleBet = async () => {
    if (!betAmount || isNaN(betAmount) || betAmount <= 0) {
      setMessage('Please enter a valid positive bet amount');
      setOpenToast(true);
      return;
    }

    if (!selectedCompetitor) {
      setMessage('Please select a competitor');
      setOpenToast(true);
      return;
    }

    try {
      await placeBet(marketId, Number(betAmount), selectedCompetitor);
      setMessage(`Bet placed on ${selectedCompetitor} for ${betAmount} BP`);
      setOpenToast(true);
      setBetAmount('');
      setSelectedCompetitor('');

      const transactions = await getBetTransactions(marketId);
      const filteredTransactions = transactions.filter(
        (transaction) => transaction.competitorName !== 'AdminFee' && transaction.competitorName !== 'Payout'
      );
      setBetTransactions(Array.isArray(filteredTransactions) ? filteredTransactions : []);
    } catch (error) {
      setMessage('Failed to place bet');
      setOpenToast(true);
    }
  };

  const handleCloseToast = () => {
    setOpenToast(false);
    setMessage('');
  };

  return (
    <Container component="main" maxWidth="lg">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          bgcolor: 'background.default',
          padding: 4,
          borderRadius: 2,
          position: 'relative'
        }}
      >
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} sm={5} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography component="h1" variant="h5" sx={{ marginBottom: 1, textAlign: 'center' }}>
              {marketData.name || 'Market'}
            </Typography>
            <Typography variant="body2" sx={{ marginBottom: 4, textAlign: 'center' }}>
              Total BP Bet: {totalBPBet} BP
            </Typography>
            {marketData.status && (
              <Typography
                variant="body2"
                sx={{
                  backgroundColor: marketData.status === 'open' ? 'green' : (marketData.status === 'paused' ? 'orange' : 'red'),
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 2,
                  textAlign: 'center',
                }}
              >
                {marketData.status.toUpperCase()}
              </Typography>
            )}
            {marketData.winner && (
              <Typography
                variant="body1"
                sx={{
                  backgroundColor: 'gold',
                  color: 'black',
                  padding: '4px 8px',
                  borderRadius: 2,
                  textAlign: 'center',
                  marginTop: 2,
                }}
              >
                {marketData.winner} won!
              </Typography>
            )}
            <Paper sx={{ width: '100%', padding: 2, marginBottom: 4, marginTop: 2, backgroundColor: '#2c2c2c', border: '1px solid white', boxShadow: '0 4px 8px rgba(255, 255, 255, 0.1)' }}>
              <Typography variant="h6" sx={{ marginBottom: 2, color: 'white', textAlign: 'center' }}>
                Competitors and Likelihoods
              </Typography>
              <List>
                {competitorsWithLikelihoods.map((competitor) => (
                  <ListItem key={competitor.name}>
                    <ListItemText
                      primary={`${competitor.name}: ${competitor.likelihood.toFixed(2)}%`}
                      sx={{ color: '#FFF' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
            {marketData.status === 'open' && (
              <Paper sx={{ width: '100%', padding: 2, marginBottom: 4, backgroundColor: '#2c2c2c', border: '1px solid white', boxShadow: '0 4px 8px rgba(255, 255, 255, 0.1)' }}>
                <Typography variant="h6" sx={{ marginBottom: 2, color: 'white', textAlign: 'center' }}>
                  Place a Bet
                </Typography>
                <Typography variant="body2" sx={{ color: '#FFF', marginBottom: 2 }}>
                  BP: {userBP}
                </Typography>
                <TextField
                  label="Bet Amount"
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  sx={{ marginBottom: 2, width: '100%', input: { color: '#FFF' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } } }}
                  InputLabelProps={{
                    style: { color: '#FFF' },
                  }}
                />
                <Select
                  value={selectedCompetitor}
                  onChange={(e) => setSelectedCompetitor(e.target.value)}
                  displayEmpty
                  fullWidth
                  sx={{ marginBottom: 2, color: '#FFF', '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } } }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: '#2c2c2c',
                        color: '#FFF',
                      },
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    Select Competitor
                  </MenuItem>
                  {marketData.competitors && marketData.competitors.map((competitor) => (
                    <MenuItem key={competitor.name} value={competitor.name} sx={{ color: '#FFF' }}>
                      {competitor.name}
                    </MenuItem>
                  ))}
                </Select>
                <Button variant="contained" color="primary" fullWidth onClick={handleBet}>
                  Bet
                </Button>
              </Paper>
            )}
          </Grid>
          <Grid item xs={12} sm={7} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Line ref={chartRef} data={data} options={options} />
            <Paper sx={{ width: '100%', padding: 2, marginTop: 4, backgroundColor: '#2c2c2c', border: '1px solid white', boxShadow: '0 4px 8px rgba(255, 255, 255, 0.1)' }}>
              <Typography variant="h6" sx={{ marginBottom: 2, color: 'white', textAlign: 'center' }}>
                Market Transactions
              </Typography>
              <List>
                {betTransactions.map((transaction, index) => (
                  <ListItem key={transaction._id}>
                    <ListItemText
                      primary={`${index + 1}. Option: ${transaction.competitorName}, Amount: ${Math.abs(transaction.amount)} BP, Timestamp: ${new Date(transaction.timestamp).toLocaleString()}`}
                      sx={{ color: '#FFF' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      <Snackbar
        open={openToast}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        message={message}
      />
    </Container>
  );
};

export default MarketPage;
