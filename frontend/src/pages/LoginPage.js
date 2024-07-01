// src/pages/LoginPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signInWithPopup, provider, registerUser } from '../firebase';
import { Container, Box, Typography, Button, Link } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

const LoginPage = () => {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await registerUser(user.uid, user.email);
      navigate('/markets');
    } catch (error) {
      console.error('Error logging in: ', error.message);
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
          boxShadow: 3,
        }}
      >
        <Typography component="h1" variant="h5" gutterBottom>
          Welcome to Oh Baby Markets
        </Typography>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<GoogleIcon />}
          onClick={handleLogin}
          sx={{ mt: 3, mb: 2 }}
        >
          Sign in with Google
        </Button>
        <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 2 }}>
          By signing in, you agree to our{' '}
          <Link href="/terms-and-conditions" variant="body2">
            Terms and Conditions
          </Link>.
        </Typography>
      </Box>
    </Container>
  );
};

export default LoginPage;
