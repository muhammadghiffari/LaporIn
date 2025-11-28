'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import api from '@/lib/api';
import Layout from '@/components/Layout';
import {
  Paper,
  Chip,
  Button,
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Block as BlockIcon,
  FileDownload,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem, GridToolbar } from '@mui/x-data-grid';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { exportToExcel, formatReportsForExcel } from '@/lib/exportToExcel';

interface Laporan {
  id: number;
  title: string;
  description: string;
  urgency: string;
  status: string;
  category?: string;
  location?: string;
  created_at: string;
  blockchain_tx_hash?: string;
  is_mock_blockchain?: boolean; // Flag untuk mock blockchain
  user_name?: string;
  user_email?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e', label: 'Menunggu' },
  in_progress: { bg: '#dbeafe', text: '#1e40af', label: 'Sedang Diproses' },
  resolved: { bg: '#d1fae5', text: '#065f46', label: 'Selesai' },
  rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Ditolak' },
};

const URGENCY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: '#fee2e2', text: '#991b1b', label: 'Tinggi' },
  medium: { bg: '#fef3c7', text: '#92400e', label: 'Sedang' },
  low: { bg: '#e5e7eb', text: '#374151', label: 'Rendah' },
};

const CATEGORY_LABELS: Record<string, string> = {
  infrastruktur: 'Infrastruktur',
  sosial: 'Sosial',
  administrasi: 'Administrasi',
  bantuan: 'Bantuan',
};

