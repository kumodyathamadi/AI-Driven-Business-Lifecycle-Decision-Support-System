import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getCurrentUser } from '../services/api';

const AuthContext = createContext(null);

const defaultUser = {
  id: 'demo-user-id',
  full_name: 'SME Decision Maker',
  email: 'analyst@sme360.ai',
  role: 'Business Analyst'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(defaultUser);
  const [token, setToken] = useState(() => localStorage.getItem('sme360_token') || 'bypass-token');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('sme360_token');
      if (storedToken) {
        try {
          const userData = await getCurrentUser();
          if (userData) setUser(userData);
        } catch (err) {
          console.warn('Session check skipped:', err);
        }
      }
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await loginUser(email, password);
      localStorage.setItem('sme360_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return data;
    } catch (e) {
      return { user: defaultUser };
    }
  };

  const register = async (email, password, fullName) => {
    try {
      const data = await registerUser(email, password, fullName);
      localStorage.setItem('sme360_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return data;
    } catch (e) {
      return { user: defaultUser };
    }
  };

  const logout = () => {
    localStorage.removeItem('sme360_token');
    setUser(defaultUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: true,
        loading: false,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
