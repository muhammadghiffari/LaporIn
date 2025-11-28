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
  Building2,
  Info,
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
  const hasCheckedAuth = useAuthStore((s) => s.hasCheckedAuth);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [statsWarga, setStatsWarga] = useState<any>(null);
  const [rtStats, setRtStats] = useState<any>(null);
  const [rwSummary, setRwSummary] = useState<any>(null);
  const [rwListSummary, setRwListSummary] = useState<any>(null); // Ringkasan semua RW untuk Super Admin
  const [rwFilter, setRwFilter] = useState<string>('');
  const [rtFilter, setRtFilter] = useState<string>('');
  const [rtList, setRtList] = useState<Array<{rt: string, rtRw: string, label: string}>>([]);
  const [rwList, setRwList] = useState<Array<{rw: string, label: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [reportPeriod, setReportPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [wargaPeriod, setWargaPeriod] = useState<'day' | 'week' | 'month'>('day');

  const allowedRoles = ['admin', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'];
  const isPengurus = allowedRoles.includes(user?.role || '');
  const isSuperAdmin = user?.role === 'admin' || user?.role === 'admin_sistem';
  const isAdminRW = user?.role === 'admin_rw';

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (mounted && hasCheckedAuth && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (mounted && hasCheckedAuth && user && !isPengurus) {
      router.push('/dashboard');
    }
  }, [mounted, hasCheckedAuth, isAuthenticated, router, user, isPengurus]);

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

  // Fetch RT list
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

  // Fetch ringkasan RW untuk Super Admin
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

  useEffect(() => {
    if (mounted && isPengurus) {
      fetchStats();
    }
  }, [mounted, isPengurus, reportPeriod, wargaPeriod, rwFilter, rtFilter]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      let statsUrl = `/reports/stats?period=${reportPeriod}`;
      if (isSuperAdmin) {
        if (rtFilter && rwFilter) {
          statsUrl += `&rtFilter=${rtFilter}&rwFilter=${rwFilter}`;
        } else if (rwFilter) {
          statsUrl += `&rwFilter=${rwFilter}`;
        }
        // Jika tidak ada filter: lihat semua (default untuk superadmin)
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
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  };

  // Early return untuk menghindari hydration mismatch
  if (!mounted || !hasCheckedAuth) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen" suppressHydrationWarning>
          <div className="text-center" suppressHydrationWarning>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" suppressHydrationWarning></div>
            <p className="mt-4 text-gray-600">Memuat...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen" suppressHydrationWarning>
          <div className="text-center" suppressHydrationWarning>
            <p className="text-gray-600">Silakan login terlebih dahulu</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isPengurus) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen" suppressHydrationWarning>
          <div className="text-center" suppressHydrationWarning>
            <p className="text-gray-600">Akses ditolak. Hanya pengurus yang dapat mengakses halaman ini.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const kpiCard = (label: string, value: number | string, icon: React.ReactNode, color: string, trend?: string) => (
    <div className={`p-6 rounded-2xl shadow-sm border border-gray-200 bg-white transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">{label}</div>
        <div className="text-gray-400 p-2 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {trend && (
          <span className="text-sm text-green-600 flex items-center gap-1 font-semibold">
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
    
    // Tentukan warna berdasarkan judul chart
    const isLaporan = title.includes('Laporan');
    const primaryColor = isLaporan ? 'rgb(59,130,246)' : 'rgb(34,197,94)';
    const gradientStart = isLaporan ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.2)';
    const gradientEnd = isLaporan ? 'rgba(59,130,246,0.02)' : 'rgba(34,197,94,0.02)';
    
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-bold text-lg text-gray-900 mb-1">{title}</div>
            <div className="text-sm text-gray-500">Data per {periodLabel.toLowerCase()}</div>
          </div>
          <select
            value={period}
            onChange={(e) => {
              if (title.includes('Laporan')) {
                setReportPeriod(e.target.value as 'day' | 'week' | 'month');
              } else {
                setWargaPeriod(e.target.value as 'day' | 'week' | 'month');
              }
            }}
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-gray-400 transition-colors font-medium shadow-sm"
          >
            <option value="day">Per Hari</option>
            <option value="week">Per Minggu</option>
            <option value="month">Per Bulan</option>
          </select>
        </div>
        <div className="flex-1 min-h-0 relative">
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
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
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
                      const unit = title.includes('Laporan') 
                        ? 'laporan' 
                        : title.includes('Warga') 
                        ? 'warga baru' 
                        : 'item';
                      return `${count} ${unit}`;
                    },
                    title: (context: any) => {
                      const label = context[0].label;
                      // Format label agar lebih jelas
                      if (period === 'day') {
                        return `Tanggal: ${label}`;
                      } else if (period === 'week') {
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
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col hover:shadow-md transition-all duration-300">
        <div className="font-bold text-lg mb-6 text-gray-900">{title}</div>
        <div className="flex-1 min-h-0">
          <Bar
            data={{
              labels: items.map((i) => i.label),
              datasets: [
                {
                  label: 'Jumlah',
                  data: items.map((i) => i.count),
                  backgroundColor: colors.map((color, index) => {
                    // Buat gradient untuk setiap bar
                    return color;
                  }),
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
                    stepSize: Math.max(1, Math.ceil((Math.max(...items.map(i => i.count)) || 1) / 8)),
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
      <div className="space-y-6" suppressHydrationWarning>
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Statistik</h1>
            <p className="text-gray-600 mt-1">Analisis data laporan dan warga secara real-time</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isSuperAdmin && rwList.length > 0 && (
              <>
                <select
                  value={rwFilter}
                  onChange={(e) => {
                    setRwFilter(e.target.value);
                    setRtFilter(''); // Reset RT filter saat RW berubah
                  }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white hover:border-gray-400 transition-colors font-medium shadow-sm"
                >
                  <option value="">Semua RW (Akumulasi)</option>
                  {rwList.map((rw) => (
                    <option key={rw.rw} value={rw.rw}>
                      {rw.label}
                    </option>
                  ))}
                </select>
                {rwFilter && rtList.length > 0 && (
                  <select
                    value={rtFilter}
                    onChange={(e) => setRtFilter(e.target.value)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white hover:border-gray-400 transition-colors font-medium shadow-sm"
                  >
                    <option value="">Semua RT</option>
                    {rtList.map((rt) => (
                      <option key={rt.rt} value={rt.rt}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
            {isAdminRW && rtList.length > 0 && (
              <select
                value={rtFilter}
                onChange={(e) => setRtFilter(e.target.value)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-gray-400 transition-colors font-medium shadow-sm"
              >
                <option value="">Semua RT</option>
                {rtList.map((rt) => (
                  <option key={rt.rt} value={rt.rt}>
                    {rt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        
        {/* Ringkasan untuk Superadmin */}
        {isSuperAdmin && (
          <div className="space-y-4">
            {!rwFilter && rwListSummary && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-purple-900">Ringkasan Sistem (Semua RW)</h3>
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">Total RW</div>
                    <div className="text-2xl font-bold text-purple-700">{rwListSummary.totalRW || 0}</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">Total RT</div>
                    <div className="text-2xl font-bold text-blue-700">{rwListSummary.totalRT || 0}</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">Rata-rata RT/RW</div>
                    <div className="text-2xl font-bold text-green-700">
                      {rwListSummary.totalRW > 0 
                        ? Math.round((rwListSummary.totalRT || 0) / rwListSummary.totalRW) 
                        : 0}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">Total Warga</div>
                    <div className="text-2xl font-bold text-orange-700">
                      {rwListSummary.rwList?.reduce((sum: number, rw: any) => sum + (rw.totalWarga || 0), 0) || 0}
                    </div>
                  </div>
                </div>
                {/* Daftar RW dengan ringkasan */}
                {rwListSummary.rwList && rwListSummary.rwList.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <h4 className="text-sm font-semibold text-purple-900 mb-3">Daftar RW di Kelurahan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {rwListSummary.rwList.map((rw: any) => (
                        <div key={rw.rw} className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-bold text-purple-900">{rw.label}</h5>
                            <Building2 className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <div className="text-gray-500">RT</div>
                              <div className="font-semibold text-blue-700">{rw.rtCount || 0}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Warga</div>
                              <div className="font-semibold text-green-700">{rw.totalWarga || 0}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Laporan</div>
                              <div className="font-semibold text-orange-700">{rw.totalReports || 0}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {rwFilter && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-purple-700">
                    Menampilkan statistik untuk <strong>{rwFilter}</strong>
                    {rtFilter && ` - ${rtList.find(rt => rt.rt === rtFilter)?.label || rtFilter}`}
                    {!rwFilter && ' (Semua RW - Akumulasi)'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ringkasan RW untuk Super Admin */}
        {isSuperAdmin && rwSummary && rwFilter && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-purple-900">Ringkasan {rwFilter}</h3>
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          </div>
        )}

        {/* Grafik per RT untuk RW Admin */}
        {isAdminRW && rtStats && rtStats.rtStats && rtStats.rtStats.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Statistik per RT</h2>
            <div className="h-[400px]">
              <Bar
                data={{
                  labels: rtStats.rtStats.map((rt: any) => rt.label),
                  datasets: [
                    {
                      label: 'Total Laporan',
                      data: rtStats.rtStats.map((rt: any) => rt.totalReports || 0),
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      borderRadius: { topLeft: 12, topRight: 12, bottomLeft: 0, bottomRight: 0 },
                    },
                    {
                      label: 'Pending',
                      data: rtStats.rtStats.map((rt: any) => rt.pendingReports || 0),
                      backgroundColor: 'rgba(245, 158, 11, 0.8)',
                      borderRadius: { topLeft: 12, topRight: 12, bottomLeft: 0, bottomRight: 0 },
                    },
                    {
                      label: 'Diproses',
                      data: rtStats.rtStats.map((rt: any) => rt.inProgressReports || 0),
                      backgroundColor: 'rgba(139, 92, 246, 0.8)',
                      borderRadius: { topLeft: 12, topRight: 12, bottomLeft: 0, bottomRight: 0 },
                    },
                    {
                      label: 'Selesai',
                      data: rtStats.rtStats.map((rt: any) => rt.resolvedReports || 0),
                      backgroundColor: 'rgba(34, 197, 94, 0.8)',
                      borderRadius: { topLeft: 12, topRight: 12, bottomLeft: 0, bottomRight: 0 },
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: true, position: 'top' as const },
                    tooltip: {
                      backgroundColor: 'rgba(15,23,42,0.95)',
                      padding: 16,
                      titleFont: { size: 15, weight: 'bold' },
                      bodyFont: { size: 14 },
                      borderColor: 'rgba(59, 130, 246, 1)',
                      borderWidth: 2,
                      cornerRadius: 12,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0,0,0,0.06)' },
                    },
                    x: {
                      grid: { display: false },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-600" suppressHydrationWarning>
            <div className="flex items-center gap-2" suppressHydrationWarning>
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" suppressHydrationWarning></div>
              <span>Memuat data...</span>
            </div>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" suppressHydrationWarning>
              {kpiCard('Total Laporan', stats?.totals?.total_reports ?? 0, <FileText className="w-5 h-5" />, '')}
              {kpiCard('Selesai', stats?.totals?.resolved_reports ?? 0, <CheckCircle className="w-5 h-5" />, '')}
              {kpiCard('Sedang Diproses', stats?.totals?.in_progress_reports ?? 0, <Clock className="w-5 h-5" />, '')}
              {kpiCard('Menunggu', stats?.totals?.pending_reports ?? 0, <AlertCircle className="w-5 h-5" />, '')}
              {kpiCard('Dibatalkan', stats?.totals?.cancelled_reports ?? 0, <XCircle className="w-5 h-5" />, '')}
            </div>

            {/* Total Warga KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" suppressHydrationWarning>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" suppressHydrationWarning>
              <div className="h-[400px]">
                {timeSeriesChart('Tren Laporan', stats?.timeSeries || [], reportPeriod)}
              </div>
              <div className="h-[400px]">
                {timeSeriesChart('Pertumbuhan Warga', statsWarga?.growth || [], wargaPeriod)}
              </div>
            </div>

            {/* Bar Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" suppressHydrationWarning>
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
