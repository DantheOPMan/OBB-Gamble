import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, signOut, getUser } from '../firebase';
import { AppBar, Toolbar, Typography, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DepositWithdrawForm from '../pages/DepositWithdrawForm';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [openDepositWithdraw, setOpenDepositWithdraw] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        const userData = await getUser(user.uid);
        if (userData.role === 'admin') {
          setIsAdmin(true);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
    navigate('/');
  };

  const handleOpenDepositWithdraw = () => {
    setOpenDepositWithdraw(true);
  };

  const handleCloseDepositWithdraw = () => {
    setOpenDepositWithdraw(false);
  };

  const handleShowToast = (message) => {
    alert(message); // Replace with Snackbar logic if needed
  };

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Oh Baby Markets
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {!user && (
            <Button
              color="inherit"
              component={Link}
              to="/"
              sx={{
                padding: '10px 16px',
                fontSize: '16px',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.2)', // Darker highlight color
                },
                flex: '1 1 100px',
              }}
            >
              Login
            </Button>
          )}
          {user && (
            <>
              {isAdmin && (
                <Button
                  color="inherit"
                  component={Link}
                  to="/admin"
                  sx={{
                    padding: '10px 16px',
                    fontSize: '16px',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.2)', // Darker highlight color
                    },
                    flex: '1 1 100px',
                  }}
                >
                  Admin
                </Button>
              )}
              <Button
                color="inherit"
                component={Link}
                to="/markets"
                sx={{
                  padding: '10px 16px',
                  fontSize: '16px',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Darker highlight color
                  },
                  flex: '1 1 100px',
                }}
              >
                Markets
              </Button>
              <Button
                color="inherit"
                component={Link}
                to="/tips"
                sx={{
                  padding: '10px 16px',
                  fontSize: '16px',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Darker highlight color
                  },
                  flex: '1 1 100px',
                }}
              >
                Tips
              </Button>
              <Button
                color="inherit"
                onClick={handleOpenDepositWithdraw}
                sx={{
                  padding: '10px 16px',
                  fontSize: '16px',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Darker highlight color
                  },
                  flex: '1 1 100px',
                }}
              >
                Deposit
              </Button>
              <Button
                color="inherit"
                component={Link}
                to="/profile"
                sx={{
                  padding: '10px 16px',
                  fontSize: '16px',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Darker highlight color
                  },
                  flex: '1 1 100px',
                }}
              >
                Profile
              </Button>
              <Button
                color="inherit"
                onClick={handleLogout}
                sx={{
                  padding: '10px 16px',
                  fontSize: '16px',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Darker highlight color
                  },
                  flex: '1 1 100px',
                }}
              >
                Logout
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
      <Dialog open={openDepositWithdraw} onClose={handleCloseDepositWithdraw}>
        <DialogTitle sx={{ bgcolor: '#333', color: '#fff' }}>Deposit/Withdraw BP</DialogTitle>
        <DialogContent sx={{ bgcolor: '#333', color: '#fff' }}>
          <DepositWithdrawForm onClose={handleCloseDepositWithdraw} onShowToast={handleShowToast} />
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#333', color: '#fff' }}>
          <Button onClick={handleCloseDepositWithdraw} color="primary" sx={{ color: '#ff7961' }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};

export default Navbar;
