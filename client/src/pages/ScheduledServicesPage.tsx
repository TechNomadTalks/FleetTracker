import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { scheduledService, vehicleService } from '../services/api';
import { ToastContainer, toast } from 'react-toastify';

interface ScheduledService {
  id: string;
  vehicleId: string;
  serviceType: string;
  description?: string;
  scheduledDate: string;
  mileageDue?: number;
  recurring: boolean;
  recurringIntervalDays?: number;
  cost?: number;
  status: string;
  completedAt?: string;
  vehicle?: {
    id: string;
    registrationNumber: string;
    make: string;
    model: string;
  };
}

export const ScheduledServicesPage: React.FC = () => {
  const [services, setServices] = useState<ScheduledService[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    serviceType: '',
    description: '',
    scheduledDate: '',
    mileageDue: '',
    recurring: false,
    recurringIntervalDays: '',
    cost: '',
  });

  useEffect(() => {
    fetchServices();
    fetchVehicles();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await scheduledService.getAll();
      setServices(res.data.data);
    } catch (error) {
      toast.error('Failed to load scheduled services');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await vehicleService.getAll();
      setVehicles(res.data.data);
    } catch (error) {
      toast.error('Failed to load vehicles');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await scheduledService.create({
        ...formData,
        mileageDue: formData.mileageDue ? parseInt(formData.mileageDue) : undefined,
        recurringIntervalDays: formData.recurringIntervalDays ? parseInt(formData.recurringIntervalDays) : undefined,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
      });
      toast.success('Service scheduled successfully!');
      setShowModal(false);
      setFormData({
        vehicleId: '',
        serviceType: '',
        description: '',
        scheduledDate: '',
        mileageDue: '',
        recurring: false,
        recurringIntervalDays: '',
        cost: '',
      });
      fetchServices();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to schedule service');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await scheduledService.update(id, { status: 'completed' });
      toast.success('Service marked as completed!');
      fetchServices();
    } catch (error) {
      toast.error('Failed to update service');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled service?')) return;
    try {
      await scheduledService.delete(id);
      toast.success('Service deleted!');
      fetchServices();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600/20 text-green-400';
      case 'in_progress': return 'bg-blue-600/20 text-blue-400';
      default: return 'bg-yellow-600/20 text-yellow-400';
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

  return (
    <Layout>
      <ToastContainer theme="dark" position="top-right" />
      
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Scheduled Services</h1>
          <p className="text-gray-400 mt-1">Manage upcoming vehicle maintenance</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          Schedule Service
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Service Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Scheduled Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Mileage Due</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Cost</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-750 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-white font-medium">
                      {service.vehicle?.registrationNumber}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {service.vehicle?.make} {service.vehicle?.model}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                    {service.serviceType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                    {new Date(service.scheduledDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                    {service.mileageDue ? `${service.mileageDue.toLocaleString()} mi` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                    {service.cost ? `$${service.cost.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(service.status)}`}>
                      {service.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {service.status !== 'completed' && (
                        <button
                          onClick={() => handleComplete(service.id)}
                          className="text-green-400 hover:text-green-300 text-sm"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No scheduled services found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Schedule Service</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle</label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  required
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.registrationNumber} - {v.make} {v.model}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Service Type</label>
                <input
                  type="text"
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  placeholder="e.g., Oil Change, Tire Rotation"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Scheduled Date</label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Mileage Due</label>
                  <input
                    type="number"
                    value={formData.mileageDue}
                    onChange={(e) => setFormData({ ...formData, mileageDue: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Est. Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.recurring}
                  onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                  className="w-4 h-4 bg-gray-700 border-gray-600 rounded"
                />
                <label htmlFor="recurring" className="ml-2 text-sm text-gray-300">Recurring service</label>
              </div>

              {formData.recurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Repeat every (days)</label>
                  <input
                    type="number"
                    value={formData.recurringIntervalDays}
                    onChange={(e) => setFormData({ ...formData, recurringIntervalDays: e.target.value })}
                    placeholder="e.g., 90"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              )}
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
