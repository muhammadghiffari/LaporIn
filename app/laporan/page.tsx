'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import api from '@/lib/api';
import Layout from '@/components/Layout';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Box,
  Typography,
  Pagination,
  TextField,
  InputAdornment,
  IconButton,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Block as BlockIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';

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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterUrgency, setFilterUrgency] = useState<string>('');
  const itemsPerPage = 10;

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
  }, [hasCheckedAuth, isAuthenticated, page, search, filterStatus, filterUrgency]);

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
  }, [hasCheckedAuth, isAuthenticated, page, search, filterStatus, filterUrgency]);

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
      
      params.append('limit', itemsPerPage.toString());
      params.append('offset', ((page - 1) * itemsPerPage).toString());

      if (search) {
        params.append('search', search);
      }
      
      const response = await api.get(`/reports?${params}`);
      const data = response.data;
      
      // Handle both old format (array) and new format (object with data, total, page)
      let reports: Laporan[] = [];
      let total = 0;
      
      if (Array.isArray(data)) {
        reports = data;
        total = data.length;
      } else if (data && data.data) {
        reports = data.data;
        total = data.total || data.data.length;
      }
      
      setLaporan(reports);
      setTotalPages(Math.ceil(total / itemsPerPage) || 1);
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

        {/* Filters & Search */}
        <Box className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className={`grid grid-cols-1 ${isPengurus ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-4`}>
            <TextField
              fullWidth
              size="medium"
              placeholder="Cari laporan, pelapor, atau lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon className="text-gray-400" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: '#f9fafb',
                  '&:hover': {
                    backgroundColor: '#f3f4f6',
                  },
                  '&.Mui-focused': {
                    backgroundColor: '#ffffff',
                  },
                },
              }}
            />
            {isPengurus && (
              <>
                <TextField
                  fullWidth
                  size="medium"
                  select
                  // label="Filter Status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  variant="outlined"
                  SelectProps={{ native: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      backgroundColor: '#f9fafb',
                      '&:hover': {
                        backgroundColor: '#f3f4f6',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#ffffff',
                      },
                    },
                  }}
                >
                  <option value="">Semua Status</option>
                  <option value="pending">Menunggu</option>
                  <option value="in_progress">Sedang Diproses</option>
                  <option value="resolved">Selesai</option>
                  <option value="rejected">Ditolak</option>
                </TextField>
                <TextField
                  fullWidth
                  size="medium"
                  select
                  // label="Filter Urgensi"
                  value={filterUrgency}
                  onChange={(e) => setFilterUrgency(e.target.value)}
                  variant="outlined"
                  SelectProps={{ native: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      backgroundColor: '#f9fafb',
                      '&:hover': {
                        backgroundColor: '#f3f4f6',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#ffffff',
                      },
                    },
                  }}
                >
                  <option value="">Semua Urgensi</option>
                  <option value="high">Tinggi</option>
                  <option value="medium">Sedang</option>
                  <option value="low">Rendah</option>
                </TextField>
              </>
            )}
          </div>
        </Box>

        {/* Table */}
        <TableContainer component={Paper} className="shadow-sm rounded-2xl border border-gray-200 overflow-hidden">
          <Table>
            <TableHead className="bg-gray-50">
              <TableRow>
                <TableCell className="font-semibold">Judul Laporan</TableCell>
                {user?.role === 'warga' ? null : (
                  <TableCell className="font-semibold">Pelapor</TableCell>
                )}
                <TableCell className="font-semibold">Kategori</TableCell>
                <TableCell className="font-semibold">Urgensi</TableCell>
                <TableCell className="font-semibold">Status</TableCell>
                {user?.role === 'admin' || user?.role === 'pengurus' ? (
                <TableCell className="font-semibold">Blockchain</TableCell>
                ) : null}
                <TableCell className="font-semibold">Tanggal</TableCell>
                <TableCell className="font-semibold text-center">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton variant="text" width="100%" /></TableCell>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    {(user?.role === 'admin' || user?.role === 'pengurus') && (
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    )}
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                  </TableRow>
                ))
              ) : laporan.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={
                    (user?.role === 'admin' || user?.role === 'pengurus') ? 8 : 
                    (user?.role === 'warga') ? 6 : 7
                  } className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <Image
                        src="https://images.unsplash.com/photo-1503264116251-35a269479413?q=80&w=1280&auto=format&fit=crop"
                        alt="Tidak ada laporan"
                        width={300}
                        height={200}
                        className="rounded-lg"
                        unoptimized
                      />
                      <Typography variant="body1" className="text-gray-600">
                        Tidak ada laporan ditemukan
                      </Typography>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                laporan.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <div>
                        <Typography variant="body2" className="font-medium">
                          {item.title}
                        </Typography>
                        <Typography variant="caption" className="text-gray-500 line-clamp-1">
                          {item.description.substring(0, 80)}...
                        </Typography>
                        {item.location && (
                          <Typography variant="caption" className="text-gray-400 block mt-1">
                            📍 {item.location}
                          </Typography>
                        )}
                      </div>
                    </TableCell>
                    {user?.role !== 'warga' && (
                      <TableCell>
                        <div>
                          <Typography variant="body2" className="font-semibold text-gray-900">
                            {item.user_name || 'Tidak diketahui'}
                          </Typography>
                          {/* Email hanya untuk admin/pengurus */}
                          {item.user_email && (user?.role === 'admin' || user?.role === 'pengurus') && (
                            <Typography variant="caption" className="text-gray-500 block">
                              {item.user_email}
                            </Typography>
                          )}
                          {item.blockchain_tx_hash && (
                            <div className="flex items-center gap-1 mt-1">
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                              <Typography variant="caption" className="text-green-600 text-xs font-semibold">
                                Terverifikasi Blockchain
                          </Typography>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Chip
                        label={CATEGORY_LABELS[item.category || ''] || item.category || 'Belum diproses'}
                        size="small"
                        className="text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      {item.urgency && URGENCY_COLORS[item.urgency] && (
                        <Chip
                          label={URGENCY_COLORS[item.urgency].label}
                          size="small"
                          style={{
                            backgroundColor: URGENCY_COLORS[item.urgency].bg,
                            color: URGENCY_COLORS[item.urgency].text,
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {STATUS_COLORS[item.status] && (
                        <Chip
                          label={STATUS_COLORS[item.status].label}
                          size="small"
                          style={{
                            backgroundColor: STATUS_COLORS[item.status].bg,
                            color: STATUS_COLORS[item.status].text,
                          }}
                        />
                      )}
                    </TableCell>
                    {(user?.role === 'admin' || user?.role === 'pengurus') && (
                    <TableCell>
                      {item.blockchain_tx_hash ? (
                          item.is_mock_blockchain ? (
                            <div className="flex items-center gap-1 text-gray-500">
                              <BlockIcon fontSize="small" />
                              <Typography variant="caption" className="font-mono text-xs">
                                {item.blockchain_tx_hash.substring(0, 8)}...
                              </Typography>
                              <Typography variant="caption" className="text-xs text-gray-400">
                                (Mock)
                              </Typography>
                            </div>
                          ) : (
                        <a
                          href={`https://amoy.polygonscan.com/tx/${item.blockchain_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Verifikasi di Blockchain Explorer"
                          className="flex items-center gap-1 text-purple-600 hover:text-purple-800"
                        >
                          <BlockIcon fontSize="small" />
                          <Typography variant="caption" className="font-mono text-xs">
                            {item.blockchain_tx_hash.substring(0, 8)}...
                          </Typography>
                        </a>
                          )
                      ) : (
                        <Typography variant="caption" className="text-gray-400">
                          Belum tercatat
                        </Typography>
                      )}
                    </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="caption" className="text-gray-600">
                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Typography>
                      <Typography variant="caption" className="text-gray-400 block text-xs">
                        {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-center">
                        <Link href={`/reports/${item.id}`}>
                          <IconButton size="small" title="Lihat Detail">
                            <VisibilityIcon fontSize="small" className="text-blue-600" />
                          </IconButton>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {!loading && laporan.length > 0 && (
          <Box className="mt-6 flex justify-center">
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              shape="rounded"
            />
          </Box>
        )}
    </Layout>
  );
}

