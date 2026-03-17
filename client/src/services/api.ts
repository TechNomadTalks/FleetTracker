import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('VITE_API_URL is not defined. Please configure your environment variables.');
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  const csrfToken = localStorage.getItem('csrfToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase())) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; role?: string; adminSecret?: string }) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const userService = {
  updateProfile: (data: { name: string; email: string }) => api.put('/users/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put('/users/password', data),
  updateNotifications: (emailNotifications: boolean) => api.put('/users/notifications', { emailNotifications }),
  getAll: () => api.get('/users'),
};

export const adminService = {
  getUsers: (page?: number, limit?: number, search?: string) =>
    api.get('/admin/users', { params: { page, limit, search } }),
  updateUser: (id: string, data: { name?: string; email?: string; role?: string }) =>
    api.put(`/admin/users/${id}`, data),
  deactivateUser: (id: string, isActive: boolean) =>
    api.put(`/admin/users/${id}/deactivate`, { isActive }),
  getAuditLog: (page?: number, limit?: number, action?: string, userId?: string) =>
    api.get('/admin/audit-log', { params: { page, limit, action, userId } }),
};

export const vehicleService = {
  getAll: () => api.get('/vehicles'),
  getById: (id: string) => api.get(`/vehicles/${id}`),
  getFull: (id: string) => api.get(`/vehicles/${id}/full`),
  getExpiring: (days?: number) => api.get('/vehicles/expiring', { params: { days } }),
  create: (data: any) => api.post('/vehicles', data),
  update: (id: string, data: any) => api.put(`/vehicles/${id}`, data),
  assign: (id: string, assignedUserId: string | null) => api.put(`/vehicles/${id}/assign`, { assignedUserId }),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
};

export const tripService = {
  checkout: (data: { vehicleId: string; destination: string; currentMileage: number; purpose?: string; notes?: string }) =>
    api.post('/trips/checkout', data),
  checkin: (id: string, endMileage: number, expenses?: number, notes?: string) => 
    api.post(`/trips/${id}/checkin`, { endMileage, expenses, notes }),
  getAll: () => api.get('/trips'),
  getByUser: (userId: string) => api.get(`/trips/user/${userId}`),
  getByVehicle: (vehicleId: string) => api.get(`/trips/vehicle/${vehicleId}`),
  update: (id: string, data: { purpose?: string; notes?: string; expenses?: number }) => 
    api.put(`/trips/${id}`, data),
  uploadReceipt: (id: string, receipt: string) => 
    api.post(`/trips/${id}/receipt`, { receipt }),
  getReceipt: (id: string) => api.get(`/trips/${id}/receipt`, { responseType: 'blob' }),
};

export const serviceService = {
  create: (data: any) => api.post('/services', data),
  getByVehicle: (vehicleId: string) => api.get(`/services/vehicle/${vehicleId}`),
  getUpcoming: () => api.get('/services/upcoming'),
};

export const notificationService = {
  getAll: (page?: number, limit?: number, type?: string) => 
    api.get('/notifications', { params: { page, limit, type } }),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

export const reportService = {
  getMileageReport: () => api.get('/reports/mileage', { responseType: 'blob' }),
  getUserActivityReport: () => api.get('/reports/user-activity', { responseType: 'blob' }),
};

export const dashboardService = {
  getSummary: () => api.get('/dashboard/summary'),
  getRecentTrips: () => api.get('/dashboard/recent-trips'),
};

export const analyticsService = {
  getTripsByMonth: (months?: number) => api.get('/analytics/trips-by-month', { params: { months } }),
  getMileageByVehicle: () => api.get('/analytics/mileage-by-vehicle'),
  getCostSummary: (days?: number) => api.get('/analytics/cost-summary', { params: { days } }),
  getUtilization: () => api.get('/analytics/utilization'),
};

export const scheduledService = {
  getAll: (params?: { vehicleId?: string; status?: string; startDate?: string; endDate?: string }) =>
    api.get('/scheduled-services', { params }),
  create: (data: any) => api.post('/scheduled-services', data),
  update: (id: string, data: any) => api.put(`/scheduled-services/${id}`, data),
  delete: (id: string) => api.delete(`/scheduled-services/${id}`),
  getUpcoming: (days?: number) => api.get('/scheduled-services/upcoming', { params: { days } }),
};

export const advancedReportService = {
  getCostPerMile: (params?: { startDate?: string; endDate?: string; vehicleId?: string }) =>
    api.get('/advanced-reports/cost-per-mile', { params }),
  getFuelEfficiency: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/advanced-reports/fuel-efficiency', { params }),
  getDepreciation: () => api.get('/advanced-reports/depreciation'),
  getMaintenanceCosts: (params?: { startDate?: string; endDate?: string; vehicleId?: string }) =>
    api.get('/advanced-reports/maintenance-costs', { params }),
  getDriverPerformance: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/advanced-reports/driver-performance', { params }),
};

export const userManagementService = {
  forgotPassword: (email: string) => api.post('/user-management/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => api.post('/user-management/reset-password', { token, newPassword }),
  verifyEmail: (token: string) => api.post('/user-management/verify-email', { token }),
  getSessions: () => api.get('/user-management/sessions'),
  revokeSession: (id: string) => api.delete(`/user-management/sessions/${id}`),
  revokeAllSessions: () => api.delete('/user-management/sessions'),
  updateLicense: (data: { licenseNumber?: string; licenseExpiry?: string }) =>
    api.put('/user-management/license', data),
  updateRating: (rating: number) => api.put('/user-management/rating', { rating }),
};

export const integrationsService = {
  getAll: () => api.get('/integrations'),
  setupGoogleCalendar: (data: { clientId: string; clientSecret: string; refreshToken: string }) =>
    api.post('/integrations/google-calendar', data),
  setupSlack: (data: { webhookUrl: string; channel: string }) =>
    api.post('/integrations/slack', data),
  setupQuickbooks: (data: { clientId: string; clientSecret: string; realmId: string; accessToken: string; refreshToken: string }) =>
    api.post('/integrations/quickbooks', data),
  delete: (type: string) => api.delete(`/integrations/${type}`),
  test: (type: string) => api.post(`/integrations/${type}/test`),
};

export const dashboardCustomService = {
  getWidgets: () => api.get('/dashboard-custom/widgets'),
  createWidget: (data: { type: string; title: string; position?: number; config?: any; isVisible?: boolean }) =>
    api.post('/dashboard-custom/widgets', data),
  updateWidget: (id: string, data: any) => api.put(`/dashboard-custom/widgets/${id}`, data),
  deleteWidget: (id: string) => api.delete(`/dashboard-custom/widgets/${id}`),
  getFilters: (type?: string) => api.get('/dashboard-custom/filters', { params: { type } }),
  saveFilter: (data: { name: string; type: string; filterData: any }) =>
    api.post('/dashboard-custom/filters', data),
  deleteFilter: (id: string) => api.delete(`/dashboard-custom/filters/${id}`),
};

export const importExportService = {
  importVehicles: (vehicles: any[]) => api.post('/import-export/import/vehicles', { vehicles }),
  importTrips: (trips: any[]) => api.post('/import-export/import/trips', { trips }),
  exportVehicles: () => api.get('/import-export/export/vehicles', { responseType: 'blob' }),
  exportTrips: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/import-export/export/trips', { params, responseType: 'blob' }),
  exportAuditLog: (params?: { startDate?: string; endDate?: string; action?: string }) =>
    api.get('/import-export/export/audit-log', { params, responseType: 'blob' }),
  getBackup: () => api.get('/import-export/backup', { responseType: 'blob' }),
};

export default api;
