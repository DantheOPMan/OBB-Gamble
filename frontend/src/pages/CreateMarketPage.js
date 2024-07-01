import React, { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Snackbar } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { createMarket } from '../firebase';

const CreateMarketPage = () => {
  const [marketName, setMarketName] = useState('');
  const [competitors, setCompetitors] = useState([{ name: '', value: '' }]);
  const [message, setMessage] = useState('');
  const [openToast, setOpenToast] = useState(false);

  const handleAddCompetitor = () => {
    setCompetitors([...competitors, { name: '', value: '' }]);
  };

  const handleCompetitorChange = (index, field, value) => {
    const newCompetitors = [...competitors];
    newCompetitors[index][field] = value;
    setCompetitors(newCompetitors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createMarket(marketName, competitors);
      setMessage('Market created successfully');
      setOpenToast(true);
      setMarketName('');
      setCompetitors([{ name: '', value: '' }]);
    } catch (error) {
      setMessage('Failed to create market');
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
        <Typography component="h1" variant="h5">Create New Market</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            label="Market Name"
            fullWidth
            value={marketName}
            onChange={(e) => setMarketName(e.target.value)}
            required
            sx={{ mb: 3 }}
          />
          {competitors.map((competitor, index) => (
            <Box key={index} sx={{ display: 'flex', mb: 2 }}>
              <TextField
                label="Competitor Name"
                fullWidth
                value={competitor.name}
                onChange={(e) => handleCompetitorChange(index, 'name', e.target.value)}
                required
                sx={{ mr: 1 }}
              />
              <TextField
                label="Initial Value"
                type="number"
                fullWidth
                value={competitor.value}
                onChange={(e) => handleCompetitorChange(index, 'value', e.target.value)}
                required
              />
            </Box>
          ))}
          <Button variant="contained" color="primary" onClick={handleAddCompetitor} startIcon={<AddIcon />}>
            Add Competitor
          </Button>
          <Button type="submit" fullWidth variant="contained" color="primary" sx={{ mt: 3 }}>
            Create Market
          </Button>
        </Box>
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

export default CreateMarketPage;
