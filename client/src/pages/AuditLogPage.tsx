import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { adminService } from '../services/api';
import { AuditLog } from '../types';
import { ToastContainer, toast } from 'react-toastify';

interface AuditLogResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const purpose = filter === 'all' ? undefined : filter;
      const res = await adminService.getAuditLog(pagination.page, pagination.limit, purpose);
      const data: AuditLogResponse = res.data.data;
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (error) {
      toast.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('started')) return 'bg-yellow-600/20 text-yellow-400';
    if (action.includes('completed')) return 'bg-green-600/20 text-green-400';
    return 'bg-blue-600/20 text-blue-400';
  };

  return (
    <Layout>
      <ToastContainer theme="dark" position="top-right" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Audit Log</h1>
        <p className="text-gray-400 mt-1">Track all user activity</p>
      </div>

      <div className="mb-4 flex space-x-2">
        {['all', 'business', 'personal', 'maintenance'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === f || (f === 'all' && filter === '')
                ? 'bg-blue-600 text-white'
                : 'bg-dark-card text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-dark-card rounded-lg border border-dark-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Action</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Vehicle</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Details</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-dark-bg">
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${getActionColor(log.action)}`}>
                    {log.action.replace('trip_', '')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-white text-sm">{log.user?.name || 'Unknown'}</p>
                    <p className="text-gray-500 text-xs">{log.user?.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300">
                  {log.details.vehicle || '-'}
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-white text-sm">{log.details.destination || '-'}</p>
                    <p className="text-gray-500 text-xs">
                      {log.details.mileage ? `${log.details.mileage} mi` : ''}
                      {log.details.purpose ? ` • ${log.details.purpose}` : ''}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400 text-sm">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {logs.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-400">
            No activity found
          </div>
        )}

        {loading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="mt-4 flex justify-center space-x-2">
          {Array.from({ length: Math.min(pagination.totalPages, 10) }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setPagination({ ...pagination, page })}
              className={`px-3 py-1 rounded ${
                page === pagination.page
                  ? 'bg-blue-600 text-white'
                  : 'bg-dark-card text-gray-400 hover:text-white'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </Layout>
  );
};
