import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Button, Select, MenuItem, Snackbar } from '@mui/material';
import { getMarkets, closeMarket, pauseMarket, resumeMarket } from '../firebase'; // Import resumeMarket

const CloseMarketPage = () => {
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [selectedWinner, setSelectedWinner] = useState('');
  const [message, setMessage] = useState('');
  const [openToast, setOpenToast] = useState(false);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await getMarkets();
        setMarkets(response.filter(market => market.status === 'open' || market.status === 'paused' || market.status === 'closed')); // Include open, paused, and closed markets
      } catch (error) {
        console.error('Failed to fetch markets', error);
      }
    };

    fetchMarkets();
  }, []);

  const handleMarketChange = (event) => {
    setSelectedMarket(event.target.value);
    setSelectedWinner(''); // Reset winner selection when market changes
  };

  const handleWinnerChange = (event) => {
    setSelectedWinner(event.target.value);
  };

  const handleCloseMarket = async () => {
    try {
      await closeMarket(selectedMarket, selectedWinner);
      setMessage('Market closed successfully');
      setOpenToast(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Adjust the delay as needed
    } catch (error) {
      setMessage('Failed to close market ' + error.message);
      setOpenToast(true);
    }
  };

  const handlePauseMarket = async () => {
    try {
      await pauseMarket(selectedMarket);
      setMessage('Market paused successfully');
      setOpenToast(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Adjust the delay as needed
    } catch (error) {
      setMessage('Failed to pause market ' + error.message);
      setOpenToast(true);
    }
  };

  const handleResumeMarket = async () => {
    try {
      await resumeMarket(selectedMarket);
      setMessage('Market resumed successfully');
      setOpenToast(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Adjust the delay as needed
    } catch (error) {
      setMessage('Failed to resume market');
      setOpenToast(true);
    }
  };

  const handleCloseToast = () => {
    setOpenToast(false);
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
        <Typography component="h1" variant="h5">Close, Pause, or Resume Market</Typography>
        <Select
          value={selectedMarket}
          onChange={handleMarketChange}
          displayEmpty
          fullWidth
          sx={{ mt: 3, mb: 3, bgcolor: '#333' }}
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: '#333',
              },
            },
          }}
        >
          <MenuItem value="" disabled sx={{ bgcolor: '#333', color: 'white' }}>Select Market</MenuItem>
          {markets.map((market) => (
            <MenuItem key={market._id} value={market._id} sx={{ bgcolor: '#333', color: 'white' }}>
              {market.name} ({market.status === 'open' ? 'Open' : market.status === 'paused' ? 'Paused' : 'Closed'})
            </MenuItem>
          ))}
        </Select>
        <Select
          value={selectedWinner}
          onChange={handleWinnerChange}
          displayEmpty
          fullWidth
          sx={{ mb: 3, bgcolor: '#333' }}
          disabled={!selectedMarket}
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: '#333',
              },
            },
          }}
        >
          <MenuItem value="" disabled sx={{ bgcolor: '#333', color: 'white' }}>Select Winner</MenuItem>
          {selectedMarket && markets.find((market) => market._id === selectedMarket).competitors.map((competitor, index) => (
            <MenuItem key={index} value={competitor.name} sx={{ bgcolor: '#333', color: 'white' }}>{competitor.name}</MenuItem>
          ))}
        </Select>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCloseMarket}
          disabled={!selectedMarket || !selectedWinner || markets.find(market => market._id === selectedMarket)?.status === 'closed'}
          sx={{ mb: 2 }}
        >
          Close Market
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handlePauseMarket}
          disabled={!selectedMarket || markets.find(market => market._id === selectedMarket)?.status !== 'open'}
          sx={{ mb: 2 }}
        >
          Pause Market
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleResumeMarket}
          disabled={!selectedMarket || markets.find(market => market._id === selectedMarket)?.status !== 'paused'}
        >
          Resume Market
        </Button>
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

export default CloseMarketPage;
