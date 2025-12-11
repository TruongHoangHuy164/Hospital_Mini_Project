import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket;

export function getSocket() {
  if (!socket) {
    const token = localStorage.getItem('accessToken') || '';
    socket = io(API_URL, {
      transports: ['websocket'],
      auth: { token },
      withCredentials: true,
    });
  }
  return socket;
}

export function disconnectSocket(){
  if(socket){ socket.disconnect(); socket = null; }
}
