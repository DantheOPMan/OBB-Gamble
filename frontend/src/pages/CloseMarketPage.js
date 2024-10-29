import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  Snackbar,
  Checkbox,
  ListItemText,
} from '@mui/material';
import { getMarkets, closeMarket, pauseMarket, resumeMarket } from '../firebase';

const CloseMarketPage = () => {
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [selectedWinner, setSelectedWinner] = useState([]);
  const [message, setMessage] = useState('');
  const [openToast, setOpenToast] = useState(false);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await getMarkets();
        setMarkets(response.filter(market => ['open', 'paused', 'closed'].includes(market.status)));
      } catch (error) {
        console.error('Failed to fetch markets', error);
      }
    };

    fetchMarkets();
  }, []);

  const handleMarketChange = (event) => {
    setSelectedMarket(event.target.value);
    setSelectedWinner([]);
  };

  const handleWinnerChange = (event) => {
    const market = markets.find(m => m._id === selectedMarket);
    if (market.marketType === 'combination') {
      setSelectedWinner(event.target.value);
    } else {
      setSelectedWinner([event.target.value]);
    }
  };

  const handleCloseMarket = async () => {
    try {
      const market = markets.find(m => m._id === selectedMarket);
      if (market.marketType === 'combination' && selectedWinner.length !== market.combinationSize) {
        setMessage(`Please select exactly ${market.combinationSize} winners`);
        setOpenToast(true);
        return;
      }
      const winner = selectedWinner.join(',');
      await closeMarket(selectedMarket, winner);
      setMessage('Market closed successfully');
      setOpenToast(true);
      setTimeout(() => window.location.reload(), 1000);
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
      }, 1000);
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
      }, 1000);
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
          sx={{ mt: 3, mb: 3, bgcolor: '#333', color: '#fff' }}
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: '#333',
                color: '#fff',
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
        {selectedMarket && (
          <>
            <Typography variant="subtitle1" sx={{ color: '#fff', mb: 1 }}>
              Select Winner(s)
            </Typography>
            {markets.find(m => m._id === selectedMarket)?.marketType === 'combination' ? (
              <Select
                multiple
                value={selectedWinner}
                onChange={handleWinnerChange}
                renderValue={(selected) => selected.join(', ')}
                fullWidth
                sx={{ mb: 3, bgcolor: '#333', color: '#fff' }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: '#333',
                      color: '#fff',
                    },
                  },
                }}
              >
                {markets.find(m => m._id === selectedMarket)?.competitors.map((competitor, index) => (
                  <MenuItem key={index} value={competitor.name}>
                    <Checkbox checked={selectedWinner.includes(competitor.name)} />
                    <ListItemText primary={competitor.name} />
                  </MenuItem>
                ))}
              </Select>
            ) : (
              <Select
                value={selectedWinner[0] || ''}
                onChange={handleWinnerChange}
                displayEmpty
                fullWidth
                sx={{ mb: 3, bgcolor: '#333', color: '#fff' }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: '#333',
                      color: '#fff',
                    },
                  },
                }}
              >
                <MenuItem value="" disabled>Select Winner</MenuItem>
                {markets.find(m => m._id === selectedMarket)?.competitors.map((competitor, index) => (
                  <MenuItem key={index} value={competitor.name}>
                    {competitor.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleCloseMarket}
          disabled={!selectedMarket || !selectedWinner.length || markets.find(market => market._id === selectedMarket)?.status === 'closed'}
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
