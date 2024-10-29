import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Container,
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  TextField,
  Button,
  MenuItem,
  Select,
  Snackbar,
  Grid,
  Checkbox,
} from '@mui/material';
import { auth, getMarketById, placeBet, getBetTransactions, getUser } from '../firebase';

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
  const [selectedCompetitors, setSelectedCompetitors] = useState([]);
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

  const calculateCombinationBets = (transactions) => {
    const combinationBets = {};
    transactions.forEach(transaction => {
      if (transaction.competitorName) {
        const combination = transaction.competitorName.split(',').sort().join(', ');
        if (!combinationBets[combination]) {
          combinationBets[combination] = 0;
        }
        combinationBets[combination] += Math.abs(transaction.amount);
      }
    });
    return combinationBets;
  };

  // New function to calculate likelihoods for combinations
  const calculateCombinationLikelihoods = (transactions) => {
    const combinationBets = calculateCombinationBets(transactions);
    const totalBet = Object.values(combinationBets).reduce((sum, amount) => sum + amount, 0) || 1;

    const combinationsWithLikelihoods = Object.entries(combinationBets).map(([combination, amount]) => ({
      combination,
      likelihood: (amount / totalBet) * 100,
    }));

    return combinationsWithLikelihoods;
  };

  // New function to calculate dominance for combinations
  const calculateCombinationDominance = (transactions) => {
    const combinationDominance = {};
    const uniqueCombinations = new Set();

    // First, get all unique combinations
    transactions.forEach(transaction => {
      if (transaction.competitorName) {
        const combination = transaction.competitorName.split(',').sort().join(', ');
        uniqueCombinations.add(combination);
      }
    });

    // Initialize dominance arrays for each combination
    uniqueCombinations.forEach(combination => {
      combinationDominance[combination] = [];
    });

    // Now, go through transactions in order, and calculate dominance over time
    transactions.forEach((transaction, index) => {
      //const currentTransactionTime = new Date(transaction.timestamp);
      const transactionsUpToCurrent = transactions.slice(0, index + 1);

      // Calculate total amount bet up to current time
      const totalBetUpToCurrent = transactionsUpToCurrent.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 1;

      // Calculate amount bet on each combination up to current time
      const combinationAmounts = {};

      uniqueCombinations.forEach(combination => {
        const amountOnCombination = transactionsUpToCurrent
          .filter(tx => {
            if (!tx.competitorName) return false;
            const txCombination = tx.competitorName.split(',').sort().join(', ');
            return txCombination === combination;
          })
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        combinationAmounts[combination] = amountOnCombination;
      });

      // Calculate dominance for each combination at current time
      uniqueCombinations.forEach(combination => {
        const dominance = (combinationAmounts[combination] / totalBetUpToCurrent) * 100;
        combinationDominance[combination].push({
          timestamp: transaction.timestamp,
          dominance
        });
      });
    });

    return combinationDominance;
  };

  const competitorsWithLikelihoods = marketData.marketType === 'single' && marketData.competitors
    ? calculateLikelihoods(marketData.competitors)
    : [];

  const combinationsWithLikelihoods = marketData.marketType === 'combination'
    ? calculateCombinationLikelihoods(betTransactions)
    : [];

  // Color map for consistent colors
  const colorMap = {};

  const assignColors = (keys) => {
    keys.forEach((key, index) => {
      const color = `hsl(${(index * 360) / keys.length}, 70%, 50%)`;
      colorMap[key] = color;
    });
  };

  const data = {
    labels: betTransactions.map(tx => new Date(tx.timestamp).toLocaleString()),
    datasets: [],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  if (marketData.marketType === 'combination') {
    const combinationDominance = calculateCombinationDominance(betTransactions);
    const combinations = Object.keys(combinationDominance);
    assignColors(combinations);

    data.datasets = combinations.map(combination => ({
      label: combination,
      data: combinationDominance[combination].map(d => d.dominance),
      fill: false,
      backgroundColor: colorMap[combination],
      borderColor: colorMap[combination],
    }));
  } else {
    const competitorsWithDominance = marketData.competitors ? calculateDominance(marketData.competitors, betTransactions) : {};
    const competitors = Object.keys(competitorsWithDominance);
    assignColors(competitors);

    data.datasets = competitors.map(competitor => ({
      label: competitor,
      data: competitorsWithDominance[competitor].map(d => d.dominance),
      fill: false,
      backgroundColor: colorMap[competitor],
      borderColor: colorMap[competitor],
    }));
  }

  const handleBet = async () => {
    const betAmountNum = Number(betAmount);

    if (!betAmount || isNaN(betAmountNum) || betAmountNum <= 0) {
      setMessage('Please enter a valid positive bet amount');
      setOpenToast(true);
      return;
    }

    if (betAmountNum < 100) {
      setMessage('The minimum bet amount is 100 BP');
      setOpenToast(true);
      return;
    }

    if (marketData.marketType === 'combination') {
      if (selectedCompetitors.length !== marketData.combinationSize) {
        setMessage(`Please select exactly ${marketData.combinationSize} competitors`);
        setOpenToast(true);
        return;
      }
    } else {
      if (!selectedCompetitor) {
        setMessage('Please select a competitor');
        setOpenToast(true);
        return;
      }
    }

    try {
      const competitorName = marketData.marketType === 'combination'
        ? selectedCompetitors.slice().sort().join(', ')
        : selectedCompetitor;

      await placeBet(marketId, betAmountNum, competitorName);
      setMessage(`Bet placed on ${competitorName} for ${betAmountNum} BP`);
      setOpenToast(true);
      setBetAmount('');
      setSelectedCompetitors([]);
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
          <Grid item xs={12} sm={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                {marketData.marketType === 'combination' ? (
                  <Select
                    multiple
                    value={selectedCompetitors}
                    onChange={(e) => setSelectedCompetitors(e.target.value)}
                    renderValue={(selected) => selected.join(', ')}
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
                    {marketData.competitors && marketData.competitors.map((competitor) => (
                      <MenuItem key={competitor.name} value={competitor.name}>
                        <Checkbox checked={selectedCompetitors.includes(competitor.name)} />
                        <ListItemText primary={competitor.name} />
                      </MenuItem>
                    ))}
                  </Select>
                ) : (
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
                )}
                <Button variant="contained" color="primary" fullWidth onClick={handleBet}>
                  Bet
                </Button>
              </Paper>
            )}
            <Paper sx={{ width: '100%', padding: 2, marginBottom: 4, marginTop: 2, backgroundColor: '#2c2c2c', border: '1px solid white', boxShadow: '0 4px 8px rgba(255, 255, 255, 0.1)' }}>
              <Typography variant="h6" sx={{ marginBottom: 2, color: 'white', textAlign: 'center' }}>
                {marketData.marketType === 'combination' ? 'Combinations and Likelihoods' : 'Competitors and Likelihoods'}
              </Typography>
              <List>
                {marketData.marketType === 'combination' ? (
                  combinationsWithLikelihoods.map(({ combination, likelihood }) => (
                    <ListItem key={combination}>
                      <ListItemText
                        primary={`${combination}: ${likelihood.toFixed(2)}%`}
                        sx={{ color: '#FFF' }}
                      />
                    </ListItem>
                  ))
                ) : (
                  competitorsWithLikelihoods.map((competitor) => (
                    <ListItem key={competitor.name}>
                      <ListItemText
                        primary={`${competitor.name}: ${competitor.likelihood.toFixed(2)}%`}
                        sx={{ color: '#FFF' }}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={8} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ width: '100%', height: 400 }}>
              <Line ref={chartRef} data={data} options={options} />
            </Box>
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
