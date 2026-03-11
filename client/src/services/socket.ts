import { io, Socket } from 'socket.io-client';
import { useEffect, useState, useCallback, useRef } from 'react';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const useSocket = (userId?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      if (userId) {
        socket.emit('join', userId);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('heartbeat', () => {
      setLastHeartbeat(Date.now());
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });
  }, [userId]);

  useEffect(() => {
    connect();

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('heartbeat');
        socket.off('connect_error');
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { isConnected, lastHeartbeat, socket: getSocket() };
};

export const joinRoom = (userId: string) => {
  const socket = getSocket();
  socket.emit('join', userId);
};

export const leaveRoom = (userId: string) => {
  const socket = getSocket();
  socket.emit('leave', userId);
};

export default getSocket;
