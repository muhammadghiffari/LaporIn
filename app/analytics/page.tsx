'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
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
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  TrendingUp,
  FileText,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsPage() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [statsWarga, setStatsWarga] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportPeriod, setReportPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [wargaPeriod, setWargaPeriod] = useState<'day' | 'week' | 'month'>('day');

  const allowedRoles = ['admin', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'pengurus'];
  const isPengurus = allowedRoles.includes(user?.role || '');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const hasCheckedAuth = useAuthStore.getState().hasCheckedAuth;
    if (hasCheckedAuth && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (hasCheckedAuth && user && !isPengurus) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router, user, isPengurus]);

  useEffect(() => {
    if (isPengurus) {
      fetchStats();
    }
  }, [isPengurus, reportPeriod, wargaPeriod]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reports/stats?period=${reportPeriod}`);
      setStats(data);
      const wargaRes = await api.get(`/auth/stats/warga?period=${wargaPeriod}`);
      setStatsWarga(wargaRes.data);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!isPengurus) {
    return null;
  }

  const kpiCard = (label: string, value: number | string, icon: React.ReactNode, color: string, trend?: string) => (
    <div className={`p-6 rounded-2xl shadow-sm border border-gray-200 bg-white transition-all hover:shadow-md ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-gray-400">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {trend && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </span>
        )}
      </div>
    </div>
  );

  const timeSeriesChart = (title: string, data: any[], period: string) => {
    const labels = data.map((d: any) => d.label);
    const counts = data.map((d: any) => Number(d.count));
    
    const periodLabel = period === 'day' ? 'Hari' : period === 'week' ? 'Minggu' : 'Bulan';
    
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-gray-900">{title}</div>
          <select
            value={period}
            onChange={(e) => {
              if (title.includes('Laporan')) {
                setReportPeriod(e.target.value as 'day' | 'week' | 'month');
              } else {
                setWargaPeriod(e.target.value as 'day' | 'week' | 'month');
              }
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="day">Per Hari</option>
            <option value="week">Per Minggu</option>
            <option value="month">Per Bulan</option>
          </select>
        </div>
        <div className="flex-1 min-h-0">
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
                  displayColors: false,
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
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col">
        <div className="font-semibold mb-4 text-gray-900">{title}</div>
        <div className="flex-1 min-h-0">
          <Bar
            data={{
              labels: items.map((i) => i.label),
              datasets: [
                {
                  label: 'Jumlah',
                  data: items.map((i) => i.count),
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Statistik</h1>
          <p className="text-gray-600 mt-1">Analisis data laporan dan warga secara real-time</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Memuat data...</span>
            </div>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {kpiCard('Total Laporan', stats?.totals?.total_reports ?? 0, <FileText className="w-5 h-5" />, '')}
              {kpiCard('Selesai', stats?.totals?.resolved_reports ?? 0, <CheckCircle className="w-5 h-5" />, '')}
              {kpiCard('Sedang Diproses', stats?.totals?.in_progress_reports ?? 0, <Clock className="w-5 h-5" />, '')}
              {kpiCard('Menunggu', stats?.totals?.pending_reports ?? 0, <AlertCircle className="w-5 h-5" />, '')}
              {kpiCard('Dibatalkan', stats?.totals?.cancelled_reports ?? 0, <XCircle className="w-5 h-5" />, '')}
            </div>

            {/* Total Warga KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {kpiCard('Total Warga', statsWarga?.total_warga ?? 0, <Users className="w-5 h-5" />, '')}
              {kpiCard(
                'Laki-laki', 
                `${statsWarga?.persentase?.laki_laki ?? 0}%`, 
                <Users className="w-5 h-5" />, 
                ''
              )}
              {kpiCard(
                'Perempuan', 
                `${statsWarga?.persentase?.perempuan ?? 0}%`, 
                <Users className="w-5 h-5" />, 
                ''
              )}
            </div>

            {/* Time Series Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[400px]">
                {timeSeriesChart('Tren Laporan', stats?.timeSeries || [], reportPeriod)}
              </div>
              <div className="h-[400px]">
                {timeSeriesChart('Pertumbuhan Warga', statsWarga?.growth || [], wargaPeriod)}
              </div>
            </div>

            {/* Bar Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-[320px]">
                {barChart(
                  'Distribusi Status',
                  (stats?.byStatus || []).map((s: any) => ({ 
                    label: getStatusLabel(s.status), 
                    count: Number(s.count) 
                  })),
                  ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#94a3b8']
                )}
              </div>
              <div className="h-[320px]">
                {barChart(
                  'Distribusi Kategori',
                  (stats?.byCategory || []).map((s: any) => ({ 
                    label: getCategoryLabel(s.category), 
                    count: Number(s.count) 
                  })),
                  ['#818cf8', '#22d3ee', '#fb7185', '#a3e635', '#fbbf24', '#cbd5e1']
                )}
              </div>
              <div className="h-[320px]">
                {barChart(
                  'Distribusi Urgensi',
                  (stats?.byUrgency || []).map((s: any) => ({ 
                    label: getUrgencyLabel(s.urgency), 
                    count: Number(s.count) 
                  })),
                  ['#ef4444', '#f59e0b', '#9ca3af', '#34d399']
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
