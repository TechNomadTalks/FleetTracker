import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { tripService } from '../services/api';
import { Trip } from '../types';
import { useAuth } from '../context/AuthContext';
import { ToastContainer, toast } from 'react-toastify';

const ITEMS_PER_PAGE = 10;

export const TripsPage: React.FC = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCheckin, setShowCheckin] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [endMileage, setEndMileage] = useState(0);
  const [expenses, setExpenses] = useState('');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, [page]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await tripService.getAll();
      const allTrips = res.data.data;
      setTotalPages(Math.ceil(allTrips.length / ITEMS_PER_PAGE));
      setTrips(allTrips);
    } catch (error) {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = (trip: Trip) => {
    setSelectedTrip(trip);
    setEndMileage(trip.startMileage);
    setExpenses(trip.expenses?.toString() || '');
    setNotes(trip.notes || '');
    setShowCheckin(true);
  };

  const submitCheckin = async () => {
    if (!selectedTrip || submitting) return;
    
    const originalTrips = [...trips];
    const optimisticTrip = {
      ...selectedTrip,
      endMileage,
      mileageDriven: endMileage - selectedTrip.startMileage,
      expenses: parseFloat(expenses) || 0,
      notes,
      endTime: new Date().toISOString(),
    };
    
    setTrips(trips.map(t => t.id === selectedTrip.id ? optimisticTrip : t));
    setSubmitting(true);
    setShowCheckin(false);
    
    try {
      await tripService.checkin(selectedTrip.id, endMileage, parseFloat(expenses) || undefined, notes);
      toast.success('Vehicle checked in successfully!');
      setSelectedTrip(null);
      setExpenses('');
      setNotes('');
      fetchTrips();
    } catch (error: any) {
      setTrips(originalTrips);
      toast.error(error.response?.data?.error || 'Checkin failed');
    } finally {
      setSubmitting(false);
    }
  };

  const activeTrip = trips.find((t) => t.userId === user?.id && !t.endTime);

  const filteredTrips = trips.filter((trip) => {
    if (filter === 'active') return !trip.endTime;
    if (filter === 'completed') return !!trip.endTime;
    return true;
  });

  const paginatedTrips = filteredTrips.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const SkeletonRow = () => (
    <tr>
      <td className="px-6 py-4"><div className="h-10 bg-gray-700 rounded animate-pulse"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-24 animate-pulse"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-20 animate-pulse"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-24 animate-pulse"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div></td>
      <td className="px-6 py-4"><div className="h-6 bg-gray-700 rounded w-20 animate-pulse"></div></td>
    </tr>
  );

  if (loading && trips.length === 0) {
    return (
      <Layout>
        <ToastContainer theme="dark" position="top-right" />
        <div className="mb-8">
          <div className="h-8 bg-gray-700 rounded w-48 animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-64 animate-pulse"></div>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Destination</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Purpose</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Driver</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Start</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">End</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Miles</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ToastContainer theme="dark" position="top-right" />
      
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Trips</h1>
          <p className="text-gray-400 mt-1">View and manage all trips</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {activeTrip && (
        <div className="mb-8 p-6 bg-blue-900/30 border border-blue-700/50 rounded-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-3 py-1 text-xs font-medium bg-blue-600/20 text-blue-400 rounded-full">Active Trip</span>
              </div>
              <h2 className="text-xl font-semibold text-white">
                {activeTrip.vehicle?.registrationNumber} - {activeTrip.destination}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Started: {new Date(activeTrip.startTime).toLocaleString()} • 
                Start mileage: {activeTrip.startMileage.toLocaleString()} mi
              </p>
            </div>
            <button
              onClick={() => handleCheckin(activeTrip)}
              className="py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Check In Now</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Purpose</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Start</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">End</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Miles</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedTrips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-750 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                        <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{trip.vehicle?.registrationNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300">{trip.destination}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      trip.purpose === 'business' ? 'bg-blue-600/20 text-blue-400' :
                      trip.purpose === 'personal' ? 'bg-purple-600/20 text-purple-400' :
                      'bg-orange-600/20 text-orange-400'
                    }`}>
                      {trip.purpose}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300">{trip.user?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-white">{trip.startMileage.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-white">
                    {trip.endMileage ? trip.endMileage.toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                    {trip.mileageDriven ? trip.mileageDriven.toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {trip.endTime ? (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-600/20 text-green-400">Completed</span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-600/20 text-yellow-400">Active</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTrips.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No trips found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {filteredTrips.length > ITEMS_PER_PAGE && (
          <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, filteredTrips.length)} of {filteredTrips.length} trips
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showCheckin && selectedTrip && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Check In Vehicle</h2>
              <button onClick={() => setShowCheckin(false)} className="text-gray-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Vehicle</p>
                  <p className="text-white font-medium">{selectedTrip.vehicle?.registrationNumber}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Destination</p>
                  <p className="text-white font-medium">{selectedTrip.destination}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Start Mileage</p>
                  <p className="text-white font-medium">{selectedTrip.startMileage.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Ending Mileage</label>
                <input
                  type="number"
                  value={endMileage}
                  onChange={(e) => setEndMileage(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Expenses ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={expenses}
                  onChange={(e) => setExpenses(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about the trip..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCheckin(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={submitCheckin}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
              >
                Complete Check-In
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
