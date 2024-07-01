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
import ProtectedRoute from './components/ProtectedRoute';
import AdminApprovalPage from './pages/AdminApprovalPage';
import AuthenticatedRoute from './components/AuthenticatedRoute';
import theme from './theme';

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthenticatedRoute>
          <div>
            <Navbar />
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/approvals" element={<AdminApprovalPage />} />
              </Route>
              <Route path="/markets/:marketId" element={<MarketPage />} />
              <Route path="/markets" element={<MarketsPage />} />
              <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
              <Route path="/profile" element={<UserProfile />} />
            </Routes>
          </div>
        </AuthenticatedRoute>
      </Router>
    </ThemeProvider>
  );
};

export default App;
