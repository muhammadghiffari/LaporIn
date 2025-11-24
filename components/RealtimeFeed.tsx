'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import { Bell, FileText, Clock, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

interface Report {
  id: number;
  title: string;
  location?: string;
  status: string;
  category?: string;
  urgency?: string;
  user_name?: string;
  rt_rw?: string;
  created_at: string;
}

export default function RealtimeFeed() {
  const { user, isAuthenticated, hasCheckedAuth } = useAuthStore();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mentions'>('all');
  const [readIds, setReadIds] = useState<number[]>([]);

  const allowedRoles = ['admin', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus', 'warga'];
  const canSeeNotifications = isAuthenticated && user && allowedRoles.includes(user.role || '');

  const fetchFeed = useCallback(
    async (showLoading = true) => {
      if (!hasCheckedAuth || !isAuthenticated || !user) return;

      try {
        if (showLoading) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        
        const { data } = await api.get('/reports/realtime-feed');
        setReports(data.reports || []);
      } catch (error) {
        console.error('Error fetching realtime feed:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hasCheckedAuth, isAuthenticated, user]
  );

  useEffect(() => {
    if (hasCheckedAuth && isAuthenticated && user) {
      fetchFeed(true);
    }
  }, [fetchFeed, hasCheckedAuth, isAuthenticated, user]);

  // Format time ago
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Baru saja';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
    return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getSnippet = (report: Report) => {
    if (report.location) return report.location;
    if (report.category) return `Kategori: ${report.category}`;
    return 'Laporan baru telah dibuat oleh warga';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get urgency color
  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const unreadReports = reports.filter(
    (r) => (r.status === 'pending' || r.status === 'in_progress') && !readIds.includes(r.id)
  );
  const badgeCount = unreadReports.length;

  if (!canSeeNotifications) return null;

  const handleOpen = () => {
    setIsOpen(true);
    if (reports.length === 0) {
      fetchFeed(false);
    }
  };

  const filteredReports =
    activeTab === 'all'
      ? reports
      : reports.filter((report) => (report.urgency || '').toLowerCase() === 'high');

  const handleMarkAllRead = () => {
    setReadIds(reports.map((r) => r.id));
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={handleOpen}
          className="relative inline-flex items-center justify-center w-11 h-11 rounded-full border border-gray-300 bg-white shadow-sm hover:border-blue-400 hover:text-blue-600 transition-colors"
          aria-label="Notifikasi laporan terbaru"
        >
          <Bell className="h-5 w-5" />
          {badgeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[11px] font-semibold rounded-full px-1.5 py-0.5 shadow">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-3 w-[620px] z-50 bg-white rounded-2xl shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Notifikasi</h3>
                  <p className="text-xs text-gray-500">Pantau update terbaru dari laporan warga</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                aria-label="Tutup notifikasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-4 text-sm font-semibold">
                {(['all', 'mentions'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2 border-b-2 ${
                      activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                    }`}
                  >
                    {tab === 'all' ? 'Semua' : 'Menandai Anda'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => fetchFeed(false)}
                  disabled={refreshing || loading}
                  className="p-2 rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh data"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleMarkAllRead}
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Tandai sudah dibaca
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Memuat notifikasi...
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">Belum ada notifikasi terbaru</div>
              ) : (
                filteredReports.map((report) => {
                  const isUnread =
                    (report.status === 'pending' || report.status === 'in_progress') && !readIds.includes(report.id);
                  const initials = (report.user_name || 'Warga')
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('');

                  return (
                    <button
                      key={report.id}
                      onClick={() => {
                        setIsOpen(false);
                        router.push(`/reports/${report.id}`);
                      }}
                      className="w-full text-left p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:shadow transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                          {initials || 'W'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm text-gray-900 line-clamp-2">{report.title}</p>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{getSnippet(report)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] text-gray-500">{formatDate(report.created_at)}</p>
                              {isUnread ? (
                                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-1" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-green-500 inline-block mt-1" />
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-[13px] text-gray-500">
                            <div className="flex items-center gap-3 flex-wrap">
                              {report.user_name && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  {report.user_name}
                                </span>
                              )}
                              {report.urgency && (
                                <span className={`font-medium ${getUrgencyColor(report.urgency)}`}>
                                  {report.urgency === 'high'
                                    ? '🔴 Tinggi'
                                    : report.urgency === 'medium'
                                    ? '🟡 Sedang'
                                    : '🟢 Rendah'}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(report.status)}`}>
                                {report.status === 'pending'
                                  ? 'Menunggu'
                                  : report.status === 'in_progress'
                                  ? 'Diproses'
                                  : report.status === 'resolved'
                                  ? 'Selesai'
                                  : report.status === 'rejected'
                                  ? 'Ditolak'
                                  : report.status === 'cancelled'
                                  ? 'Dibatalkan'
                                  : report.status}
                              </span>
                            </div>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {timeAgo(report.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {reports.length > 0 && (
              <div className="px-5 pb-4 flex items-center justify-between text-sm">
                <button
                  onClick={handleMarkAllRead}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Tandai semua dibaca
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/laporan');
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  Lihat semua notifikasi
                </button>
              </div>
            )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

