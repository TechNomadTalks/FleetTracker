import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout/Layout';
import { vehicleService, tripService } from '../services/api';
import { Vehicle } from '../types';
import { ToastContainer, toast } from 'react-toastify';

export const VehiclesPage: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [checkoutData, setCheckoutData] = useState({ 
    destination: '', 
    currentMileage: 0,
    purpose: 'business',
    notes: ''
  });
  const [showExpiring, setShowExpiring] = useState(false);
  const [expiringVehicles, setExpiringVehicles] = useState<Vehicle[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await vehicleService.getAll();
      setVehicles(res.data.data);
    } catch (error) {
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiring = async () => {
    try {
      const res = await vehicleService.getExpiring(30);
      setExpiringVehicles(res.data.data);
    } catch (error) {
      toast.error('Failed to load expiring vehicles');
    }
  };

  const handleCheckout = async () => {
    if (!selectedVehicle || !checkoutData.destination || submitting) {
      if (!checkoutData.destination) toast.error('Please enter a destination');
      return;
    }
    
    const originalVehicles = [...vehicles];
    setVehicles(vehicles.map(v => 
      v.id === selectedVehicle.id ? { ...v, status: 'out' as const } : v
    ));
    setSubmitting(true);
    setShowCheckout(false);
    
    try {
      await tripService.checkout({
        vehicleId: selectedVehicle.id,
        destination: checkoutData.destination,
        currentMileage: checkoutData.currentMileage,
        purpose: checkoutData.purpose,
        notes: checkoutData.notes || undefined,
      });
      toast.success(`${selectedVehicle.registrationNumber} checked out!`);
      setSelectedVehicle(null);
      setCheckoutData({ destination: '', currentMileage: 0, purpose: 'business', notes: '' });
      fetchVehicles();
    } catch (error: any) {
      setVehicles(originalVehicles);
      toast.error(error.response?.data?.error || 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openCheckout = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setCheckoutData({ destination: '', currentMileage: vehicle.currentMileage, purpose: 'business', notes: '' });
    setShowCheckout(true);
  };

  const handleViewExpiring = async () => {
    await fetchExpiring();
    setShowExpiring(true);
  };

  const VehicleSkeleton = () => (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="h-6 bg-gray-700 rounded w-24 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-32"></div>
        </div>
        <div className="h-6 bg-gray-700 rounded w-16"></div>
      </div>
      <div className="space-y-3 mt-6">
        <div className="flex justify-between"><div className="h-4 bg-gray-700 rounded w-24"></div><div className="h-4 bg-gray-700 rounded w-16"></div></div>
        <div className="flex justify-between"><div className="h-4 bg-gray-700 rounded w-24"></div><div className="h-4 bg-gray-700 rounded w-16"></div></div>
      </div>
      <div className="mt-6 h-10 bg-gray-700 rounded"></div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <ToastContainer theme="dark" position="top-right" />
        <div className="mb-8">
          <div className="h-8 bg-gray-700 rounded w-48 animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-64 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <VehicleSkeleton key={i} />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ToastContainer theme="dark" position="top-right" />
      
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Vehicles</h1>
          <p className="text-gray-400 mt-1">Manage your fleet vehicles</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleViewExpiring}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/30 rounded-lg text-yellow-400 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Expiring Docs</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-sm">
              {vehicles.filter(v => v.status === 'available').length} available
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400 text-sm">
              {vehicles.filter(v => v.status === 'out').length} in use
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            onClick={() => navigate(`/vehicles/${vehicle.id}`)}
            className="bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition duration-200 overflow-hidden cursor-pointer"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{vehicle.registrationNumber}</h3>
                  <p className="text-gray-400">{vehicle.make} {vehicle.model}</p>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    vehicle.status === 'available'
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-yellow-600/20 text-yellow-400'
                  }`}
                >
                  {vehicle.status === 'available' ? 'Available' : 'In Use'}
                </span>
              </div>
              
              <div className="space-y-3 mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Current Mileage</span>
                  <span className="text-white font-medium">{vehicle.currentMileage.toLocaleString()} mi</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Service Interval</span>
                  <span className="text-white font-medium">{vehicle.serviceInterval.toLocaleString()} mi</span>
                </div>
                {vehicle.assignedUser && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Assigned To</span>
                    <span className="text-white font-medium">{vehicle.assignedUser.name}</span>
                  </div>
                )}
                {vehicle.insuranceExpiry && new Date(vehicle.insuranceExpiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                  <div className="mt-2 p-2 bg-yellow-600/20 border border-yellow-600/30 rounded text-xs text-yellow-400">
                    Insurance expires {new Date(vehicle.insuranceExpiry).toLocaleDateString()}
                  </div>
                )}
                {vehicle.registrationExpiry && new Date(vehicle.registrationExpiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                  <div className="mt-2 p-2 bg-orange-600/20 border border-orange-600/30 rounded text-xs text-orange-400">
                    Registration expires {new Date(vehicle.registrationExpiry).toLocaleDateString()}
                  </div>
                )}
                {vehicle.needsService && (
                  <div className="mt-4 p-3 bg-red-600/20 border border-red-600/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-red-400 text-sm font-medium">
                        Service due in {vehicle.milesUntilService} miles
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 pb-6">
              {vehicle.status === 'available' ? (
                <button
                  onClick={() => openCheckout(vehicle)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>Check Out</span>
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-3 bg-gray-700 text-gray-500 font-semibold rounded-lg cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Currently Out</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCheckout && selectedVehicle && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Check Out Vehicle</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold">{selectedVehicle.registrationNumber}</p>
                  <p className="text-gray-400 text-sm">{selectedVehicle.make} {selectedVehicle.model}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Destination</label>
                <input
                  type="text"
                  value={checkoutData.destination}
                  onChange={(e) => setCheckoutData({ ...checkoutData, destination: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Where are you going?"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Purpose</label>
                <select
                  value={checkoutData.purpose}
                  onChange={(e) => setCheckoutData({ ...checkoutData, purpose: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes (optional)</label>
                <textarea
                  value={checkoutData.notes}
                  onChange={(e) => setCheckoutData({ ...checkoutData, notes: e.target.value })}
                  placeholder="Add any notes..."
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Current Mileage</label>
                <input
                  type="number"
                  value={checkoutData.currentMileage}
                  onChange={(e) => setCheckoutData({ ...checkoutData, currentMileage: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                Check Out
              </button>
            </div>
          </div>
        </div>
      )}

      {showExpiring && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Expiring Documents (30 Days)</h2>
              <button
                onClick={() => setShowExpiring(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {expiringVehicles.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-400">No documents expiring in the next 30 days</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {expiringVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-semibold">{vehicle.registrationNumber}</p>
                        <p className="text-gray-400 text-sm">{vehicle.make} {vehicle.model}</p>
                      </div>
                      <div className="text-right">
                        {vehicle.insuranceExpiring && (
                          <p className="text-yellow-400 text-sm">
                            Insurance: {vehicle.insuranceDaysLeft} days
                          </p>
                        )}
                        {vehicle.registrationExpiring && (
                          <p className="text-orange-400 text-sm">
                            Registration: {vehicle.registrationDaysLeft} days
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};
