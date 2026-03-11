import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
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

export default api;
