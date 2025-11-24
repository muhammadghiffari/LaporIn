'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import useAuthStore from '@/store/authStore';
import Layout from '@/components/Layout';
import { ArrowLeft, Home, FileText, Calendar, MapPin, Tag, AlertCircle, CheckCircle2, Clock, XCircle, ExternalLink, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { initSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';

interface Report {
  id: number;
  user_id: number;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  location: string;
  image_url?: string;
  ai_summary: string;
  blockchain_tx_hash: string;
  is_mock_blockchain?: boolean; // Flag untuk mock blockchain
  cancellation_reason?: string;
  created_at: string;
  user_name?: string;
  rt_rw?: string;
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
  const hasCheckedAuth = useAuthStore((s) => s.hasCheckedAuth);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockchainLogs, setBlockchainLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);
  const [blockchainConfigured, setBlockchainConfigured] = useState<boolean>(true);
  const socketRef = useRef<any>(null);
  const { toasts, success, error, removeToast } = useToast();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (hasCheckedAuth && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (hasCheckedAuth && isAuthenticated && user && params.id) {
      fetchReport();
    }
  }, [hasCheckedAuth, isAuthenticated, router, user, params.id]);

  const fetchReport = async (isBackgroundRefresh = false) => {
    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      const { data } = await api.get(`/reports/${params.id}`);
      setReport(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  };

  const fetchBlockchainLogs = async () => {
    if (!params.id) return;
    setLoadingLogs(true);
    setBlockchainError(null);
    try {
      console.log('[Frontend] Fetching blockchain logs for report:', params.id);
      const { data } = await api.get(`/reports/${params.id}/blockchain-logs`);
      console.log('[Frontend] Received blockchain logs:', data);
      
      setBlockchainLogs(data.logs || []);
      setBlockchainConfigured(data.blockchainConfigured !== false);
      setShowLogs(true);
      
      if (data.error) {
        setBlockchainError(data.error);
      }
      
      if (data.logs && data.logs.length === 0) {
        console.log('[Frontend] No blockchain logs found. Has blockchain tx:', data.hasBlockchainTx);
        console.log('[Frontend] Blockchain configured:', data.blockchainConfigured);
      }
    } catch (error: any) {
      console.error('[Frontend] Error fetching blockchain logs:', error);
      console.error('[Frontend] Error details:', error.response?.data);
      setBlockchainLogs([]);
      setBlockchainError(error.response?.data?.error || error.message || 'Gagal memuat log blockchain');
    } finally {
      setLoadingLogs(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!hasCheckedAuth || !isAuthenticated || !user || !params.id) return;

    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) return;

    // Initialize socket connection
    const socket = initSocket(token);
    socketRef.current = socket;

    // Subscribe to report updates
    socket.emit('subscribe:report', params.id);

    // Listen for report updates
    socket.on('report:updated', (updatedReport: Report) => {
      if (updatedReport.id === parseInt(params.id as string)) {
        console.log('[Socket] Received real-time update for report:', updatedReport.id);
        setReport(updatedReport);
      }
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe:report', params.id);
        disconnectSocket();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCheckedAuth, isAuthenticated, user, params.id]);

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
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="space-y-4">
        {/* Breadcrumb & Back Button */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md text-gray-700 font-medium"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
              <Link href="/dashboard" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <span>/</span>
              <Link href="/laporan" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>Laporan</span>
              </Link>
              <span>/</span>
              <span className="text-gray-700 font-medium">Detail Laporan #{report.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/laporan"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Semua Laporan</span>
            </Link>
          </div>
        </div>


        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 space-y-6">
          {/* Blockchain Transparency Badge - Untuk Warga (Simplified) */}
          {!isPengurus && report.blockchain_tx_hash && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-lg text-green-900">🔐 Tercatat di Blockchain</div>
                  <div className="text-xs text-green-700">Data Aman & Tidak Bisa Diubah</div>
                </div>
              </div>
              <p className="text-sm text-green-800 mb-3">
                Laporan Anda telah tercatat secara permanen di blockchain. Data tidak dapat diubah atau dihapus oleh siapa pun.
              </p>
              {report.is_mock_blockchain && (
                <div className="text-xs text-gray-600 italic">
                  🔧 Mock Blockchain (Demo Mode)
                </div>
              )}
            </div>
          )}

          {/* Security / Blockchain Card - Hanya untuk Admin/Pengurus */}
          {isPengurus && (
            <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl p-6 border-2 border-purple-300 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-md">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-lg text-gray-900">🔐 Tercatat di Blockchain</div>
                  <div className="text-xs text-gray-600">Audit Trail & Transparansi - Hanya Admin</div>
                </div>
            </div>
            {report.blockchain_tx_hash ? (
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Transaction Hash (Tx Hash)</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs text-purple-700 font-mono break-all bg-purple-50 px-2 py-1 rounded flex-1 min-w-0">
                        {report.blockchain_tx_hash}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(report.blockchain_tx_hash);
                          setCopiedAddress(report.blockchain_tx_hash);
                          setTimeout(() => setCopiedAddress(null), 2000);
                        }}
                        className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                        title="Salin hash"
                      >
                        {copiedAddress === report.blockchain_tx_hash ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-purple-600" />
                        )}
                      </button>
                      {report.is_mock_blockchain ? (
                        <div className="p-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold flex items-center gap-1">
                          <span>🎭 Mock Blockchain (Demo)</span>
                        </div>
                      ) : (
                <a
                  href={`https://amoy.polygonscan.com/tx/${report.blockchain_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                          className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md flex items-center gap-1 text-xs font-semibold"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(`https://amoy.polygonscan.com/tx/${report.blockchain_tx_hash}`, '_blank', 'noopener,noreferrer');
                  }}
                >
                          <ExternalLink className="w-4 h-4" />
                          Verifikasi
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-semibold">Status: Tersimpan di Blockchain</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Laporan ini telah tercatat secara permanen di blockchain. Data tidak dapat diubah atau dihapus.
                    </p>
                  </div>
              </div>
            ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Transaksi blockchain sedang diproses atau belum tersedia.</span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-2">
                    Laporan telah tersimpan dengan aman. Informasi blockchain akan muncul setelah transaksi dikonfirmasi.
                  </p>
              </div>
            )}
          </div>
          )}
          {/* Header dengan Status Badge */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-gray-200">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">{report.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{new Date(report.created_at).toLocaleDateString('id-ID', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                {report.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{report.location}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${
                  report.status === 'resolved'
                    ? 'bg-green-100 text-green-800'
                    : report.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : report.status === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {report.status === 'resolved' && <CheckCircle2 className="h-4 w-4" />}
                {report.status === 'in_progress' && <Clock className="h-4 w-4" />}
                {report.status === 'cancelled' && <XCircle className="h-4 w-4" />}
                {report.status === 'pending' && <AlertCircle className="h-4 w-4" />}
                {report.status === 'resolved' ? 'Selesai' : 
                 report.status === 'in_progress' ? 'Sedang Diproses' :
                 report.status === 'cancelled' ? 'Dibatalkan' :
                 'Menunggu'}
              </span>
              <span
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${
                  report.urgency === 'high'
                    ? 'bg-red-100 text-red-800'
                    : report.urgency === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <AlertCircle className="h-4 w-4" />
                {report.urgency === 'high' ? 'Tinggi' : 
                 report.urgency === 'medium' ? 'Sedang' : 
                 'Rendah'}
              </span>
            </div>
          </div>

          {/* Info Pelapor - Transparan untuk Semua Role */}
          {(report.user_name || report.rt_rw) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 mb-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Informasi Pelapor (Transparan & Terverifikasi)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {report.user_name && (
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-gray-500 mb-1">Nama Pelapor</div>
                    <div className="font-semibold text-gray-900 text-base">{report.user_name}</div>
                  </div>
                )}
                {report.rt_rw && (
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-gray-500 mb-1">RT/RW</div>
                    <div className="font-semibold text-gray-900 text-base">{report.rt_rw}</div>
                  </div>
                )}
                {report.location && (
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-gray-500 mb-1">Lokasi Laporan</div>
                    <div className="font-semibold text-gray-900 text-base">{report.location}</div>
                  </div>
                )}
                {isPengurus && report.blockchain_tx_hash && (
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-gray-500 mb-1">Blockchain Hash (Admin Only)</div>
                    {report.is_mock_blockchain ? (
                      <div className="font-mono text-xs text-gray-600 break-all">
                        {report.blockchain_tx_hash.substring(0, 20)}...
                        <span className="text-xs text-gray-500 ml-2">(Mock Blockchain - Demo)</span>
                      </div>
                    ) : (
                    <a
                      href={`https://amoy.polygonscan.com/tx/${report.blockchain_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-blue-600 hover:text-blue-800 break-all"
                      title="Verifikasi di blockchain explorer"
                    >
                      {report.blockchain_tx_hash.substring(0, 20)}...
                    </a>
                    )}
                  </div>
                )}
              </div>
              {isPengurus && (
              <div className="mt-3 text-xs text-gray-600 bg-white/50 rounded-lg p-2 border border-blue-100">
                  <span className="font-semibold">🔐 Audit Trail Blockchain:</span> Semua data laporan ini tercatat di blockchain untuk audit dan transparansi. Hanya admin yang dapat melihat detail blockchain.
              </div>
              )}
            </div>
          )}

          {/* Image Preview */}
          {report.image_url && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Foto Laporan
              </h3>
              <div className="relative rounded-xl overflow-hidden border-2 border-gray-300 shadow-md bg-white">
                <img
                  src={report.image_url}
                  alt={report.title}
                  className="w-full h-auto max-h-96 object-contain bg-gray-50"
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Deskripsi */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                Deskripsi Laporan
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{report.description}</p>
            </div>

            {/* Lokasi */}
            {report.location && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  Lokasi
                </h3>
                <p className="text-gray-700 font-medium">{report.location}</p>
              </div>
            )}

            {/* Kategori */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-5 w-5 text-gray-500" />
                <span className="font-semibold text-gray-700">Kategori</span>
              </div>
              <p className="text-gray-900 font-medium capitalize">{report.category || 'Belum diproses'}</p>
            </div>

            {report.ai_summary && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Ringkasan AI
                </h3>
                <p className="text-gray-700 leading-relaxed">{report.ai_summary}</p>
              </div>
            )}

            {/* Blockchain Logs Section - Hanya untuk Admin Sistem */}
            {user?.role === 'admin' && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border-2 border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Blockchain Logs & Audit Trail
                  </h3>
                  <button
                    onClick={fetchBlockchainLogs}
                    disabled={loadingLogs}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {loadingLogs ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Memuat...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        <span>{showLogs ? 'Refresh Logs' : 'Lihat Logs'}</span>
                      </>
                    )}
                  </button>
                </div>
              
              {report.blockchain_tx_hash && (
                <div className="mb-4 bg-white rounded-lg p-3 border border-purple-200">
                  <div className="text-xs text-gray-500 mb-1">Transaction Hash</div>
                  <div className="flex items-center gap-2">
                    {report.is_mock_blockchain ? (
                      <>
                        <span className="text-xs text-purple-600 font-mono break-all flex-1">
                          {report.blockchain_tx_hash}
                        </span>
                        <span className="text-xs text-gray-500">(Mock - Demo)</span>
                      </>
                    ) : (
                      <>
                    <a
                      href={`https://amoy.polygonscan.com/tx/${report.blockchain_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 hover:text-purple-800 font-mono break-all flex-1 cursor-pointer"
                      title="Lihat transaksi di explorer"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(`https://amoy.polygonscan.com/tx/${report.blockchain_tx_hash}`, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      {report.blockchain_tx_hash}
                    </a>
                    <a
                      href={`https://amoy.polygonscan.com/tx/${report.blockchain_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-purple-100 rounded transition-colors cursor-pointer"
                      title="Buka di explorer"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(`https://amoy.polygonscan.com/tx/${report.blockchain_tx_hash}`, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <ExternalLink className="h-4 w-4 text-purple-600" />
                    </a>
                      </>
                    )}
                  </div>
                </div>
              )}

              {showLogs && (
                <div className="space-y-3">
                  {blockchainError && (
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <p className="text-sm text-red-800 font-semibold mb-2">⚠️ Error Blockchain</p>
                      <p className="text-xs text-red-700">{blockchainError}</p>
                      {!blockchainConfigured && (
                        <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                          <strong>Solusi:</strong> Pastikan environment variables berikut sudah di-set di backend:
                          <ul className="list-disc list-inside mt-1 ml-2">
                            <li>BLOCKCHAIN_RPC_URL</li>
                            <li>PRIVATE_KEY</li>
                            <li>CONTRACT_ADDRESS (setelah deploy contract)</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!blockchainError && (
                    <>
                      {blockchainLogs.length === 0 ? (
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                          <div className="text-center text-gray-500 mb-3">
                            <p className="font-medium mb-1">Tidak ada log blockchain ditemukan untuk laporan ini.</p>
                            <p className="text-xs">Log akan muncul setelah transaksi blockchain tercatat.</p>
                          </div>
                          {report.blockchain_tx_hash ? (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-xs text-blue-800 mb-2">
                                <strong>Catatan:</strong> Laporan ini memiliki transaction hash, tetapi events mungkin belum ter-index atau contract belum di-deploy dengan benar.
                              </p>
                              <p className="text-xs text-blue-700 mb-2">
                                Transaction Hash: <span className="font-mono">{report.blockchain_tx_hash.substring(0, 20)}...</span>
                              </p>
                              {report.is_mock_blockchain ? (
                                <div className="text-xs text-gray-600 italic">
                                  🔧 Mock Blockchain (Demo Mode) - Hash tidak bisa diverifikasi di explorer
                                </div>
                              ) : (
                              <a
                                href={`https://amoy.polygonscan.com/tx/${report.blockchain_tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                  Lihat transaksi di Polygon Amoy Explorer
                              </a>
                              )}
                            </div>
                          ) : (
                            <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                              <p className="text-xs text-yellow-800 mb-2">
                                <strong>Info:</strong> Laporan ini belum memiliki transaction hash blockchain.
                              </p>
                              <p className="text-xs text-yellow-700">
                                Pastikan blockchain service sudah dikonfigurasi dengan benar di backend (.env).
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        blockchainLogs.map((log, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                log.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                log.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                log.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.status}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(log.date).toLocaleString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </span>
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Actor:</span>
                                <span className="font-mono text-gray-700">{log.actor?.substring(0, 10)}...{log.actor?.substring(log.actor.length - 8)}</span>
                                <button
                                  onClick={() => copyToClipboard(log.actor)}
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                  title="Copy address"
                                >
                                  {copiedAddress === log.actor ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-gray-400" />
                                  )}
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Meta Hash:</span>
                                <span className="font-mono text-gray-700 break-all">{log.metaHash}</span>
                              </div>
                              {log.txHash && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Tx Hash:</span>
                                  {report.is_mock_blockchain ? (
                                    <>
                                      <span className="font-mono text-gray-600 break-all">
                                        {log.txHash.substring(0, 20)}...
                                      </span>
                                      <span className="text-xs text-gray-500">(Mock)</span>
                                    </>
                                  ) : (
                                    <>
                                  <a
                                    href={`https://amoy.polygonscan.com/tx/${log.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-purple-600 hover:text-purple-800 break-all"
                                  >
                                    {log.txHash.substring(0, 20)}...
                                  </a>
                                  <a
                                    href={`https://amoy.polygonscan.com/tx/${log.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 hover:bg-purple-100 rounded transition-colors"
                                    title="Buka di explorer"
                                  >
                                    <ExternalLink className="h-3 w-3 text-purple-600" />
                                  </a>
                                    </>
                                  )}
                                </div>
                              )}
                              {log.blockNumber && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Block:</span>
                                  <span className="font-mono text-gray-700">{log.blockNumber.toString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                      )}
                    </>
                  )}
                </div>
              )}

              {!showLogs && (
                <div className="bg-white rounded-lg p-4 border border-purple-200 text-center text-gray-500">
                  <p className="text-sm">Klik tombol "Lihat Logs" untuk melihat audit trail blockchain</p>
                </div>
              )}
            </div>
            )}

            {/* Timeline */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                Timeline Status
              </h3>
              <div className="space-y-4">
                {report.history.map((item, index) => (
                  <div key={item.id} className="relative pl-6 pb-4 last:pb-0">
                    {/* Timeline line */}
                    {index < report.history.length - 1 && (
                      <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-300"></div>
                    )}
                    {/* Timeline dot */}
                    <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 ${
                      item.status === 'resolved' ? 'bg-green-500 border-green-600' :
                      item.status === 'in_progress' ? 'bg-blue-500 border-blue-600' :
                      item.status === 'cancelled' ? 'bg-red-500 border-red-600' :
                      'bg-gray-400 border-gray-500'
                    }`}></div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <span className={`font-semibold text-sm ${
                          item.status === 'resolved' ? 'text-green-700' :
                          item.status === 'in_progress' ? 'text-blue-700' :
                          item.status === 'cancelled' ? 'text-red-700' :
                          'text-gray-700'
                        }`}>
                          {item.status === 'resolved' ? 'Selesai' : 
                           item.status === 'in_progress' ? 'Sedang Diproses' :
                           item.status === 'cancelled' ? 'Dibatalkan' :
                           'Menunggu'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded p-2">{item.notes}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <span>Oleh:</span>
                        <span className="font-medium">{item.updated_by_name}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
              {/* Cancel Report Button (hanya untuk warga, hanya jika status pending) */}
              {user && user.id === report.user_id && report.status === 'pending' && (
                <button
                  onClick={async () => {
                    const reason = prompt('Alasan pembatalan (opsional):');
                    if (reason !== null) {
                      try {
                        await api.post(`/reports/${report.id}/cancel`, { reason: reason || undefined });
                        success('Laporan berhasil dibatalkan. Perubahan status telah dicatat di blockchain.');
                        setTimeout(() => {
                        router.push('/dashboard');
                        }, 1500);
                      } catch (err: any) {
                        error(err.response?.data?.error || 'Gagal membatalkan laporan. Silakan coba lagi.');
                      }
                    }
                  }}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <XCircle className="h-5 w-5" />
                  <span>Batalkan Laporan</span>
                </button>
              )}
              <Link
                href="/laporan"
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Kembali ke Daftar</span>
              </Link>
            </div>

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
      </div>
    </Layout>
  );
}

