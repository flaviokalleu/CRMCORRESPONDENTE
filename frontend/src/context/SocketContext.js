import React, { createContext, useContext, useMemo } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  // Só inicializa o socket uma vez por provider
  const socket = useMemo(() => io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000', { withCredentials: true }), []);
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
