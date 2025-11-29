'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import Link from 'next/link';
import FaceCapture from '@/components/FaceCapture';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rtRw, setRtRw] = useState('RT001/RW005');
  const [jenisKelamin, setJenisKelamin] = useState('');
  const [error, setError] = useState('');
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [showFaceCapture, setShowFaceCapture] = useState(true); // Auto show untuk wajib
  const [faceError, setFaceError] = useState('');
  const { register } = useAuthStore();
  const router = useRouter();
  const { toasts, success, error: showError, removeToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Cleanup kamera saat unmount atau navigate away
  useEffect(() => {
    return () => {
      console.log('[RegisterPage] Cleaning up camera on unmount...');
      // Matikan semua media streams
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('[RegisterPage] Camera track stopped');
        });
        videoRef.current.srcObject = null;
      }
      // Juga cek navigator.mediaDevices untuk memastikan semua stream dimatikan
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(() => {
          // Ignore errors
        });
    };
  }, []);

  const handleFaceCaptured = (descriptor: number[]) => {
    setFaceDescriptor(descriptor);
    setFaceError('');
    // Jangan tutup kamera setelah capture - biarkan tetap hidup untuk ambil ulang jika perlu
    // setShowFaceCapture(false); // REMOVED - keep camera visible
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFaceError('');
    
    // WAJIB face recognition untuk registrasi
    if (!faceDescriptor) {
      const errorMsg = 'Wajib mendaftarkan wajah untuk keamanan akun';
      setFaceError(errorMsg);
      showError(errorMsg);
      setShowFaceCapture(true);
      return;
    }
    
    try {
      // Register dengan face descriptor (WAJIB)
      const response = await api.post('/auth/register', {
        email,
        password,
        name,
        role: 'warga',
        rt_rw: rtRw,
        jenis_kelamin: jenisKelamin,
        faceDescriptor: JSON.stringify(faceDescriptor), // Wajib ada
      });

      success('Registrasi berhasil! Silakan login dengan email dan password Anda.');
      // Redirect ke login dengan success message
      setTimeout(() => {
        router.push('/login?registered=true&email=' + encodeURIComponent(email));
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Gagal mendaftar. Email mungkin sudah terdaftar.';
      setError(errorMsg);
      showError(errorMsg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl border border-gray-100 animate-fade-in">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">L</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Daftar Akun Warga</h2>
          <p className="mt-2 text-gray-600">Bergabung untuk membuat laporan</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg animate-fade-in">
              <div className="flex items-center">
                <span className="font-medium">⚠️ {error}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400"
              placeholder="Masukkan nama lengkap"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400"
              placeholder="nama@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400"
              placeholder="Minimal 6 karakter"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              RT/RW
            </label>
            <input
              type="text"
              value={rtRw}
              onChange={(e) => setRtRw(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400"
              placeholder="RT001/RW005"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Jenis Kelamin
            </label>
            <select
              value={jenisKelamin}
              onChange={(e) => setJenisKelamin(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 bg-white"
              required
            >
              <option value="">Pilih Jenis Kelamin</option>
              <option value="laki_laki">Laki-laki</option>
              <option value="perempuan">Perempuan</option>
            </select>
          </div>

          {/* Face Recognition Section (WAJIB) */}
          <div className="border-t border-gray-200 pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Face Recognition <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500">
                  Wajib mendaftarkan wajah untuk keamanan dan verifikasi akun
                </p>
              </div>
              {faceDescriptor && (
                <div className="px-3 py-1.5 text-xs rounded-lg font-medium bg-green-100 text-green-800">
                  ✓ Terdaftar
                </div>
              )}
            </div>

            <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              {showFaceCapture && (
                <FaceCapture
                  onFaceCaptured={handleFaceCaptured}
                  onError={(error) => setFaceError(error)}
                  autoStart={!faceDescriptor}
                  hideAfterCapture={false}
                  videoRef={videoRef}
                />
              )}
              {faceError && (
                <p className="mt-2 text-xs text-red-600 font-medium">{faceError}</p>
              )}
              {faceDescriptor && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Face descriptor berhasil direkam - Siap untuk registrasi
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFaceDescriptor(null);
                      setFaceError('');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 underline"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Ambil Ulang Wajah
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!faceDescriptor}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {faceDescriptor ? 'Daftar' : 'Daftar Wajah Terlebih Dahulu'}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-800 font-semibold transition-colors">
            Masuk
          </Link>
        </div>
      </div>
    </div>
  );
}


