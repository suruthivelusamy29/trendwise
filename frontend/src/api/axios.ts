import axios from 'axios';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://trendwise-nmuc.onrender.com',
  // Don't set default Content-Type - let browser handle it for FormData
});

// Add request interceptor to include token
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage directly to avoid circular dependency
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.error('Authentication failed. Please login again.');
      // Could dispatch logout action here
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
