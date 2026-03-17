import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { advancedReportService, vehicleService } from '../services/api';
import { ToastContainer, toast } from 'react-toastify';

export const AdvancedReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('cost-per-mile');
  const [costPerMile, setCostPerMile] = useState<any[]>([]);
  const [fuelEfficiency, setFuelEfficiency] = useState<any[]>([]);
  const [depreciation, setDepreciation] = useState<any[]>([]);
  const [maintenanceCosts, setMaintenanceCosts] = useState<any>(null);
  const [driverPerformance, setDriverPerformance] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', vehicleId: '' });

  useEffect(() => {
    fetchVehicles();
    fetchReport(activeTab);
  }, []);

  useEffect(() => {
    fetchReport(activeTab);
  }, [filters, activeTab]);

  const fetchVehicles = async () => {
    try {
      const res = await vehicleService.getAll();
      setVehicles(res.data.data);
    } catch (error) {
      console.error('Failed to load vehicles');
    }
  };

  const fetchReport = async (type: string) => {
    setLoading(true);
    try {
      const params = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        vehicleId: filters.vehicleId || undefined,
      };

      switch (type) {
        case 'cost-per-mile':
          const costRes = await advancedReportService.getCostPerMile(params);
          setCostPerMile(costRes.data.data);
          break;
        case 'fuel-efficiency':
          const fuelRes = await advancedReportService.getFuelEfficiency(params);
          setFuelEfficiency(fuelRes.data.data);
          break;
        case 'depreciation':
          const depRes = await advancedReportService.getDepreciation();
          setDepreciation(depRes.data.data);
          break;
        case 'maintenance-costs':
          const maintRes = await advancedReportService.getMaintenanceCosts(params);
          setMaintenanceCosts(maintRes.data.data);
          break;
        case 'driver-performance':
          const driverRes = await advancedReportService.getDriverPerformance(params);
          setDriverPerformance(driverRes.data.data);
          break;
      }
    } catch (error) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).filter(k => !k.includes('vehicle') && !k.includes('driver') && typeof data[0][k] !== 'object');
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        return typeof val === 'number' ? val : `"${val || ''}"`;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  const tabs = [
    { id: 'cost-per-mile', label: 'Cost per Mile' },
    { id: 'fuel-efficiency', label: 'Fuel Efficiency' },
    { id: 'depreciation', label: 'Depreciation' },
    { id: 'maintenance-costs', label: 'Maintenance Costs' },
    { id: 'driver-performance', label: 'Driver Performance' },
  ];

  return (
    <Layout>
      <ToastContainer theme="dark" position="top-right" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Advanced Reports</h1>
        <p className="text-gray-400 mt-1">Detailed analytics and insights</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          placeholder="Start Date"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          placeholder="End Date"
        />
        <select
          value={filters.vehicleId}
          onChange={(e) => setFilters({ ...filters, vehicleId: e.target.value })}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          <option value="">All Vehicles</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>{v.registrationNumber}</option>
          ))}
        </select>
      </div>

      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {activeTab === 'cost-per-mile' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Cost per Mile Analysis</h2>
                <button onClick={() => exportToCSV(costPerMile, 'cost-per-mile')} className="text-blue-400 hover:text-blue-300">
                  Export CSV
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Total Vehicles</p>
                  <p className="text-2xl font-bold text-white">{costPerMile.length}</p>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Avg Cost/Mile</p>
                  <p className="text-2xl font-bold text-white">
                    ${(costPerMile.reduce((a, b) => a + (b.costPerMile || 0), 0) / (costPerMile.length || 1)).toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Total Miles</p>
                  <p className="text-2xl font-bold text-white">
                    {costPerMile.reduce((a, b) => a + (b.totalMiles || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm">
                      <th className="pb-3">Vehicle</th>
                      <th className="pb-3">Total Miles</th>
                      <th className="pb-3">Total Expenses</th>
                      <th className="pb-3">Cost/Mile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {costPerMile.map((item, i) => (
                      <tr key={i}>
                        <td className="py-3 text-white">{item.vehicle?.registrationNumber}</td>
                        <td className="py-3 text-gray-300">{item.totalMiles?.toLocaleString()}</td>
                        <td className="py-3 text-gray-300">${(item.totalExpenses || 0).toFixed(2)}</td>
                        <td className="py-3 text-green-400 font-medium">${(item.costPerMile || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'depreciation' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Vehicle Depreciation</h2>
                <button onClick={() => exportToCSV(depreciation, 'depreciation')} className="text-blue-400 hover:text-blue-300">
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm">
                      <th className="pb-3">Vehicle</th>
                      <th className="pb-3">Year</th>
                      <th className="pb-3">Purchase Price</th>
                      <th className="pb-3">Current Value</th>
                      <th className="pb-3">Depreciation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {depreciation.map((item, i) => (
                      <tr key={i}>
                        <td className="py-3 text-white">{item.vehicle?.registrationNumber} {item.vehicle?.make} {item.vehicle?.model}</td>
                        <td className="py-3 text-gray-300">{item.vehicle?.year || '-'}</td>
                        <td className="py-3 text-gray-300">${(item.purchasePrice || 0).toFixed(2)}</td>
                        <td className="py-3 text-green-400">${(item.currentValue || 0).toFixed(2)}</td>
                        <td className="py-3 text-red-400">-${(item.totalDepreciation || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'driver-performance' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Driver Performance</h2>
                <button onClick={() => exportToCSV(driverPerformance, 'driver-performance')} className="text-blue-400 hover:text-blue-300">
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm">
                      <th className="pb-3">Driver</th>
                      <th className="pb-3">Total Trips</th>
                      <th className="pb-3">Total Miles</th>
                      <th className="pb-3">Avg Rating</th>
                      <th className="pb-3">Cost/Mile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {driverPerformance.map((item, i) => (
                      <tr key={i}>
                        <td className="py-3 text-white">{item.driver?.name}</td>
                        <td className="py-3 text-gray-300">{item.totalTrips}</td>
                        <td className="py-3 text-gray-300">{item.totalMiles?.toLocaleString()}</td>
                        <td className="py-3 text-yellow-400">{item.avgRating?.toFixed(1) || '-'}</td>
                        <td className="py-3 text-gray-300">${(item.costPerMile || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'maintenance-costs' && maintenanceCosts && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Maintenance Costs</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Total Services</p>
                  <p className="text-2xl font-bold text-white">{maintenanceCosts.serviceCount}</p>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Total Cost</p>
                  <p className="text-2xl font-bold text-red-400">${(maintenanceCosts.totalCost || 0).toFixed(2)}</p>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Avg Cost/Service</p>
                  <p className="text-2xl font-bold text-white">
                    ${(maintenanceCosts.totalCost / (maintenanceCosts.serviceCount || 1)).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm">
                      <th className="pb-3">Vehicle</th>
                      <th className="pb-3">Service Type</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {maintenanceCosts.services?.slice(0, 20).map((s: any, i: number) => (
                      <tr key={i}>
                        <td className="py-3 text-white">{s.vehicle?.registrationNumber}</td>
                        <td className="py-3 text-gray-300">{s.serviceType}</td>
                        <td className="py-3 text-gray-300">{new Date(s.performedAt).toLocaleDateString()}</td>
                        <td className="py-3 text-red-400">${(s.cost || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'fuel-efficiency' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Fuel Efficiency Analysis</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm">
                      <th className="pb-3">Vehicle</th>
                      <th className="pb-3">Total Miles</th>
                      <th className="pb-3">Fuel Cost</th>
                      <th className="pb-3">Cost/Mile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {fuelEfficiency.map((item, i) => (
                      <tr key={i}>
                        <td className="py-3 text-white">{item.vehicle?.registrationNumber}</td>
                        <td className="py-3 text-gray-300">{item.totalMiles?.toLocaleString()}</td>
                        <td className="py-3 text-gray-300">${(item.totalFuelCost || 0).toFixed(2)}</td>
                        <td className="py-3 text-green-400">${(item.avgFuelCostPerMile || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};
