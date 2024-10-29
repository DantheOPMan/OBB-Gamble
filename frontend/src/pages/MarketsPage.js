import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Box, Typography, List, ListItem, ListItemText, Paper } from '@mui/material';
import { getMarkets, getBetTransactions } from '../firebase';

const MarketsPage = () => {
  const [openMarkets, setOpenMarkets] = useState([]);
  const [pausedMarkets, setPausedMarkets] = useState([]);
  const [closedMarkets, setClosedMarkets] = useState([]);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await getMarkets();

        // Fetch additional data for each market
        const marketDataPromises = response.map(async (market) => {
          let itemsToDisplay = [];

          if (market.marketType === 'combination') {
            const combinationLikelihoods = await calculateCombinationLikelihoods(market._id);
            combinationLikelihoods.sort((a, b) => a.combination.localeCompare(b.combination));
            itemsToDisplay = combinationLikelihoods.slice(0, 5);
          } else {
            const competitorsWithLikelihoods = calculateLikelihoods(market.competitors);
            itemsToDisplay = competitorsWithLikelihoods.slice(0, 5);
          }

          return { ...market, itemsToDisplay };
        });

        const marketsWithData = await Promise.all(marketDataPromises);

        setOpenMarkets(marketsWithData.filter(market => market.status === 'open'));
        setPausedMarkets(marketsWithData.filter(market => market.status === 'paused'));
        setClosedMarkets(marketsWithData.filter(market => market.status === 'closed'));
      } catch (error) {
        console.error('Failed to fetch markets', error);
      }
    };

    fetchMarkets();
  }, []);

  const calculateLikelihoods = (competitors) => {
    const totalValue = competitors.reduce((sum, competitor) => sum + competitor.value, 0) || 1;
    return competitors.map(competitor => ({
      ...competitor,
      likelihood: (competitor.value / totalValue) * 100,
    }));
  };

  const calculateCombinationLikelihoods = async (marketId) => {
    const transactions = await getBetTransactions(marketId);
    const combinationBets = {};
    transactions.forEach(transaction => {
      if (transaction.competitorName) {
        const combination = transaction.competitorName.split(',').map(name => name.trim()).sort().join(', ');
        if (!combinationBets[combination]) {
          combinationBets[combination] = 0;
        }
        combinationBets[combination] += Math.abs(transaction.amount);
      }
    });
    const totalBet = Object.values(combinationBets).reduce((sum, amount) => sum + amount, 0) || 1;
    const combinationsWithLikelihoods = Object.entries(combinationBets).map(([combination, amount]) => ({
      combination,
      likelihood: (amount / totalBet) * 100,
    }));
    return combinationsWithLikelihoods;
  };

  const renderMarket = (market, statusLabel = '') => {
    return (
      <Paper
        key={market._id}
        component={Link}
        to={`/markets/${market._id}`}
        sx={{
          width: '100%',
          marginBottom: 2,
          padding: 2,
          backgroundColor: '#2c2c2c',
          textDecoration: 'none',
          color: '#FFF',
          '&:hover': {
            backgroundColor: '#3c3c3c',
          },
        }}
      >
        <Typography variant="h6" sx={{ marginBottom: 1 }}>
          {market.name} {statusLabel}
        </Typography>
        <Typography variant="subtitle2" sx={{ color: '#FFF', marginBottom: 1 }}>
          {market.marketType === 'combination' ? `Combination Market (Select ${market.combinationSize})` : 'Single Option Market'}
        </Typography>
        {market.status === 'closed' && market.winner && (
          <Typography variant="body2" sx={{ color: '#FFF', marginBottom: 1 }}>
            Winner: {market.winner}
          </Typography>
        )}
        <List>
          {market.itemsToDisplay && market.itemsToDisplay.map((item) => (
            <ListItem key={item.name || item.combination}>
              <ListItemText
                primary={`${item.name || item.combination}: ${item.likelihood.toFixed(2)}%`}
                sx={{ color: '#FFF' }}
              />
            </ListItem>
          ))}
        </List>
        <Typography
          component="div"
          variant="body2"
          sx={{ color: '#FFF', marginTop: 1 }}
        >
          Continue to see all competitors
        </Typography>
      </Paper>
    );
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 8,
          marginBottom: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5" sx={{ marginBottom: 4 }}>
          Available Markets
        </Typography>

        <Typography component="h2" variant="h6" sx={{ marginTop: 2, marginBottom: 2 }}>
          Open Markets
        </Typography>
        {openMarkets.map((market) => renderMarket(market))}

        <Typography component="h2" variant="h6" sx={{ marginTop: 4, marginBottom: 2 }}>
          Paused Markets
        </Typography>
        {pausedMarkets.map((market) => renderMarket(market, '(Paused)'))}

        <Typography component="h2" variant="h6" sx={{ marginTop: 4, marginBottom: 2 }}>
          Closed Markets
        </Typography>
        {closedMarkets.map((market) => renderMarket(market, '(Closed)'))}
      </Box>
    </Container>
  );
};

export default MarketsPage;
