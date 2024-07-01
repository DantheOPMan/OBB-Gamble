// src/components/AuthenticatedRoute.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, auth } from '../firebase';

const AuthenticatedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (location.pathname === '/') {
          navigate('/markets');
        }
      } else {
        if (location.pathname !== '/') {
          navigate('/');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate, location.pathname]);

  if (loading) {
    return <div>Loading...</div>; // You can replace this with a spinner or any loading component
  }

  return children;
};

export default AuthenticatedRoute;
