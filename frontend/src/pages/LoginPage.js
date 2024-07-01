// src/pages/LoginPage.js
import React from 'react';
import { auth, provider, signInWithPopup, registerUser, getUser } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

const LoginPage = () => {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await registerUser(user.uid, user.email);

      // Get user data to check role
      const userData = await getUser(user.uid);

      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/markets');
      }
    } catch (error) {
      console.error('Error signing in with Google: ', error);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          bgcolor: 'background.default',
          padding: 4,
          borderRadius: 2,
          color: 'text.primary', // Ensure text color is applied
        }}
      >
        <Typography component="h1" variant="h5" color="text.primary">
          Welcome to Oh Baby Markets
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<GoogleIcon />}
            onClick={handleLogin}
            sx={{
              bgcolor: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            Login / Sign Up with Google
          </Button>
        </Box>
      </Box>
      <Box mt={5}>
        <Typography variant="body2" color="text.secondary" align="center">
          By logging in, you agree to our <Link to="/terms-and-conditions" style={{ color: '#d75f5f' }}>terms and conditions</Link>.
        </Typography>
      </Box>
    </Container>
  );
};

export default LoginPage;
