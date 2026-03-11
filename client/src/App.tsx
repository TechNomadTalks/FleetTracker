import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
import { SocketEvents } from './components/SocketEvents';
import { useAuth } from './context/AuthContext';
import { useEffect } from 'react';
import { joinRoom, leaveRoom } from './services/socket';

const SocketWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      joinRoom(user.id);
      return () => leaveRoom(user.id);
    }
  }, [user?.id]);

  return (
    <>
      {children}
      <SocketEvents />
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <div className="dark">
        <AuthProvider>
          <NotificationProvider>
            <SocketWrapper>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/vehicles" element={<VehiclesPage />} />
                  <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
                  <Route path="/trips" element={<TripsPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>
                
                <Route element={<AdminRoute />}>
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/audit" element={<AuditLogPage />} />
                </Route>
                
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </SocketWrapper>
          </NotificationProvider>
        </AuthProvider>
      </div>
    </BrowserRouter>
  );
}

export default App;
