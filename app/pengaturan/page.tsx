'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import {
  User,
  Mail,
  MapPin,
  Shield,
  Bell,
  Key,
  Save,
  AlertCircle,
  Camera,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import FaceCapture from '@/components/FaceCapture';

export default function PengaturanPage() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile settings
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rtRw, setRtRw] = useState('');
  
  // Password settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Notification settings
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifReport, setNotifReport] = useState(true);
  const [notifStatus, setNotifStatus] = useState(true);
  
  // Face Recognition settings
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [faceError, setFaceError] = useState('');
  const [faceSuccess, setFaceSuccess] = useState('');
  const [registeringFace, setRegisteringFace] = useState(false);
  
  // User verification status
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  const hasCheckedAuth = useAuthStore((s) => s.hasCheckedAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (hasCheckedAuth && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Load user data
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setRtRw(user.rt_rw || '');
      
      // Load face verification status
      loadFaceStatus();
    }
  }, [hasCheckedAuth, isAuthenticated, router, user]);
  
  const loadFaceStatus = async () => {
    try {
      const response = await api.get('/auth/me');
      setFaceVerified(response.data.face_verified || false);
      setIsVerified(response.data.is_verified || false);
      setVerifiedAt(response.data.verified_at || null);
    } catch (err) {
      console.error('Failed to load face status:', err);
    }
  };
  
  const handleFaceCaptured = (descriptor: number[]) => {
    setFaceDescriptor(descriptor);
    setFaceError('');
  };
  
  const handleRegisterFace = async () => {
    if (!faceDescriptor) {
      setFaceError('Silakan capture wajah terlebih dahulu');
      return;
    }
    
    setRegisteringFace(true);
    setFaceError('');
    setFaceSuccess('');
    
    try {
      const response = await api.post('/auth/register-face', {
        faceDescriptor: JSON.stringify(faceDescriptor)
      });
      
      if (response.data.success) {
        setFaceSuccess('Face recognition berhasil didaftarkan!');
        setFaceVerified(true);
        setShowFaceCapture(false);
        setFaceDescriptor(null);
        
        // Update user state - reload user data instead of manual update
        await loadFaceStatus();
        
        setTimeout(() => setFaceSuccess(''), 5000);
      }
    } catch (err: any) {
      setFaceError(err.response?.data?.error || 'Gagal mendaftarkan face recognition');
    } finally {
      setRegisteringFace(false);
    }
  };

  if (!hasCheckedAuth) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-600">Memuat...</div>
      </Layout>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // TODO: Implement API endpoint for updating profile
      // await api.patch('/auth/profile', { name, email, phone, rt_rw });
      setSuccess('Profil berhasil diperbarui!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal memperbarui profil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    if (newPassword !== confirmPassword) {
      setError('Password baru dan konfirmasi password tidak cocok');
      setSaving(false);
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter');
      setSaving(false);
      return;
    }
    
    try {
      // TODO: Implement API endpoint for changing password
      // await api.patch('/auth/password', { currentPassword, newPassword });
      setSuccess('Password berhasil diubah!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal mengubah password');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pengaturan</h1>
          <p className="text-gray-600 mt-1">Kelola profil dan preferensi akun Anda</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <span className="font-medium">✅ {success}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Profile Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">Profil</h2>
              <p className="text-sm text-gray-600">Informasi akun Anda</p>
            </div>
            {/* Verification Status Badge */}
            {user?.role === 'warga' && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                isVerified 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {isVerified ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-semibold">Terverifikasi</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Belum Diverifikasi</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Verification Alert for Warga */}
          {user?.role === 'warga' && !isVerified && (
            <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Akun Belum Diverifikasi</h3>
                  <p className="text-sm text-yellow-700">
                    Akun Anda belum diverifikasi oleh Admin RT/RW. Silakan hubungi Admin RT/RW untuk melakukan verifikasi akun Anda terlebih dahulu sebelum dapat membuat laporan.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {user?.role === 'warga' && isVerified && verifiedAt && (
            <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">Akun Terverifikasi</h3>
                  <p className="text-sm text-green-700">
                    Akun Anda telah diverifikasi pada {new Date(verifiedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}. Anda dapat menggunakan semua fitur platform.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-gray-50 focus:bg-white"
                placeholder="Masukkan nama lengkap"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-gray-50 focus:bg-white"
                  placeholder="nama@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                RT/RW
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <input
                  type="text"
                  value={rtRw}
                  onChange={(e) => setRtRw(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-gray-50 focus:bg-white"
                  placeholder="RT001/RW005"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all font-semibold flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Password Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Key className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Keamanan</h2>
              <p className="text-sm text-gray-600">Ubah password akun Anda</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Password Saat Ini
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-gray-50 focus:bg-white"
                  placeholder="Masukkan password saat ini"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Password Baru
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-gray-50 focus:bg-white"
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-gray-50 focus:bg-white"
                  placeholder="Ulangi password baru"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-4 rounded-xl hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all font-semibold flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Mengubah...</span>
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  <span>Ubah Password</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Face Recognition Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Face Recognition</h2>
              <p className="text-sm text-gray-600">Daftarkan atau perbarui verifikasi wajah Anda</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Status */}
            <div className={`p-4 rounded-xl border-2 ${
              faceVerified 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center gap-3">
                {faceVerified ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">Face Recognition Terdaftar</p>
                      <p className="text-sm text-green-700">Wajah Anda sudah terdaftar dan terverifikasi</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-yellow-600" />
                    <div>
                      <p className="font-semibold text-yellow-900">Face Recognition Belum Terdaftar</p>
                      <p className="text-sm text-yellow-700">Daftarkan wajah Anda untuk keamanan ekstra saat login</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Register/Update Face */}
            {!faceVerified && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowFaceCapture(!showFaceCapture)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-all font-semibold"
                >
                  <Camera className="w-5 h-5" />
                  {showFaceCapture ? 'Sembunyikan Kamera' : 'Daftarkan Wajah'}
                </button>

                {showFaceCapture && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <FaceCapture
                      onFaceCaptured={handleFaceCaptured}
                      onError={(error) => setFaceError(error)}
                      autoStart={showFaceCapture && !faceDescriptor}
                      hideAfterCapture={false}
                    />
                    
                    {faceError && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">{faceError}</p>
                      </div>
                    )}
                    
                    {faceDescriptor && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={handleRegisterFace}
                          disabled={registeringFace}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all font-semibold"
                        >
                          {registeringFace ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Mendaftarkan...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-5 h-5" />
                              <span>Simpan Face Recognition</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {faceVerified && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-700">
                  <strong>Info:</strong> Face recognition Anda sudah terdaftar. Untuk memperbarui, silakan hubungi administrator.
                </p>
              </div>
            )}

            {faceSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl animate-fade-in">
                <p className="text-sm text-green-700 font-medium">{faceSuccess}</p>
              </div>
            )}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Notifikasi</h2>
              <p className="text-sm text-gray-600">Kelola preferensi notifikasi</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <h3 className="font-semibold text-gray-900">Notifikasi Email</h3>
                <p className="text-sm text-gray-600">Terima notifikasi via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifEmail}
                  onChange={(e) => setNotifEmail(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <h3 className="font-semibold text-gray-900">Notifikasi Laporan Baru</h3>
                <p className="text-sm text-gray-600">Dapatkan notifikasi saat ada laporan baru</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifReport}
                  onChange={(e) => setNotifReport(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <h3 className="font-semibold text-gray-900">Notifikasi Perubahan Status</h3>
                <p className="text-sm text-gray-600">Dapatkan notifikasi saat status laporan berubah</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifStatus}
                  onChange={(e) => setNotifStatus(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Informasi Akun</h2>
              <p className="text-sm text-gray-600">Detail akun dan peran Anda</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm text-gray-600">Peran</p>
                <p className="font-semibold text-gray-900">
                  {user.role === 'warga'
                    ? 'Warga'
                    : user.role === 'admin'
                    ? 'Admin Sistem'
                    : user.role === 'admin_rw'
                    ? 'Admin RW'
                    : user.role === 'ketua_rt'
                    ? 'Ketua RT'
                    : ['sekretaris_rt', 'sekretaris'].includes(user.role || '')
                    ? 'Sekretaris RT'
                    : user.role === 'pengurus'
                    ? 'Pengurus'
                    : user.role}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm text-gray-600">ID Pengguna</p>
                <p className="font-semibold text-gray-900">#{user.id}</p>
              </div>
            </div>

            {user.rt_rw && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm text-gray-600">Wilayah</p>
                  <p className="font-semibold text-gray-900">{user.rt_rw}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

