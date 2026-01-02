// backend/src/socket.js
// Centraliza a exportação do objeto io para uso global

let ioInstance = null;

function setSocketIO(io) {
  ioInstance = io;
}

function getSocketIO() {
  if (!ioInstance) {
    throw new Error('Socket.io não inicializado!');
  }
  return ioInstance;
}

module.exports = {
  setSocketIO,
  getSocketIO,
};
