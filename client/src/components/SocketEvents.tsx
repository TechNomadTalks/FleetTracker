import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getSocket } from '../services/socket';
import { useNotifications } from '../context/NotificationContext';

interface SocketEventHandlerProps {
  onVehicleStatusChange?: () => void;
  onTripCreated?: () => void;
}

export const SocketEvents: React.FC<SocketEventHandlerProps> = ({ onVehicleStatusChange, onTripCreated }) => {
  const { fetchNotifications } = useNotifications();
  const hasShownConnect = useRef(false);

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      if (hasShownConnect.current) {
        toast.success('Reconnected to server', { toastId: 'reconnected' });
      }
      hasShownConnect.current = true;
      socket.emit('join');
    });

    socket.on('trip:created', (data: any) => {
      toast.info(`New trip: ${data.vehicle?.registrationNumber} - ${data.trip?.destination}`, {
        autoClose: 5000,
      });
      fetchNotifications();
      if (onTripCreated) onTripCreated();
    });

    socket.on('vehicle:status', (data: any) => {
      toast.info(`Vehicle ${data.vehicleId} status changed to ${data.status}`, {
        autoClose: 5000,
      });
      if (onVehicleStatusChange) onVehicleStatusChange();
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
      socket.off('connect');
      socket.off('trip:created');
      socket.off('vehicle:status');
      socket.off('service:reminder');
      socket.off('notification');
    };
  }, [fetchNotifications, onVehicleStatusChange, onTripCreated]);

  return null;
};

export default SocketEvents;
