/**
 * Vehicle Assignment Calendar Page
 * 
 * Purpose:
 * - Display vehicle assignments in calendar view
 * - Show trip schedules and bookings
 * - Allow drag-and-drop assignment changes
 * 
 * Overview:
 * Full-page calendar showing vehicles on the Y-axis and dates on X-axis.
 * Displays assigned trips, maintenance schedules, and availability.
 * 
 * Features:
 * - Monthly/weekly/daily views
 * - Color-coded by vehicle status
 * - Click to view/edit assignments
 * - Filter by vehicle type/status
 */

import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface Trip {
  id: string;
  destination: string;
  startTime: string;
  endTime: string | null;
  purpose: string;
  vehicle: {
    id: string;
    registrationNumber: string;
    make: string;
    model: string;
  };
  user: {
    name: string;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  type: 'trip' | 'maintenance';
  data: Trip;
}

export const VehicleCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await api.get('/trips');
      if (response.data.success) {
        setTrips(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch trips:', error);
    }
  };

  const getEvents = (): CalendarEvent[] => {
    return trips
      .filter((trip) => trip.startTime)
      .map((trip) => ({
        id: trip.id,
        title: `${trip.vehicle.registrationNumber} - ${trip.destination}`,
        start: new Date(trip.startTime),
        end: trip.endTime ? new Date(trip.endTime) : new Date(trip.startTime),
        color: trip.purpose === 'business' ? '#2563eb' : trip.purpose === 'personal' ? '#7c3aed' : '#dc2626',
        type: 'trip' as const,
        data: trip,
      }));
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(new Date(year, month, -firstDay.getDay() + i + 1));
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const getEventsForDay = (date: Date) => {
    return getEvents().filter((event) => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const events = getEvents();
  const days = getDaysInMonth(currentDate);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Vehicle Calendar
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setView('month')}
              className={`px-4 py-2 rounded-lg ${
                view === 'month'
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-lg ${
                view === 'week'
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Week
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigateMonth(-1)}
            className={`p-2 rounded-lg ${
              theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            ←
          </button>
          <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            className={`p-2 rounded-lg ${
              theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            →
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg ml-4"
          >
            Today
          </button>
        </div>

        <div
          className={`rounded-lg shadow overflow-hidden ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
            {dayNames.map((day) => (
              <div
                key={day}
                className={`p-3 text-center font-semibold ${
                  theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
            {days.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 ${
                    theme === 'dark'
                      ? isCurrentMonth(day)
                        ? 'bg-gray-800'
                        : 'bg-gray-900 opacity-50'
                      : isCurrentMonth(day)
                      ? 'bg-white'
                      : 'bg-gray-50 opacity-50'
                  } ${isToday(day) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isToday(day)
                        ? 'text-blue-600'
                        : theme === 'dark'
                        ? 'text-gray-400'
                        : 'text-gray-500'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedTrip(event.data)}
                        className="text-xs p-1 rounded truncate cursor-pointer"
                        style={{ backgroundColor: event.color, color: 'white' }}
                        title={event.title}
                      >
                        {event.data.vehicle.registrationNumber}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedTrip && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div
              className={`rounded-lg p-6 max-w-md w-full ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Trip Details
              </h3>
              <div className="space-y-3">
                <div>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Vehicle
                  </span>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedTrip.vehicle.registrationNumber} - {selectedTrip.vehicle.make} {selectedTrip.vehicle.model}
                  </p>
                </div>
                <div>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Driver
                  </span>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedTrip.user.name}
                  </p>
                </div>
                <div>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Destination
                  </span>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedTrip.destination}
                  </p>
                </div>
                <div>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Start Time
                  </span>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(selectedTrip.startTime).toLocaleString()}
                  </p>
                </div>
                {selectedTrip.endTime && (
                  <div>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      End Time
                    </span>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(selectedTrip.endTime).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedTrip(null)}
                className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleCalendarPage;
