import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { integrationsService } from '../services/api';
import { ToastContainer, toast } from 'react-toastify';

interface Integration {
  id: string;
  type: string;
  isActive: boolean;
  lastSyncAt: string | null;
}

export const IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await integrationsService.getAll();
      setIntegrations(res.data.data);
    } catch (error) {
      console.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (type: string) => {
    try {
      switch (type) {
        case 'google_calendar':
          await integrationsService.setupGoogleCalendar(formData);
          break;
        case 'slack':
          await integrationsService.setupSlack(formData);
          break;
        case 'quickbooks':
          await integrationsService.setupQuickbooks(formData);
          break;
      }
      toast.success(`${type} connected successfully!`);
      setShowModal(null);
      setFormData({});
      fetchIntegrations();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to connect');
    }
  };

  const handleDelete = async (type: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) return;
    try {
      await integrationsService.delete(type);
      toast.success('Integration disconnected');
      fetchIntegrations();
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  const handleTest = async (type: string) => {
    try {
      await integrationsService.test(type);
      toast.success('Test successful!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Test failed');
    }
  };

  const integrationCards = [
    {
      type: 'google_calendar',
      name: 'Google Calendar',
      description: 'Sync scheduled services with Google Calendar',
      icon: '📅',
      fields: [
        { key: 'clientId', label: 'Client ID', type: 'text' },
        { key: 'clientSecret', label: 'Client Secret', type: 'password' },
        { key: 'refreshToken', label: 'Refresh Token', type: 'text' },
      ],
    },
    {
      type: 'slack',
      name: 'Slack',
      description: 'Get notifications in Slack channels',
      icon: '💬',
      fields: [
        { key: 'webhookUrl', label: 'Webhook URL', type: 'text' },
        { key: 'channel', label: 'Channel', type: 'text' },
      ],
    },
    {
      type: 'quickbooks',
      name: 'QuickBooks',
      description: 'Sync expenses and invoices with QuickBooks',
      icon: '📊',
      fields: [
        { key: 'clientId', label: 'Client ID', type: 'text' },
        { key: 'clientSecret', label: 'Client Secret', type: 'password' },
        { key: 'realmId', label: 'Realm ID', type: 'text' },
        { key: 'accessToken', label: 'Access Token', type: 'password' },
        { key: 'refreshToken', label: 'Refresh Token', type: 'password' },
      ],
    },
  ];

  const getIntegrationStatus = (type: string) => {
    const int = integrations.find(i => i.type === type);
    return int?.isActive ? 'Connected' : 'Not Connected';
  };

  const getIntegrationLastSync = (type: string) => {
    const int = integrations.find(i => i.type === type);
    return int?.lastSyncAt ? new Date(int.lastSyncAt).toLocaleString() : 'Never';
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
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Integrations</h1>
        <p className="text-gray-400 mt-1">Connect FleetTracker with external services</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrationCards.map((integration) => (
          <div key={integration.type} className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">{integration.icon}</div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                getIntegrationStatus(integration.type) === 'Connected' 
                  ? 'bg-green-600/20 text-green-400' 
                  : 'bg-gray-600/20 text-gray-400'
              }`}>
                {getIntegrationStatus(integration.type)}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-2">{integration.name}</h3>
            <p className="text-gray-400 text-sm mb-4">{integration.description}</p>
            
            <p className="text-gray-500 text-xs mb-4">
              Last sync: {getIntegrationLastSync(integration.type)}
            </p>

            <div className="flex space-x-2">
              {getIntegrationStatus(integration.type) === 'Connected' ? (
                <>
                  <button
                    onClick={() => handleTest(integration.type)}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => handleDelete(integration.type)}
                    className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowModal(integration.type)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                Connect {integrationCards.find(i => i.type === showModal)?.name}
              </h2>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {integrationCards.find(i => i.type === showModal)?.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{field.label}</label>
                  <input
                    type={field.type}
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(null)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(showModal)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
