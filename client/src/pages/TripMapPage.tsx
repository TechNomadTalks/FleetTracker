/**
 * Trip Map Visualization Page
 * 
 * Purpose:
 * - Display trip routes on an interactive map
 * - Show vehicle locations and movements
 * - Visualize trip history with paths
 * 
 * Overview:
 * Uses Leaflet for map display. Shows start/end points and
 * draws paths between them. Simulates route for demo purposes.
 * 
 * Features:
 * - Interactive map with markers
 * - Trip route visualization
 * - Vehicle status indicators
 * - Trip details sidebar
 */

import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface Trip {
  id: string;
  destination: string;
  startMileage: number;
  endMileage: number | null;
  startTime: string;
  endTime: string | null;
  purpose: string;
  mileageDriven: number | null;
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

const simulateRoutePoints = (startLat: number, startLng: number, endLat: number, endLng: number): [number, number][] => {
  const points: [number, number][] = [];
  const steps = 10;
  
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const lat = startLat + (endLat - startLat) * ratio + (Math.random() - 0.5) * 0.01;
    const lng = startLng + (endLng - startLng) * ratio + (Math.random() - 0.5) * 0.01;
    points.push([lat, lng]);
  }
  
  return points;
};

export const TripMapPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTrips();
    loadMap();
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

  const loadMap = async () => {
    const L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    
    if (mapRef.current) {
      const map = L.map(mapRef.current).setView([40.7128, -74.006], 10);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      
      setMapLoaded(true);
    }
  };

  useEffect(() => {
    if (!mapLoaded || !selectedTrip) return;
    
    const renderRoute = async () => {
      const L = await import('leaflet');
      
      if (!mapRef.current) return;
      
      const map = L.map(mapRef.current);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      
      const baseLat = 40.7128 + Math.random() * 0.1;
      const baseLng = -74.006 + Math.random() * 0.1;
      
      const startLat = baseLat;
      const startLng = baseLng;
      const endLat = baseLat + (Math.random() - 0.5) * 0.2;
      const endLng = baseLng + (Math.random() - 0.5) * 0.2;
      
      const startMarker = L.marker([startLat, startLng])
        .addTo(map)
        .bindPopup(`<b>Start</b><br>${selectedTrip.vehicle.registrationNumber}`);
      
      const endMarker = L.marker([endLat, endLng])
        .addTo(map)
        .bindPopup(`<b>Destination</b><br>${selectedTrip.destination}`);
      
      const routePoints = simulateRoutePoints(startLat, startLng, endLat, endLng);
      
      const routeLine = L.polyline(routePoints, {
        color: selectedTrip.purpose === 'business' ? '#2563eb' : '#7c3aed',
        weight: 4,
        opacity: 0.8
      }).addTo(map);
      
      const bounds = L.latLngBounds(routePoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    };
    
    renderRoute();
  }, [selectedTrip, mapLoaded]);

  const getStatusColor = (trip: Trip) => {
    if (!trip.endTime) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex h-screen">
        <div className="w-1/3 p-4 overflow-y-auto">
          <h1 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Trip Map
          </h1>
          
          <div className="space-y-3">
            {trips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => setSelectedTrip(trip)}
                className={`p-4 rounded-lg cursor-pointer transition ${
                  theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'
                } ${selectedTrip?.id === trip.id ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {trip.vehicle.registrationNumber}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    trip.purpose === 'business' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {trip.purpose}
                  </span>
                </div>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {trip.destination}
                </div>
                <div className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {new Date(trip.startTime).toLocaleDateString()}
                  {trip.mileageDriven && ` • ${trip.mileageDriven} miles`}
                </div>
              </div>
            ))}
          </div>
          
          {trips.length === 0 && (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              No trips found
            </div>
          )}
        </div>
        
        <div className="w-2/3 relative">
          <div ref={mapRef} className="h-full w-full" />
          
          {!selectedTrip && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg text-center">
                <p className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Select a trip to view on map
                </p>
              </div>
            </div>
          )}
          
          {selectedTrip && (
            <div className={`absolute bottom-4 left-4 right-4 p-4 rounded-lg ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            } shadow-lg`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedTrip.vehicle.registrationNumber}
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedTrip.vehicle.make} {selectedTrip.vehicle.model}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedTrip.destination}
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedTrip.mileageDriven ? `${selectedTrip.mileageDriven} miles` : 'In progress'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripMapPage;
