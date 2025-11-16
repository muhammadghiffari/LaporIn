'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import Layout from '@/components/Layout';
import AdminSystemPanel from '@/components/AdminSystemPanel';

export default function PenggunaPage() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const hasCheckedAuth = useAuthStore.getState().hasCheckedAuth;
    if (hasCheckedAuth && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Only admin can access this page
    if (hasCheckedAuth && user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router, user]);

  if (!isAuthenticated || !user) {
    return null;
  }

  if (user.role !== 'admin') {
    return null;
  }

  return (
    <Layout>
      <AdminSystemPanel />
    </Layout>
  );
}

