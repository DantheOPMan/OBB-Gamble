import React from 'react';
import { Container, Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const CasinoPage = () => {
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
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Casino Games
        </Typography>
        <Box sx={{ marginBottom: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="error">
            Odds are rigged to the house. 99% of gamblers quit before they make it.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to="/casino/bplinko"
            sx={{
              padding: '10px 20px',
              fontSize: '18px',
              minWidth: '200px',
            }}
          >
            BPlinko
          </Button>
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to="/casino/blackjack"
            sx={{
              padding: '10px 20px',
              fontSize: '18px',
              minWidth: '200px',
            }}
          >
            Blackjack
          </Button>
          {/* Add more games here */}
        </Box>
      </Box>
    </Container>
  );
};

export default CasinoPage;
