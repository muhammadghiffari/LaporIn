'use client';

import { useEffect, useState, useCallback, useMemo, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, useLoadScript, Marker, Circle, Polygon, InfoWindow } from '@react-google-maps/api';
import useAuthStore from '@/store/authStore';
import api from '@/lib/api';
import { MapPin, AlertCircle, CheckCircle2, Clock, XCircle, Settings, Save, FileText, Filter, Layers, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
import { Box, Paper, Select, MenuItem, FormControl, InputLabel, Chip, IconButton, Collapse } from '@mui/material';
import { Close as CloseIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

const containerStyle = {
  width: '100%',
  height: '100%'
};

// Center dan batas default untuk Kelurahan Cipete, Jakarta Selatan
const defaultCenter = {
  lat: -6.2746,
  lng: 106.8023
};

// Google Maps libraries - harus konstanta di luar komponen untuk mencegah reload
const googleMapsLibraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places'];

interface Report {
  id: number;
  title: string;
  description: string;
  location: string;
  lat: number;
  lng: number;
  locationMismatch: boolean;
  locationDistance?: number;
  geocodeConfidence?: string;
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
  type?: 'rw' | 'rt';
  label?: string | null;
}

type LatLngBoundsLiteral = {
  north: number;
  south: number;
  east: number;
  west: number;
};

// Batas global kelurahan Cipete (perkiraan, digunakan sebagai fallback restriction)
const CIPETE_BOUNDS: LatLngBoundsLiteral = {
  north: -6.265,
  south: -6.285,
  east: 106.812,
  west: 106.792
};

export default function PetaLaporanPage() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [rtRwBoundary, setRtRwBoundary] = useState<RTRwBoundary | null>(null);
  const [parentBoundary, setParentBoundary] = useState<RTRwBoundary | null>(null);
  const [allBoundaries, setAllBoundaries] = useState<RTRwBoundary[]>([]);
  const [selectedBoundaryInfo, setSelectedBoundaryInfo] = useState<RTRwBoundary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(13);
  const [isSettingBoundary, setIsSettingBoundary] = useState(false);
  const [newBoundaryCenter, setNewBoundaryCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [newBoundaryRadius, setNewBoundaryRadius] = useState<number>(500);
  const [boundaryRestriction, setBoundaryRestriction] = useState<LatLngBoundsLiteral | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const boundaryAutoFitKeyRef = useRef<string | null>(null);
  const globalAutoFitKeyRef = useRef<string | null>(null);
  const fallbackPositionKeyRef = useRef<number | 'default' | null>(null);
  const centerSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const zoomSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [userInteracting, setUserInteracting] = useState(false);
  const { toasts, success: showSuccess, error: showError, removeToast } = useToast();
  
  // Filter states
  const [rtFilter, setRtFilter] = useState<string>('');
  const [rwFilter, setRwFilter] = useState<string>('');
  const [rtList, setRtList] = useState<Array<{rt: string, rtRw: string, label: string}>>([]);
  const [rwList, setRwList] = useState<Array<{rw: string, label: string}>>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchingLocation, setIsSearchingLocation] = useState<boolean>(false);
  
  // UI states
  const [showStats, setShowStats] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showFilters, setShowFilters] = useState(true);

  const allowedRoles = ['admin', 'admin_sistem', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'];
  const canSetBoundary = ['admin', 'admin_sistem', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris'].includes(user?.role || '');
  const isPengurus = allowedRoles.includes(user?.role || '');
  const isAdminRW = user?.role === 'admin_rw';
  const isSuperAdmin = ['admin', 'admin_sistem'].includes(user?.role || '');
  const isKetuaRT = ['ketua_rt'].includes(user?.role || '');
  const isSekretaris = ['sekretaris_rt', 'sekretaris'].includes(user?.role || '');
  
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  // Memoize useLoadScript options untuk mencegah reload
  const loadScriptOptions = useMemo(() => ({
    googleMapsApiKey: googleMapsApiKey,
    libraries: googleMapsLibraries // Gunakan konstanta, bukan array baru setiap render
  }), [googleMapsApiKey]);
  const { isLoaded, loadError } = useLoadScript(loadScriptOptions);

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

  // Fetch RW list untuk Super Admin
  useEffect(() => {
    if (!mounted || !isSuperAdmin) return;
    
    const fetchRwList = async () => {
      try {
        const { data } = await api.get('/reports/stats/rw-list');
        console.log('[PetaLaporan] RW List response:', data);
        if (data && data.rwList) {
          setRwList(data.rwList);
          console.log('[PetaLaporan] RW List set:', data.rwList);
        } else {
          console.warn('[PetaLaporan] RW List is empty or undefined');
          setRwList([]);
        }
      } catch (e: any) {
        console.error('Error fetching RW list:', e);
        showError('Gagal memuat daftar RW: ' + (e.response?.data?.error || e.message));
        setRwList([]);
      }
    };
    fetchRwList();
  }, [mounted, isSuperAdmin, showError]);
  
  // Fetch RT list untuk Admin RW atau Super Admin (berdasarkan RW filter)
  useEffect(() => {
    if (!mounted) return;
    
    const fetchRtList = async () => {
      try {
        if (isAdminRW) {
          const { data } = await api.get('/reports/stats/rt-list');
          setRtList(data.rtList || []);
        } else if (isSuperAdmin && rwFilter) {
          const { data } = await api.get(`/reports/stats/rt-list?rwFilter=${rwFilter}`);
          setRtList(data.rtList || []);
        } else if (isSuperAdmin) {
          setRtList([]);
        }
      } catch (e: any) {
        console.error('Error fetching RT list:', e);
      }
    };
    fetchRtList();
  }, [mounted, isAdminRW, isSuperAdmin, rwFilter]);

  // Fetch map data
  const fetchMapData = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/reports/map';
      const params = new URLSearchParams();
      if ((isAdminRW || isSuperAdmin) && rtFilter) {
        params.append('rtFilter', rtFilter);
      }
      if (isSuperAdmin && rwFilter) {
        params.append('rwFilter', rwFilter);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      const response = await api.get(url);
      setReports(response.data.reportsWithCoords || response.data.reports || []);
      setTotalReports(response.data.total || 0);
      setRtRwBoundary(response.data.rtRwBoundary || null);
      setParentBoundary(response.data.parentBoundary || null);
      setAllBoundaries(response.data.allBoundaries || []);
      
      if (response.data.rtRwBoundary?.center) {
        setMapCenter(response.data.rtRwBoundary.center);
        setMapZoom(15);
      } else if (response.data.reports && response.data.reports.length > 0) {
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
  }, [isAdminRW, isSuperAdmin, rtFilter, rwFilter, showError]);

  useEffect(() => {
    if (mounted && isAuthenticated && isPengurus) {
      fetchMapData();
    }
  }, [mounted, isAuthenticated, isPengurus, fetchMapData]);

  // Filter reports berdasarkan filter state
  const filteredReports = useMemo(() => {
    let filtered = reports;
    
    if (statusFilter) {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    if (urgencyFilter) {
      filtered = filtered.filter(r => r.urgency === urgencyFilter);
    }
    
    if (categoryFilter) {
      filtered = filtered.filter(r => r.category === categoryFilter);
    }
    
    return filtered;
  }, [reports, statusFilter, urgencyFilter, categoryFilter]);

const fitMapToBoundary = useCallback((boundary: RTRwBoundary, mapInstance?: google.maps.Map | null) => {
    const mapObject = mapInstance || mapRef.current;
    if (!mapObject || !boundary?.center || typeof window === 'undefined' || !window.google?.maps) return;
    
    const paddingFactor = boundary.type === 'rt' ? 1.3 : 1.15;
    const applyBoundsPadding = (bounds: google.maps.LatLngBounds, factor: number) => {
      if (factor <= 1) return;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const latSpan = Math.max(Math.abs(ne.lat() - sw.lat()), 0.001);
      const lngSpan = Math.max(Math.abs(ne.lng() - sw.lng()), 0.001);
      const latPadding = (latSpan * (factor - 1)) / 2;
      const lngPadding = (lngSpan * (factor - 1)) / 2;
      bounds.extend(new window.google.maps.LatLng(ne.lat() + latPadding, ne.lng() + lngPadding));
      bounds.extend(new window.google.maps.LatLng(sw.lat() - latPadding, sw.lng() - lngPadding));
    };
    
    // Prioritaskan polygon jika ada
    if (boundary.polygon && boundary.polygon.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      boundary.polygon.forEach(point => bounds.extend(point));
      applyBoundsPadding(bounds, paddingFactor);
      mapObject.fitBounds(bounds, 100);
      const center = bounds.getCenter();
      setMapCenter(center.toJSON());
      return;
    }
    
    // Jika ada radius, buat bounding box berdasarkan radius (meter -> derajat)
    if (boundary.radius && boundary.radius > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      const latOffset = (boundary.radius / 111320) * paddingFactor; // ~meter to degree
      const lngOffset = (boundary.radius / (111320 * Math.cos(boundary.center.lat * (Math.PI / 180)))) * paddingFactor;
      bounds.extend(new window.google.maps.LatLng(boundary.center.lat + latOffset, boundary.center.lng + lngOffset));
      bounds.extend(new window.google.maps.LatLng(boundary.center.lat - latOffset, boundary.center.lng - lngOffset));
      mapObject.fitBounds(bounds, 80);
      setMapCenter(boundary.center);
      return;
    }
    
    // Fallback ke center default
    mapObject.setCenter(boundary.center);
    mapObject.setZoom(15);
    setMapCenter(boundary.center);
    setMapZoom(15);
  }, []);

  const extendBoundsWithBoundary = useCallback((bounds: google.maps.LatLngBounds, boundary: RTRwBoundary) => {
    if (!boundary?.center || typeof window === 'undefined' || !window.google?.maps) return;
    
    if (boundary.polygon && boundary.polygon.length > 0) {
      boundary.polygon.forEach(point => bounds.extend(point as google.maps.LatLngLiteral));
      return;
    }
    
    if (boundary.radius && boundary.radius > 0) {
      const latOffset = boundary.radius / 111320;
      const lngOffset = boundary.radius / (111320 * Math.cos(boundary.center.lat * (Math.PI / 180)));
      bounds.extend(new window.google.maps.LatLng(boundary.center.lat + latOffset, boundary.center.lng + lngOffset));
      bounds.extend(new window.google.maps.LatLng(boundary.center.lat - latOffset, boundary.center.lng - lngOffset));
      return;
    }
    
    bounds.extend(boundary.center);
  }, []);

  
  useEffect(() => {
    if (!rtRwBoundary) {
      boundaryAutoFitKeyRef.current = null;
      return;
    }
    if (userInteracting) {
      return;
    }
    const boundaryKey = [
      rtRwBoundary.label || '',
      rtRwBoundary.center?.lat ?? '',
      rtRwBoundary.center?.lng ?? '',
      rtRwBoundary.radius ?? '',
      rtRwBoundary.polygon ? rtRwBoundary.polygon.length : 0,
    ].join('-');
    if (boundaryAutoFitKeyRef.current === boundaryKey) {
      return;
    }
    boundaryAutoFitKeyRef.current = boundaryKey;
    // Set userInteracting untuk mencegah re-render loop
    setUserInteracting(true);
    fitMapToBoundary(rtRwBoundary);
    // Reset setelah delay untuk memastikan animation selesai
    setTimeout(() => {
      setUserInteracting(false);
    }, 1500);
  }, [rtRwBoundary, fitMapToBoundary, userInteracting]);

  useEffect(() => {
    if (rtRwBoundary) {
      fallbackPositionKeyRef.current = null;
      return;
    }
    if (userInteracting || !mapRef.current) {
      return;
    }
    if (isSuperAdmin && !rwFilter && !rtFilter && allBoundaries.length > 0) {
      return;
    }
      const fallbackReport = filteredReports.find(report => report.lat && report.lng);
      if (fallbackReport) {
      if (fallbackPositionKeyRef.current === fallbackReport.id) {
        return;
      }
      fallbackPositionKeyRef.current = fallbackReport.id;
        const fallbackCenter = { lat: fallbackReport.lat, lng: fallbackReport.lng };
      // Set userInteracting untuk mencegah re-render loop
      setUserInteracting(true);
        mapRef.current.setCenter(fallbackCenter);
        mapRef.current.setZoom(14);
        setMapCenter(fallbackCenter);
        setMapZoom(14);
      // Reset setelah delay untuk memastikan animation selesai
      setTimeout(() => {
        setUserInteracting(false);
      }, 1500);
      return;
    }
    if (fallbackPositionKeyRef.current === 'default') {
      return;
    }
    fallbackPositionKeyRef.current = 'default';
    // Set userInteracting untuk mencegah re-render loop
    setUserInteracting(true);
        mapRef.current.setCenter(defaultCenter);
        mapRef.current.setZoom(12);
        setMapCenter(defaultCenter);
        setMapZoom(12);
    // Reset setelah delay untuk memastikan animation selesai
    setTimeout(() => {
      setUserInteracting(false);
    }, 1500);
  }, [rtRwBoundary, filteredReports, isSuperAdmin, rwFilter, rtFilter, allBoundaries.length, userInteracting]);

  useEffect(() => {
    if (!isSuperAdmin || rwFilter || rtFilter || allBoundaries.length === 0) {
      globalAutoFitKeyRef.current = null;
      return;
    }
    if (userInteracting || !mapRef.current || typeof window === 'undefined' || !window.google?.maps) {
      return;
    }
    const boundariesKey = allBoundaries
      .map((boundary) => `${boundary.label}-${boundary.center?.lat}-${boundary.center?.lng}-${boundary.radius}-${boundary.polygon?.length || 0}`)
      .join('|');
    if (!boundariesKey || globalAutoFitKeyRef.current === boundariesKey) {
      return;
    }
    globalAutoFitKeyRef.current = boundariesKey;
    const bounds = new window.google.maps.LatLngBounds();
    allBoundaries.forEach(boundary => extendBoundsWithBoundary(bounds, boundary));
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, 80);
      const center = bounds.getCenter();
      setMapCenter(center.toJSON());
    }
  }, [isSuperAdmin, rwFilter, rtFilter, allBoundaries, extendBoundsWithBoundary, userInteracting]);

  useEffect(() => {
    setSelectedBoundaryInfo(null);
  }, [rwFilter, rtFilter, isSuperAdmin, isAdminRW, isKetuaRT, isSekretaris]);

  useEffect(() => {
    if (!rtRwBoundary || !rtRwBoundary.center) {
      setBoundaryRestriction(null);
      return;
    }
    if (rtRwBoundary.polygon && rtRwBoundary.polygon.length > 2) {
      const lats = rtRwBoundary.polygon.map((point) => point.lat);
      const lngs = rtRwBoundary.polygon.map((point) => point.lng);
      setBoundaryRestriction({
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs),
      });
      return;
    }
    if (rtRwBoundary.radius && rtRwBoundary.radius > 0) {
      const latOffset = rtRwBoundary.radius / 111320;
      const lngOffset = rtRwBoundary.radius / (111320 * Math.cos(rtRwBoundary.center.lat * (Math.PI / 180)));
      setBoundaryRestriction({
        north: rtRwBoundary.center.lat + latOffset,
        south: rtRwBoundary.center.lat - latOffset,
        east: rtRwBoundary.center.lng + lngOffset,
        west: rtRwBoundary.center.lng - lngOffset,
      });
      return;
    }
    setBoundaryRestriction(null);
  }, [rtRwBoundary]);

  // Statistics
  const stats = useMemo(() => {
    const filtered = filteredReports.filter(r => r.lat && r.lng);
    return {
      total: filtered.length,
      pending: filtered.filter(r => r.status === 'pending').length,
      inProgress: filtered.filter(r => r.status === 'in_progress').length,
      resolved: filtered.filter(r => r.status === 'resolved' || r.status === 'completed').length,
      cancelled: filtered.filter(r => r.status === 'cancelled').length,
      locationMismatch: filtered.filter(r => r.locationMismatch).length,
      highUrgency: filtered.filter(r => r.urgency === 'high').length,
      mediumUrgency: filtered.filter(r => r.urgency === 'medium').length,
      lowUrgency: filtered.filter(r => r.urgency === 'low').length,
    };
  }, [filteredReports]);

  const noteUserInteraction = useCallback(() => {
    setUserInteracting(true);
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      setUserInteracting(false);
      interactionTimeoutRef.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, []);

  // Cleanup debounce timeouts saat unmount
  useEffect(() => {
    return () => {
      if (centerSyncTimeoutRef.current) {
        clearTimeout(centerSyncTimeoutRef.current);
      }
      if (zoomSyncTimeoutRef.current) {
        clearTimeout(zoomSyncTimeoutRef.current);
      }
    };
  }, []);

  const handleMapClick = (e: any) => {
    if (isSettingBoundary && e?.latLng) {
      setNewBoundaryCenter({
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      });
    }
  };

  const focusOnBoundary = useCallback((boundary: RTRwBoundary | null) => {
    if (!boundary?.center || !mapRef.current) return;
    
    const hasShape = (boundary.polygon && boundary.polygon.length > 2) || (boundary.radius && boundary.radius > 0);
    if (hasShape) {
      fitMapToBoundary(boundary);
      return;
    }
    
    const zoomLevel = boundary.type === 'rt' ? 16 : 14;
    mapRef.current.panTo(boundary.center);
    mapRef.current.setZoom(zoomLevel);
    setMapCenter(boundary.center);
    setMapZoom(zoomLevel);
  }, [fitMapToBoundary]);

  const handleBoundarySelection = useCallback((boundary: RTRwBoundary | null) => {
    if (!boundary) return;
    noteUserInteraction();
    setSelectedBoundaryInfo(boundary);
    focusOnBoundary(boundary);
  }, [focusOnBoundary, noteUserInteraction]);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (rtRwBoundary) {
      fitMapToBoundary(rtRwBoundary, map);
    }
  }, [fitMapToBoundary, rtRwBoundary]);

  const handleMapUnmount = () => {
    mapRef.current = null;
  };

  const buildBoundaryPayload = useCallback(() => {
    if (!newBoundaryCenter) {
      return null;
    }
    const payload: Record<string, any> = {
      latitude: newBoundaryCenter.lat,
      longitude: newBoundaryCenter.lng,
      radius: newBoundaryRadius,
      polygon: null,
    };
    if (isSuperAdmin) {
      if (rtFilter && rwFilter) {
        payload.targetLevel = 'rt';
        payload.targetRt = rtFilter;
        payload.targetRw = rwFilter;
      } else if (rwFilter) {
        payload.targetLevel = 'rw';
        payload.targetRw = rwFilter;
      } else {
        showError('Pilih RW atau RT terlebih dahulu sebelum menyetel area.');
        return null;
      }
    }
    return payload;
  }, [isSuperAdmin, newBoundaryCenter, newBoundaryRadius, rtFilter, rwFilter, showError]);

  const handleStartBoundarySetting = () => {
    if (isSuperAdmin) {
      if (!rwFilter && !rtFilter) {
        showError('Pilih RW atau RT terlebih dahulu sebelum mengatur area.');
        return;
      }
      if (rtFilter && !rwFilter) {
        showError('Pilih RW yang sesuai sebelum mengatur RT.');
        return;
      }
    }
    setIsSettingBoundary(true);
    // Pre-fill dengan lokasi dan radius yang sudah ada (jika ada)
    if (rtRwBoundary?.center) {
      setNewBoundaryCenter(rtRwBoundary.center);
    } else {
      // Jika belum ada, set ke center map saat ini
      setNewBoundaryCenter(mapCenter);
    }
    if (rtRwBoundary?.radius) {
      setNewBoundaryRadius(rtRwBoundary.radius);
    } else {
      // Default radius jika belum ada
      setNewBoundaryRadius(500);
    }
  };

  const handleSaveBoundary = async () => {
    if (!newBoundaryCenter) {
      showError('Klik di peta untuk set lokasi center RT/RW');
      return;
    }

    try {
      const payload = buildBoundaryPayload();
      if (!payload) {
        return;
      }
      await api.post('/reports/admin/rt-rw/set-location', payload);
      
      showSuccess('Lokasi RT/RW berhasil di-set');
      setIsSettingBoundary(false);
      setNewBoundaryCenter(null);
      fetchMapData();
    } catch (error: any) {
      console.error('Error setting boundary:', error);
      showError(error.response?.data?.error || 'Gagal menyimpan lokasi RT/RW');
    }
  };

  const getMarkerIcon = (report: Report) => {
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      return undefined;
    }
    
    if (report.locationMismatch) {
      return {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#EF4444',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        scale: 10
      };
    }
    
    const statusColors: Record<string, string> = {
      pending: '#F59E0B',
      in_progress: '#8B5CF6', // ungu supaya tidak sama dengan area RW (biru)
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
      scale: 8
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'completed':
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <MapPin className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBoundaryColors = useCallback((type?: 'rw' | 'rt') => {
    if (type === 'rt') {
      return { fill: '#B45309', stroke: '#92400E' };
    }
    return { fill: '#2563EB', stroke: '#1D4ED8' };
  }, []);

  const boundaryColors = useMemo(() => {
    if (!rtRwBoundary) return null;
    return getBoundaryColors(rtRwBoundary.type);
  }, [rtRwBoundary, getBoundaryColors]);
  
  const parentBoundaryColors = useMemo(() => {
    if (!parentBoundary) return null;
    return getBoundaryColors(parentBoundary.type);
  }, [parentBoundary, getBoundaryColors]);

  // Fungsi untuk menghitung minZoom berdasarkan radius boundary
  const calculateMinZoomFromRadius = useCallback((radius: number | null | undefined): number => {
    if (!radius || radius <= 0) return 13; // Default untuk radius kecil/tidak ada
    
    // Semakin besar radius, semakin kecil minZoom (lebih jauh/overview)
    if (radius >= 2000) {
      return 10; // Radius >= 2000m -> overview sangat jauh
    } else if (radius >= 1500) {
      return 10; // Radius 1500-1999m -> overview jauh
    } else if (radius >= 1000) {
      return 11; // Radius 1000-1499m -> overview sedang-jauh
    } else if (radius >= 750) {
      return 11; // Radius 750-999m -> overview sedang
    } else if (radius >= 500) {
      return 18; // Radius 500-749m -> overview dekat
    } else {
      return 13; // Radius < 500m -> detail
    }
  }, []);

  const restrictedZoomRange = useMemo(() => {
    if (!boundaryRestriction) return null;
    
    const radius = rtRwBoundary?.radius || null;
    const minZoom = calculateMinZoomFromRadius(radius);
    
    if (rtRwBoundary?.type === 'rt') {
      // RT biasanya lebih kecil, jadi bisa lebih detail
      return { minZoom: Math.max(minZoom, 12), maxZoom: 21 };
    }
    if (rtRwBoundary?.type === 'rw') {
      // RW biasanya lebih besar, jadi bisa lebih overview
      return { minZoom: Math.max(minZoom, 10), maxZoom: 22 };
    }
    return { minZoom, maxZoom: 21 };
  }, [boundaryRestriction, rtRwBoundary, isSuperAdmin, calculateMinZoomFromRadius]);

  const boundaryLabelDisplay = useMemo(() => {
    if (!rtRwBoundary?.label) return null;
    if (rtRwBoundary.type === 'rw') {
      if (rtRwBoundary.label.startsWith('RW')) {
        return rtRwBoundary.label;
      }
      const parts = rtRwBoundary.label.split('/');
      return parts[1] || rtRwBoundary.label;
    }
    return rtRwBoundary.label;
  }, [rtRwBoundary]);

  const boundaryTargetLabel = useMemo(() => {
    if (isSuperAdmin) {
      if (rtFilter && rwFilter) {
        return `${rtFilter}/${rwFilter}`;
      }
      if (rwFilter) {
        return rwFilter;
      }
      return null;
    }
    return user?.rt_rw || null;
  }, [isSuperAdmin, rtFilter, rwFilter, user?.rt_rw]);

  const isGlobalSuperAdminView = useMemo(
    () => isSuperAdmin && !rwFilter && !rtFilter && allBoundaries.length > 0,
    [isSuperAdmin, rwFilter, rtFilter, allBoundaries.length]
  );
  
  const selectedBoundaryStats = useMemo(() => {
    if (!selectedBoundaryInfo?.label) return null;
    const normalizedLabel = selectedBoundaryInfo.label.toUpperCase();
    const reportsInBoundary = reports.filter((report) => {
      const rtRwValue = report.rtRw?.toUpperCase();
      if (!rtRwValue) return false;
      if (selectedBoundaryInfo.type === 'rt') {
        return rtRwValue === normalizedLabel;
      }
      return rtRwValue.endsWith(`/${normalizedLabel}`);
    });
    if (!reportsInBoundary.length) {
      return { total: 0, pending: 0, inProgress: 0, resolved: 0 };
    }
    return {
      total: reportsInBoundary.length,
      pending: reportsInBoundary.filter(r => r.status === 'pending').length,
      inProgress: reportsInBoundary.filter(r => r.status === 'in_progress').length,
      resolved: reportsInBoundary.filter(r => ['resolved', 'completed'].includes(r.status)).length
    };
  }, [selectedBoundaryInfo, reports]);
  
  const selectedBoundaryColors = useMemo(() => {
    if (!selectedBoundaryInfo) return null;
    return getBoundaryColors(selectedBoundaryInfo.type);
  }, [selectedBoundaryInfo, getBoundaryColors]);

  // Map Component
  const MapComponent = () => {
    if (loadError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50" suppressHydrationWarning>
          <div className="text-center" suppressHydrationWarning>
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Gagal memuat Google Maps</p>
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

    const showAllBoundaries = isGlobalSuperAdminView && allBoundaries.length > 0;

    const mapOptions = useMemo(() => {
      const options: google.maps.MapOptions = {
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
        ],
      };

      // Untuk superadmin, tidak ada batasan peta (bebas zoom dan pan ke mana saja)
      // Untuk role lain, gunakan boundary RT/RW jika ada, kalau tidak pakai batas global Cipete
      if (!isSuperAdmin) {
        const effectiveBounds = boundaryRestriction || CIPETE_BOUNDS;
        if (effectiveBounds) {
          options.restriction = {
            latLngBounds: effectiveBounds,
            strictBounds: true,
          };
          if (restrictedZoomRange) {
            options.minZoom = restrictedZoomRange.minZoom;
            options.maxZoom = restrictedZoomRange.maxZoom;
          }
        }
      }
      // Superadmin: tidak ada restriction, bebas zoom dan pan
      return options;
    }, [boundaryRestriction, restrictedZoomRange]);

    const handleZoomChanged = useCallback(() => {
      // Superadmin tidak ada batasan zoom
      if (isSuperAdmin) return;
      
      if (!mapRef.current || !restrictedZoomRange) return;
      const currentZoom = mapRef.current.getZoom();
      if (typeof currentZoom !== 'number') return;
      if (currentZoom < restrictedZoomRange.minZoom) {
        mapRef.current.setZoom(restrictedZoomRange.minZoom);
      } else if (currentZoom > restrictedZoomRange.maxZoom) {
        mapRef.current.setZoom(restrictedZoomRange.maxZoom);
      }
    }, [isSuperAdmin, restrictedZoomRange]);

    // Handler untuk zoom changed - hanya untuk restricted zoom, TIDAK sync state
    const handleZoomChangedWithSync = useCallback(() => {
      handleZoomChanged();
      // Jangan sync state - ini akan menyebabkan re-render dan kedip-kedip
    }, [handleZoomChanged]);

    // Handler untuk center changed - kosongkan, TIDAK sync state
    const handleCenterChanged = useCallback(() => {
      // Jangan sync state - ini akan menyebabkan re-render dan kedip-kedip
      // State hanya di-update oleh useEffect yang mengubah center/zoom secara programmatic
    }, []);

    return (
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={mapZoom}
        onClick={handleMapClick}
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
        onZoomChanged={handleZoomChangedWithSync}
        onCenterChanged={handleCenterChanged}
        options={mapOptions}
      >
        {/* Parent RW boundary */}
        {parentBoundary?.center && (
          <>
            {parentBoundary.polygon && parentBoundary.polygon.length > 2 ? (
              <Polygon
                path={parentBoundary.polygon}
                options={{
                  fillColor: parentBoundaryColors?.fill || '#2563EB',
                  fillOpacity: 0.08,
                  strokeColor: parentBoundaryColors?.stroke || '#2563EB',
                  strokeOpacity: 0.7,
                  strokeWeight: 3,
                }}
                onClick={() => handleBoundarySelection(parentBoundary)}
              />
            ) : parentBoundary.radius ? (
              <Circle
                center={parentBoundary.center}
                radius={parentBoundary.radius}
                options={{
                  fillColor: parentBoundaryColors?.fill || '#2563EB',
                  fillOpacity: 0.12,
                  strokeColor: parentBoundaryColors?.stroke || '#2563EB',
                  strokeOpacity: 0.7,
                  strokeWeight: 2,
                }}
                onClick={() => handleBoundarySelection(parentBoundary)}
              />
            ) : null}
            {typeof window !== 'undefined' && window.google?.maps && (
              <Marker
                position={parentBoundary.center}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: parentBoundaryColors?.stroke || '#2563EB',
                  fillOpacity: 0.85,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 3,
                  scale: parentBoundary.type === 'rt' ? 16 : 20,
                }}
                onClick={() => handleBoundarySelection(parentBoundary)}
              />
            )}
          </>
        )}

        {/* RT/RW Boundary */}
        {rtRwBoundary?.center && rtRwBoundary.radius && (
          <Circle
            center={rtRwBoundary.center}
            radius={rtRwBoundary.radius}
            options={{
              fillColor: boundaryColors?.fill || '#3B82F6',
              fillOpacity: 0.2,
              strokeColor: boundaryColors?.stroke || '#3B82F6',
              strokeOpacity: 0.8,
              strokeWeight: 2
            }}
            onClick={() => handleBoundarySelection(rtRwBoundary)}
          />
        )}

        {rtRwBoundary?.center && typeof window !== 'undefined' && window.google?.maps && (
          <Marker
            position={rtRwBoundary.center}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: boundaryColors?.stroke || '#2563EB',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 4,
              scale: rtRwBoundary.type === 'rt' ? 16 : 20
            }}
            onClick={() => handleBoundarySelection(rtRwBoundary)}
          />
        )}

        {/* New Boundary (saat setting) */}
        {isSettingBoundary && newBoundaryCenter && typeof window !== 'undefined' && window.google?.maps && (
          <>
            <Marker
              position={newBoundaryCenter}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: isSuperAdmin && rtFilter && rwFilter ? '#B45309' : '#2563EB', // Coklat untuk RT, Biru untuk RW
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 3,
                scale: 10
              }}
            />
            <Circle
              center={newBoundaryCenter}
              radius={newBoundaryRadius}
              options={{
                fillColor: isSuperAdmin && rtFilter && rwFilter ? '#B45309' : '#2563EB', // Coklat untuk RT, Biru untuk RW
                fillOpacity: 0.2,
                strokeColor: isSuperAdmin && rtFilter && rwFilter ? '#92400E' : '#1D4ED8', // Stroke sesuai dengan fill
                strokeOpacity: 0.8,
                strokeWeight: 2
              }}
            />
          </>
        )}

        {showAllBoundaries &&
          allBoundaries.map((boundary) => {
            const colors = getBoundaryColors(boundary.type);
            return (
              <Fragment key={`boundary-${boundary.label}`}>
                {boundary.polygon && boundary.polygon.length > 2 && (
                  <Polygon
                    path={boundary.polygon}
                    options={{
                      fillColor: colors.fill,
                      fillOpacity: 0.12,
                      strokeColor: colors.stroke,
                      strokeOpacity: 0.5,
                      strokeWeight: 1.5,
                    }}
                    onClick={() => handleBoundarySelection(boundary)}
                  />
                )}
                {boundary.radius && !boundary.polygon && (
                  <Circle
                    center={boundary.center}
                    radius={boundary.radius}
                    options={{
                      fillColor: colors.fill,
                      fillOpacity: 0.12,
                      strokeColor: colors.stroke,
                      strokeOpacity: 0.5,
                      strokeWeight: 1.5,
                    }}
                    onClick={() => handleBoundarySelection(boundary)}
                  />
                )}
                <Marker
                  position={boundary.center}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: colors.stroke,
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 3,
                    scale: boundary.type === 'rt' ? 15 : 18,
                  }}
                  onClick={() => handleBoundarySelection(boundary)}
                />
              </Fragment>
            );
          })}

        {selectedBoundaryInfo && (
          <>
            {selectedBoundaryInfo.polygon && selectedBoundaryInfo.polygon.length > 2 && (
              <Polygon
                path={selectedBoundaryInfo.polygon}
                options={{
                  fillColor: selectedBoundaryColors?.fill || '#F97316',
                  fillOpacity: 0.08,
                  strokeColor: selectedBoundaryColors?.stroke || '#F97316',
                  strokeOpacity: 0.9,
                  strokeWeight: 3,
                  zIndex: 10,
                }}
              />
            )}
            {selectedBoundaryInfo.radius && !selectedBoundaryInfo.polygon && (
              <Circle
                center={selectedBoundaryInfo.center}
                radius={selectedBoundaryInfo.radius}
                options={{
                  fillColor: selectedBoundaryColors?.fill || '#F97316',
                  fillOpacity: 0.08,
                  strokeColor: selectedBoundaryColors?.stroke || '#F97316',
                  strokeOpacity: 0.9,
                  strokeWeight: 3,
                  zIndex: 10,
                }}
              />
            )}
          </>
        )}

        {/* Report Markers */}
        {filteredReports
          .filter(report => report.lat && report.lng)
          .map((report) => {
            const icon = typeof window !== 'undefined' && window.google?.maps 
              ? getMarkerIcon(report) 
              : undefined;
            return (
              <Marker
                key={report.id}
                position={{ lat: report.lat, lng: report.lng }}
                icon={icon}
                onClick={() => {
                  // Set userInteracting untuk mencegah useEffect mengubah center/zoom
                  setUserInteracting(true);
                  noteUserInteraction();
                  setSelectedReport(report);
                  // Reset setelah delay untuk allow map animation (noteUserInteraction sudah handle timeout)
                }}
                title={report.title}
              />
            );
          })}

        {selectedBoundaryInfo?.center && (
          <InfoWindow
            position={selectedBoundaryInfo.center}
            onCloseClick={() => {
              // Set userInteracting untuk mencegah useEffect mengubah center/zoom
              setUserInteracting(true);
              noteUserInteraction();
              setSelectedBoundaryInfo(null);
            }}
          >
            <div className="p-5 min-w-[280px] space-y-4" suppressHydrationWarning>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-wide text-gray-500">
                  {selectedBoundaryInfo.type === 'rt' ? 'Wilayah RT' : 'Wilayah RW'}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {selectedBoundaryInfo.label || 'Tidak diketahui'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-base text-gray-700">
                <div>
                  <p className="text-xs uppercase text-gray-500">Radius</p>
                  <p className="font-semibold">
                    {selectedBoundaryInfo.radius
                      ? `${selectedBoundaryInfo.radius.toLocaleString('id-ID')} m`
                      : 'Belum disetel'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Center</p>
                  <p className="font-semibold text-sm">
                    {typeof selectedBoundaryInfo.center?.lat === 'number' && typeof selectedBoundaryInfo.center?.lng === 'number'
                      ? `${selectedBoundaryInfo.center.lat.toFixed(4)}, ${selectedBoundaryInfo.center.lng.toFixed(4)}`
                      : 'Belum tersedia'}
                  </p>
                </div>
              </div>
              
              {selectedBoundaryStats && (
                <div className="bg-gray-50 rounded-md p-4 text-base space-y-1">
                  <p className="text-xs uppercase text-gray-500">Ringkasan laporan</p>
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span className="font-semibold text-gray-900">{selectedBoundaryStats.total}</span>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span>Pending</span>
                    <span className="font-semibold">{selectedBoundaryStats.pending}</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>Diproses</span>
                    <span className="font-semibold">{selectedBoundaryStats.inProgress}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Selesai</span>
                    <span className="font-semibold">{selectedBoundaryStats.resolved}</span>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-gray-500">
                {selectedBoundaryInfo.type === 'rt'
                  ? 'Menampilkan laporan warga dalam wilayah RT ini.'
                  : 'Menampilkan seluruh RT di dalam wilayah RW ini.'}
              </p>
            </div>
          </InfoWindow>
        )}

        {/* Info Window */}
        {selectedReport && (
          <InfoWindow
            position={{ lat: selectedReport.lat, lng: selectedReport.lng }}
            onCloseClick={() => {
              // Set userInteracting untuk mencegah useEffect mengubah center/zoom
              setUserInteracting(true);
              noteUserInteraction();
              setSelectedReport(null);
            }}
          >
            <div className="p-3 max-w-xs sm:max-w-sm" suppressHydrationWarning>
              <h3 className="font-bold text-gray-900 mb-2 text-xs sm:text-sm break-words">{selectedReport.title}</h3>
              <p className="text-xs text-gray-600 mb-3 line-clamp-3 break-words">{selectedReport.description}</p>
              <div className="flex items-start gap-2 text-xs text-gray-700 mb-2">
                <MapPin className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="break-words">{selectedReport.location}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div>Status: <span className="font-medium">{selectedReport.status}</span></div>
                <div>Urgensi: <span className="font-medium">{selectedReport.urgency}</span></div>
              </div>
              <button
                onClick={() => {
                  noteUserInteraction();
                  router.push(`/reports/${selectedReport.id}`);
                  setSelectedReport(null);
                }}
                className="w-full px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span className="hidden sm:inline">Lihat Detail →</span>
                <span className="sm:hidden">Detail →</span>
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    );
  };

  const handleSearchLocation = useCallback(() => {
    if (!searchQuery.trim()) {
      showError('Masukkan nama lokasi untuk mencari.');
      return;
    }
    if (!mapRef.current || typeof window === 'undefined' || !window.google?.maps) {
      showError('Peta belum siap untuk digunakan.');
      return;
    }

    setIsSearchingLocation(true);
    const service = new window.google.maps.places.PlacesService(mapRef.current);
    service.findPlaceFromQuery(
      {
        query: searchQuery,
        fields: ['name', 'formatted_address', 'geometry']
      },
      (results, status) => {
        setIsSearchingLocation(false);
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results || results.length === 0) {
          showError('Lokasi tidak ditemukan. Coba kata kunci lain.');
          return;
        }

        const place = results[0];
        const location = place.geometry?.location;
        if (location) {
          const coords = { lat: location.lat(), lng: location.lng() };
          mapRef.current?.setCenter(coords);
          mapRef.current?.setZoom(16);
          setMapCenter(coords);
          showSuccess(`Lokasi ditemukan: ${place.name || place.formatted_address}`);
        } else {
          showError('Lokasi tidak memiliki koordinat yang valid.');
        }
      }
    );
  }, [searchQuery, showError, showSuccess]);

  if (!mounted || !hasCheckedAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen" suppressHydrationWarning>
        <div className="text-center" suppressHydrationWarning>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" suppressHydrationWarning></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!isPengurus) {
    return (
      <div className="flex items-center justify-center min-h-screen" suppressHydrationWarning>
        <div className="text-center" suppressHydrationWarning>
          <p className="text-gray-600">Akses ditolak</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ marginTop: 0 }} suppressHydrationWarning>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        
      {/* Full-Size Map */}
      <div className="flex-1 relative" suppressHydrationWarning>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-50" suppressHydrationWarning>
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
            </div>
          </div>
        )}

        {/* Floating Control Panel - Top Left */}
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: { xs: 8, sm: 16 },
            left: { xs: 8, sm: 16 },
            right: { xs: 8, sm: 'auto' },
            zIndex: 1000,
            minWidth: { xs: 'calc(100% - 16px)', sm: 320 },
            maxWidth: { xs: '100%', sm: 400 },
            borderRadius: 3,
            p: { xs: 1.5, sm: 2 },
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            maxHeight: { xs: '90vh', sm: 'auto' },
            overflowY: 'auto',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.1rem' }, color: '#111827' }}>
              Kontrol Peta
            </Box>
            <IconButton
              size="small"
              onClick={() => setShowFilters(!showFilters)}
              sx={{ color: 'text.secondary' }}
            >
              {showFilters ? <CloseIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>

          <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
            <button
              onClick={handleBackToDashboard}
              className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-gray-800 transition"
            >
              <span className="hidden sm:inline">← Kembali ke Dashboard</span>
              <span className="sm:hidden">← Kembali</span>
            </button>
          </Box>

          <Collapse in={showFilters}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Location Search for Superadmin */}
              {isSuperAdmin && (
                <FormControl fullWidth size="small">
                  <InputLabel shrink>Pencarian Lokasi</InputLabel>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari kelurahan / kecamatan ..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      onClick={handleSearchLocation}
                      disabled={isSearchingLocation}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                    >
                      {isSearchingLocation ? 'Mencari...' : 'Cari'}
                    </button>
                  </Box>
                </FormControl>
              )}

              {(rtRwBoundary || isGlobalSuperAdminView) && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Chip
                    color={
                      isGlobalSuperAdminView
                        ? 'primary'
                        : rtRwBoundary?.type === 'rt'
                        ? 'warning'
                        : 'primary'
                    }
                    label={`Area aktif: ${
                      isGlobalSuperAdminView ? 'Semua RW/RT' : boundaryLabelDisplay || 'RT/RW'
                    }`}
                    icon={<MapPin className="h-4 w-4" />}
                    sx={{ alignSelf: 'flex-start' }}
                  />
                  {isGlobalSuperAdminView ? (
                    <span className="text-xs text-gray-500">
                      Menampilkan semua boundary RW dan RT. Gunakan filter di atas untuk fokus ke wilayah tertentu.
                    </span>
                  ) : (
                    !isSuperAdmin && (
                    <span className="text-xs text-gray-500">
                      Peta dibatasi ke wilayah ini untuk menjaga fokus dan privasi warga.
                    </span>
                    )
                  )}
                </Box>
              )}

              {/* RW Filter (Super Admin) */}
              {isSuperAdmin && (
                <FormControl fullWidth size="small">
                  <InputLabel>Pilih RW</InputLabel>
                  <Select
                    value={rwFilter}
                    onChange={(e) => {
                      setRwFilter(e.target.value);
                      setRtFilter('');
                    }}
                    label="Pilih RW"
                  >
                    <MenuItem value="">Semua RW</MenuItem>
                    {rwList.map((rw) => (
                      <MenuItem key={rw.rw} value={rw.rw}>
                        {rw.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* RT Filter (Admin RW & Super Admin) */}
              {((isAdminRW && rtList.length > 0) || (isSuperAdmin && rwFilter && rtList.length > 0)) && (
                <FormControl fullWidth size="small">
                  <InputLabel>Pilih RT</InputLabel>
                  <Select
                    value={rtFilter}
                    onChange={(e) => {
                      setRtFilter(e.target.value);
                    }}
                    label="Pilih RT"
                  >
                    <MenuItem value="">Semua RT</MenuItem>
                    {rtList.map((rt) => (
                      <MenuItem key={rt.rt} value={rt.rt}>
                        {rt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Status Filter */}
              <FormControl fullWidth size="small">
                <InputLabel>Filter Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Filter Status"
                >
                  <MenuItem value="">Semua Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>

              {/* Urgency Filter */}
              <FormControl fullWidth size="small">
                <InputLabel>Filter Urgensi</InputLabel>
                <Select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  label="Filter Urgensi"
                >
                  <MenuItem value="">Semua Urgensi</MenuItem>
                  <MenuItem value="high">Tinggi</MenuItem>
                  <MenuItem value="medium">Sedang</MenuItem>
                  <MenuItem value="low">Rendah</MenuItem>
                </Select>
              </FormControl>

              {/* Category Filter */}
              <FormControl fullWidth size="small">
                <InputLabel>Filter Kategori</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Filter Kategori"
                >
                  <MenuItem value="">Semua Kategori</MenuItem>
                  <MenuItem value="infrastruktur">Infrastruktur</MenuItem>
                  <MenuItem value="sosial">Sosial</MenuItem>
                  <MenuItem value="administrasi">Administrasi</MenuItem>
                  <MenuItem value="bantuan">Bantuan</MenuItem>
                </Select>
              </FormControl>

              {/* Set/Edit Boundary Button */}
            {canSetBoundary && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {isSettingBoundary ? (
                  <>
                      <Box sx={{ fontSize: '0.75rem', color: '#6B7280', mb: 1 }}>
                        {boundaryTargetLabel
                          ? `Mengatur area ${boundaryTargetLabel}. Klik pada peta untuk menentukan titik pusat baru atau ubah radius.`
                          : 'Klik pada peta untuk menentukan titik pusat baru atau ubah radius.'}
                      </Box>
                      
                      {/* Current Location Display */}
                      {newBoundaryCenter && (
                        <Box sx={{ p: 1.5, bgcolor: '#F3F4F6', borderRadius: 1, mb: 1 }}>
                          <Box sx={{ fontSize: '0.75rem', color: '#6B7280', mb: 0.5 }}>Lokasi Center:</Box>
                          <Box sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                            {newBoundaryCenter.lat.toFixed(6)}, {newBoundaryCenter.lng.toFixed(6)}
                          </Box>
                        </Box>
                      )}
                      
                      {/* Radius Input */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <label className="text-sm font-medium text-gray-700">Radius (meter)</label>
                        <input
                          type="number"
                          value={newBoundaryRadius}
                          onChange={(e) => setNewBoundaryRadius(parseFloat(e.target.value) || 500)}
                          className="px-3 py-2 border border-gray-300 rounded-lg w-full"
                          placeholder="Radius (meter)"
                          min="100"
                          max="5000"
                          step="50"
                        />
                        <Box sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
                          Jarak dari center ke edge boundary
                        </Box>
                      </Box>
                      
                      {/* Action Buttons */}
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <button
                        onClick={handleSaveBoundary}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-2"
                      >
                          <Save className="h-4 w-4" />
                        Simpan Perubahan
                      </button>
                      <button
                        onClick={() => {
                          setIsSettingBoundary(false);
                          setNewBoundaryCenter(null);
                          // Reset to original boundary if exists
                          if (rtRwBoundary?.center) {
                            setNewBoundaryCenter(rtRwBoundary.center);
                          }
                          if (rtRwBoundary?.radius) {
                            setNewBoundaryRadius(rtRwBoundary.radius);
                          }
                        }}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                      >
                        Batal
                      </button>
                      </Box>
                  </>
                ) : (
                  <button
                      onClick={handleStartBoundarySetting}
                      disabled={isSuperAdmin && !boundaryTargetLabel}
                      title={isSuperAdmin && !boundaryTargetLabel ? 'Pilih RW atau RT terlebih dahulu' : undefined}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                      {rtRwBoundary ? 'Edit Lokasi & Radius' : (isSuperAdmin ? 'Set Lokasi RW/RT Terpilih' : 'Set Lokasi Wilayah Saya')}
                  </button>
                )}
                </Box>
              )}
            </Box>
          </Collapse>
        </Paper>

        {/* Floating Statistics Panel - Top Right */}
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1000,
            minWidth: 280,
            borderRadius: 3,
            p: 2,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 1 }}>
              <BarChart3 className="h-5 w-5" />
              Statistik
            </Box>
            <IconButton
              size="small"
              onClick={() => setShowStats(!showStats)}
              sx={{ color: 'text.secondary' }}
            >
              {showStats ? <CloseIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>

          <Collapse in={showStats}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#F9FAFB', borderRadius: 2 }}>
                <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
                  {stats.total}
                </Box>
                <Box sx={{ fontSize: '0.75rem', color: '#6B7280', mt: 0.5 }}>Total Laporan</Box>
              </Box>
              <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#FEF3C7', borderRadius: 2 }}>
                <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#92400E' }}>
                  {stats.pending}
                </Box>
                <Box sx={{ fontSize: '0.75rem', color: '#92400E', mt: 0.5 }}>Pending</Box>
              </Box>
              <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#DBEAFE', borderRadius: 2 }}>
                <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E40AF' }}>
                  {stats.inProgress}
                </Box>
                <Box sx={{ fontSize: '0.75rem', color: '#1E40AF', mt: 0.5 }}>Diproses</Box>
              </Box>
              <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#D1FAE5', borderRadius: 2 }}>
                <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#065F46' }}>
                  {stats.resolved}
                </Box>
                <Box sx={{ fontSize: '0.75rem', color: '#065F46', mt: 0.5 }}>Selesai</Box>
              </Box>
              <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#FEE2E2', borderRadius: 2 }}>
                <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#991B1B' }}>
                  {stats.locationMismatch}
                </Box>
                <Box sx={{ fontSize: '0.75rem', color: '#991B1B', mt: 0.5 }}>Lokasi Mismatch</Box>
              </Box>
              <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#F3F4F6', borderRadius: 2 }}>
                <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#374151' }}>
                  {stats.cancelled}
                </Box>
                <Box sx={{ fontSize: '0.75rem', color: '#374151', mt: 0.5 }}>Dibatalkan</Box>
              </Box>
            </Box>
          </Collapse>
        </Paper>

        {/* Floating Legend Panel - Bottom Right */}
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 1000,
            minWidth: 260,
            borderRadius: 3,
            p: 2,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Layers className="h-4 w-4" />
              Legend Marker
            </Box>
            <IconButton
              size="small"
              onClick={() => setShowLegend(!showLegend)}
              sx={{ color: 'text.secondary' }}
            >
              {showLegend ? <CloseIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>

          <Collapse in={showLegend}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: '#F59E0B',
                    border: '2px solid white',
                  }}
                />
                <Box sx={{ fontSize: '0.875rem', color: '#374151' }}>
                  <Box sx={{ fontWeight: 600 }}>🟡 Pending</Box>
                  <Box sx={{ fontSize: '0.75rem', color: '#6B7280' }}>Laporan menunggu diproses</Box>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: '#3B82F6',
                    border: '2px solid white',
                  }}
                />
                <Box sx={{ fontSize: '0.875rem', color: '#374151' }}>
                  <Box sx={{ fontWeight: 600 }}>🔵 In Progress</Box>
                  <Box sx={{ fontSize: '0.75rem', color: '#6B7280' }}>Sedang ditangani</Box>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: '#2563EB',
                    border: '2px solid white',
                  }}
                />
                <Box sx={{ fontSize: '0.875rem', color: '#374151' }}>
                  <Box sx={{ fontWeight: 600 }}>🔵 Zona RW</Box>
                  <Box sx={{ fontSize: '0.75rem', color: '#6B7280' }}>Area resmi Admin RW</Box>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: '#B45309',
                    border: '2px solid white',
                  }}
                />
                <Box sx={{ fontSize: '0.875rem', color: '#374151' }}>
                  <Box sx={{ fontWeight: 600 }}>🟤 Zona RT</Box>
                  <Box sx={{ fontSize: '0.75rem', color: '#6B7280' }}>Area resmi Ketua/Sekretaris RT</Box>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: '#10B981',
                    border: '2px solid white',
                  }}
                />
                <Box sx={{ fontSize: '0.875rem', color: '#374151' }}>
                  <Box sx={{ fontWeight: 600 }}>🟢 Resolved</Box>
                  <Box sx={{ fontSize: '0.75rem', color: '#6B7280' }}>Sudah selesai</Box>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: '#6B7280',
                    border: '2px solid white',
                  }}
                />
                <Box sx={{ fontSize: '0.875rem', color: '#374151' }}>
                  <Box sx={{ fontWeight: 600 }}>⚫ Cancelled</Box>
                  <Box sx={{ fontSize: '0.75rem', color: '#6B7280' }}>Dibatalkan</Box>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: '#EF4444',
                    border: '2px solid white',
                  }}
                />
                <Box sx={{ fontSize: '0.875rem', color: '#374151' }}>
                  <Box sx={{ fontWeight: 600 }}>🔴 Lokasi Mismatch</Box>
                  <Box sx={{ fontSize: '0.75rem', color: '#6B7280' }}>Di luar boundary RT/RW</Box>
                </Box>
              </Box>
            </Box>
          </Collapse>
        </Paper>
      </div>
    </div>
  );
}
