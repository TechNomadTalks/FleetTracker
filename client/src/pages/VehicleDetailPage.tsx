import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout/Layout';
import { vehicleService, userService } from '../services/api';
import { Vehicle } from '../types';
import { ToastContainer, toast } from 'react-toastify';

interface User {
  id: string;
  name: string;
  email: string;
}

export const VehicleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (id) {
      fetchVehicle();
      fetchUsers();
    }
  }, [id]);

  const fetchVehicle = async () => {
    try {
      const res = await vehicleService.getFull(id!);
      setVehicle(res.data.data);
      setSelectedUserId(res.data.data.assignedUserId || '');
    } catch (error) {
      toast.error('Failed to load vehicle');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await userService.getAll();
      setUsers(res.data.data);
    } catch (error) {
      console.error('Failed to load users');
    }
  };

  const handleAssign = async () => {
    setAssigning(true);
    try {
      await vehicleService.assign(id!, selectedUserId || null);
      toast.success('Vehicle assigned successfully');
      fetchVehicle();
      setShowAssignModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign vehicle');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (!vehicle) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-400">Vehicle not found</p>
          <Link to="/vehicles" className="text-blue-500 hover:underline mt-2 inline-block">
            Back to Vehicles
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ToastContainer theme="dark" position="top-right" />
      
      <div className="mb-6">
        <Link to="/vehicles" className="text-gray-400 hover:text-white flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Vehicles</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-dark-card rounded-lg border border-dark-border p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">{vehicle.registrationNumber}</h1>
                <p className="text-dark-muted">{vehicle.make} {vehicle.model}</p>
              </div>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  vehicle.status === 'available'
                    ? 'bg-green-600/20 text-green-400'
                    : 'bg-yellow-600/20 text-yellow-400'
                }`}
              >
                {vehicle.status === 'available' ? 'Available' : 'In Use'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-dark-bg rounded-lg">
                <p className="text-dark-muted text-sm">Current Mileage</p>
                <p className="text-white text-xl font-semibold">{vehicle.currentMileage.toLocaleString()} mi</p>
              </div>
              <div className="p-4 bg-dark-bg rounded-lg">
                <p className="text-dark-muted text-sm">Service Interval</p>
                <p className="text-white text-xl font-semibold">{vehicle.serviceInterval.toLocaleString()} mi</p>
              </div>
              <div className="p-4 bg-dark-bg rounded-lg">
                <p className="text-dark-muted text-sm">Total Trips</p>
                <p className="text-white text-xl font-semibold">{vehicle.totalTrips || 0}</p>
              </div>
              <div className="p-4 bg-dark-bg rounded-lg">
                <p className="text-dark-muted text-sm">Total Mileage</p>
                <p className="text-white text-xl font-semibold">{(vehicle.totalMileage || 0).toLocaleString()} mi</p>
              </div>
            </div>
          </div>

          <div className="bg-dark-card rounded-lg border border-dark-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Trip History</h2>
            {vehicle.trips && vehicle.trips.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {vehicle.trips.map((trip: any) => (
                  <div key={trip.id} className="p-4 bg-dark-bg rounded-lg border border-dark-border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">{trip.destination}</p>
                        <p className="text-dark-muted text-sm">
                          {new Date(trip.startTime).toLocaleDateString()} • {trip.user?.name || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white">{trip.mileageDriven || 0} mi</p>
                        {trip.endTime ? (
                          <span className="text-green-400 text-xs">Completed</span>
                        ) : (
                          <span className="text-yellow-400 text-xs">In Progress</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-muted text-center py-8">No trips recorded</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-dark-card rounded-lg border border-dark-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Vehicle Details</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-dark-muted text-sm">Assigned User</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-white">{vehicle.assignedUser?.name || 'Unassigned'}</p>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="text-blue-500 hover:text-blue-400 text-sm"
                  >
                    {vehicle.assignedUser ? 'Change' : 'Assign'}
                  </button>
                </div>
              </div>

              {vehicle.fuelType && (
                <div>
                  <p className="text-dark-muted text-sm">Fuel Type</p>
                  <p className="text-white capitalize">{vehicle.fuelType}</p>
                </div>
              )}

              {vehicle.fuelEfficiency && (
                <div>
                  <p className="text-dark-muted text-sm">Fuel Efficiency</p>
                  <p className="text-white">{vehicle.fuelEfficiency} mpg</p>
                </div>
              )}

              {vehicle.insuranceExpiry && (
                <div>
                  <p className="text-dark-muted text-sm">Insurance Expiry</p>
                  <p className={`${vehicle.insuranceExpiring ? 'text-yellow-400' : 'text-white'}`}>
                    {new Date(vehicle.insuranceExpiry).toLocaleDateString()}
                  </p>
                </div>
              )}

              {vehicle.registrationExpiry && (
                <div>
                  <p className="text-dark-muted text-sm">Registration Expiry</p>
                  <p className={`${vehicle.registrationExpiring ? 'text-orange-400' : 'text-white'}`}>
                    {new Date(vehicle.registrationExpiry).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div>
                <p className="text-dark-muted text-sm">Service Status</p>
                {vehicle.needsService ? (
                  <p className="text-red-400">Service due in {vehicle.milesUntilService} miles</p>
                ) : (
                  <p className="text-green-400">Service OK ({vehicle.milesUntilService} miles remaining)</p>
                )}
              </div>
            </div>
          </div>

          {vehicle.serviceLogs && vehicle.serviceLogs.length > 0 && (
            <div className="bg-dark-card rounded-lg border border-dark-border p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Service History</h2>
              <div className="space-y-3">
                {vehicle.serviceLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="p-3 bg-dark-bg rounded-lg">
                    <p className="text-white text-sm">{log.serviceType}</p>
                    <p className="text-dark-muted text-xs">
                      {new Date(log.performedAt).toLocaleDateString()} • {log.mileageAtService.toLocaleString()} mi
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-card rounded-lg border border-dark-border p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Assign Vehicle</h3>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white mb-4"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-dark-border hover:bg-dark-muted text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
              >
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
