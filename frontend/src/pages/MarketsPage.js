import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Box, Typography, List, ListItem, ListItemText, Paper } from '@mui/material';
import { getMarkets } from '../firebase'; // Import the function to fetch markets

const MarketsPage = () => {
  const [openMarkets, setOpenMarkets] = useState([]);
  const [pausedMarkets, setPausedMarkets] = useState([]);
  const [closedMarkets, setClosedMarkets] = useState([]);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await getMarkets();
        setOpenMarkets(response.filter(market => market.status === 'open'));
        setPausedMarkets(response.filter(market => market.status === 'paused'));
        setClosedMarkets(response.filter(market => market.status === 'closed'));
      } catch (error) {
        console.error('Failed to fetch markets', error);
      }
    };

    fetchMarkets();
  }, []);

  const calculateLikelihoods = (competitors) => {
    const totalValue = competitors.reduce((sum, competitor) => sum + competitor.value, 0) || 1; // Set totalValue to 1 if it's 0
    return competitors.map(competitor => ({
      ...competitor,
      likelihood: (competitor.value / totalValue) * 100,
    }));
  };

  const renderMarket = (market, statusLabel = '') => {
    const competitorsWithLikelihoods = calculateLikelihoods(market.competitors);
    const topCompetitors = competitorsWithLikelihoods.slice(0, 5);

    return (
      <Paper
        key={market._id}
        component={Link}
        to={`/markets/${market._id}`}
        sx={{
          width: '100%',
          marginBottom: 2,
          padding: 2,
          backgroundColor: '#2c2c2c', // Dark pastel gray background
          textDecoration: 'none',
          color: '#FFF',
          '&:hover': {
            backgroundColor: '#3c3c3c', // Slightly lighter gray on hover
          },
        }}
      >
        <Typography variant="h6" sx={{ marginBottom: 1 }}>
          {market.name} {statusLabel}
        </Typography>
        <List>
          {topCompetitors.map((competitor) => (
            <ListItem key={competitor.name}>
              <ListItemText
                primary={`${competitor.name}: ${competitor.likelihood.toFixed(2)}%`}
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
        {closedMarkets.map((market) => (
          <Paper
            key={market._id}
            component={Link}
            to={`/markets/${market._id}`}
            sx={{
              width: '100%',
              marginBottom: 2,
              padding: 2,
              backgroundColor: '#2c2c2c', // Dark pastel gray background
              textDecoration: 'none',
              color: '#FFF',
              '&:hover': {
                backgroundColor: '#3c3c3c', // Slightly lighter gray on hover
              },
            }}
          >
            <Typography variant="h6" sx={{ marginBottom: 1 }}>
              {market.name} (Closed)
            </Typography>
            <Typography variant="body2" sx={{ color: '#FFF', marginBottom: 1 }}>
              Winner: {market.winner}
            </Typography>
            <List>
              {calculateLikelihoods(market.competitors).slice(0, 5).map((competitor) => (
                <ListItem key={competitor.name}>
                  <ListItemText
                    primary={`${competitor.name}: ${competitor.likelihood.toFixed(2)}%`}
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
        ))}
      </Box>
    </Container>
  );
};

export default MarketsPage;
