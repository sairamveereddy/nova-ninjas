// API Configuration
// This file centralizes the API URL for the entire application

// Production API URL (Railway deployed backend)
const PRODUCTION_API_URL = 'https://nova-ninjas-production.up.railway.app';

// Development API URL
const DEVELOPMENT_API_URL = 'http://localhost:8000';

// Determine environment
const isProduction = window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

// Use environment-based API URL
export const API_URL = isProduction ? PRODUCTION_API_URL : DEVELOPMENT_API_URL;

// Helper function to make API calls with proper error handling
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;

  const token = localStorage.getItem('auth_token');

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'token': token } : {}),
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API Error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
};

export default API_URL;


