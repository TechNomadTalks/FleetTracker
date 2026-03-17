import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout/Layout';
import { dashboardService, analyticsService } from '../services/api';
import { DashboardSummary, Trip, TripsByMonth, MileageByVehicle, CostSummary, VehicleUtilization } from '../types';
import { ToastContainer, toast } from 'react-toastify';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [tripsByMonth, setTripsByMonth] = useState<TripsByMonth[]>([]);
  const [mileageByVehicle, setMileageByVehicle] = useState<MileageByVehicle[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [utilization, setUtilization] = useState<VehicleUtilization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    setIsAdmin(user?.role === 'admin');
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, user]);

  const fetchData = async () => {
    try {
      const [summaryRes, tripsRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getRecentTrips(),
      ]);
      setSummary(summaryRes.data.data);
      setRecentTrips(tripsRes.data.data);

      if (user?.role === 'admin') {
        const [tripsData, mileageData, costData, utilData] = await Promise.all([
          analyticsService.getTripsByMonth(6),
          analyticsService.getMileageByVehicle(),
          analyticsService.getCostSummary(30),
          analyticsService.getUtilization(),
        ]);
        setTripsByMonth(tripsData.data.data);
        setMileageByVehicle(mileageData.data.data);
        setCostSummary(costData.data.data);
        setUtilization(utilData.data.data.vehicles);
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const TrendIndicator = ({ value }: { value: number }) => {
    if (value === 0) return <span className="text-gray-400 ml-2">-</span>;
    return (
      <span className={`ml-2 text-sm ${value > 0 ? 'text-red-400' : 'text-green-400'}`}>
        {value > 0 ? '↑' : '↓'} {Math.abs(value)}%
      </span>
    );
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

  const StatCard = ({ title, value, color, icon, trend }: { title: string; value: number | string; color: string; icon: React.ReactNode; trend?: number }) => (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <div className="flex items-baseline">
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            {trend !== undefined && <TrendIndicator value={trend} />}
          </div>
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '600/20').replace('400', '400/20')}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const utilizationData = utilization.map(v => ({
    name: v.registrationNumber,
    value: v.utilizationPercent,
  }));

  const purposeData = costSummary ? [
    { name: 'Business', value: costSummary.byPurpose.business },
    { name: 'Personal', value: costSummary.byPurpose.personal },
    { name: 'Maintenance', value: costSummary.byPurpose.maintenance },
  ] : [];

  return (
    <Layout>
      <ToastContainer theme="dark" position="top-right" />
      
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Fleet overview and recent activity</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-gray-400 text-sm">Auto-refresh</span>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoRefresh ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoRefresh ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <button
            onClick={fetchData}
            className="p-2 text-gray-400 hover:text-white transition"
            title="Refresh data"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 mb-8">
        <StatCard 
          title="Total Vehicles" 
          value={summary?.totalVehicles || 0} 
          color="text-white"
          icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
        />
        <StatCard 
          title="Available" 
          value={summary?.availableVehicles || 0} 
          color="text-green-400"
          icon={<svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
        />
        <StatCard 
          title="In Use" 
          value={summary?.outVehicles || 0} 
          color="text-yellow-400"
          icon={<svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
        <StatCard 
          title="Total Trips" 
          value={summary?.totalTrips || 0} 
          color="text-blue-400"
          icon={<svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>}
        />
        <StatCard 
          title="Total Users" 
          value={summary?.totalUsers || 0} 
          color="text-purple-400"
          icon={<svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
        <StatCard 
          title="Service Due" 
          value={summary?.upcomingServicesCount || 0} 
          color={summary?.upcomingServicesCount ? 'text-red-400' : 'text-gray-400'}
          icon={<svg className={`w-6 h-6 ${summary?.upcomingServicesCount ? 'text-red-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
      </div>

      {isAdmin && costSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard 
            title="30-Day Expenses" 
            value={`$${costSummary.totalExpenses.toFixed(2)}`} 
            color="text-red-400"
            icon={<svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            trend={costSummary.expenseChange}
          />
          <StatCard 
            title="30-Day Mileage" 
            value={costSummary.totalMileage.toLocaleString()} 
            color="text-blue-400"
            icon={<svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            trend={costSummary.mileageChange}
          />
          <StatCard 
            title="Trips (30 Days)" 
            value={costSummary.tripCount} 
            color="text-green-400"
            icon={<svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>}
          />
        </div>
      )}

      {isAdmin && tripsByMonth.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Trips Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={tripsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Legend />
                <Line type="monotone" dataKey="trips" stroke="#3B82F6" strokeWidth={2} name="Trips" dot={{ fill: '#3B82F6' }} />
                <Line type="monotone" dataKey="mileage" stroke="#10B981" strokeWidth={2} name="Mileage" dot={{ fill: '#10B981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Mileage by Vehicle</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={mileageByVehicle.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="registrationNumber" type="category" stroke="#9CA3AF" fontSize={12} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Bar dataKey="totalMileage" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Mileage" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {isAdmin && utilizationData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Vehicle Utilization (30 Days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={utilizationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}%`}
                  labelLine={false}
                >
                  {utilizationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Trips by Purpose</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={purposeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {purposeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Recent Trips</h2>
          <Link to="/trips" className="text-blue-400 hover:text-blue-300 text-sm font-medium transition">
            View All →
          </Link>
        </div>
        
        {recentTrips.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Destination</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Purpose</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Miles</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {recentTrips.map((trip) => (
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
                          <div className="text-sm text-gray-500">{trip.vehicle?.make}</div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{trip.mileageDriven ? trip.mileageDriven.toLocaleString() : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">{new Date(trip.startTime).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {trip.endTime ? (
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-600/20 text-green-400">Completed</span>
                      ) : (
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-600/20 text-yellow-400">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="mt-4 text-gray-400">No trips recorded yet</p>
            <Link to="/vehicles" className="mt-4 inline-block text-blue-400 hover:text-blue-300 font-medium">
              Check out a vehicle →
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
};
