'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import Link from 'next/link';
import FaceCapture from '@/components/FaceCapture';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
import LaporInLogo from '@/components/LaporInLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState<'credentials' | 'face-verification'>('credentials');
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [faceError, setFaceError] = useState('');
  const [userHasFace, setUserHasFace] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [tempUser, setTempUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();
  const { toasts, showToast, success: showSuccess, error: showError, removeToast } = useToast();  

  // Fix hydration mismatch: hanya render setelah client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for registration success message from URL
  useEffect(() => {
    if (mounted) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('registered') === 'true') {
        const registeredEmail = params.get('email');
        if (registeredEmail) {
          setEmail(registeredEmail);
          showSuccess('Registrasi berhasil! Silakan login dengan email dan password Anda.');
          // Clean URL
          window.history.replaceState({}, '', '/login');
        }
      }
    }
  }, [mounted, showSuccess]);

  const handleFaceCaptured = (descriptor: number[]) => {
    setFaceDescriptor(descriptor);
    setFaceError('');
    // Kamera akan dimatikan otomatis oleh FaceCapture saat autoStart menjadi false
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFaceError('');
    setSuccess('');

    try {
      // Step 1: Login dengan email + password
      const response = await api.post('/auth/login', { email, password });
      
      // Check jika warga belum diverifikasi
      if (response.data.requiresVerification === true && response.data.isVerified === false) {
        const errorMsg = response.data.error || 'Akun Anda belum diverifikasi oleh Admin RT/RW. Silakan hubungi Admin RT/RW untuk melakukan verifikasi akun Anda terlebih dahulu.';
        setError(errorMsg);
        showError(errorMsg);
        return; // Stop, jangan lanjut login
      }
      
      // Save token and user temporarily (belum save ke localStorage)
      const token = response.data.token;
      const user = response.data.user;
      setTempToken(token);
      setTempUser(user);
      
      // Check if user has face registered using the login response
      // IMPORTANT: Check with strict equality untuk memastikan true/false, bukan truthy/falsy
      const hasFaceRegistered = Boolean(response.data.hasFaceRegistered) === true;
      const requiresFaceVerification = Boolean(response.data.requiresFaceVerification) === true;
      const hasFace = hasFaceRegistered || requiresFaceVerification;
      
      console.log('[Login Debug] Response data:', JSON.stringify(response.data, null, 2));
      console.log('[Login Debug] Face check:', {
        hasFaceRegistered,
        requiresFaceVerification,
        hasFace,
        rawHasFaceRegistered: response.data.hasFaceRegistered,
        rawRequiresFaceVerification: response.data.requiresFaceVerification
      });
      
      // Save temp data FIRST before any conditional
      setTempToken(token);
      setTempUser(user);
      setUserHasFace(hasFace);
      
      // CRITICAL: Jika user punya face registered, WAJIB verifikasi dulu sebelum ke dashboard!
      if (hasFace === true) {
        // Step 2: Move to face verification (JANGAN save token ke localStorage dulu!)
        console.log('[Login] ✅ User has face registered - MOVING TO FACE VERIFICATION STEP');
        console.log('[Login] ⚠️  NOT saving token yet - waiting for face verification');
        setStep('face-verification');
        // JANGAN push ke dashboard! JANGAN save token!
        // Wait for face verification to complete
        return; // Early return untuk prevent execution ke else block
      }
      
      // Hanya jika TIDAK punya face registered, baru save token dan ke dashboard
      console.log('[Login] ℹ️  User has no face registered - going directly to dashboard');
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      useAuthStore.setState({
        user: user,
        token: token,
        isAuthenticated: true,
        hasCheckedAuth: true,
      });
      showSuccess('Login berhasil! Selamat datang kembali.');
      router.push('/dashboard');
    } catch (err: any) {
      // Handle error khusus untuk warga yang belum diverifikasi
      if (err.response?.status === 403 && err.response?.data?.requiresVerification === true) {
        const errorMsg = err.response?.data?.error || 'Akun Anda belum diverifikasi oleh Admin RT/RW. Silakan hubungi Admin RT/RW untuk melakukan verifikasi akun Anda terlebih dahulu.';
        setError(errorMsg);
        showError(errorMsg);
      } else {
        const errorMsg = err.response?.data?.error || 'Email atau password salah.';
        setError(errorMsg);
        showError(errorMsg);
      }
      setTempToken(null);
      setTempUser(null);
    }
  };

  const handleFaceVerification = async () => {
    if (!faceDescriptor) {
      setFaceError('Silakan capture wajah terlebih dahulu');
      return;
    }

    if (!tempToken || !tempUser) {
      setFaceError('Session expired. Silakan login ulang.');
      setStep('credentials');
      return;
    }

    setIsVerifying(true);
    setFaceError('');

    try {
      // Set auth header dengan temp token
      api.defaults.headers.common['Authorization'] = `Bearer ${tempToken}`;

      const response = await api.post('/auth/verify-face', {
        faceDescriptor: JSON.stringify(faceDescriptor),
      });

      if (response.data.verified) {
        // Face verified successfully, save token dan user ke localStorage
          localStorage.setItem('token', tempToken);
          localStorage.setItem('user', JSON.stringify(tempUser));
        useAuthStore.setState({
          user: tempUser,
          token: tempToken,
          isAuthenticated: true,
          hasCheckedAuth: true,
        });
        
        showSuccess('Verifikasi wajah berhasil! Selamat datang kembali.');
        router.push('/dashboard');
      } else {
        const errorMsg = `Verifikasi wajah gagal. Distance: ${response.data.distance}, Threshold: ${response.data.threshold}. Silakan coba lagi.`;
        setFaceError(errorMsg);
        showError(errorMsg);
        setFaceDescriptor(null);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Face verification gagal';
      const details = err.response?.data?.details;
      const fullErrorMsg = details ? `${errorMsg} (Distance: ${details.distance})` : errorMsg;
      setFaceError(fullErrorMsg);
      showError(fullErrorMsg);
      setFaceDescriptor(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkipFaceVerification = () => {
    // Skip face verification - save token dan proceed (untuk development/fallback)
    if (tempToken && tempUser) {
        localStorage.setItem('token', tempToken);
        localStorage.setItem('user', JSON.stringify(tempUser));
      useAuthStore.setState({
        user: tempUser,
        token: tempToken,
        isAuthenticated: true,
        hasCheckedAuth: true,
      });
      router.push('/dashboard');
    } else {
      // No temp token, go back to credentials
      setStep('credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50" suppressHydrationWarning>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="max-w-md w-full space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-8 bg-white rounded-2xl shadow-xl border border-gray-100 animate-fade-in mx-4" suppressHydrationWarning>
        <div className="text-center" suppressHydrationWarning>
          <div className="flex justify-center mb-4" suppressHydrationWarning>
            <LaporInLogo size={80} showText={false} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            LaporIn
          </h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Masuk ke akun Anda
          </p>
        </div>

        {step === 'credentials' ? (
          <>
            {/* Step 1: Email & Password */}
            <div className="flex items-center justify-center mb-4" suppressHydrationWarning>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">1</div>
                <div className="h-1 w-12 bg-gray-300"></div>
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-semibold text-sm">2</div>
              </div>
            </div>

            <form onSubmit={handleCredentialsSubmit} className="space-y-6" suppressHydrationWarning>
              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg animate-fade-in" suppressHydrationWarning>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{success}</span>
                  </div>
                </div>
              )}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg animate-fade-in" suppressHydrationWarning>
                  <div className="flex items-center">
                    <span className="font-medium">⚠️ {error}</span>
                  </div>
                </div>
              )}

              <div suppressHydrationWarning>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  placeholder="nama@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>

              <div suppressHydrationWarning>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  placeholder="Masukkan password Anda"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Masuk
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Step 2: Face Verification */}
            <div className="flex items-center justify-center mb-4" suppressHydrationWarning>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="h-1 w-12 bg-green-500"></div>
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">2</div>
              </div>
            </div>

            <div className="space-y-6" suppressHydrationWarning>
              <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-3 rounded-lg" suppressHydrationWarning>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Verifikasi Wajah (Wajib - 2FA)</p>
                    <p className="text-xs text-blue-700 mt-1">Email dan password sudah benar. Anda telah mendaftarkan wajah, silakan verifikasi wajah Anda untuk melanjutkan ke dashboard.</p>
                  </div>
                </div>
              </div>

              {faceError && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg animate-fade-in" suppressHydrationWarning>
                  <div className="flex items-center">
                    <span className="font-medium text-sm">⚠️ {faceError}</span>
                  </div>
                </div>
              )}

              <div suppressHydrationWarning>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Verifikasi Wajah
                </label>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  {step === 'face-verification' && !faceDescriptor && (
                    <FaceCapture
                      onFaceCaptured={handleFaceCaptured}
                      onError={(error) => setFaceError(error)}
                      autoStart={true}
                      hideAfterCapture={true}
                    />
                  )}
                  {faceDescriptor && (
                    <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Wajah berhasil di-capture. Klik "Verifikasi" untuk melanjutkan.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3" suppressHydrationWarning>
                <button
                  type="button"
                  onClick={handleSkipFaceVerification}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                >
                  Lewati
                </button>
                <button
                  type="button"
                  onClick={handleFaceVerification}
                  disabled={!faceDescriptor || isVerifying}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Verifikasi</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
        <div className="text-center text-sm text-gray-600" suppressHydrationWarning>
          Belum punya akun?{' '}
          <Link href="/register" className="text-blue-600 hover:text-blue-800 font-semibold transition-colors">
            Daftar sebagai Warga
          </Link>
        </div>
      </div>
    </div>
  );
};