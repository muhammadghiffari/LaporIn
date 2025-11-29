import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  // Get API URL from environment variable
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (!apiUrl) {
    console.warn('[Socket] ⚠️ NEXT_PUBLIC_API_URL not set! Using localhost fallback. Set NEXT_PUBLIC_API_URL in Vercel environment variables.');
  }
  
  const socketUrl = apiUrl || 'http://localhost:3001';
  
  // Log untuk debugging (selalu muncul untuk troubleshooting)
  if (typeof window !== 'undefined') {
    console.log('[Socket Config] NEXT_PUBLIC_API_URL:', apiUrl || 'NOT SET');
    console.log('[Socket Config] Connecting to:', socketUrl);
  }
  
  socket = io(socketUrl, {
    auth: {
      token: token
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to server');
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected from server');
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};

