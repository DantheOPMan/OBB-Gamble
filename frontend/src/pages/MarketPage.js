import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Container, Box, Typography } from '@mui/material';
import { getAuth } from 'firebase/auth';
import { getMarketById } from '../firebase'; // Make sure this is correctly imported

const MarketPage = ({ marketId }) => {
  const [marketData, setMarketData] = useState([]);
  const auth = getAuth(); // Ensure auth is defined and imported correctly

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getMarketById(marketId);
        setMarketData(data);
      } catch (error) {
        console.error('Failed to fetch market data', error);
      }
    };

    fetchData();
  }, [marketId]);

  const data = {
    labels: marketData.competitors ? marketData.competitors.map(item => item.name) : [],
    datasets: [
      {
        label: 'Competitor Values',
        data: marketData.competitors ? marketData.competitors.map(item => item.value) : [],
        fill: false,
        backgroundColor: 'rgb(75, 192, 192)',
        borderColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
      },
    },
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
        }}
      >
        <Typography component="h1" variant="h5">
          Market Data
        </Typography>
        <Line data={data} options={options} />
      </Box>
    </Container>
  );
};

export default MarketPage;
