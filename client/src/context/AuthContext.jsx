import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(() => JSON.parse(localStorage.getItem('ic_user') || 'null'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ic_token');
    if (token) {
      api.get('/auth/me')
        .then(res => { setUser(res.data.user); localStorage.setItem('ic_user', JSON.stringify(res.data.user)); })
        .catch(() => { localStorage.removeItem('ic_token'); localStorage.removeItem('ic_user'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (studentId, password) => {
    const res = await api.post('/auth/login', { studentId, password });
    const { token, user, requiresPasswordChange } = res.data;
    localStorage.setItem('ic_token', token);
    localStorage.setItem('ic_user', JSON.stringify(user));
    setUser(user);
    return { user, requiresPasswordChange };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ic_token');
    localStorage.removeItem('ic_user');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get('/auth/me');
    setUser(res.data.user);
    localStorage.setItem('ic_user', JSON.stringify(res.data.user));
    return res.data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, isAdmin: user?.role === 'admin', isStudent: user?.role === 'student' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
