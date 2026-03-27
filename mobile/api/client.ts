import axios from 'axios';

// Default to localhost for development
// In production, this should be configured via environment
const BASE_URL = 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    if (__DEV__) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__) {
      console.error('[API Error]', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

// Function to update base URL (for connecting to different backends)
export const setApiBaseUrl = (url: string) => {
  apiClient.defaults.baseURL = url;
};
