import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { ConnectionStatus } from './ConnectionStatus';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/vehicles', label: 'Vehicles' },
    { to: '/trips', label: 'Trips' },
    { to: '/services', label: 'Services' },
  ];

  if (user?.role === 'admin') {
    navLinks.push({ to: '/reports', label: 'Reports' });
    navLinks.push({ to: '/admin/users', label: 'Users' });
    navLinks.push({ to: '/admin/audit', label: 'Audit' });
  }

  return (
    <nav className="bg-dark-card border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="text-xl font-bold text-blue-500">
              FleetTracker
            </Link>
            <div className="ml-10 flex space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === link.to
                      ? 'bg-dark-border text-white'
                      : 'text-dark-muted hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <ConnectionStatus />
            <NotificationBell />
            <Link
              to="/profile"
              className={`text-sm ${
                location.pathname === '/profile'
                  ? 'text-white'
                  : 'text-dark-muted hover:text-white'
              }`}
            >
              Profile
            </Link>
            <span className="text-dark-muted text-sm">{user?.name}</span>
            <span className="text-xs px-2 py-1 bg-blue-600 rounded text-white">{user?.role}</span>
            <button
              onClick={logout}
              className="text-sm text-dark-muted hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
