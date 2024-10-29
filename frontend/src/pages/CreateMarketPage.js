import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Snackbar,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { createMarket } from '../firebase';

const CreateMarketPage = () => {
  const [marketName, setMarketName] = useState('');
  const [marketType, setMarketType] = useState('single');
  const [combinationSize, setCombinationSize] = useState(2);
  const [competitors, setCompetitors] = useState([{ name: '', value: 0 }]);
  const [message, setMessage] = useState('');
  const [openToast, setOpenToast] = useState(false);

  const handleAddCompetitor = () => {
    setCompetitors([...competitors, { name: '', value: 0 }]);
  };

  const handleCompetitorChange = (index, field, value) => {
    const newCompetitors = [...competitors];
    newCompetitors[index][field] = value;
    setCompetitors(newCompetitors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const competitorsWithInitialValue = competitors.map(competitor => ({
        ...competitor,
        value: 0,
      }));
      await createMarket(marketName, competitorsWithInitialValue, marketType, combinationSize);
      setMessage('Market created successfully');
      setOpenToast(true);
      setMarketName('');
      setCompetitors([{ name: '', value: 0 }]);
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
      <Box sx={{ marginTop: 8, padding: 4 }}>
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
          <Typography variant="subtitle1">Market Type</Typography>
          <RadioGroup
            row
            value={marketType}
            onChange={(e) => setMarketType(e.target.value)}
            sx={{ mb: 3 }}
          >
            <FormControlLabel value="single" control={<Radio />} label="Single Option" />
            <FormControlLabel value="combination" control={<Radio />} label="Combination" />
          </RadioGroup>
          {marketType === 'combination' && (
            <TextField
              label="Combination Size"
              type="number"
              fullWidth
              value={combinationSize}
              onChange={(e) => setCombinationSize(Number(e.target.value))}
              required
              sx={{ mb: 3 }}
              inputProps={{ min: 2 }}
            />
          )}
          {competitors.map((competitor, index) => (
            <Box key={index} sx={{ display: 'flex', mb: 2 }}>
              <TextField
                label="Competitor Name"
                fullWidth
                value={competitor.name}
                onChange={(e) => handleCompetitorChange(index, 'name', e.target.value)}
                required
              />
            </Box>
          ))}
          <Button variant="contained" onClick={handleAddCompetitor} startIcon={<AddIcon />}>
            Add Competitor
          </Button>
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }}>
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
