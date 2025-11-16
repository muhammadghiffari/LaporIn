'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from './Toast';

export default function CreateReportForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const router = useRouter();
  const { toasts, success, error, removeToast } = useToast();

  // Listen untuk data dari chatbot
  useEffect(() => {
    const handleChatData = (e: CustomEvent) => {
      const data = e.detail as { title?: string; description?: string; location?: string; category?: string; urgency?: string };
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.location) setLocation(data.location);
      
      // Optional: scroll ke form jika di bawah
      setTimeout(() => {
        const form = document.querySelector('form');
        form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    };

    window.addEventListener('chat-report-data', handleChatData as EventListener);
    return () => {
      window.removeEventListener('chat-report-data', handleChatData as EventListener);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await api.post('/reports', { title, description, location });
      // Broadcast event agar daftar laporan refresh dan auto-scroll top
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('report-created', { detail: { reportId: data.id } })
        );
      }
      setCreatedId(data.id);
      setSuccessOpen(true);
      success('Laporan berhasil dibuat!');
      // Reset form setelah sukses
      setTitle('');
      setDescription('');
      setLocation('');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || 'Gagal membuat laporan. Silakan coba lagi.';
      error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Judul Laporan
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
            placeholder="Contoh: Got mampet di Blok C3"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Deskripsi
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 resize-none"
            placeholder="Jelaskan masalahnya secara detail..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Lokasi
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
            placeholder="Contoh: Jl. Merdeka No. 15, Blok C3"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all font-semibold flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Mengirim...</span>
            </>
          ) : (
            'Kirim Laporan'
          )}
        </button>
      </form>

      {/* Success Modal */}
      {successOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in border border-gray-200">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Laporan Terkirim!</h3>
              <p className="text-sm text-gray-600 mt-2">
                Laporan Anda telah diterima dan sedang diproses. Anda bisa melihatnya pada daftar laporan.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSuccessOpen(false)}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  if (createdId) router.push(`/reports/${createdId}`);
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
              >
                Lihat Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

