'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import useAuthStore from '@/store/authStore';

interface Report {
  id: number;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  location: string;
  created_at: string;
  user_name: string;
  rt_rw?: string;
}

export default function RTQueuePanel() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyPending, setOnlyPending] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports');
      
      // Backend returns { data: [...], total, page, limit }
      let reportsData: Report[] = [];
      if (Array.isArray(response.data)) {
        reportsData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        reportsData = response.data.data || response.data.reports || response.data.results || [];
      }
      
      // Ensure it's an array
      if (!Array.isArray(reportsData)) {
        reportsData = [];
      }
      
      // Filter client-side by RT/RW user (jika perlu)
      // Admin dan Pengurus bisa lihat semua laporan tanpa filter RT/RW
      const rtRw = user?.rt_rw || '';
      let list: Report[] = reportsData;
      
      // Hanya filter RT/RW untuk role RT/RW (ketua_rt, sekretaris_rt, admin_rw)
      // Admin dan Pengurus tidak perlu filter
      if (rtRw && ['ketua_rt', 'sekretaris_rt', 'admin_rw'].includes(user?.role || '')) {
        list = list.filter((r: any) => {
          const reportRtRw = r.rt_rw || r.location || '';
          return reportRtRw.includes(rtRw) || rtRw.includes(reportRtRw);
        });
      }
      // Admin dan Pengurus melihat semua laporan tanpa filter RT/RW
      
      // Filter berdasarkan status jika checkbox checked
      if (onlyPending) {
        list = list.filter((r) => r.status === 'pending' || r.status === 'in_progress');
      }
      
      console.log('[RTQueuePanel] Filtered reports:', list.length, 'from', reportsData.length);
      setReports(list.slice(0, 50));
    } catch (e: any) {
      console.error('[RTQueuePanel] Error fetching reports:', e);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyPending, user]);

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/reports/${id}/status`, { status });
      fetchReports();
    } catch {
      alert('Gagal mengubah status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-xl font-bold text-gray-900">Antrian Laporan Warga</h3>
        <label className="text-sm text-gray-600 flex items-center gap-2 cursor-pointer hover:text-gray-900 transition-colors">
          <input
            type="checkbox"
            checked={onlyPending}
            onChange={(e) => setOnlyPending(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span>Tampilkan hanya pending / in_progress</span>
        </label>
      </div>
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-900">Judul</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-900">Urgensi</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-900">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-900">Waktu</th>
              <th className="px-4 py-3 font-semibold text-gray-900 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center" colSpan={5}>
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Memuat...</span>
                  </div>
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center" colSpan={5}>
                  <div className="text-gray-500">
                    <p className="font-medium">Tidak ada laporan</p>
                    <p className="text-sm mt-1">Semua laporan sudah ditangani</p>
                  </div>
                </td>
              </tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{r.title}</div>
                    <div className="text-xs text-gray-500 line-clamp-2 mt-1">{r.description}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        r.urgency === 'high'
                          ? 'bg-red-100 text-red-800'
                          : r.urgency === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {r.urgency || 'Belum diproses'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      r.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      r.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(r.created_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {r.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(r.id, 'in_progress')}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium shadow-sm"
                        >
                          Mulai Proses
                        </button>
                      )}
                      {r.status !== 'resolved' && (
                        <button
                          onClick={() => updateStatus(r.id, 'resolved')}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium shadow-sm"
                        >
                          Selesaikan
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


