import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refresh user data (useful after email verification or plan upgrade)
  const refreshUser = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'token': token }
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('user_data', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  // Check for existing auth on mount
  useEffect(() => {
    const initAuth = async () => {
      console.log('[AuthDebug] Initializing auth...');
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      console.log('[AuthDebug] Storage check - Token:', !!token, 'User:', !!userData);

      if (token && userData) {
        try {
          console.log('[AuthDebug] Verifying token with backend at:', `${API_URL}/api/auth/me`);
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'token': token }
          });

          console.log('[AuthDebug] Token verification status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('[AuthDebug] Token valid for:', data.user.email);
            localStorage.setItem('user_data', JSON.stringify(data.user));
            setUser(data.user);
          } else {
            const errData = await response.json().catch(() => ({}));
            console.warn('[AuthDebug] Token invalid or expired:', response.status, errData);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            setUser(null);
          }
        } catch (e) {
          console.error('[AuthDebug] Network/System error during verification:', e);
          // Don't clear storage immediately on network error, but set user null
          setUser(null);
        }
      } else {
        console.log('[AuthDebug] No session found in storage');
        setUser(null);
      }

      console.log('[AuthDebug] Auth initialization complete, setting loading=false');
      setLoading(false);
    };

    initAuth();
  }, []);

  // Login function - calls backend API
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      setUser(data.user);

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Signup function - calls backend API and sends welcome email
  const signup = async (email, password, name, referralCode) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, referral_code: referralCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Signup failed');
      }

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      setUser(data.user);

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    googleLogin: (userData, token) => {
      console.log('[AuthDebug] googleLogin called - User:', userData.email, 'Token snippet:', token?.substring(0, 10) + '...');
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      setUser(userData);
      console.log('[AuthDebug] Session data saved to storage and state updated');
    },
    signup,
    logout,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
