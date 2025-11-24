import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  hasCheckedAuth: boolean;
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

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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
          set({ 
            user: data.user, 
            token: data.token, 
            isAuthenticated: true, 
            hasCheckedAuth: true 
          });
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
          set({ 
            user: data.user, 
            token: data.token, 
            isAuthenticated: true, 
            hasCheckedAuth: true 
          });
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
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false, 
          hasCheckedAuth: true 
        });
      },

      checkAuth: () => {
        // Jika sudah check, skip
        if (get().hasCheckedAuth) {
          return;
        }

        if (typeof window === 'undefined') {
          set({ hasCheckedAuth: true });
          return;
        }

        const token = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');
        
        if (!token || !userJson) {
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false, 
            hasCheckedAuth: true 
          });
          return;
        }

        try {
          // Parse user dari localStorage
          const parsedUser = JSON.parse(userJson) as User;
          
          // Set state dari localStorage (untuk immediate UI update)
          // Token akan divalidate oleh response interceptor jika invalid
          set({ 
            token, 
            user: parsedUser, 
            isAuthenticated: true, 
            hasCheckedAuth: true 
          });
        } catch (error) {
          // Error parsing user JSON
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false, 
            hasCheckedAuth: true 
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        // Jangan persist hasCheckedAuth, harus di-check setiap kali
      }),
    }
  )
);

export default useAuthStore;

