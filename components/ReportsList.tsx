'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { ReportsListSkeleton } from './ReportSkeleton';

interface Report {
  id: number;
  title: string;
  description: string;
  urgency: string;
  status: string;
  created_at: string;
  category?: string;
  blockchain_tx_hash?: string;
}

interface ReportsListProps {
  filter?: Record<string, string>;
}

export default function ReportsList({ filter }: ReportsListProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const filterKey = JSON.stringify(filter || {});

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // Refresh when a new report is created
  useEffect(() => {
    const handler = () => {
      fetchReports().then(() => {
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    };
    window.addEventListener('report-created', handler as EventListener);
    return () => window.removeEventListener('report-created', handler as EventListener);
  }, [filterKey]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filter || {});
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
      if (error.response) {
        console.error('API Error Response:', error.response.data);
      }
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

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
            unoptimized
            priority
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
    <div className="space-y-4">
      {reports.map((report) => (
        <Link
          key={report.id}
          href={`/reports/${report.id}`}
          className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition border border-gray-100 hover:border-gray-200"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{report.title}</h3>
              <p className="text-gray-700 text-sm mt-1">
                {report.description.substring(0, 100)}...
              </p>
              <div className="flex gap-2 mt-2">
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
                  <a
                    onClick={(e) => e.stopPropagation()}
                    href={`https://mumbai.polygonscan.com/tx/${report.blockchain_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 hover:bg-purple-200"
                    title="Lihat di blockchain"
                  >
                    On-chain
                  </a>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {new Date(report.created_at).toLocaleDateString('id-ID')}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

