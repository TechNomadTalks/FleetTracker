import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { getSocket } from '../services/socket';
import { useNotifications } from '../context/NotificationContext';

export const SocketEvents: React.FC = () => {
  const { fetchNotifications } = useNotifications();

  useEffect(() => {
    const socket = getSocket();

    socket.on('trip:created', (data: any) => {
      toast.info(`New trip: ${data.vehicle?.registrationNumber} - ${data.trip?.destination}`, {
        autoClose: 5000,
      });
      fetchNotifications();
    });

    socket.on('vehicle:status', (data: any) => {
      toast.info(`Vehicle ${data.vehicleId} status changed to ${data.status}`, {
        autoClose: 5000,
      });
    });

    socket.on('service:reminder', (data: any) => {
      toast.warn(data.message, {
        autoClose: 10000,
      });
      fetchNotifications();
    });

    socket.on('notification', (data: any) => {
      toast.info(data.message, {
        autoClose: 5000,
      });
      fetchNotifications();
    });

    return () => {
      socket.off('trip:created');
      socket.off('vehicle:status');
      socket.off('service:reminder');
      socket.off('notification');
    };
  }, [fetchNotifications]);

  return null;
};
