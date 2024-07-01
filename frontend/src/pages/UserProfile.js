// src/pages/UserProfile.js
import React, { useState, useEffect } from 'react';
import { getUser, auth } from '../firebase'; // Correct imports
import { Container, Box, Typography } from '@mui/material';

const UserProfile = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (currentUser) {
      const fetchUserData = async () => {
        try {
          const data = await getUser(currentUser.uid);
          setUserData(data);
        } catch (error) {
          console.error('Error fetching user data: ', error);
        }
      };

      fetchUserData();
    }
  }, []);

  if (!userData) {
    return <div>Loading...</div>;
  }

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
          color: 'text.primary',
        }}
      >
        <Typography component="h1" variant="h5">
          User Profile
        </Typography>
        <Typography variant="body1">
          Email: {userData.email}
        </Typography>
        <Typography variant="body1">
          Role: {userData.role}
        </Typography>
        <Typography variant="body1">
          BP Balance: {userData.bpBalance}
        </Typography>
      </Box>
    </Container>
  );
};

export default UserProfile;
