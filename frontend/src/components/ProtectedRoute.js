// src/components/ProtectedRoute.js
import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getUser, auth } from '../firebase';

const ProtectedRoute = ({ allowedRoles }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkUserRole = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userData = await getUser(currentUser.uid);
        setUserRole(userData.role);
      }
      setIsLoading(false);
    };

    checkUserRole();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>; // You can replace this with a spinner or any loading component
  }

  return allowedRoles.includes(userRole) ? <Outlet /> : <Navigate to="/markets" replace />;
};

export default ProtectedRoute;
