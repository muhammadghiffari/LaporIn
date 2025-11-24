'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, useLoadScript, Marker, Circle, Polygon, InfoWindow } from '@react-google-maps/api';
import useAuthStore from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { MapPin, AlertCircle, CheckCircle2, Clock, XCircle, Settings, Save, FileText } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: -6.2088, // Jakarta default
  lng: 106.8456
};

interface Report {
  id: number;
  title: string;
  description: string;
  location: string;
  lat: number;
  lng: number;
  locationMismatch: boolean;
  locationDistance?: number;
  geocodeConfidence?: string; // ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE
  category: string;
  urgency: string;
  status: string;
  createdAt: string;
  userName: string;
  rtRw: string;
}

interface RTRwBoundary {
  center: {
    lat: number;
    lng: number;
  };
  radius?: number;
  polygon?: Array<{ lat: number; lng: number }>;
}

export default function PetaLaporanPage() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [totalReports, setTotalReports] = useState(0); // Total semua reports
  const [rtRwBoundary, setRtRwBoundary] = useState<RTRwBoundary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(13);
  const [isSettingBoundary, setIsSettingBoundary] = useState(false);
  const [newBoundaryCenter, setNewBoundaryCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [newBoundaryRadius, setNewBoundaryRadius] = useState<number>(500);
  const { toasts, success: showSuccess, error: showError, removeToast } = useToast();

  const allowedRoles = ['admin_sistem', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'];
  const canSetBoundary = ['admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris'].includes(user?.role || '');
  const isPengurus = allowedRoles.includes(user?.role || '');
  const isAdminRW = user?.role === 'admin_rw';
  const isKetuaRT = ['ketua_rt'].includes(user?.role || '');
  const isSekretaris = ['sekretaris_rt', 'sekretaris'].includes(user?.role || '');
  
  // State untuk filter RT (hanya untuk Admin RW)
  const [rtFilter, setRtFilter] = useState<string>('');
  const [rtList, setRtList] = useState<Array<{rt: string, rtRw: string, label: string}>>([]);

  // Google Maps API Key - harus dipanggil sebelum early return
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Use useLoadScript hook - HARUS dipanggil sebelum early return untuk mematuhi Rules of Hooks
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: googleMapsApiKey,
    libraries: ['places'] // Optional: jika perlu Places API
  });

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  const hasCheckedAuth = useAuthStore((s) => s.hasCheckedAuth);
  useEffect(() => {
    if (mounted && hasCheckedAuth && !isAuthenticated) {
      router.push('/login');
    }
    if (mounted && hasCheckedAuth && isAuthenticated && !isPengurus) {
      router.push('/dashboard');
    }
  }, [mounted, hasCheckedAuth, isAuthenticated, isPengurus, router]);

  // Fetch RT list untuk Admin RW
  useEffect(() => {
    if (!mounted || !isAdminRW) return;
    
    const fetchRtList = async () => {
      try {
        const { data } = await api.get('/reports/stats/rt-list');
        setRtList(data.rtList || []);
      } catch (e: any) {
        console.error('Error fetching RT list:', e);
      }
    };
    fetchRtList();
  }, [mounted, isAdminRW]);

  // Fetch map data function - HARUS didefinisikan sebelum useEffect yang menggunakannya
  const fetchMapData = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/reports/map';
      if (isAdminRW && rtFilter) {
        url += `?rtFilter=${rtFilter}`;
      }
      const response = await api.get(url);
      // Gunakan reportsWithCoords jika ada, fallback ke reports
      setReports(response.data.reportsWithCoords || response.data.reports || []);
      setTotalReports(response.data.total || 0);
      setRtRwBoundary(response.data.rtRwBoundary || null);
      
      // Set map center ke RT/RW center atau first report
      if (response.data.rtRwBoundary?.center) {
        setMapCenter(response.data.rtRwBoundary.center);
        setMapZoom(15);
      } else if (response.data.reports && response.data.reports.length > 0) {
        // Cari report pertama yang punya koordinat
        const reportWithCoords = response.data.reports.find((r: Report) => r.lat && r.lng);
        if (reportWithCoords) {
          setMapCenter({
            lat: reportWithCoords.lat,
            lng: reportWithCoords.lng
          });
          setMapZoom(14);
        }
      }
    } catch (error: any) {
      console.error('Error fetching map data:', error);
      showError('Gagal memuat data peta');
    } finally {
      setLoading(false);
    }
  }, [isAdminRW, rtFilter, showError]);

  useEffect(() => {
    if (mounted && isAuthenticated && isPengurus) {
      fetchMapData();
    }
  }, [mounted, isAuthenticated, isPengurus, fetchMapData]);

  // Early return untuk menghindari hydration mismatch - HARUS setelah semua hooks
  if (!mounted) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen" suppressHydrationWarning>
          <div className="text-center" suppressHydrationWarning>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" suppressHydrationWarning></div>
            <p className="mt-4 text-gray-600">Memuat...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleMapClick = (e: any) => {
    if (isSettingBoundary && e?.latLng) {
      setNewBoundaryCenter({
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      });
    }
  };

  const handleSaveBoundary = async () => {
    if (!newBoundaryCenter) {
      showError('Klik di peta untuk set lokasi center RT/RW');
      return;
    }

    try {
      await api.post('/reports/admin/rt-rw/set-location', {
        latitude: newBoundaryCenter.lat,
        longitude: newBoundaryCenter.lng,
        radius: newBoundaryRadius,
        polygon: null // TODO: Support polygon later
      });
      
      showSuccess('Lokasi RT/RW berhasil di-set');
      setIsSettingBoundary(false);
      setNewBoundaryCenter(null);
      fetchMapData(); // Refresh data
    } catch (error: any) {
      console.error('Error setting boundary:', error);
      showError(error.response?.data?.error || 'Gagal menyimpan lokasi RT/RW');
    }
  };

  const getMarkerIcon = (report: Report) => {
    // Pastikan google.maps sudah tersedia
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      // Fallback icon jika Google Maps belum dimuat
      return undefined; // Gunakan default marker
    }
    
    if (report.locationMismatch) {
      return {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#EF4444',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        scale: 8
      };
    }
    
    const statusColors: Record<string, string> = {
      pending: '#F59E0B',
      in_progress: '#3B82F6',
      resolved: '#10B981',
      completed: '#10B981',
      cancelled: '#6B7280',
      rejected: '#EF4444'
    };
    
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: statusColors[report.status] || '#6B7280',
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 7
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <MapPin className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!mounted || !hasCheckedAuth) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen" suppressHydrationWarning>
          <div className="text-center" suppressHydrationWarning>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" suppressHydrationWarning></div>
            <p className="mt-4 text-gray-600">Memuat...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated || !isPengurus) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen" suppressHydrationWarning>
          <div className="text-center" suppressHydrationWarning>
            <p className="text-gray-600">Akses ditolak</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Component untuk map (dipisah untuk menghindari re-render)
  const MapComponent = () => {
    if (loadError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50" suppressHydrationWarning>
          <div className="text-center" suppressHydrationWarning>
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Gagal memuat Google Maps</p>
            <p className="text-sm text-gray-500 mt-2">Periksa API key atau koneksi internet</p>
          </div>
        </div>
      );
    }

    if (!isLoaded) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50" suppressHydrationWarning>
          <div className="text-center" suppressHydrationWarning>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" suppressHydrationWarning></div>
            <p className="mt-4 text-gray-600">Memuat Google Maps...</p>
          </div>
        </div>
      );
    }

    return (
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={mapZoom}
        onClick={handleMapClick}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true
        }}
      >
        {/* RT/RW Boundary Circle */}
        {rtRwBoundary?.center && rtRwBoundary.radius && (
          <Circle
            center={rtRwBoundary.center}
            radius={rtRwBoundary.radius}
            options={{
              fillColor: '#3B82F6',
              fillOpacity: 0.2,
              strokeColor: '#3B82F6',
              strokeOpacity: 0.8,
              strokeWeight: 2
            }}
          />
        )}

        {/* RT/RW Boundary Polygon */}
        {rtRwBoundary?.polygon && rtRwBoundary.polygon.length > 0 && (
          <Polygon
            paths={rtRwBoundary.polygon}
            options={{
              fillColor: '#3B82F6',
              fillOpacity: 0.2,
              strokeColor: '#3B82F6',
              strokeOpacity: 0.8,
              strokeWeight: 2
            }}
          />
        )}

        {/* RT/RW Center Marker */}
        {rtRwBoundary?.center && typeof window !== 'undefined' && window.google?.maps && (
          <Marker
            position={rtRwBoundary.center}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#3B82F6',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
              scale: 10
            }}
            title="Lokasi RT/RW"
          />
        )}

        {/* New Boundary Center (saat setting) */}
        {isSettingBoundary && newBoundaryCenter && typeof window !== 'undefined' && window.google?.maps && (
          <>
            <Marker
              position={newBoundaryCenter}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: '#10B981',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 3,
                scale: 10
              }}
              title="Lokasi RT/RW Baru"
            />
            <Circle
              center={newBoundaryCenter}
              radius={newBoundaryRadius}
              options={{
                fillColor: '#10B981',
                fillOpacity: 0.2,
                strokeColor: '#10B981',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                strokeDasharray: '5, 5'
              }}
            />
          </>
        )}

        {/* Report Markers */}
        {reports
          .filter(report => report.lat && report.lng) // Hanya tampilkan reports dengan koordinat
          .map((report) => {
            const icon = typeof window !== 'undefined' && window.google?.maps 
              ? getMarkerIcon(report) 
              : undefined;
            return (
              <Marker
                key={report.id}
                position={{ lat: report.lat, lng: report.lng }}
                icon={icon}
                onClick={() => setSelectedReport(report)}
                title={report.title}
              />
            );
          })}

        {/* Info Window */}
        {selectedReport && (
          <InfoWindow
            position={{ lat: selectedReport.lat, lng: selectedReport.lng }}
            onCloseClick={() => setSelectedReport(null)}
          >
            <div className="p-3 max-w-sm" suppressHydrationWarning>
              {/* Title */}
              <h3 className="font-bold text-gray-900 mb-2 text-sm leading-tight">{selectedReport.title}</h3>
              
              {/* Description */}
              <p className="text-xs text-gray-600 mb-3 line-clamp-3">{selectedReport.description}</p>
              
              {/* Location */}
              <div className="flex items-start gap-2 text-xs text-gray-700 mb-2 pb-2 border-b border-gray-200">
                <MapPin className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">{selectedReport.location}</span>
                  {selectedReport.geocodeConfidence && (
                    <div className="mt-1 flex items-center gap-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        selectedReport.geocodeConfidence === 'ROOFTOP' 
                          ? 'bg-green-100 text-green-700' 
                          : selectedReport.geocodeConfidence === 'RANGE_INTERPOLATED'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedReport.geocodeConfidence === 'ROOFTOP' 
                          ? '✓ Akurat' 
                          : selectedReport.geocodeConfidence === 'RANGE_INTERPOLATED'
                          ? '⚠ Perkiraan'
                          : '? Perkiraan kasar'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Location Mismatch Warning */}
              {selectedReport.locationMismatch && (
                <div className="flex items-center gap-2 text-xs text-red-600 mb-2 p-2 bg-red-50 rounded border border-red-200">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Lokasi di luar RT/RW ({selectedReport.locationDistance}m dari pusat)</span>
                </div>
              )}
              
              {/* Low Confidence Warning */}
              {selectedReport.geocodeConfidence && 
               !['ROOFTOP', 'RANGE_INTERPOLATED'].includes(selectedReport.geocodeConfidence) && (
                <div className="flex items-center gap-2 text-xs text-amber-600 mb-2 p-2 bg-amber-50 rounded border border-amber-200">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Koordinat ini adalah perkiraan. Alamat mungkin tidak tepat karena terlalu umum.</span>
                </div>
              )}
              
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* Status */}
                <div className="flex items-center gap-1.5 text-xs">
                  {getStatusIcon(selectedReport.status)}
                  <span className="font-medium text-gray-700">
                    {selectedReport.status === 'pending' ? 'Menunggu' :
                     selectedReport.status === 'in_progress' ? 'Diproses' :
                     selectedReport.status === 'resolved' ? 'Selesai' :
                     selectedReport.status === 'rejected' ? 'Ditolak' :
                     selectedReport.status === 'cancelled' ? 'Dibatalkan' : selectedReport.status}
                  </span>
                </div>
                
                {/* Category */}
                {selectedReport.category && (
                  <div className="text-xs">
                    <span className="text-gray-500">Kategori:</span>
                    <span className="ml-1 font-medium text-gray-700 capitalize">{selectedReport.category}</span>
                  </div>
                )}
                
                {/* Urgency */}
                {selectedReport.urgency && (
                  <div className="text-xs">
                    <span className="text-gray-500">Urgensi:</span>
                    <span className={`ml-1 font-medium ${
                      selectedReport.urgency === 'high' ? 'text-red-600' :
                      selectedReport.urgency === 'medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {selectedReport.urgency === 'high' ? 'Tinggi' :
                       selectedReport.urgency === 'medium' ? 'Sedang' :
                       'Rendah'}
                    </span>
                  </div>
                )}
                
                {/* RT/RW */}
                {selectedReport.rtRw && (
                  <div className="text-xs">
                    <span className="text-gray-500">RT/RW:</span>
                    <span className="ml-1 font-medium text-gray-700">{selectedReport.rtRw}</span>
                  </div>
                )}
              </div>
              
              {/* Pelapor & Waktu */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>{selectedReport.userName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(selectedReport.createdAt).toLocaleDateString('id-ID', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              </div>
              
              {/* Action Button */}
              <button
                onClick={() => {
                  router.push(`/reports/${selectedReport.id}`);
                  setSelectedReport(null);
                }}
                className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md"
              >
                Lihat Detail Lengkap →
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    );
  };

  return (
    <Layout>
      <div className="flex flex-col h-screen" suppressHydrationWarning>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4" suppressHydrationWarning>
          <div className="flex items-center justify-between flex-wrap gap-4" suppressHydrationWarning>
            <div suppressHydrationWarning>
              <h1 className="text-2xl font-bold text-gray-900">Peta Monitoring Laporan</h1>
              <p className="text-sm text-gray-600 mt-1">
                {reports.length} dari {totalReports} laporan dengan koordinat GPS
                {isAdminRW && rtFilter && (
                  <span className="ml-2 text-blue-600 font-medium">
                    (Filter: {rtList.find(rt => rt.rt === rtFilter)?.label || rtFilter})
                  </span>
                )}
                {isAdminRW && !rtFilter && (
                  <span className="ml-2 text-blue-600 font-medium">
                    (Semua RT dalam RW Anda)
                  </span>
                )}
                {(isKetuaRT || isSekretaris) && (
                  <span className="ml-2 text-green-600 font-medium">
                    (RT/RW Anda)
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isAdminRW && !rtFilter && 'Gunakan filter di atas untuk melihat laporan per RT tertentu'}
                {isAdminRW && rtFilter && `Menampilkan laporan dari ${rtList.find(rt => rt.rt === rtFilter)?.label || rtFilter} saja`}
                {(isKetuaRT || isSekretaris) && 'Anda hanya melihat laporan dari RT/RW yang Anda naungi. Tidak ada filter karena Anda hanya menaungi satu RT.'}
                {user?.role === 'admin_sistem' && 'Anda melihat semua laporan dari seluruh RT/RW dalam sistem'}
              </p>
            </div>
            
            <div className="flex items-center gap-3" suppressHydrationWarning>
              {/* Filter RT untuk Admin RW */}
              {isAdminRW && rtList.length > 0 && (
                <select
                  value={rtFilter}
                  onChange={(e) => setRtFilter(e.target.value)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-gray-400 transition-colors font-medium shadow-sm"
                >
                  <option value="">Semua RT</option>
                  {rtList.map((rt) => (
                    <option key={rt.rt} value={rt.rt}>
                      {rt.label}
                    </option>
                  ))}
                </select>
              )}
              
            {canSetBoundary && (
              <div className="flex items-center gap-3" suppressHydrationWarning>
                {isSettingBoundary ? (
                  <>
                    <div className="flex items-center gap-2" suppressHydrationWarning>
                      <input
                        type="number"
                        value={newBoundaryRadius}
                        onChange={(e) => setNewBoundaryRadius(parseFloat(e.target.value) || 500)}
                        className="px-3 py-2 border border-gray-300 rounded-lg w-32"
                        placeholder="Radius (meter)"
                        min="100"
                        max="5000"
                      />
                      <button
                        onClick={handleSaveBoundary}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Save className="h-4 w-4" />
                        Simpan
                      </button>
                      <button
                        onClick={() => {
                          setIsSettingBoundary(false);
                          setNewBoundaryCenter(null);
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setIsSettingBoundary(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Set Lokasi RT/RW
                  </button>
                )}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative" suppressHydrationWarning>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50" suppressHydrationWarning>
              <div className="text-center" suppressHydrationWarning>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" suppressHydrationWarning></div>
                <p className="mt-4 text-gray-600">Memuat peta...</p>
              </div>
            </div>
          ) : googleMapsApiKey ? (
            <MapComponent />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50" suppressHydrationWarning>
              <div className="text-center" suppressHydrationWarning>
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">Google Maps API Key tidak ditemukan</p>
                <p className="text-sm text-gray-500 mt-2">
                  Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY di .env.local
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Stats */}
        <div className="bg-white border-t border-gray-200 px-6 py-4" suppressHydrationWarning>
          <div className="grid grid-cols-4 gap-4" suppressHydrationWarning>
            <div className="text-center" suppressHydrationWarning>
              <div className="text-2xl font-bold text-gray-900">{reports.length}</div>
              <div className="text-sm text-gray-600">Total Laporan</div>
            </div>
            <div className="text-center" suppressHydrationWarning>
              <div className="text-2xl font-bold text-amber-500">
                {reports.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center" suppressHydrationWarning>
              <div className="text-2xl font-bold text-red-500">
                {reports.filter(r => r.locationMismatch).length}
              </div>
              <div className="text-sm text-gray-600">Lokasi Mismatch</div>
            </div>
            <div className="text-center" suppressHydrationWarning>
              <div className="text-2xl font-bold text-green-500">
                {reports.filter(r => r.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Selesai</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

