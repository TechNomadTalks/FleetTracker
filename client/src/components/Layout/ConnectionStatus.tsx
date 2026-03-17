import React, { useEffect, useRef } from 'react';
import { useSocket } from '../../services/socket';
import { toast } from 'react-toastify';

export const ConnectionStatus: React.FC = () => {
  const { isConnected } = useSocket();
  const wasConnected = useRef<boolean | null>(null);

  useEffect(() => {
    if (wasConnected.current === false && !isConnected) {
      toast.error('Connection lost. Attempting to reconnect...', {
        toastId: 'connection-lost',
        autoClose: 3000,
      });
    }
    wasConnected.current = isConnected;
  }, [isConnected]);

  return (
    <div className="flex items-center space-x-2" title={isConnected ? 'Connected to server' : 'Disconnected'}>
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
      <span className="text-xs text-gray-400 hidden sm:inline">
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
};
