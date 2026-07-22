// src/components/TokenExpiredAlert.js
import React from 'react';
import { Button } from '@mui/material'; // ou outro componente de botão que você esteja usando
import { styled } from '@mui/material/styles';

const Overlay = styled('div')({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
});

const MessageBox = styled('div')({
  backgroundColor: '#fff',
  padding: '20px',
  borderRadius: '5px',
  textAlign: 'center',
});

const TokenExpiredAlert = () => {
  return (
    <Overlay>
      <MessageBox>
        <h2>Your session has expired. Please log in again.</h2>
        <Button variant="contained" color="primary" onClick={() => window.location.href = '/login'}>
          Go to Login
        </Button>
      </MessageBox>
    </Overlay>
  );
};

export default TokenExpiredAlert;
