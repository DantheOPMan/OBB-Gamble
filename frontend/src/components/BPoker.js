import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPokerTables, createPokerTable } from '../firebase';
import { Container, Button, TextField, Typography, Paper, Grid } from '@mui/material';
import { styled } from '@mui/system';

const StyledContainer = styled(Container)(({ theme }) => ({
  backgroundColor: theme.palette.grey[900],
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  minHeight: '100vh',
  color: theme.palette.common.white,
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.grey[800],
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  color: theme.palette.common.white,
}));

const StyledButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1),
}));

const BPoker = () => {
  const [tables, setTables] = useState([]);
  const [newTableName, setNewTableName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const tablesList = await listPokerTables();
      setTables(tablesList);
      console.log(tablesList)
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
  };

  const handleCreateTable = async () => {
    try {
      await createPokerTable({ tableName: newTableName });
      setNewTableName('');
      fetchTables();
    } catch (error) {
      console.error('Failed to create table:', error);
    }
  };

  const handleViewTable = (tableId) => {
    navigate(`/casino/poker/table/${tableId}`);
  };

  return (
    <StyledContainer>
      <Typography variant="h4" gutterBottom>
        Poker Tables
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Typography variant="h6">Available Tables</Typography>
          {tables.map((table) => {
            return (
              <StyledPaper key={table.id}>
                <Typography variant="h6">{table.name}</Typography>
                <Typography variant="body1">Players: {table.players.length}/{table.maxPlayers}</Typography>
                <StyledButton variant="contained" color="primary" onClick={() => handleViewTable(table.id)}>
                  View Table
                </StyledButton>
              </StyledPaper>
            );
          })}
          <TextField
            label="Table Name"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            fullWidth
            style={{ marginBottom: '1rem' }}
            variant="filled"
            InputProps={{ style: { color: 'white' } }}
            InputLabelProps={{ style: { color: 'grey' } }}
          />
          <StyledButton variant="contained" color="secondary" onClick={handleCreateTable}>
            Create Table
          </StyledButton>
        </Grid>
      </Grid>
    </StyledContainer>
  );
};

export default BPoker;
