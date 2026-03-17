import { io, Socket } from 'socket.io-client';
import { useEffect, useState, useCallback, useRef } from 'react';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '');

if (!SOCKET_URL) {
  throw new Error('VITE_API_URL is not defined. Please configure your environment variables.');
}

let socket: Socket | null = null;

export const getSocket = () => {
  const token = localStorage.getItem('accessToken');
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  } else {
    const currentAuth = socket.auth as { token?: string };
    if (currentAuth.token !== token) {
      socket.auth = { token };
      socket.disconnect();
      socket.connect();
    }
  }
  return socket;
};

export const reconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  return getSocket();
};

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('join');
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onHeartbeat = () => {
      setLastHeartbeat(Date.now());
    };

    const onConnectError = (err: Error) => {
      console.error('Socket connection error:', err);
      setIsConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('heartbeat', onHeartbeat);
    socket.on('connect_error', onConnectError);

    if (socket.connected) {
      setIsConnected(true);
      socket.emit('join');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('heartbeat', onHeartbeat);
      socket.off('connect_error', onConnectError);
    };
  }, []);

  return { isConnected, lastHeartbeat, socket: getSocket() };
};

export const joinRoom = () => {
  const socket = getSocket();
  if (socket.connected) {
    socket.emit('join');
  }
};

export const leaveRoom = () => {
  const socket = getSocket();
  if (socket.connected) {
    socket.emit('leave');
  }
};

export default getSocket;
