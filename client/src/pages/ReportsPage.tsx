import React, { useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { reportService, api } from '../services/api';
import { ToastContainer, toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL;

export const ReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const buildParams = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return params.toString();
  };

  const downloadReport = async (type: 'mileage' | 'user-activity', format: 'csv' | 'pdf') => {
    setLoading(true);
    try {
      const baseUrl = type === 'mileage' 
        ? `${API_URL}/reports/mileage`
        : `${API_URL}/reports/user-activity`;
      
      const url = format === 'pdf' ? `${baseUrl}-pdf` : baseUrl;
      const params = buildParams();
      const fullUrl = params ? `${url}?${params}` : url;

      const token = localStorage.getItem('accessToken');
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download');
      }

      const blob = await response.blob();
      const contentType = format === 'pdf' ? 'application/pdf' : 'text/csv';
      const filename = `${type}-report.${format}`;

      const url2 = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url2;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download report');
    } finally {
      setLoading(false);
    }
  };

  const ReportCard = ({ 
    title, 
    description, 
    type 
  }: { 
    title: string; 
    description: string; 
    type: 'mileage' | 'user-activity';
  }) => (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
      <p className="text-gray-400 text-sm mb-4">{description}</p>
      <div className="flex space-x-2">
        <button
          onClick={() => downloadReport(type, 'csv')}
          disabled={loading}
          className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50"
        >
          CSV
        </button>
        <button
          onClick={() => downloadReport(type, 'pdf')}
          disabled={loading}
          className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium disabled:opacity-50"
        >
          PDF
        </button>
      </div>
    </div>
  );

  return (
    <Layout>
      <ToastContainer theme="dark" />
      <h1 className="text-2xl font-bold text-white mb-6">Reports</h1>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Date Range</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-md font-medium"
          >
            Clear
          </button>
        </div>
        {(startDate || endDate) && (
          <p className="text-gray-400 text-sm mt-2">
            Showing data from {startDate || 'beginning'} to {endDate || 'now'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportCard 
          title="Mileage Report" 
          description="Export all vehicles with their current mileage and total miles driven."
          type="mileage"
        />
        <ReportCard 
          title="User Activity Report" 
          description="Export all users with their trip counts and total miles driven."
          type="user-activity"
        />
      </div>
    </Layout>
  );
};
