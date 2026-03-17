import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; role?: string; adminSecret?: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      authService.me()
        .then((res) => setUser(res.data.data))
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    const { user, accessToken, refreshToken, csrfToken } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    if (csrfToken) {
      localStorage.setItem('csrfToken', csrfToken);
    }
    setUser(user);
  };

  const register = async (data: { email: string; password: string; name: string; role?: string; adminSecret?: string }) => {
    const response = await authService.register(data);
    const { user, accessToken, refreshToken, csrfToken } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    if (csrfToken) {
      localStorage.setItem('csrfToken', csrfToken);
    }
    setUser(user);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('csrfToken');
      setUser(null);
    }
  };

  const setUserState = (userData: User | null) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser: setUserState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
