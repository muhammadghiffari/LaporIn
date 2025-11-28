'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { ReportsListSkeleton } from './ReportSkeleton';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from './Toast';

interface Report {
  id: number;
  title: string;
  description: string;
  urgency: string;
  status: string;
  created_at: string;
  category?: string;
  blockchain_tx_hash?: string;
  is_mock_blockchain?: boolean; // Flag untuk mock blockchain
  is_sensitive?: boolean; // Laporan sensitif/rahasia
  user_name?: string;
  user_email?: string;
  rt_rw?: string;
  location?: string;
}

interface ReportsListProps {
  filter?: Record<string, string>;
}

function ReportsList({ filter }: ReportsListProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const filterKey = useMemo(() => JSON.stringify(filter || {}), [filter]);
  const { toasts, error: showError, removeToast } = useToast();

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // Realtime polling - refresh setiap 10 detik untuk update realtime
  useEffect(() => {
    const interval = setInterval(() => {
      // Background refresh tanpa loading indicator
      setIsRefreshing(true);
      fetchReports(true).finally(() => {
        setTimeout(() => setIsRefreshing(false), 500);
      });
    }, 10000); // Poll setiap 10 detik

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // Refresh when a new report is created
  useEffect(() => {
    const handler = () => {
      fetchReports().then(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    };
    window.addEventListener('report-created', handler as EventListener);
    return () => window.removeEventListener('report-created', handler as EventListener);
  }, [filterKey]);

  const fetchReports = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams(filter || {});
      // Pastikan my_reports tidak terkirim untuk dashboard (transparansi)
      // my_reports hanya untuk halaman /laporan
      if (params.has('my_reports')) {
        params.delete('my_reports');
      }
      const response = await api.get(`/reports?${params}`);
      
      // Backend returns { data: [...], total, page, limit }
      // But also handle direct array response for backward compatibility
      let reportsData: Report[] = [];
      
      if (Array.isArray(response.data)) {
        // Direct array response
        reportsData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // Wrapped response with pagination
        reportsData = response.data.data || response.data.reports || response.data.results || [];
      }
      
      // Ensure it's an array and filter out any null/undefined
      reportsData = Array.isArray(reportsData) 
        ? reportsData.filter((r: any) => r != null) 
        : [];
      
      // Debug logging
      console.log('[ReportsList] Fetched reports:', reportsData.length);
      if (reportsData.length > 0) {
        console.log('[ReportsList] Sample report:', reportsData[0]);
      }
      
      setReports(reportsData);
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      
      // Handle different types of errors
      if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || error.message?.includes('Network')) {
        console.error('Network Error: Backend mungkin tidak berjalan atau tidak bisa diakses');
        console.error('API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api');
        if (!isBackgroundRefresh) {
          showError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
          setReports([]);
        }
      } else if (error.response) {
        // API returned an error response
        console.error('API Error Response:', error.response.status, error.response.data);
        if (error.response.status === 401) {
          // Unauthorized - token expired or invalid
          console.error('Unauthorized: Token mungkin expired atau invalid');
          if (!isBackgroundRefresh) {
            showError('Sesi Anda telah berakhir. Silakan login kembali.');
          }
        } else if (!isBackgroundRefresh) {
          showError('Gagal memuat laporan. Silakan coba lagi.');
        }
        setReports([]);
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received from server');
        console.error('Request URL:', error.config?.url);
        if (!isBackgroundRefresh) {
          showError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
          setReports([]);
        }
      } else if (!isBackgroundRefresh) {
        showError('Terjadi kesalahan. Silakan coba lagi.');
        setReports([]);
      } else {
        // Something else happened
        console.error('Error setting up request:', error.message);
        setReports([]);
      }
    } finally {
      setLoading(false);
    }
  }, [filter, filterKey, showError]);

  if (loading) return <ReportsListSkeleton count={5} />;

  if (!reports || reports.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center text-center">
        <div className="w-full max-w-md relative aspect-[16/9] overflow-hidden rounded-xl mb-6">
          <Image
            src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?q=80&w=1280&auto=format&fit=crop"
            alt="Ilustrasi warga di kompleks perumahan"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover rounded-xl"
            loading="lazy"
            quality={75}
          />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Belum ada laporan</h3>
        <p className="text-gray-600 text-base max-w-md">
          Mulai dengan membuat laporan baru di sisi kanan. Ceritakan masalahnya secara jelas agar cepat ditindaklanjuti.
        </p>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    <div className="space-y-4">
      {/* Realtime indicator */}
      {isRefreshing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center gap-2 text-sm text-blue-700 animate-pulse">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>Memperbarui data realtime...</span>
        </div>
      )}
      {reports.map((report) => (
        <Link
          key={report.id}
          href={`/reports/${report.id}`}
          className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition border border-gray-100 hover:border-gray-200"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-start gap-2 mb-1">
                <h3 className="font-semibold text-lg text-gray-900 flex-1">{report.title}</h3>
                {report.is_sensitive && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-semibold border border-orange-300">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    SENSITIF
                  </span>
                )}
              </div>
              <p className="text-gray-700 text-sm mt-1">
                {report.description.substring(0, 100)}...
              </p>
              
              {/* Informasi Pelapor - Transparan untuk Semua */}
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                {report.user_name && (
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium text-gray-700">{report.user_name}</span>
                  </div>
                )}
                {report.rt_rw && (
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{report.rt_rw}</span>
                  </div>
                )}
                {report.location && (
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate max-w-[150px]">{report.location}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-2 flex-wrap">
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
                {report.blockchain_tx_hash && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      // Hanya buka link jika bukan mock blockchain
                      if (!report.is_mock_blockchain) {
                      window.open(`https://amoy.polygonscan.com/tx/${report.blockchain_tx_hash}`, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all ${
                      report.is_mock_blockchain
                        ? 'bg-gray-400 text-white cursor-default'
                        : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 cursor-pointer'
                    }`}
                    title={report.is_mock_blockchain 
                      ? 'Tercatat di Blockchain (Mock - Demo Mode)' 
                      : 'Tercatat di Blockchain - Klik untuk verifikasi di Polygon Amoy Explorer'
                    }
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    On-Chain
                    {report.is_mock_blockchain && (
                      <span className="text-xs opacity-75">(Mock)</span>
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500 ml-4 text-right">
              <div>{new Date(report.created_at).toLocaleDateString('id-ID')}</div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(report.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
    </>
  );
}

export default memo(ReportsList);

