// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import MarketsPage from './pages/MarketsPage';
import MarketPage from './pages/MarketPage';
import TermsAndConditionsPage from './pages/TermsAndConditionsPage';
import UserProfile from './pages/UserProfile';
import Navbar from './components/Navbar';
import theme from './theme';

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div>
          <Navbar />
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/markets/:id" element={<MarketPage />} />
            <Route path="/markets" element={<MarketsPage />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
            <Route path="/profile" element={<UserProfile />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;
