import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { serviceService, vehicleService } from '../services/api';
import { Vehicle } from '../types';
import { ToastContainer, toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

export const ServicesPage: React.FC = () => {
  const { user } = useAuth();
  const [upcomingServices, setUpcomingServices] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddService, setShowAddService] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [serviceData, setServiceData] = useState({
    vehicleId: '',
    serviceType: '',
    mileageAtService: 0,
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [upcomingRes, vehiclesRes] = await Promise.all([
        serviceService.getUpcoming(),
        vehicleService.getAll(),
      ]);
      setUpcomingServices(upcomingRes.data.data);
      setVehicles(vehiclesRes.data.data);
    } catch (error) {
      toast.error('Failed to load service data');
    } finally {
      setLoading(false);
    }
  };

  const submitService = async () => {
    if (!serviceData.vehicleId || !serviceData.serviceType) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await serviceService.create(serviceData);
      toast.success('Service logged successfully!');
      setShowAddService(false);
      setServiceData({ vehicleId: '', serviceType: '', mileageAtService: 0, notes: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to log service');
    }
  };

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ToastContainer theme="dark" position="top-right" />
      
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Service Reminders</h1>
          <p className="text-gray-400 mt-1">Vehicles requiring maintenance</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setServiceData({ ...serviceData, vehicleId: vehicles[0]?.id || '' });
              setShowAddService(true);
            }}
            className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Log Service</span>
          </button>
        )}
      </div>

      {upcomingServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingServices.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-gray-800 rounded-xl border border-red-700/50 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{vehicle.registrationNumber}</h3>
                    <p className="text-gray-400">{vehicle.make} {vehicle.model}</p>
                  </div>
                  <div className="p-2 bg-red-600/20 rounded-lg">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-400 font-medium">
                      {vehicle.milesUntilService} miles until service
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${Math.max(0, Math.min(100, (500 - (vehicle.milesUntilService || 0)) / 5))}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Current</p>
                    <p className="text-white font-medium">{vehicle.currentMileage.toLocaleString()} mi</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Service Interval</p>
                    <p className="text-white font-medium">{vehicle.serviceInterval.toLocaleString()} mi</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <div className="mx-auto h-16 w-16 bg-green-600/20 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">All Vehicles Serviced</h3>
          <p className="text-gray-400">No vehicles require service within 500 miles</p>
        </div>
      )}

      {showAddService && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Log Service</h2>
              <button onClick={() => setShowAddService(false)} className="text-gray-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle</label>
                <select
                  value={serviceData.vehicleId}
                  onChange={(e) => {
                    const vehicle = vehicles.find((v) => v.id === e.target.value);
                    setServiceData({
                      ...serviceData,
                      vehicleId: e.target.value,
                      mileageAtService: vehicle?.currentMileage || 0,
                    });
                  }}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} - {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Service Type</label>
                <input
                  type="text"
                  value={serviceData.serviceType}
                  onChange={(e) => setServiceData({ ...serviceData, serviceType: e.target.value })}
                  placeholder="Oil change, tire rotation, etc."
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mileage at Service</label>
                <input
                  type="number"
                  value={serviceData.mileageAtService}
                  onChange={(e) => setServiceData({ ...serviceData, mileageAtService: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes (Optional)</label>
                <textarea
                  value={serviceData.notes}
                  onChange={(e) => setServiceData({ ...serviceData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddService(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={submitService}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                Save Service
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
