import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jwtDecode from 'jwt-decode';
import axios from 'axios';

const RequireAuth = ({ children }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = localStorage.getItem('token'); // Assumindo que o token é armazenado no localStorage

    if (!token) {
      navigate('/login');
      return;
    }

    const validateToken = async () => {
      try {
        const response = await axios.post('/api/auth/validate-token', { token });
        if (response.data.valid) {
          // O token é válido, continue normalmente
          return;
        } else {
          // O token é inválido ou expirado
          localStorage.removeItem('token');
          navigate('/login');
        }
      } catch (error) {
        console.error('Erro ao validar o token:', error);
        localStorage.removeItem('token');
        navigate('/login');
      }
    };

    validateToken();
  }, [navigate]);

  return children;
};

export default RequireAuth;
