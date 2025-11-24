'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from './Toast';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  Pagination,
  Box,
} from '@mui/material';
import {
  CheckCircle2,
  XCircle,
  UserCheck,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface PendingWarga {
  id: number;
  email: string;
  name: string;
  rt_rw?: string;
  jenis_kelamin?: string;
  created_at: string;
  face_verified: boolean;
  verified_by?: number;
  verified_at?: string;
  verification_notes?: string;
}

export default function UserVerificationPanel() {
  const [pendingWarga, setPendingWarga] = useState<PendingWarga[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<number | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedWarga, setSelectedWarga] = useState<PendingWarga | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [approveMode, setApproveMode] = useState(true);
  const [page, setPage] = useState(1);
  const itemsPerPage = 5; // 5 item per halaman
  const { toasts, success: showSuccess, error: showError, removeToast } = useToast();
  
  // Calculate pagination
  const totalPages = Math.ceil(pendingWarga.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWarga = pendingWarga.slice(startIndex, endIndex);

  useEffect(() => {
    fetchPendingWarga();
  }, []);

  const fetchPendingWarga = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/warga/pending-verification');
      setPendingWarga(data.pendingWarga || []);
    } catch (error: any) {
      console.error('Error fetching pending warga:', error);
      showError('Gagal memuat daftar warga yang perlu diverifikasi');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyClick = (warga: PendingWarga, approve: boolean) => {
    setSelectedWarga(warga);
    setApproveMode(approve);
    setVerificationNotes('');
    setOpenDialog(true);
  };

  const handleVerify = async () => {
    if (!selectedWarga) return;

    setVerifying(selectedWarga.id);
    try {
      await api.post(`/auth/warga/${selectedWarga.id}/verify`, {
        approved: approveMode,
        notes: verificationNotes || null
      });

      showSuccess(
        approveMode 
          ? `Warga ${selectedWarga.name} berhasil diverifikasi` 
          : `Verifikasi warga ${selectedWarga.name} ditolak`
      );
      
      setOpenDialog(false);
      setSelectedWarga(null);
      setVerificationNotes('');
      
      // Calculate if we need to adjust page after verification
      // If current page has only 1 item and we're not on page 1, go to previous page
      const currentPageItems = paginatedWarga.length;
      const shouldGoToPreviousPage = currentPageItems === 1 && page > 1;
      
      // Refresh list
      fetchPendingWarga();
      
      // Reset to previous page if current page becomes empty after verification
      if (shouldGoToPreviousPage) {
        setPage(page - 1);
      }
    } catch (error: any) {
      console.error('Error verifying warga:', error);
      showError(error.response?.data?.error || 'Gagal melakukan verifikasi');
    } finally {
      setVerifying(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Tanggal tidak valid';
      }
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Tanggal tidak valid';
    }
  };

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h5" className="font-bold text-gray-900">
            Verifikasi Warga
          </Typography>
          <Typography variant="body2" className="text-gray-600 mt-1">
            Verifikasi akun warga baru untuk memastikan keamanan dan validitas data
          </Typography>
        </div>
        <Button
          variant="outlined"
          onClick={fetchPendingWarga}
          disabled={loading}
          className="rounded-xl"
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={80} className="rounded-xl" />
          ))}
        </div>
      ) : pendingWarga.length === 0 ? (
        <Alert severity="success" className="rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>Semua warga sudah diverifikasi. Tidak ada warga yang menunggu verifikasi.</span>
          </div>
        </Alert>
      ) : (
        <>
          <Alert severity="info" className="rounded-xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>
                Ada <strong>{pendingWarga.length}</strong> warga yang menunggu verifikasi
                {totalPages > 1 && (
                  <span className="ml-2 text-sm">
                    (Halaman {page} dari {totalPages})
                  </span>
                )}
              </span>
            </div>
          </Alert>

          <TableContainer component={Paper} className="rounded-2xl shadow-sm border border-gray-200">
            <Table>
              <TableHead>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-semibold">Nama</TableCell>
                  <TableCell className="font-semibold">Email</TableCell>
                  <TableCell className="font-semibold">RT/RW</TableCell>
                  <TableCell className="font-semibold">Jenis Kelamin</TableCell>
                  <TableCell className="font-semibold">Terdaftar</TableCell>
                  <TableCell className="font-semibold">Face Verified</TableCell>
                  <TableCell className="font-semibold text-center">Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedWarga.map((warga) => (
                  <TableRow key={warga.id} hover>
                    <TableCell>
                      <div className="font-medium text-gray-900">{warga.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">{warga.email}</div>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={warga.rt_rw || 'N/A'} 
                        size="small" 
                        className="bg-blue-100 text-blue-700"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600 capitalize">
                        {warga.jenis_kelamin === 'laki_laki' ? 'Laki-laki' : 
                         warga.jenis_kelamin === 'perempuan' ? 'Perempuan' : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDate(warga.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {warga.face_verified ? (
                        <Chip 
                          icon={<CheckCircle2 className="h-3 w-3" />}
                          label="Ya" 
                          size="small" 
                          className="bg-green-100 text-green-700"
                        />
                      ) : (
                        <Chip 
                          icon={<XCircle className="h-3 w-3" />}
                          label="Belum" 
                          size="small" 
                          className="bg-gray-100 text-gray-600"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-center">
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<CheckCircle2 className="h-4 w-4" />}
                          onClick={() => handleVerifyClick(warga, true)}
                          disabled={verifying === warga.id}
                          className="bg-green-600 hover:bg-green-700 rounded-lg"
                        >
                          Setujui
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          startIcon={<XCircle className="h-4 w-4" />}
                          onClick={() => handleVerifyClick(warga, false)}
                          disabled={verifying === warga.id}
                          className="rounded-lg"
                        >
                          Tolak
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box className="flex justify-center mt-4">
              <Pagination
                count={totalPages}
                page={page}
                onChange={(event, value) => setPage(value)}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
                sx={{
                  '& .MuiPaginationItem-root': {
                    borderRadius: '8px',
                  },
                }}
              />
            </Box>
          )}
        </>
      )}

      {/* Verification Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => {
          setOpenDialog(false);
          setSelectedWarga(null);
          setVerificationNotes('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="flex items-center gap-2">
          {approveMode ? (
            <>
              <UserCheck className="h-5 w-5 text-green-600" />
              <span>Setujui Verifikasi Warga</span>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-red-600" />
              <span>Tolak Verifikasi Warga</span>
            </>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedWarga && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Nama:</span>
                  <span className="font-medium text-gray-900">{selectedWarga.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Email:</span>
                  <span className="font-medium text-gray-900">{selectedWarga.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">RT/RW:</span>
                  <span className="font-medium text-gray-900">{selectedWarga.rt_rw || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Terdaftar:</span>
                  <span className="font-medium text-gray-900">{formatDate(selectedWarga.created_at)}</span>
                </div>
              </div>

              {!approveMode && (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Alasan Penolakan (Opsional)"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Masukkan alasan mengapa verifikasi ditolak..."
                  variant="outlined"
                  className="rounded-lg"
                />
              )}

              {approveMode ? (
                <Alert severity="success" className="rounded-lg">
                  Dengan menyetujui, warga ini akan dapat menggunakan semua fitur platform dengan penuh.
                </Alert>
              ) : (
                <Alert severity="warning" className="rounded-lg">
                  Warga ini tidak akan dapat menggunakan platform sampai diverifikasi ulang.
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions className="px-6 py-4">
          <Button
            onClick={() => {
              setOpenDialog(false);
              setSelectedWarga(null);
              setVerificationNotes('');
            }}
            className="rounded-lg"
          >
            Batal
          </Button>
          <Button
            onClick={handleVerify}
            variant="contained"
            disabled={verifying === selectedWarga?.id}
            className={`rounded-lg ${approveMode ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {verifying === selectedWarga?.id ? 'Memproses...' : approveMode ? 'Setujui' : 'Tolak'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

