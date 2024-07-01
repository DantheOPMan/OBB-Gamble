// src/pages/TermsAndConditionsPage.js
import React from 'react';
import { Container, Box, Typography } from '@mui/material';

const TermsAndConditionsPage = () => {
  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography component="h1" variant="h4" gutterBottom>
          Terms and Conditions
        </Typography>
        <Typography variant="body1" paragraph>
          Welcome to Oh Baby Games. By using our services, you agree to these terms. Please read them carefully.
        </Typography>
        <Typography variant="h6" gutterBottom>
          1. Acceptance of Terms
        </Typography>
        <Typography variant="body1" paragraph>
          By accessing or using Oh Baby Games, you agree to be bound by these Terms and Conditions.
        </Typography>
        <Typography variant="h6" gutterBottom>
          2. Use of Service
        </Typography>
        <Typography variant="body1" paragraph>
          You may use Oh Baby Games for personal, non-commercial purposes only. You agree not to misuse our services or help anyone else do so.
        </Typography>
        <Typography variant="h6" gutterBottom>
          3. User Accounts
        </Typography>
        <Typography variant="body1" paragraph>
          You are responsible for safeguarding your account information and for all activities that occur under your account.
        </Typography>
        <Typography variant="h6" gutterBottom>
          4. Privacy
        </Typography>
        <Typography variant="body1" paragraph>
          Your use of Oh Baby Games is also governed by our Privacy Policy.
        </Typography>
        <Typography variant="h6" gutterBottom>
          5. Intellectual Property
        </Typography>
        <Typography variant="body1" paragraph>
          All content and materials available on Oh Baby Games are property of Oh Baby Games and protected by copyright laws.
        </Typography>
        <Typography variant="h6" gutterBottom>
          6. Termination
        </Typography>
        <Typography variant="body1" paragraph>
          We reserve the right to terminate or suspend access to our services for any reason without notice.
        </Typography>
        <Typography variant="h6" gutterBottom>
          7. Changes to Terms
        </Typography>
        <Typography variant="body1" paragraph>
          We may modify these terms at any time. Please review these terms regularly.
        </Typography>
        <Typography variant="body1" sx={{ mt: 4 }}>
          Last updated: [Insert Date]
        </Typography>
      </Box>
    </Container>
  );
};

export default TermsAndConditionsPage;
