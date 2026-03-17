import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute, AdminRoute } from './components/Common/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { TripsPage } from './pages/TripsPage';
import { ServicesPage } from './pages/ServicesPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProfilePage } from './pages/ProfilePage';
import { VehicleDetailPage } from './pages/VehicleDetailPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ScheduledServicesPage } from './pages/ScheduledServicesPage';
import { AdvancedReportsPage } from './pages/AdvancedReportsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { TripMapPage } from './pages/TripMapPage';
import { VehicleCalendarPage } from './pages/VehicleCalendarPage';
import { DashboardCustomPage } from './pages/DashboardCustomPage';
import { SocketEvents } from './components/SocketEvents';
import { useAuth } from './context/AuthContext';
import { useEffect } from 'react';
import { joinRoom, leaveRoom } from './services/socket';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const SocketWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      joinRoom();
      return () => leaveRoom();
    }
  }, [user?.id]);

  return (
    <>
      {children}
      <SocketEvents />
    </>
  );
};

const AppContent: React.FC = () => {
  useKeyboardShortcuts();
  
  return (
    <SocketWrapper>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/trips/map" element={<TripMapPage />} />
          <Route path="/calendar" element={<VehicleCalendarPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/scheduled-services" element={<ScheduledServicesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        
        <Route element={<AdminRoute />}>
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/advanced-reports" element={<AdvancedReportsPage />} />
          <Route path="/customize" element={<DashboardCustomPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/audit" element={<AuditLogPage />} />
        </Route>
        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </SocketWrapper>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
