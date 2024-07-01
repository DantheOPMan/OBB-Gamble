import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Container, Box, Typography, Paper, List, ListItem, ListItemText, TextField, Button, MenuItem, Select, Snackbar } from '@mui/material';
import { getMarketById, placeBet, getBetTransactions } from '../firebase';

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
        setBetTransactions(Array.isArray(transactions) ? transactions : []);
      } catch (error) {
        console.error('Failed to fetch market data', error);
        setBetTransactions([]);
      }
    };

    fetchData();
  }, [marketId]);

  useEffect(() => {
    return () => {
      const chartInstance = chartRef.current;
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, []);

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
        competitor.value = relevantTransactions.reduce((sum, tx) => sum + tx.amount, 0);
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
      setBetTransactions(Array.isArray(transactions) ? transactions : []);
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
          position: 'relative'
        }}
      >
        <Typography component="h1" variant="h5" sx={{ marginBottom: 4 }}>
          {marketData.name || 'Market'}
        </Typography>
        {marketData.status && (
          <Typography
            variant="body2"
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              backgroundColor: marketData.status === 'open' ? 'green' : 'red',
              color: 'white',
              padding: '4px 8px',
              borderRadius: 2,
            }}
          >
            {marketData.status.toUpperCase()}
          </Typography>
        )}
        {marketData.winner && (
          <Typography
            variant="body1"
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              backgroundColor: 'gold',
              color: 'black',
              padding: '4px 8px',
              borderRadius: 2,
            }}
          >
            {marketData.winner} won!
          </Typography>
        )}
        <Paper sx={{ width: '100%', padding: 2, marginBottom: 4, backgroundColor: '#2c2c2c', border: '1px solid white', boxShadow: '0 4px 8px rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="h6" sx={{ marginBottom: 2, color: 'white' }}>
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
        <Paper sx={{ width: '100%', padding: 2, marginBottom: 4, backgroundColor: '#2c2c2c', border: '1px solid white', boxShadow: '0 4px 8px rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="h6" sx={{ marginBottom: 2, color: 'white' }}>
            Place a Bet
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
        <Line ref={chartRef} data={data} options={options} />
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
