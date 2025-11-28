'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import useAuthStore from '@/store/authStore';
import ReportsList from '@/components/ReportsList';
import CreateReportForm from '@/components/CreateReportForm';
import api from '@/lib/api';
import Layout from '@/components/Layout';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
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
import RTQueuePanel from '@/components/RTQueuePanel';
import RealtimeFeed from '@/components/RealtimeFeed';
import UserVerificationPanel from '@/components/UserVerificationPanel';
import { BarChart3, Building2, Users, Info } from 'lucide-react';

// Lazy load ChatWidget untuk reduce initial bundle size
const ChatWidget = dynamic(() => import('@/components/ChatWidget'), {
  ssr: false,
  loading: () => (
    <div className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 rounded-full shadow-lg flex items-center justify-center animate-pulse">
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    </div>
  ),
});

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
  const [statsWargaPersonal, setStatsWargaPersonal] = useState<any>(null); // Statistik laporan warga sendiri
  const [reportPeriod, setReportPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [wargaPeriod, setWargaPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [rtFilter, setRtFilter] = useState<string>(''); // Filter RT untuk Admin RW
  const [rwFilter, setRwFilter] = useState<string>(''); // Filter RW untuk Super Admin
  const [rtList, setRtList] = useState<Array<{rt: string, rtRw: string, label: string}>>([]); // Daftar RT dalam RW
  const [rwList, setRwList] = useState<Array<{rw: string, label: string}>>([]); // Daftar RW untuk Super Admin
  const [rtStats, setRtStats] = useState<any>(null); // Statistik per RT untuk RW Admin
  const [rwSummary, setRwSummary] = useState<any>(null); // Ringkasan RW untuk Super Admin
  const [rwListSummary, setRwListSummary] = useState<any>(null); // Ringkasan semua RW untuk Super Admin
  const [mounted, setMounted] = useState(false);
  const { toasts, error: showError, removeToast } = useToast();
  
  // Peran yang boleh melihat grafik/statistik - Memoize untuk prevent recalculation
  const allowedRoles = useMemo(() => ['pengurus', 'admin', 'sekretaris_rt', 'sekretaris', 'ketua_rt', 'admin_rw'], []);
  const isPengurus = useMemo(() => allowedRoles.includes(user?.role || ''), [allowedRoles, user?.role]);
  const isWarga = useMemo(() => user?.role === 'warga', [user?.role]);
  const isSuperAdmin = useMemo(() => user?.role === 'admin' || user?.role === 'admin_sistem', [user?.role]);
  const isAdminRW = useMemo(() => user?.role === 'admin_rw', [user?.role]);
  const isSekretaris = useMemo(() => user?.role === 'sekretaris_rt' || user?.role === 'sekretaris', [user?.role]);
  const isKetuaRT = useMemo(() => user?.role === 'ketua_rt', [user?.role]);

  // Set mounted setelah component mount di client
  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  // Hindari redirect sampai cek auth selesai
  const hasCheckedAuth = useAuthStore((s) => s.hasCheckedAuth);
  useEffect(() => {
    if (mounted && hasCheckedAuth && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, hasCheckedAuth, isAuthenticated, router]);

  // Fetch RW list untuk Super Admin (TANPA set default filter - default semua RW)
  useEffect(() => {
    if (!mounted || !isSuperAdmin) return;
    
    const fetchRwList = async () => {
      try {
        const { data } = await api.get('/reports/stats/rw-list');
        setRwList(data.rwList || []);
        // Simpan ringkasan semua RW (total RW, total RT, dll)
        setRwListSummary({
          totalRW: data.totalRW || 0,
          totalRT: data.totalRT || 0,
          rwList: data.rwList || []
        });
        // TIDAK set default RW filter - superadmin default melihat semua RW
      } catch (e: any) {
        console.error('Error fetching RW list:', e);
      }
    };
    fetchRwList();
  }, [mounted, isSuperAdmin]);

  // Fetch RT list untuk Admin RW atau Super Admin (jika RW dipilih)
  useEffect(() => {
    if (!mounted) return;
    
    const fetchRtList = async () => {
      try {
        if (isAdminRW) {
          const { data } = await api.get('/reports/stats/rt-list');
          setRtList(data.rtList || []);
        } else if (isSuperAdmin && rwFilter) {
          const { data } = await api.get(`/reports/stats/rt-list?rwFilter=${rwFilter}`);
          setRtList(data.rtList || []);
        } else {
          setRtList([]);
        }
      } catch (e: any) {
        console.error('Error fetching RT list:', e);
      }
    };
    fetchRtList();
  }, [mounted, isAdminRW, isSuperAdmin, rwFilter]);

  // Fetch statistik per RT untuk RW Admin
  useEffect(() => {
    if (!mounted || !isAdminRW) return;
    
    const fetchRtStats = async () => {
      try {
        const { data } = await api.get('/reports/stats/by-rt');
        setRtStats(data);
      } catch (e: any) {
        console.error('Error fetching RT stats:', e);
      }
    };
    fetchRtStats();
  }, [mounted, isAdminRW]);

  // Fetch ringkasan RW untuk Super Admin (default RW 1)
  useEffect(() => {
    if (!mounted || !isSuperAdmin || !rwFilter) return;
    
    const fetchRwSummary = async () => {
      try {
        const { data } = await api.get(`/reports/stats/rw-summary?rwFilter=${rwFilter}`);
        setRwSummary(data);
      } catch (e: any) {
        console.error('Error fetching RW summary:', e);
      }
    };
    fetchRwSummary();
  }, [mounted, isSuperAdmin, rwFilter]);

  // Fetch stats (must be declared before any early return to keep hook order stable)
  useEffect(() => {
    if (!mounted) return;
    
    const fetchStats = async () => {
      if (isPengurus) {
      setLoadingStats(true);
      try {
          let statsUrl = `/reports/stats?period=${reportPeriod}`;
          if (isSuperAdmin) {
            if (rtFilter && rwFilter) {
              statsUrl += `&rtFilter=${rtFilter}&rwFilter=${rwFilter}`;
            } else if (rwFilter) {
              statsUrl += `&rwFilter=${rwFilter}`;
            }
          } else if (isAdminRW && rtFilter) {
            statsUrl += `&rtFilter=${rtFilter}`;
          }
          const { data } = await api.get(statsUrl);
        setStats(data);
          
          let wargaUrl = `/auth/stats/warga?period=${wargaPeriod}`;
          if (isSuperAdmin) {
            if (rtFilter && rwFilter) {
              wargaUrl += `&rtFilter=${rtFilter}&rwFilter=${rwFilter}`;
            } else if (rwFilter) {
              wargaUrl += `&rwFilter=${rwFilter}`;
            }
          } else if (isAdminRW && rtFilter) {
            wargaUrl += `&rtFilter=${rtFilter}`;
          }
          const wargaRes = await api.get(wargaUrl);
        setStatsWarga(wargaRes.data);
        } catch (e: any) {
        console.error('Error fetching stats:', e);
          if (e.response?.status === 401) {
            showError('Sesi Anda telah berakhir. Silakan login kembali.');
          } else if (e.code === 'ECONNABORTED' || e.message === 'Network Error') {
            showError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
          }
        } finally {
          setLoadingStats(false);
        }
      } else if (isWarga) {
        // Fetch statistik laporan warga sendiri
        setLoadingStats(true);
        try {
          const { data } = await api.get('/reports/stats/warga');
          setStatsWargaPersonal(data);
        } catch (e: any) {
          console.error('Error fetching warga personal stats:', e);
          if (e.response?.status === 401) {
            showError('Sesi Anda telah berakhir. Silakan login kembali.');
          } else if (e.code === 'ECONNABORTED' || e.message === 'Network Error') {
            showError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
          }
      } finally {
        setLoadingStats(false);
        }
      }
    };
    fetchStats();
  }, [mounted, isPengurus, isWarga, reportPeriod, wargaPeriod, rtFilter, rwFilter, isSuperAdmin, isAdminRW]);

  // Prevent hydration mismatch: return consistent content during SSR
  if (!mounted || !hasCheckedAuth) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-600" suppressHydrationWarning>Memuat...</div>
      </Layout>
    );
  }
  
  if (!isAuthenticated) return null;

  // Helper function untuk extract RT/RW number dari rtRw string
  const getRtRwLabel = () => {
    if (!user?.rt_rw) return '';
    
    const parts = user.rt_rw.split('/');
    const rtPart = parts[0] || ''; // e.g., "RT001"
    const rwPart = parts[1] || ''; // e.g., "RW005"
    
    // Extract number dari RT (RT001 -> 001 -> 1)
    const rtNumber = rtPart.replace(/RT/i, '').replace(/^0+/, '') || '0';
    // Extract number dari RW (RW005 -> 005 -> 5)
    const rwNumber = rwPart.replace(/RW/i, '').replace(/^0+/, '') || '0';
    
    if (isKetuaRT || isSekretaris) {
      return `RT ${rtNumber}`;
    } else if (isAdminRW) {
      return `RW ${rwNumber}`;
    }
    
    return user.rt_rw;
  };

  const dashboardLabel = () => {
    switch (user?.role) {
      case 'admin':
        return 'Dashboard Admin';
      case 'admin_rw':
        return `Dashboard ${getRtRwLabel()}`;
      case 'ketua_rt':
      case 'sekretaris_rt':
      case 'sekretaris':
        return `Dashboard ${getRtRwLabel()}`;
      case 'pengurus':
        return 'Dashboard Pengurus';
      default:
        return 'Dashboard';
    }
  };

  const kpiCard = (label: string, value: number | string, color = 'bg-white') => (
    <div className={`p-6 rounded-2xl shadow-sm border border-gray-200 ${color} transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between min-h-[120px]`}>
      <div className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-3">{label}</div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );

  const timeSeriesChart = () => {
    const labels = (stats?.timeSeries || []).map((d: any) => d.label);
    const counts = (stats?.timeSeries || []).map((d: any) => Number(d.count));
    const periodLabel = reportPeriod === 'day' ? 'Hari' : reportPeriod === 'week' ? 'Minggu' : 'Bulan';
    const primaryColor = 'rgb(59,130,246)';
    const gradientStart = 'rgba(59,130,246,0.2)';
    const gradientEnd = 'rgba(59,130,246,0.02)';
    
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-bold text-lg text-gray-900 mb-1">Tren Laporan</div>
            <div className="text-sm text-gray-500">Data per {periodLabel.toLowerCase()}</div>
          </div>
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value as 'day' | 'week' | 'month')}
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-gray-400 transition-colors font-medium shadow-sm"
          >
            <option value="day">Per Hari</option>
            <option value="week">Per Minggu</option>
            <option value="month">Per Bulan</option>
          </select>
        </div>
        <div style={{ height: '350px' }}>
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: `Jumlah per ${periodLabel}`,
                  data: counts,
                  borderColor: primaryColor,
                  backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, gradientStart);
                    gradient.addColorStop(1, gradientEnd);
                    return gradient;
                  },
                  borderWidth: 3,
                  tension: 0.5,
                  fill: true,
                  pointRadius: 6,
                  pointHoverRadius: 9,
                  pointBackgroundColor: primaryColor,
                  pointBorderColor: '#fff',
                  pointBorderWidth: 3,
                  pointHoverBackgroundColor: '#fff',
                  pointHoverBorderColor: primaryColor,
                  pointHoverBorderWidth: 3,
                },
              ],
            }}
            options={{ 
              responsive: true,
              maintainAspectRatio: false,
              animation: {
                duration: 1500,
                easing: 'easeInOutQuart' as any,
              },
              plugins: { 
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(15,23,42,0.95)',
                  padding: 16,
                  titleFont: { size: 15, weight: 'bold', family: 'system-ui' },
                  bodyFont: { size: 14, weight: 'normal' as any, family: 'system-ui' },
                  displayColors: true,
                  borderColor: primaryColor,
                  borderWidth: 2,
                  cornerRadius: 12,
                  titleColor: '#fff',
                  bodyColor: '#e2e8f0',
                  callbacks: {
                    label: (context: any) => {
                      const count = context.parsed.y;
                      return `${count} laporan`;
                    },
                    title: (context: any) => {
                      const label = context[0].label;
                      // Format label agar lebih jelas
                      if (reportPeriod === 'day') {
                        return `Tanggal: ${label}`;
                      } else if (reportPeriod === 'week') {
                        return `Minggu: ${label}`;
                      } else {
                        return `Bulan: ${label}`;
                      }
                    },
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0,0,0,0.06)',
                    lineWidth: 1,
                  },
                  ticks: {
                    stepSize: Math.max(1, Math.ceil((Math.max(...counts) || 1) / 8)),
                    font: {
                      size: 12,
                      family: 'system-ui',
                    },
                    color: '#64748b',
                    padding: 10,
                  },
                },
                x: {
                  grid: {
                    display: false,
                  },
                  ticks: {
                    font: {
                      size: 12,
                      family: 'system-ui',
                    },
                    color: '#64748b',
                    padding: 10,
                  },
                },
              },
              interaction: {
                intersect: false,
                mode: 'index' as any,
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
    const primaryColor = 'rgb(34,197,94)';
    const gradientStart = 'rgba(34,197,94,0.2)';
    const gradientEnd = 'rgba(34,197,94,0.02)';

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-bold text-lg text-gray-900 mb-1">Pertumbuhan Warga</div>
            <div className="text-sm text-gray-500">Jumlah warga baru per {periodLabel.toLowerCase()}</div>
          </div>
          <select
            value={wargaPeriod}
            onChange={(e) => setWargaPeriod(e.target.value as 'day' | 'week' | 'month')}
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white hover:border-gray-400 transition-colors font-medium shadow-sm"
          >
            <option value="day">30 Hari</option>
            <option value="week">12 Minggu</option>
            <option value="month">12 Bulan</option>
          </select>
        </div>
        <div style={{ height: '350px' }}>
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: `Warga Baru per ${periodLabel}`,
                  data: counts,
                  borderColor: primaryColor,
                  backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, gradientStart);
                    gradient.addColorStop(1, gradientEnd);
                    return gradient;
                  },
                  borderWidth: 3,
                  tension: 0.5,
                  fill: true,
                  pointRadius: 6,
                  pointHoverRadius: 9,
                  pointBackgroundColor: primaryColor,
                  pointBorderColor: '#fff',
                  pointBorderWidth: 3,
                  pointHoverBackgroundColor: '#fff',
                  pointHoverBorderColor: primaryColor,
                  pointHoverBorderWidth: 3,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: {
                duration: 1500,
                easing: 'easeInOutQuart' as any,
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(15,23,42,0.95)',
                  padding: 16,
                  titleFont: { size: 15, weight: 'bold', family: 'system-ui' },
                  bodyFont: { size: 14, weight: 'normal' as any, family: 'system-ui' },
                  displayColors: true,
                  borderColor: primaryColor,
                  borderWidth: 2,
                  cornerRadius: 12,
                  titleColor: '#fff',
                  bodyColor: '#e2e8f0',
                  callbacks: {
                    label: (context: any) => {
                      const count = context.parsed.y;
                      return `${count} warga baru`;
                    },
                    title: (context: any) => {
                      const label = context[0].label;
                      // Format label agar lebih jelas
                      if (wargaPeriod === 'day') {
                        return `Tanggal: ${label}`;
                      } else if (wargaPeriod === 'week') {
                        return `Minggu: ${label}`;
                      } else {
                        return `Bulan: ${label}`;
                      }
                    },
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0,0,0,0.06)',
                    lineWidth: 1,
                  },
                  ticks: {
                    stepSize: Math.max(1, Math.ceil((Math.max(...counts) || 1) / 8)),
                    font: {
                      size: 12,
                      family: 'system-ui',
                    },
                    color: '#64748b',
                    padding: 10,
                  },
                },
                x: {
                  grid: {
                    display: false,
                  },
                  ticks: {
                    font: {
                      size: 12,
                      family: 'system-ui',
                    },
                    color: '#64748b',
                    padding: 10,
                  },
                },
              },
              interaction: {
                intersect: false,
                mode: 'index' as any,
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
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
        <div className="font-bold text-lg mb-6 text-gray-900">{title}</div>
        <div style={{ height: '300px' }}>
          <Bar
            data={{
              labels: mappedItems.map((i) => i.label),
              datasets: [
                {
                  label: 'Jumlah',
                  data: mappedItems.map((i) => i.count),
                  backgroundColor: colors,
                  borderRadius: {
                    topLeft: 12,
                    topRight: 12,
                    bottomLeft: 0,
                    bottomRight: 0,
                  },
                  borderSkipped: false,
                  borderWidth: 0,
                  maxBarThickness: 60,
                },
              ],
            }}
            options={{ 
              responsive: true,
              maintainAspectRatio: false,
              animation: {
                duration: 1200,
                easing: 'easeInOutQuart' as any,
              },
              plugins: { 
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(15,23,42,0.95)',
                  padding: 16,
                  titleFont: { size: 15, weight: 'bold', family: 'system-ui' },
                  bodyFont: { size: 14, weight: 'normal' as any, family: 'system-ui' },
                  displayColors: true,
                  borderColor: colors[0],
                  borderWidth: 2,
                  cornerRadius: 12,
                  titleColor: '#fff',
                  bodyColor: '#e2e8f0',
                  callbacks: {
                    label: (context: any) => {
                      return `${context.parsed.y} item`;
                    },
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0,0,0,0.06)',
                    lineWidth: 1,
                  },
                  ticks: {
                    stepSize: Math.max(1, Math.ceil((Math.max(...mappedItems.map(i => i.count)) || 1) / 8)),
                    font: {
                      size: 12,
                      family: 'system-ui',
                    },
                    color: '#64748b',
                    padding: 10,
                  },
                },
                x: {
                  grid: {
                    display: false,
                  },
                  ticks: {
                    font: {
                      size: 12,
                      family: 'system-ui',
                      weight: 'normal' as any,
                    },
                    color: '#64748b',
                    padding: 10,
                  },
                },
              },
              interaction: {
                intersect: false,
                mode: 'index' as any,
              },
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
        {isPengurus ? (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{dashboardLabel()}</h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  {isSuperAdmin && rwList.length > 0 && (
                    <select
                      value={rwFilter}
                      onChange={(e) => {
                        setRwFilter(e.target.value);
                        setRtFilter(''); // Reset RT filter saat RW berubah
                      }}
                      className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white hover:border-gray-400 transition-colors font-medium shadow-sm"
                    >
                      <option value="">Semua RW</option>
                      {rwList.map((rw) => (
                        <option key={rw.rw} value={rw.rw}>
                          {rw.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {isSuperAdmin && rwFilter && rtList.length > 0 && (
                    <select
                      value={rtFilter}
                      onChange={(e) => setRtFilter(e.target.value)}
                      className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white hover:border-gray-400 transition-colors font-medium shadow-sm"
                    >
                      <option value="">Semua RT</option>
                      {rtList.map((rt) => (
                        <option key={rt.rt} value={rt.rt}>
                          {rt.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {isAdminRW && rtList.length > 0 && (
                    <select
                      value={rtFilter}
                      onChange={(e) => setRtFilter(e.target.value)}
                      className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-gray-400 transition-colors font-medium shadow-sm"
                    >
                      <option value="">Semua RT</option>
                      {rtList.map((rt) => (
                        <option key={rt.rt} value={rt.rt}>
                          {rt.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {isSuperAdmin && (
                    <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                      Super Admin
                    </span>
                  )}
                  {isAdminRW && (
                    <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                      Admin {getRtRwLabel()}
                    </span>
                  )}
                  {isKetuaRT && (
                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                      Ketua {getRtRwLabel()}
                    </span>
                  )}
                  {isSekretaris && (
                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                      Sekretaris {getRtRwLabel()}
                    </span>
                  )}
                </div>
                <RealtimeFeed />
              </div>
              </div>
              {isSuperAdmin && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-purple-700">
                    Menampilkan statistik untuk{' '}
                    {rtFilter && rwFilter ? (
                      <strong>{rtList.find(rt => rt.rt === rtFilter)?.label || `${rtFilter}/${rwFilter}`}</strong>
                    ) : rwFilter ? (
                      <strong>RW {rwFilter}</strong>
                    ) : (
                      <strong>Semua RW (Akumulasi)</strong>
                    )}
                  </p>
                </div>
              )}
              {isAdminRW && rtFilter && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    Menampilkan statistik untuk <strong>{rtList.find(rt => rt.rt === rtFilter)?.label || rtFilter}</strong>
                  </p>
                </div>
              )}
              {isKetuaRT && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-700">
                    Menampilkan statistik untuk <strong>{getRtRwLabel()}</strong> (data dari {getRtRwLabel()} yang Anda naungi)
                  </p>
                </div>
              )}
              {isSekretaris && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-700">
                    Menampilkan statistik untuk <strong>{getRtRwLabel()}</strong> (data dari {getRtRwLabel()} yang Anda naungi)
                  </p>
                </div>
              )}
            {/* Role-specific panels */}
              {isSuperAdmin ? (
                <div className="space-y-4">
                  {/* Ringkasan RW untuk Super Admin */}
                  {rwSummary && rwFilter && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-purple-900">Ringkasan {rwFilter}</h3>
                        <Building2 className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-600 mb-1">Total RT</div>
                          <div className="text-2xl font-bold text-purple-700">{rwSummary.totalRT || 0}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-600 mb-1">Total Warga</div>
                          <div className="text-2xl font-bold text-blue-700">{rwSummary.totalWarga || 0}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-600 mb-1">Total Laporan</div>
                          <div className="text-2xl font-bold text-green-700">{rwSummary.totalReports || 0}</div>
                        </div>
                        {rwSummary.rtTerbesar && (
                          <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="text-sm text-gray-600 mb-1">RT Terbesar</div>
                            <div className="text-lg font-bold text-orange-700">{rwSummary.rtTerbesar.rt}</div>
                            <div className="text-xs text-gray-500">{rwSummary.rtTerbesar.wargaCount} warga</div>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-purple-200 grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Pending</div>
                          <div className="text-lg font-semibold text-amber-600">{rwSummary.pendingReports || 0}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Diproses</div>
                          <div className="text-lg font-semibold text-blue-600">{rwSummary.inProgressReports || 0}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Selesai</div>
                          <div className="text-lg font-semibold text-green-600">{rwSummary.resolvedReports || 0}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-purple-900 mb-2">Overview Sistem</h3>
                      <p className="text-sm text-purple-700 mb-2">
                        {rwFilter ? `Menampilkan data dari ${rwFilter}. ` : 'Anda melihat data dari semua RT/RW dalam sistem. '}
                        Gunakan filter di atas untuk melihat statistik per RW atau per RT.
                      </p>
                      {!rwFilter && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <p className="text-xs text-purple-600 font-medium mb-1">Best Practice Filter:</p>
                          <ul className="text-xs text-purple-600 space-y-1 list-disc list-inside">
                            <li>Pilih <strong>RW</strong> terlebih dahulu untuk melihat statistik semua RT dalam RW tersebut</li>
                            <li>Setelah memilih RW, pilih <strong>RT</strong> untuk melihat statistik spesifik RT tersebut</li>
                            <li>Biarkan kosong untuk melihat statistik semua RW/RT dalam sistem</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {isAdminRW && (
                    <>
                      {/* Statistik per RT untuk RW Admin */}
                      {rtStats && rtStats.rtStats && rtStats.rtStats.length > 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-6 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-blue-900">Statistik per RT dalam {getRtRwLabel()}</h3>
                            <Users className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {rtStats.rtStats.map((rt: any) => (
                              <div key={rt.rt} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-bold text-lg text-blue-900">{rt.label}</h4>
                                  <Building2 className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Warga:</span>
                                    <span className="font-semibold text-gray-900">{rt.wargaCount || 0}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total Laporan:</span>
                                    <span className="font-semibold text-gray-900">{rt.totalReports || 0}</span>
                                  </div>
                                  <div className="pt-2 border-t border-gray-200 grid grid-cols-3 gap-2 text-xs">
                                    <div className="text-center">
                                      <div className="text-amber-600 font-semibold">{rt.pendingReports || 0}</div>
                                      <div className="text-gray-500">Pending</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-blue-600 font-semibold">{rt.inProgressReports || 0}</div>
                                      <div className="text-gray-500">Proses</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-green-600 font-semibold">{rt.resolvedReports || 0}</div>
                                      <div className="text-gray-500">Selesai</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start gap-3">
                        <Building2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-semibold text-blue-900 mb-2">Data {getRtRwLabel()} Anda</h3>
                          <p className="text-sm text-blue-700">
                            Statistik dan laporan dari semua RT dalam {getRtRwLabel()} Anda. Gunakan dropdown di atas untuk melihat statistik per RT.
                          </p>
                          {rtStats && rtStats.rtStats && (
                            <p className="text-xs text-blue-600 mt-2">
                              Total RT yang dinaungi: <strong>{rtStats.rtStats.length}</strong>
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  {isKetuaRT && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-start gap-3">
                      <Users className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-green-900 mb-2">Data {getRtRwLabel()} Anda</h3>
                        <p className="text-sm text-green-700">
                          Statistik dan laporan dari {getRtRwLabel()} yang Anda naungi. Anda hanya menaungi satu RT, jadi tidak ada filter dropdown.
                        </p>
                      </div>
                    </div>
                  )}
                  {isSekretaris && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-start gap-3">
                      <Users className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-green-900 mb-2">Data {getRtRwLabel()} Anda</h3>
                        <p className="text-sm text-green-700">
                          Peran Sekretaris membantu Ketua RT menjalankan tugas administrasi dan memastikan tindak lanjut laporan berjalan tertib.
                        </p>
                      </div>
                    </div>
                  )}
                  <RTQueuePanel />
                  {/* User Verification Panel untuk Admin RT/RW */}
                  {(isAdminRW || isKetuaRT || isSekretaris) && (
                    <UserVerificationPanel />
                  )}
                </div>
              )}
            {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {timeSeriesChart()}
                  {wargaGrowthChart()}
                </div>
                {/* Bar charts for distributions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
            </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Statistik Laporan Warga Sendiri */}
            {isWarga && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">Statistik Laporan Saya</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {loadingStats ? (
                    <div className="col-span-full flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <>
                      {kpiCard('Total Laporan', statsWargaPersonal?.totals?.total_reports ?? 0)}
                      {kpiCard('Menunggu', statsWargaPersonal?.totals?.pending_reports ?? 0)}
                      {kpiCard('Diproses', statsWargaPersonal?.totals?.in_progress_reports ?? 0)}
                      {kpiCard('Selesai', statsWargaPersonal?.totals?.resolved_reports ?? 0)}
                      {kpiCard('Ditolak', statsWargaPersonal?.totals?.rejected_reports ?? 0)}
                      {kpiCard('Dibatalkan', statsWargaPersonal?.totals?.cancelled_reports ?? 0)}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Grid Layout untuk Warga */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {isWarga ? 'Laporan Warga' : 'Laporan Saya'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {isWarga
                      ? `Laporan dari semua warga di ${getRtRwLabel()} Anda (Real-time)`
                      : 'Pantau progres dan status laporan Anda'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <RealtimeFeed />
                  <button
                    onClick={() => router.push(isWarga ? '/laporan' : '/laporan/saya')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm"
                  >
                    {isWarga ? 'Lihat Semua' : 'Buat Laporan'}
                  </button>
                </div>
              </div>
              <ReportsList filter={isWarga ? {} : undefined} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Buat Laporan Baru</h2>
              <CreateReportForm />
            </div>
          </div>
          </div>
        )}
      <ChatWidget />
    </Layout>
  );
}

