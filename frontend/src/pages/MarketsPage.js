import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Box, Typography, List, ListItem, ListItemText, Paper } from '@mui/material';
import { getMarkets } from '../firebase'; // Import the function to fetch markets

const MarketsPage = () => {
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await getMarkets();
        const openMarkets = response.filter(market => market.status === 'open'); // Filter out closed markets
        setMarkets(openMarkets);
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
        {markets.map((market) => {
          const competitorsWithLikelihoods = calculateLikelihoods(market.competitors);
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
                {market.name}
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
          );
        })}
      </Box>
    </Container>
  );
};

export default MarketsPage;
