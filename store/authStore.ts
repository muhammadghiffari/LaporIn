import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  rt_rw?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasCheckedAuth?: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    rt_rw?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  hasCheckedAuth: false,

  login: async (email: string, password: string) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      set({ user: data.user, token: data.token, isAuthenticated: true });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  },

  register: async (userData) => {
    try {
      const { data } = await api.post('/auth/register', userData);
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      set({ user: data.user, token: data.token, isAuthenticated: true });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' };
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    set({ user: null, token: null, isAuthenticated: false, hasCheckedAuth: true });
  },

  checkAuth: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const userJson = localStorage.getItem('user');
      const parsedUser = userJson ? (JSON.parse(userJson) as User) : null;
      if (token) {
        set({ token, user: parsedUser, isAuthenticated: true, hasCheckedAuth: true });
      } else {
        set({ hasCheckedAuth: true });
      }
    }
  },
}));

export default useAuthStore;

