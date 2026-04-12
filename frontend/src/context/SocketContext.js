import React, { createContext, useContext, useMemo } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../utils/socketConfig';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  // Só inicializa o socket uma vez por provider
  const socket = useMemo(() => io(getSocketUrl(), { withCredentials: true }), []);
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
