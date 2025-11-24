'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import Layout from '@/components/Layout';
import AdminSystemPanel from '@/components/AdminSystemPanel';

export default function PenggunaPage() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const hasCheckedAuth = useAuthStore((s) => s.hasCheckedAuth);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (hasCheckedAuth && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Only admin, admin_rw, ketua_rt, sekretaris_rt can access this page
    const allowedRoles = ['admin', 'admin_sistem', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris'];
    if (hasCheckedAuth && user && !allowedRoles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [hasCheckedAuth, isAuthenticated, router, user]);

  if (!hasCheckedAuth) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-600">Memuat...</div>
      </Layout>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const allowedRoles = ['admin', 'admin_sistem', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris'];
  if (!allowedRoles.includes(user.role)) {
    return null;
  }

  return (
    <Layout>
      <AdminSystemPanel />
    </Layout>
  );
}

