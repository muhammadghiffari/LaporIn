'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import ReportsList from '@/components/ReportsList';
import CreateReportForm from '@/components/CreateReportForm';
import api from '@/lib/api';
import ChatWidget from '@/components/ChatWidget';
import Layout from '@/components/Layout';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import AdminSystemPanel from '@/components/AdminSystemPanel';
import RTQueuePanel from '@/components/RTQueuePanel';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function DashboardPage() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [statsWarga, setStatsWarga] = useState<any>(null);
  const [reportPeriod, setReportPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [wargaPeriod, setWargaPeriod] = useState<'day' | 'week' | 'month'>('month');
  // Peran yang boleh melihat grafik/statistik
  const allowedRoles = ['pengurus', 'admin', 'sekretaris_rt', 'ketua_rt', 'admin_rw'];
  const isPengurus = allowedRoles.includes(user?.role || '');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Hindari redirect sampai cek auth selesai
  const hasCheckedAuth = useAuthStore((s) => s.hasCheckedAuth);
  useEffect(() => {
    if (hasCheckedAuth && !isAuthenticated) {
      router.push('/login');
    }
  }, [hasCheckedAuth, isAuthenticated, router]);

  // Fetch stats (must be declared before any early return to keep hook order stable)
  useEffect(() => {
    const fetchStats = async () => {
      if (!isPengurus) return;
      setLoadingStats(true);
      try {
        const { data } = await api.get(`/reports/stats?period=${reportPeriod}`);
        setStats(data);
        const wargaRes = await api.get(`/auth/stats/warga?period=${wargaPeriod}`);
        setStatsWarga(wargaRes.data);
      } catch (e) {
        console.error('Error fetching stats:', e);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [isPengurus, reportPeriod, wargaPeriod]);

  if (!hasCheckedAuth) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-600">Memuat...</div>
      </Layout>
    );
  }
  if (!isAuthenticated) return null;

  const dashboardLabel = () => {
    switch (user?.role) {
      case 'admin':
        return 'Dashboard Admin';
      case 'admin_rw':
      case 'ketua_rt':
      case 'sekretaris_rt':
        return 'Dashboard RT/RW';
      case 'pengurus':
        return 'Dashboard Pengurus';
      default:
        return 'Dashboard';
    }
  };

  const kpiCard = (label: string, value: number | string, color = 'bg-white') => (
    <div className={`p-6 rounded-2xl shadow-sm border border-gray-200 ${color} transition-all hover:shadow-md`}>
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );

  const timeSeriesChart = () => {
    const labels = (stats?.timeSeries || []).map((d: any) => d.label);
    const counts = (stats?.timeSeries || []).map((d: any) => Number(d.count));
    const periodLabel = reportPeriod === 'day' ? 'Hari' : reportPeriod === 'week' ? 'Minggu' : 'Bulan';
    
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-gray-900">Tren Laporan</div>
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value as 'day' | 'week' | 'month')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="day">Per Hari</option>
            <option value="week">Per Minggu</option>
            <option value="month">Per Bulan</option>
          </select>
        </div>
        <div style={{ height: '300px' }}>
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: `Jumlah per ${periodLabel}`,
                  data: counts,
                  borderColor: 'rgb(59,130,246)',
                  backgroundColor: 'rgba(59,130,246,0.1)',
                  borderWidth: 3,
                  tension: 0.4,
                  fill: true,
                  pointRadius: 5,
                  pointHoverRadius: 7,
                  pointBackgroundColor: 'rgb(59,130,246)',
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2,
                },
              ],
            }}
            options={{ 
              responsive: true,
              maintainAspectRatio: false,
              plugins: { 
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  padding: 12,
                  titleFont: { size: 14, weight: 'bold' },
                  bodyFont: { size: 13 },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0,0,0,0.05)',
                  },
                  ticks: {
                    stepSize: 1,
                  },
                },
                x: {
                  grid: {
                    display: false,
                  },
                },
              },
            }}
          />
        </div>
      </div>
    );
  };

  const wargaGrowthChart = () => {
    const labels = (statsWarga?.growth || []).map((d: any) => d.label);
    const counts = (statsWarga?.growth || []).map((d: any) => Number(d.count));
    const periodLabel = wargaPeriod === 'day' ? 'Hari' : wargaPeriod === 'week' ? 'Minggu' : 'Bulan';

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-semibold text-gray-900">Pertumbuhan Warga</div>
            <div className="text-sm text-gray-500">Jumlah warga baru per {periodLabel}</div>
          </div>
          <select
            value={wargaPeriod}
            onChange={(e) => setWargaPeriod(e.target.value as 'day' | 'week' | 'month')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="day">30 Hari</option>
            <option value="week">12 Minggu</option>
            <option value="month">12 Bulan</option>
          </select>
        </div>
        <div style={{ height: '300px' }}>
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: `Warga Baru per ${periodLabel}`,
                  data: counts,
                  borderColor: 'rgb(34,197,94)',
                  backgroundColor: 'rgba(34,197,94,0.15)',
                  borderWidth: 3,
                  tension: 0.4,
                  fill: true,
                  pointRadius: 5,
                  pointHoverRadius: 7,
                  pointBackgroundColor: 'rgb(34,197,94)',
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  padding: 12,
                  titleFont: { size: 14, weight: 'bold' },
                  bodyFont: { size: 13 },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0,0,0,0.05)',
                  },
                  ticks: {
                    stepSize: 1,
                  },
                },
                x: {
                  grid: {
                    display: false,
                  },
                },
              },
            }}
          />
        </div>
      </div>
    );
  };

  const barChart = (title: string, items: Array<{ label: string; count: number }>, colors: string[]) => {
    const getStatusLabel = (status: string) => {
      const labels: Record<string, string> = {
        pending: 'Menunggu',
        in_progress: 'Sedang Diproses',
        resolved: 'Selesai',
        cancelled: 'Dibatalkan',
      };
      return labels[status] || status;
    };

    const getCategoryLabel = (cat: string) => {
      const labels: Record<string, string> = {
        infrastruktur: 'Infrastruktur',
        keamanan: 'Keamanan',
        kebersihan: 'Kebersihan',
        sosial: 'Sosial',
        lainnya: 'Lainnya',
        unknown: 'Tidak Diketahui',
      };
      return labels[cat] || cat;
    };

    const getUrgencyLabel = (urg: string) => {
      const labels: Record<string, string> = {
        tinggi: 'Tinggi',
        sedang: 'Sedang',
        rendah: 'Rendah',
        unknown: 'Tidak Diketahui',
      };
      return labels[urg] || urg;
    };

    // Apply label mapping based on title
    const mappedItems = items.map((item) => {
      if (title.includes('Status')) {
        return { ...item, label: getStatusLabel(item.label) };
      } else if (title.includes('Kategori')) {
        return { ...item, label: getCategoryLabel(item.label) };
      } else if (title.includes('Urgensi')) {
        return { ...item, label: getUrgencyLabel(item.label) };
      }
      return item;
    });

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="font-semibold mb-4 text-gray-900">{title}</div>
        <div style={{ height: '250px' }}>
          <Bar
            data={{
              labels: mappedItems.map((i) => i.label),
              datasets: [
                {
                  label: 'Jumlah',
                  data: mappedItems.map((i) => i.count),
                  backgroundColor: colors,
                  borderRadius: 8,
                  borderSkipped: false,
                },
              ],
            }}
            options={{ 
              responsive: true,
              maintainAspectRatio: false,
              plugins: { 
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  padding: 12,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0,0,0,0.05)',
                  },
                  ticks: {
                    stepSize: 1,
                  },
                },
                x: {
                  grid: {
                    display: false,
                  },
                },
              },
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <Layout>
        {/* Role capability banner */}
        <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="text-sm text-gray-600">
            Peran Anda: <span className="font-semibold text-gray-900 capitalize">{user?.role?.replace('_', ' ')}</span>
            </div>
          <div className="text-xs text-gray-500 mt-1">
            {user?.role === 'admin'
              ? 'Anda dapat mengelola sistem dan memonitor seluruh laporan.'
              : ['admin_rw', 'ketua_rt', 'sekretaris_rt'].includes(user?.role || '')
              ? 'Anda dapat memantau laporan di wilayah RT/RW dan memastikan tindak lanjut.'
              : isPengurus
              ? 'Anda dapat memantau statistik, melihat semua laporan sesuai kewenangan, dan mengelola tindak lanjut.'
              : 'Anda dapat membuat laporan baru dan memantau progres laporan Anda.'}
          </div>
        </div>
        {isPengurus ? (
          <div className="space-y-8 animate-fade-in">
            <h2 className="text-2xl font-bold">{dashboardLabel()}</h2>
            {/* Role-specific panels */}
            {user?.role === 'admin' ? <AdminSystemPanel /> : <RTQueuePanel />}
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {kpiCard('Total Laporan', stats?.totals?.total_reports ?? 0)}
              {kpiCard('Selesai', stats?.totals?.resolved_reports ?? 0)}
              {kpiCard('Sedang Diproses', stats?.totals?.in_progress_reports ?? 0)}
              {kpiCard('Menunggu', stats?.totals?.pending_reports ?? 0)}
              {kpiCard('Total Warga', statsWarga?.total_warga ?? 0)}
            </div>

            {/* Charts */}
            {loadingStats ? (
              <div className="flex items-center justify-center h-64 text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Memuat statistik...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Time series charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {timeSeriesChart()}
                  {wargaGrowthChart()}
                </div>
                {/* Bar charts for distributions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {barChart(
                    'Distribusi Status',
                    (stats?.byStatus || []).map((s: any) => ({ label: s.status, count: Number(s.count) })),
                    ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#94a3b8']
                  )}
                  {barChart(
                    'Distribusi Kategori',
                    (stats?.byCategory || []).map((s: any) => ({ label: s.category, count: Number(s.count) })),
                    ['#818cf8', '#22d3ee', '#fb7185', '#a3e635', '#fbbf24', '#cbd5e1']
                  )}
                  {barChart(
                    'Distribusi Urgensi',
                    (stats?.byUrgency || []).map((s: any) => ({ label: s.urgency, count: Number(s.count) })),
                    ['#ef4444', '#f59e0b', '#9ca3af', '#34d399']
                  )}
                </div>
                {/* Gender distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {barChart(
                    'Distribusi Gender Warga',
                    [
                      { label: 'Laki-laki', count: Number(statsWarga?.by_gender?.find((g: any) => g.jenis_kelamin === 'laki_laki')?.count || 0) },
                      { label: 'Perempuan', count: Number(statsWarga?.by_gender?.find((g: any) => g.jenis_kelamin === 'perempuan')?.count || 0) },
                    ],
                    ['#60a5fa', '#fb7185']
                  )}
                </div>
              </>
            )}

            {/* Link ke halaman laporan lengkap */}
            <div className="animate-fade-in-slow mt-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Lihat Semua Laporan</h3>
                <p className="text-gray-600 mb-4">Akses halaman lengkap untuk melihat dan mengelola semua laporan</p>
                <a
                  href="/laporan"
                  className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-md hover:shadow-lg"
                >
                  Buka Halaman Laporan →
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Laporan Saya</h2>
                <span className="text-sm text-gray-500">Pantau progres dan status laporan Anda</span>
              </div>
              <ReportsList />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Buat Laporan Baru</h2>
              <CreateReportForm />
            </div>
          </div>
        )}
      <ChatWidget />
    </Layout>
  );
}

