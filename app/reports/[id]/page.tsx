'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import useAuthStore from '@/store/authStore';
import Layout from '@/components/Layout';

interface Report {
  id: number;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  location: string;
  ai_summary: string;
  blockchain_tx_hash: string;
  created_at: string;
  history: Array<{
    id: number;
    status: string;
    notes: string;
    created_at: string;
    updated_by_name: string;
  }>;
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      // Wait a bit for auth state to update
      setTimeout(() => {
        if (!isAuthenticated || !user) {
          router.push('/login');
        } else {
          fetchReport();
        }
      }, 100);
    };
    init();
  }, [params.id]);

  const fetchReport = async () => {
    try {
      const { data } = await api.get(`/reports/${params.id}`);
      setReport(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-600">Memuat...</div>
      </Layout>
    );
  }
  if (!report) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Laporan tidak ditemukan</p>
        </div>
      </Layout>
    );
  }

  const isPengurus = user?.role === 'pengurus' || user?.role === 'admin';

  return (
    <Layout>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          {/* Security / Blockchain Card */}
          <div className="border border-gray-200 rounded-2xl p-6 bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Keamanan & Audit</h2>
              <span className="text-xs text-gray-500">Terekam di blockchain</span>
            </div>
            <div className="mt-2 text-sm text-gray-700">
              Data penting laporan dicatat sebagai jejak audit yang tidak bisa diubah.
            </div>
            {report.blockchain_tx_hash ? (
              <div className="mt-3">
                <div className="text-xs text-gray-500">Kode Enkripsi (Tx Hash)</div>
                <a
                  href={`https://mumbai.polygonscan.com/tx/${report.blockchain_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-mono break-all"
                >
                  {report.blockchain_tx_hash}
                </a>
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-500">
                Transaksi blockchain belum tersedia untuk laporan ini.
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-4">{report.title}</h1>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-700">Deskripsi</h3>
              <p className="text-gray-600">{report.description}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700">Lokasi</h3>
              <p className="text-gray-600">{report.location}</p>
            </div>

            <div className="flex gap-4">
              <div>
                <span className="font-semibold text-gray-700">Kategori: </span>
                <span className="text-gray-600">{report.category || 'Belum diproses'}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Urgensi: </span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    report.urgency === 'high'
                      ? 'bg-red-100 text-red-800'
                      : report.urgency === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {report.urgency || 'Belum diproses'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Status: </span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    report.status === 'resolved'
                      ? 'bg-green-100 text-green-800'
                      : report.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {report.status}
                </span>
              </div>
            </div>

            {report.ai_summary && (
              <div>
                <h3 className="font-semibold text-gray-700">Ringkasan AI</h3>
                <p className="text-gray-600">{report.ai_summary}</p>
              </div>
            )}

            {report.blockchain_tx_hash && (
              <div>
                <h3 className="font-semibold text-gray-700">Blockchain</h3>
                <a
                  href={`https://mumbai.polygonscan.com/tx/${report.blockchain_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-mono break-all"
                  title="Lihat transaksi di explorer"
                >
                  {report.blockchain_tx_hash}
                </a>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Timeline</h3>
              <div className="space-y-2">
                {report.history.map((item) => (
                  <div key={item.id} className="border-l-2 border-blue-500 pl-4 py-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{item.status}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Oleh: {item.updated_by_name}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cancel Report Button (hanya untuk warga, hanya jika status pending) */}
            {user && user.id === report.user_id && report.status === 'pending' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={async () => {
                    const reason = prompt('Alasan pembatalan (opsional):');
                    if (reason !== null) {
                      try {
                        await api.post(`/reports/${report.id}/cancel`, { reason: reason || undefined });
                        alert('Laporan berhasil dibatalkan. Perubahan status telah dicatat di blockchain.');
                        router.push('/dashboard');
                      } catch (error: any) {
                        alert(error.response?.data?.error || 'Gagal membatalkan laporan');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                >
                  Batalkan Laporan
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Catatan: Pembatalan akan dicatat di blockchain untuk transparansi. Laporan tidak akan dihapus, hanya status diubah menjadi "cancelled".
                </p>
              </div>
            )}

            {/* Cancellation Info */}
            {report.status === 'cancelled' && report.cancellation_reason && (
              <div className="mt-6 pt-6 border-t border-gray-200 bg-red-50 rounded-2xl p-4">
                <h3 className="font-semibold text-red-900 mb-2">Laporan Dibatalkan</h3>
                <p className="text-sm text-red-800">Alasan: {report.cancellation_reason}</p>
                <p className="text-xs text-red-600 mt-2">
                  Status pembatalan telah dicatat di blockchain dan tidak dapat diubah.
                </p>
              </div>
            )}
          </div>
        </div>
    </Layout>
  );
}

