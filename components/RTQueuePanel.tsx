'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import useAuthStore from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from './Toast';
import { DataGrid, GridColDef, GridActionsCellItem, GridToolbar } from '@mui/x-data-grid';
import { Box, Button, Chip, IconButton, Paper, Tooltip } from '@mui/material';
import { FileDownload, PlayArrow, CheckCircle } from '@mui/icons-material';
import { exportToExcel, formatReportsForExcel } from '@/lib/exportToExcel';

interface Report {
  id: number;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  location: string;
  created_at: string;
  user_name: string;
  rt_rw?: string;
}

export default function RTQueuePanel() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [onlyPending, setOnlyPending] = useState(true);
  const { toasts, success, error: showError, removeToast } = useToast();
  const canManageStatus = ['pengurus', 'ketua_rt', 'sekretaris_rt', 'sekretaris'].includes(user?.role || '');

  const fetchReports = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setLoading(true);
    }
    try {
      const response = await api.get('/reports');
      
      let reportsData: Report[] = [];
      if (Array.isArray(response.data)) {
        reportsData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        reportsData = response.data.data || response.data.reports || response.data.results || [];
      }
      
      if (!Array.isArray(reportsData)) {
        reportsData = [];
      }
      
      let list: Report[] = [...reportsData];
      
      // Filter berdasarkan status jika checkbox checked
      if (onlyPending) {
        list = list.filter((r) => {
          const status = (r.status || '').toLowerCase().trim();
          return status === 'pending' || status === 'in_progress';
        });
      }
      
      // Sort by created_at desc (terbaru di atas)
      list.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      
      setReports(list);
    } catch (e: any) {
      console.error('[RTQueuePanel] Error fetching reports:', e);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [onlyPending]);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user, fetchReports]);

  // Realtime polling - refresh setiap 10 detik
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      setIsRefreshing(true);
      fetchReports(true).finally(() => {
        setTimeout(() => setIsRefreshing(false), 500);
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [user, fetchReports]);

  const updateStatus = useCallback(async (id: number, status: string) => {
    try {
      await api.patch(`/reports/${id}/status`, { status });
      const statusLabels: Record<string, string> = {
        'pending': 'Menunggu',
        'in_progress': 'Sedang Diproses',
        'resolved': 'Selesai',
        'cancelled': 'Dibatalkan'
      };
      success(`Status laporan berhasil diubah menjadi "${statusLabels[status] || status}"`);
      fetchReports();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Gagal mengubah status laporan. Silakan coba lagi.');
    }
  }, [fetchReports, success, showError]);

  const handleExportExcel = useCallback(() => {
    if (reports.length === 0) {
      showError('Tidak ada data untuk diekspor');
      return;
    }
    
    const formattedData = formatReportsForExcel(reports);
    exportToExcel(formattedData, 'laporan_warga', 'Laporan Warga');
    success('Data berhasil diekspor ke Excel');
  }, [reports, showError, success]);

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'title',
      headerName: 'Judul Laporan',
      flex: 2,
      minWidth: 200,
      renderCell: (params) => (
        <Box>
          <Box sx={{ fontWeight: 600, color: 'text.primary' }}>
            {params.row.title}
          </Box>
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
            {params.row.description?.substring(0, 100)}
            {params.row.description?.length > 100 ? '...' : ''}
          </Box>
        </Box>
      ),
    },
    {
      field: 'user_name',
      headerName: 'Pelapor',
      width: 150,
      filterable: true,
    },
    {
      field: 'urgency',
      headerName: 'Urgensi',
      width: 130,
      type: 'singleSelect',
      valueOptions: ['high', 'medium', 'low'],
      filterable: true,
      renderCell: (params) => {
        const colors: Record<string, { bg: string; color: string }> = {
          high: { bg: '#FEE2E2', color: '#991B1B' },
          medium: { bg: '#FEF3C7', color: '#92400E' },
          low: { bg: '#F3F4F6', color: '#374151' },
        };
        const color = colors[params.value] || colors.low;
        return (
          <Chip
            label={params.value || 'Belum diproses'}
            size="small"
            sx={{
              bgcolor: color.bg,
              color: color.color,
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
      valueOptions: ['pending', 'in_progress', 'resolved', 'cancelled'],
      filterable: true,
      renderCell: (params) => {
        const colors: Record<string, { bg: string; color: string; label: string }> = {
          pending: { bg: '#FEF3C7', color: '#92400E', label: 'Menunggu' },
          in_progress: { bg: '#DBEAFE', color: '#1E40AF', label: 'Diproses' },
          resolved: { bg: '#D1FAE5', color: '#065F46', label: 'Selesai' },
          cancelled: { bg: '#F3F4F6', color: '#374151', label: 'Dibatalkan' },
        };
        const color = colors[params.value] || colors.pending;
        return (
          <Chip
            label={color.label || params.value}
            size="small"
            sx={{
              bgcolor: color.bg,
              color: color.color,
              fontWeight: 600,
            }}
          />
        );
      },
    },
    {
      field: 'location',
      headerName: 'Lokasi',
      width: 180,
      filterable: true,
    },
    {
      field: 'created_at',
      headerName: 'Tanggal Dibuat',
      width: 180,
      type: 'dateTime',
      filterable: true,
      valueGetter: (value) => value ? new Date(value) : null,
      renderCell: (params) => {
        if (!params.value) return '-';
        return new Date(params.value).toLocaleString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Aksi',
      width: 200,
      getActions: (params) => {
        const actions = [];
        
        if (canManageStatus) {
          if (params.row.status === 'pending') {
            actions.push(
              <GridActionsCellItem
                icon={<Tooltip title="Mulai Proses"><PlayArrow sx={{ color: '#3B82F6' }} /></Tooltip>}
                label="Mulai Proses"
                onClick={() => updateStatus(params.row.id, 'in_progress')}
                showInMenu={false}
              />
            );
          }
          
          if (params.row.status !== 'resolved') {
            actions.push(
              <GridActionsCellItem
                icon={<Tooltip title="Selesaikan"><CheckCircle sx={{ color: '#10B981' }} /></Tooltip>}
                label="Selesaikan"
                onClick={() => updateStatus(params.row.id, 'resolved')}
                showInMenu={false}
              />
            );
          }
        }
        
        return actions;
      },
    },
  ], [canManageStatus, updateStatus]);

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header dengan controls */}
      {isRefreshing && (
          <Box
            sx={{
              bgcolor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontSize: '0.875rem',
              color: '#1E40AF',
              animation: 'pulse 2s infinite',
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#3B82F6',
                animation: 'pulse 1s infinite',
              }}
            />
            Memperbarui antrian realtime...
          </Box>
        )}

        <Paper
          elevation={0}
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid #E5E7EB',
            borderRadius: 3,
          }}
        >
          <Box sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#111827' }}>
            Antrian Laporan Warga
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <input
            type="checkbox"
            checked={onlyPending}
            onChange={(e) => setOnlyPending(e.target.checked)}
                style={{
                  width: 16,
                  height: 16,
                  cursor: 'pointer',
                }}
              />
              <Box component="label" sx={{ fontSize: '0.875rem', color: '#6B7280', cursor: 'pointer' }}>
                Tampilkan hanya pending / in_progress
              </Box>
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={handleExportExcel}
              disabled={reports.length === 0}
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
          </Box>
        </Paper>

        {/* DataGrid */}
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
            rows={reports}
            columns={columns}
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

        {!canManageStatus && reports.length > 0 && (
          <Box
            sx={{
              p: 1,
              bgcolor: '#F3F4F6',
              borderRadius: 1,
              fontSize: '0.75rem',
              color: '#6B7280',
              textAlign: 'center',
            }}
          >
            Hanya pengurus RT yang dapat mengubah status laporan
          </Box>
        )}
      </Box>
    </>
  );
}
