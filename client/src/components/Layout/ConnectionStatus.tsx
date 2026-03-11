import React from 'react';
import { useSocket } from '../services/socket';

export const ConnectionStatus: React.FC = () => {
  const { isConnected } = useSocket();

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <span className="text-xs text-gray-400">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
};
