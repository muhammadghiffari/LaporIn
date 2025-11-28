'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from './Toast';
import { Image as ImageIcon, X, Upload } from 'lucide-react';

function CreateReportForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [blockchainHash, setBlockchainHash] = useState<string | null>(null);
  const [isSensitive, setIsSensitive] = useState(false); // Laporan sensitif/rahasia
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validasi ukuran file (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        error('Ukuran gambar maksimal 5MB');
        return;
      }
      
      // Validasi tipe file
      if (!file.type.startsWith('image/')) {
        error('File harus berupa gambar');
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [error]);

  const removeImage = useCallback(() => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Get current location using browser Geolocation API
  const getCurrentLocation = useCallback(() => {
    setIsGettingLocation(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError('Browser Anda tidak mendukung Geolocation API');
      setIsGettingLocation(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setLatitude(lat);
        setLongitude(lng);
        setIsGettingLocation(false);
        
        // Reverse geocoding untuk mendapatkan alamat dari koordinat
        try {
          const response = await api.get('/reports/reverse-geocode', {
            params: { latitude: lat, longitude: lng }
          });
          
          if (response.data.address) {
            setLocation(response.data.address);
            success('Lokasi berhasil didapatkan!');
          }
        } catch (err) {
          // Jika reverse geocoding gagal, tetap gunakan koordinat
          console.warn('Reverse geocoding failed:', err);
          setLocation(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setLocationError(
          err.code === 1
            ? 'Izin lokasi ditolak. Silakan aktifkan izin lokasi di browser Anda.'
            : 'Tidak dapat mendapatkan lokasi. Pastikan GPS aktif dan izin lokasi diberikan.'
        );
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validasi: Foto wajib diisi
      if (!imageFile) {
        error('Foto wajib diisi. Silakan ambil foto di tempat kejadian dengan GPS aktif.');
        setLoading(false);
        return;
      }

      // Convert image to base64
      const reader = new FileReader();
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const { data } = await api.post('/reports', { 
        title, 
        description, 
        location,
        latitude: latitude || undefined, // Send GPS coordinates
        longitude: longitude || undefined, // Send GPS coordinates
        imageUrl: imageBase64,
        isSensitive: isSensitive // Laporan sensitif/rahasia
      });
      
      // Handle location warning/mismatch
      if (data.locationWarning) {
        // Tampilkan warning/error untuk location mismatch atau warning lainnya
        if (data.locationMismatch) {
          error(data.locationWarning); // Error toast untuk location mismatch
        } else {
          // Warning toast untuk location warning lainnya (misalnya lokasi tidak disebutkan)
          // Note: useToast tidak punya warning method, pakai error dengan style berbeda
          error(data.locationWarning);
        }
      }

      // Handle photo validation warning
      if (data.photoWarning) {
        error(data.photoWarning); // Warning untuk validasi foto
      }
      
      // Broadcast event agar daftar laporan refresh dan auto-scroll top
      const txHash = data.blockchain_tx_hash || data.blockchainTxHash;
        window.dispatchEvent(
        new CustomEvent('report-created', { 
          detail: { 
            reportId: data.id,
            blockchainTxHash: txHash 
          } 
        })
        );
      setCreatedId(data.id);
      setBlockchainHash(txHash || null);
      setSuccessOpen(true);
      
      // Tampilkan pesan sukses (blockchain info hanya untuk admin, tidak ditampilkan ke warga)
      success('Laporan berhasil dibuat! Laporan Anda sedang diproses.');
      // Reset form setelah sukses
      setTitle('');
      setDescription('');
      setLocation('');
      setLatitude(null);
      setLongitude(null);
      setLocationError(null);
      setIsSensitive(false);
      removeImage();
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
      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200">
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
            Lokasi <span className="text-red-500">*</span>
            {latitude && longitude && (
              <span className="ml-2 text-xs text-green-600 font-normal">
                ✓ Koordinat GPS tersedia
              </span>
            )}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 text-sm sm:text-base"
              placeholder="Contoh: Jl. Merdeka No. 15, Blok C3"
              required
              readOnly={isGettingLocation}
            />
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="w-full sm:w-auto px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              title="Gunakan lokasi GPS saat ini"
            >
              {isGettingLocation ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="hidden sm:inline">Mengambil...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden sm:inline">GPS</span>
                </>
              )}
            </button>
          </div>
          {locationError && (
            <p className="mt-2 text-sm text-red-600">{locationError}</p>
          )}
          {latitude && longitude && (
            <p className="mt-1 text-xs text-gray-500">
              Koordinat: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          )}
          {!latitude && !longitude && (
            <p className="mt-1 text-xs text-amber-600">
              ⚠️ Rekomendasi: Klik tombol GPS untuk mendapatkan koordinat lokasi. Ini membantu validasi lokasi laporan.
            </p>
          )}
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Foto <span className="text-red-500">*</span>
            <span className="ml-2 text-xs text-amber-600 font-normal">
              ⚠️ Harus diambil di tempat kejadian
            </span>
          </label>
          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
            >
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Ambil foto di tempat kejadian</p>
              <p className="text-xs text-amber-600 font-medium mb-1">
                ⚠️ Pastikan GPS aktif dan ambil foto langsung dari kamera, bukan dari galeri
              </p>
              <p className="text-xs text-gray-400">Maksimal 5MB (JPG, PNG, GIF)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative">
              <div className="relative w-full h-64 rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-all"
                  aria-label="Hapus gambar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {imageFile?.name} ({((imageFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
              </p>
            </div>
          )}
        </div>

        {/* Laporan Sensitif/Rahasia */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="isSensitive"
              checked={isSensitive}
              onChange={(e) => setIsSensitive(e.target.checked)}
              className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
            />
            <label htmlFor="isSensitive" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm font-semibold text-orange-900">
                  Laporan Sensitif/Rahasia
                </span>
              </div>
              <p className="text-xs text-orange-800">
                Centang jika laporan ini bersifat sensitif. Hanya admin RT/RW yang dapat melihat laporan ini.
              </p>
            </label>
          </div>
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
              <h3 className="text-xl font-bold text-gray-900">Laporan Terkirim! ✅</h3>
              <p className="text-sm text-gray-600 mt-2">
                Laporan Anda telah diterima dan sedang diproses. Anda bisa melihatnya pada daftar laporan.
              </p>
              {/* Blockchain info hanya untuk admin, tidak ditampilkan ke warga */}
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

export default memo(CreateReportForm);

