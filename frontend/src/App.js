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
import TippingPage from './pages/TippingPage';
import AuthenticatedRoute from './components/AuthenticatedRoute';
import theme from './theme';
import CasinoPage from './pages/CasinoPage';
import BPlinkoPage from './pages/BPlinkoPage';
import BlackjackPage from './pages/BlackjackPage';
import PokerPage from './pages/PokerPage';
import PokerTablePage from './pages/PokerTablePage';
import RoulettePage from './pages/RoulettePage';

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
              <Route path="/tips" element={<TippingPage />} />
              <Route path="/markets/:marketId" element={<MarketPage />} />
              <Route path="/markets" element={<MarketsPage />} />
              <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/casino" element={<CasinoPage />} />
              <Route path="/casino/bplinko" element={<BPlinkoPage />} />
              <Route path="/casino/blackjack" element={<BlackjackPage />} />
              <Route path="/casino/poker" element={<PokerPage />} />
              <Route path="/casino/poker/table/:tableId" element={<PokerTablePage />} />
              <Route path="/casino/roulette" element={<RoulettePage />} />
            </Routes>
          </div>
        </AuthenticatedRoute>
      </Router>
    </ThemeProvider>
  );
};

export default App;
