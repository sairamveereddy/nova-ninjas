// API Configuration
// This file centralizes the API URL for the entire application

// Production API URL (Railway deployed backend)
const PRODUCTION_API_URL = 'https://nova-ninjas-production.up.railway.app';

// Development API URL
const DEVELOPMENT_API_URL = 'http://localhost:8000';

// Determine environment
const isProduction = window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

// Production API URL for Interview Service (Next.js)
const PRODUCTION_INTERVIEW_API_URL = ''; // Will use relative paths on same domain

// Use local backend for localhost, production for everything else
export const API_URL = isProduction ? PRODUCTION_API_URL : DEVELOPMENT_API_URL;

// Interview API URL (Next.js saas-app)
export const INTERVIEW_API_URL = isProduction
  ? (PRODUCTION_INTERVIEW_API_URL || '')
  : 'http://localhost:3001';

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


