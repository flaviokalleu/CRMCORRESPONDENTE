// src/components/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLoading from './AuthLoading';

const PrivateRoute = ({ element, requiredRole = null }) => {
  const { isAuthenticated, loading, user, hasRole } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se uma role específica for necessária, verificar
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Renderizar o elemento diretamente (sem Router)
  return element;
};

export default PrivateRoute;
