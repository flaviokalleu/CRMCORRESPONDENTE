// src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { HelmetProvider } from 'react-helmet-async';

// Socket.IO Client
import { io } from 'socket.io-client';
export const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000', {
  withCredentials: true
});

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
