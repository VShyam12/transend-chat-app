import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';
import { getStoredToken } from '../store/authStore';

let socketInstance: Socket | null = null;

const createSocket = () => {
  if (!socketInstance) {
    const token = getStoredToken();

    socketInstance = io(API_URL, {
      autoConnect: false,
      transports: ['websocket'],
      auth: token ? { token } : {},
    });
  }

  return socketInstance;
};

export const socket = createSocket();

export const connectSocket = () => {
  const client = createSocket();
  const token = getStoredToken();

  if (!token) {
    client.auth = {};
    return client;
  }

  client.auth = {
    token,
  };

  if (!client.connected) {
    client.connect();
  }

  return client;
};

export const disconnectSocket = () => {
  if (socketInstance && socketInstance.connected) {
    socketInstance.disconnect();
  }
};

export const refreshSocketAuth = () => {
  if (!socketInstance) {
    return;
  }

  const token = getStoredToken();

  socketInstance.auth = token ? { token } : {};
};