// src/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#d75f5f', // Dark pastel red
    },
    secondary: {
      main: '#a9a9a9', // Dark pastel gray
    },
    background: {
      default: '#2c2c2c', // Dark grey background
    },
    text: {
      primary: '#ffffff', // White text for better contrast
      secondary: '#d3d3d3', // Light grey text for secondary information
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

export default theme;
