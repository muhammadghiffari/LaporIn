import axios from 'axios';

// Get API URL from environment variable
const getApiBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // Log untuk debugging (selalu muncul untuk troubleshooting)
  if (typeof window !== 'undefined') {
    console.log('[API Config] NEXT_PUBLIC_API_URL:', apiUrl || 'NOT SET');
    console.log('[API Config] NODE_ENV:', process.env.NODE_ENV);
  }
  
  if (apiUrl) {
    // Remove trailing slash jika ada
    const cleanUrl = apiUrl.replace(/\/$/, '');
    const finalUrl = `${cleanUrl}/api`;
    if (typeof window !== 'undefined') {
      console.log('[API Config] Using API URL:', finalUrl);
    }
    return finalUrl;
  }
  
  // Fallback ke localhost hanya untuk development lokal
  if (typeof window !== 'undefined') {
    console.warn('[API Config] ⚠️ NEXT_PUBLIC_API_URL not set! Using localhost fallback. Set NEXT_PUBLIC_API_URL in Vercel environment variables.');
  }
  
  return 'http://localhost:3001/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (token expired/invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Token invalid atau expired, clear auth state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Import store dan logout (harus dynamic import untuk avoid circular dependency)
      import('@/store/authStore').then(({ default: useAuthStore }) => {
        useAuthStore.getState().logout();
      });
      
      // Redirect ke login jika tidak di halaman login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

