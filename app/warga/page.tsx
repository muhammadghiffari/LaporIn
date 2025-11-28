'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import {
  Paper,
  TextField,
  Box,
  Typography,
  Chip,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  People as UsersIcon,
  LocationOn as MapPinIcon,
  Mail,
  CalendarToday,
  Person,
  FilterList,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';

interface WargaRow {
  id: number;
  email: string;
  name: string;
  rt_rw?: string;
  jenis_kelamin?: string;
  created_at: string;
  total_reports?: number;
  pending_reports?: number;
  resolved_reports?: number;
}

export default function WargaPage() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const hasCheckedAuth = useAuthStore((s) => s.hasCheckedAuth);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [warga, setWarga] = useState<WargaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rtFilter, setRtFilter] = useState<string>('');
  const [rtList, setRtList] = useState<Array<{rt: string, rtRw: string, label: string}>>([]);
  const [stats, setStats] = useState({
    total: 0,
    lakiLaki: 0,
    perempuan: 0,
    totalReports: 0,
  });

  const isAdminRW = useMemo(() => user?.role === 'admin_rw', [user?.role]);
  const isKetuaRT = useMemo(() => user?.role === 'ketua_rt', [user?.role]);
  const isSekretaris = useMemo(() => ['sekretaris_rt', 'sekretaris'].includes(user?.role || ''), [user?.role]);
  const allowedRoles = useMemo(() => ['admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris'], []);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (mounted && hasCheckedAuth && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (mounted && hasCheckedAuth && user && !allowedRoles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [mounted, hasCheckedAuth, isAuthenticated, router, user, allowedRoles]);

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

  // Fetch data warga - function biasa untuk avoid dependency issues
  const fetchWarga = async () => {
    if (!mounted || !hasCheckedAuth || !isAuthenticated || !user || !allowedRoles.includes(user.role)) {
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('role', 'warga'); // Hanya ambil warga
      if (search) params.set('search', search);
      if (rtFilter) params.set('rtFilter', rtFilter);
      params.set('limit', '1000'); // Ambil semua warga
      
      const { data } = await api.get(`/auth/users?${params.toString()}`);
      
      const wargaData = Array.isArray(data) ? data : (data?.data || []);
      setWarga(wargaData);

      // Calculate stats
      const total = wargaData.length;
      const lakiLaki = wargaData.filter((w: WargaRow) => w.jenis_kelamin === 'laki_laki').length;
      const perempuan = wargaData.filter((w: WargaRow) => w.jenis_kelamin === 'perempuan').length;
      
      // Fetch report stats untuk setiap warga (optional, bisa di-comment jika terlalu berat)
      let totalReports = 0;
      try {
        const reportStatsPromises = wargaData.slice(0, 50).map(async (w: WargaRow) => {
          try {
            const { data: reportData } = await api.get(`/reports?userId=${w.id}&limit=1`);
            return Array.isArray(reportData) ? reportData.length : (reportData?.total || 0);
          } catch {
            return 0;
          }
        });
        const reportCounts = await Promise.all(reportStatsPromises);
        totalReports = reportCounts.reduce((sum, count) => sum + count, 0);
      } catch {
        // Ignore error untuk report stats
      }

      setStats({
        total,
        lakiLaki,
        perempuan,
        totalReports,
      });
    } catch (error: any) {
      console.error('Error fetching warga:', error);
      setWarga([]); // Set empty array on error
      setStats({
        total: 0,
        lakiLaki: 0,
        perempuan: 0,
        totalReports: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch warga when dependencies change (initial load and rtFilter change)
  useEffect(() => {
    if (mounted && hasCheckedAuth && isAuthenticated && user && allowedRoles.includes(user.role)) {
      fetchWarga();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, hasCheckedAuth, isAuthenticated, user?.role, rtFilter]);

  // Debounce search - separate effect untuk search
  useEffect(() => {
    if (!mounted || !hasCheckedAuth || !isAuthenticated || !user || !allowedRoles.includes(user.role)) {
      return;
    }
    
    const timer = setTimeout(() => {
      fetchWarga();
    }, 500);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Nama',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person sx={{ color: 'text.secondary', fontSize: 20 }} />
          <Typography variant="body2" fontWeight={500}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Mail sx={{ color: 'text.secondary', fontSize: 18 }} />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'rt_rw',
      headerName: 'RT/RW',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MapPinIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
          <Typography variant="body2">{params.value || '-'}</Typography>
        </Box>
      ),
    },
    {
      field: 'jenis_kelamin',
      headerName: 'Jenis Kelamin',
      width: 150,
      renderCell: (params) => {
        const gender = params.value;
        if (!gender) return <Typography variant="body2">-</Typography>;
        const label = gender === 'laki_laki' ? 'Laki-laki' : gender === 'perempuan' ? 'Perempuan' : gender;
        return (
          <Chip
            label={label}
            size="small"
            color={gender === 'laki_laki' ? 'primary' : 'secondary'}
            sx={{ textTransform: 'capitalize' }}
          />
        );
      },
    },
    {
      field: 'created_at',
      headerName: 'Terdaftar',
      width: 150,
      renderCell: (params) => {
        if (!params.value) return <Typography variant="body2">-</Typography>;
        const date = new Date(params.value);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday sx={{ color: 'text.secondary', fontSize: 16 }} />
            <Typography variant="body2">
              {date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Typography>
          </Box>
        );
      },
    },
  ];

  if (!mounted || !hasCheckedAuth) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <CircularProgress />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    return null;
  }

  const getPageTitle = () => {
    if (isAdminRW) {
      return `Data Warga RW ${user.rt_rw?.split('/')[1] || ''}`;
    }
    if (isKetuaRT || isSekretaris) {
      return `Data Warga ${user.rt_rw || ''}`;
    }
    return 'Data Warga';
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UsersIcon sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700} color="text.primary">
                {getPageTitle()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kelola dan lihat data warga di wilayah Anda
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Warga
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="primary.main">
                      {stats.total}
                    </Typography>
                  </Box>
                  <UsersIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Laki-laki
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="info.main">
                      {stats.lakiLaki}
                    </Typography>
                  </Box>
                  <Person sx={{ fontSize: 40, color: 'info.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Perempuan
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="secondary.main">
                      {stats.perempuan}
                    </Typography>
                  </Box>
                  <Person sx={{ fontSize: 40, color: 'secondary.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Laporan
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="success.main">
                      {stats.totalReports}
                    </Typography>
                  </Box>
                  <FilterList sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            {isAdminRW && rtList.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Filter RT</InputLabel>
                <Select
                  value={rtFilter}
                  onChange={(e) => setRtFilter(e.target.value)}
                  label="Filter RT"
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
          </Box>
        </Paper>

        {/* Data Grid */}
        <Paper sx={{ height: 600, width: '100%' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : warga.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Alert severity="info">Tidak ada data warga ditemukan</Alert>
            </Box>
          ) : (
            <DataGrid
              rows={warga}
              columns={columns}
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 25 },
                },
              }}
              slots={{
                toolbar: GridToolbar,
              }}
              sx={{
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #f0f0f0',
                },
                '& .MuiDataGrid-row:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            />
          )}
        </Paper>
      </Box>
    </Layout>
  );
}