export default function LaporanPage() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterUrgency, setFilterUrgency] = useState<string>('');

  const hasCheckedAuth = useAuthStore((s) => s.hasCheckedAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (hasCheckedAuth && !isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [hasCheckedAuth, isAuthenticated, router]);

  useEffect(() => {
    if (hasCheckedAuth && isAuthenticated) {
      fetchLaporan();
    }
  }, [hasCheckedAuth, isAuthenticated, search, filterStatus, filterUrgency]);

  // Realtime polling - refresh setiap 10 detik untuk update realtime
  useEffect(() => {
    if (!hasCheckedAuth || !isAuthenticated) return;
    
    const interval = setInterval(() => {
      setIsRefreshing(true);
      fetchLaporan(true).finally(() => {
        setTimeout(() => setIsRefreshing(false), 500);
      });
    }, 10000); // Poll setiap 10 detik untuk update realtime

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCheckedAuth, isAuthenticated, search, filterStatus, filterUrgency]);

  const fetchLaporan = async (isBackgroundRefresh = false) => {
    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      const params = new URLSearchParams();
      
      // PRIVACY: Untuk warga, hanya tampilkan laporan mereka sendiri di halaman /laporan
      // Dashboard tetap transparan (semua laporan RT/RW)
      if (user?.role === 'warga') {
        params.append('my_reports', 'true');
      }
      
      // Filter hanya untuk status dan urgency (jika ada)
      if (filterStatus) params.append('status', filterStatus);
      if (filterUrgency) params.append('urgency', filterUrgency);
      
      // Fetch more data untuk client-side filtering/sorting (DataGrid akan handle pagination)
      params.append('limit', '1000'); // Fetch banyak data, DataGrid handle pagination

      if (search) {
        params.append('search', search);
      }
      
      const response = await api.get(`/reports?${params}`);
      const data = response.data;
      
      // Handle both old format (array) and new format (object with data, total, page)
      let reports: Laporan[] = [];
      
      if (Array.isArray(data)) {
        reports = data;
      } else if (data && data.data) {
        reports = data.data;
      }
      
      setLaporan(reports);
    } catch (error) {
      console.error('Error fetching laporan:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const isPengurus = ['admin', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'].includes(user.role || '');

  return (
    <Layout>
        {/* Header */}
        <div className="mb-6">
          <Typography variant="h4" className="font-bold text-gray-900 mb-2">
            {user?.role === 'warga' ? 'Laporan Saya' : 'Daftar Laporan'}
          </Typography>
          <Typography variant="body2" className="text-gray-600">
            {user?.role === 'warga' 
              ? 'Pantau progres dan status laporan Anda' 
              : 'Kelola dan pantau semua laporan dari warga'}
          </Typography>
        </div>

        {/* Realtime indicator */}
        {isRefreshing && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center gap-2 text-sm text-blue-700 animate-pulse">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Memperbarui data realtime...</span>
          </div>
        )}

        {/* Header dengan Export Button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box />
          {laporan.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={() => {
                const formattedData = formatReportsForExcel(laporan);
                exportToExcel(formattedData, 'daftar_laporan', 'Daftar Laporan');
              }}
              sx={{
                borderColor: '#3B82F6',
                color: '#3B82F6',
                '&:hover': {
                  borderColor: '#2563EB',
                  bgcolor: '#EFF6FF',
                },
              }}
            >
              Export Excel
            </Button>
          )}
        </Box>

        {/* DataGrid Table */}
        <Paper
          elevation={0}
          sx={{
            height: 600,
            width: '100%',
            border: '1px solid #E5E7EB',
            borderRadius: 3,
            '& .MuiDataGrid-root': {
              border: 'none',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #F3F4F6',
            },
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: '#F9FAFB',
              borderBottom: '2px solid #E5E7EB',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid #E5E7EB',
            },
          }}
        >
          <DataGrid
            rows={laporan}
            columns={[
              {
                field: 'title',
                headerName: 'Judul Laporan',
                flex: 2,
                minWidth: 200,
                filterable: true,
                renderCell: (params) => (
                  <Box>
                    <Box sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {params.row.title}
                    </Box>
                    <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                      {params.row.description?.substring(0, 100)}
                      {params.row.description?.length > 100 ? '...' : ''}
                    </Box>
                    {params.row.location && (
                      <Box sx={{ fontSize: '0.75rem', color: 'text.disabled', mt: 0.5 }}>
                        📍 {params.row.location}
                      </Box>
                    )}
                  </Box>
                ),
              },
              ...(user?.role !== 'warga' ? [{
                field: 'user_name',
                headerName: 'Pelapor',
                width: 180,
                filterable: true,
                renderCell: (params) => (
                  <Box>
                    <Box sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {params.row.user_name || 'Tidak diketahui'}
                    </Box>
                    {params.row.user_email && (user?.role === 'admin' || user?.role === 'pengurus') && (
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        {params.row.user_email}
                      </Box>
                    )}
                  </Box>
                ),
              }] : []),
              {
                field: 'category',
                headerName: 'Kategori',
                width: 140,
                filterable: true,
                renderCell: (params) => (
                  <Chip
                    label={CATEGORY_LABELS[params.value] || params.value || 'Belum diproses'}
                    size="small"
                  />
                ),
              },
              {
                field: 'urgency',
                headerName: 'Urgensi',
                width: 130,
                type: 'singleSelect',
                valueOptions: ['high', 'medium', 'low'],
                filterable: true,
                renderCell: (params) => {
                  if (!params.value || !URGENCY_COLORS[params.value]) return null;
                  const color = URGENCY_COLORS[params.value];
                  return (
                    <Chip
                      label={color.label}
                      size="small"
                      sx={{
                        bgcolor: color.bg,
                        color: color.text,
                        fontWeight: 600,
                      }}
                    />
                  );
                },
              },
              {
                field: 'status',
                headerName: 'Status',
                width: 140,
                type: 'singleSelect',
                valueOptions: ['pending', 'in_progress', 'resolved', 'rejected', 'cancelled'],
                filterable: true,
                renderCell: (params) => {
                  if (!params.value || !STATUS_COLORS[params.value]) return null;
                  const color = STATUS_COLORS[params.value];
                  return (
                    <Chip
                      label={color.label}
                      size="small"
                      sx={{
                        bgcolor: color.bg,
                        color: color.text,
                        fontWeight: 600,
                      }}
                    />
                  );
                },
              },
              ...((user?.role === 'admin' || user?.role === 'pengurus') ? [{
                field: 'blockchain_tx_hash',
                headerName: 'Blockchain',
                width: 160,
                filterable: false,
                renderCell: (params) => {
                  if (!params.value) {
                    return (
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        Belum tercatat
                      </Typography>
                    );
                  }
                  if (params.row.is_mock_blockchain) {
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
                        <BlockIcon fontSize="small" />
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {params.value.substring(0, 8)}...
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          (Mock)
                        </Typography>
                      </Box>
                    );
                  }
                  return (
                    <Link
                      href={`https://amoy.polygonscan.com/tx/${params.value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9333EA', textDecoration: 'none' }}
                    >
                      <BlockIcon fontSize="small" />
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {params.value.substring(0, 8)}...
                      </Typography>
                    </Link>
                  );
                },
              }] : []),
              {
                field: 'created_at',
                headerName: 'Tanggal',
                width: 180,
                type: 'dateTime',
                filterable: true,
                valueGetter: (value) => value ? new Date(value) : null,
                renderCell: (params) => {
                  if (!params.value) return '-';
                  const date = new Date(params.value);
                  return (
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block' }}>
                        {date.toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                        {date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  );
                },
              },
              {
                field: 'actions',
                type: 'actions',
                headerName: 'Aksi',
                width: 100,
                getActions: (params) => [
                  <GridActionsCellItem
                    icon={<Tooltip title="Lihat Detail"><VisibilityIcon /></Tooltip>}
                    label="Lihat Detail"
                    onClick={() => router.push(`/reports/${params.row.id}`)}
                    showInMenu={false}
                    sx={{ color: '#3B82F6' }}
                  />,
                ],
              },
            ]}
            loading={loading}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10 },
              },
              sorting: {
                sortModel: [{ field: 'created_at', sort: 'desc' }],
              },
            }}
            slots={{
              toolbar: GridToolbar,
            }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
                printOptions: { disableToolbarButton: true },
                csvOptions: { disableToolbarButton: true },
                excelOptions: { disableToolbarButton: true },
              },
            }}
            sx={{
              '& .MuiDataGrid-toolbarContainer': {
                p: 2,
                borderBottom: '1px solid #E5E7EB',
              },
              '& .MuiDataGrid-row:hover': {
                bgcolor: '#F9FAFB',
              },
            }}
          />
        </Paper>
    </Layout>
  );
}

