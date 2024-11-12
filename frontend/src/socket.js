import { io } from 'socket.io-client';
import { auth } from './firebase';
import { APIURL } from './constants';

let socket;

export const initializeSocket = async () => {
  if (socket) return socket;

  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  const token = await auth.currentUser.getIdToken();

  socket = io(process.env.REACT_APP_BACKEND_URL || APIURL, {
    path: '/socket.io',
    transports: ['websocket'],
    auth: {
      token,
    },
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized. Call initializeSocket first.');
  }
  return socket;
};
