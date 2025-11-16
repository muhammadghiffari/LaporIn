'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Box,
  Typography,
  Pagination,
  IconButton,
  Skeleton,
  Chip,
  Button,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: string;
  rt_rw?: string;
  jenis_kelamin?: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  warga: 'Warga',
  pengurus: 'Pengurus',
  sekretaris_rt: 'Sekretaris RT',
  ketua_rt: 'Ketua RT',
  admin_rw: 'Admin RW',
  admin: 'Admin Sistem',
};

export default function AdminSystemPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  
  // Form state
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'warga',
    rt_rw: '',
    jenis_kelamin: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (role && role !== 'all') params.set('role', role);
      params.set('limit', itemsPerPage.toString());
      params.set('offset', ((page - 1) * itemsPerPage).toString());
      
      const { data } = await api.get(`/auth/users?${params.toString()}`);
      
      // Handle both array and object response
      if (Array.isArray(data)) {
        setUsers(data);
        setTotalPages(Math.ceil(data.length / itemsPerPage) || 1);
      } else if (data && data.data) {
        setUsers(data.data);
        setTotalPages(Math.ceil((data.total || data.data.length) / itemsPerPage) || 1);
      } else {
        setUsers([]);
        setTotalPages(1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchUsers();
      } else {
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role]);

  const removeUser = async (id: number) => {
    if (!confirm('Hapus pengguna ini?')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      fetchUsers();
    } catch {
      alert('Gagal menghapus pengguna');
    }
  };

  const handleCreateUser = async () => {
    setFormError('');
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      setFormError('Nama, email, password, dan role wajib diisi');
      return;
    }
    
    setFormLoading(true);
    try {
      await api.post('/auth/users', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        rt_rw: formData.rt_rw || null,
        jenis_kelamin: formData.jenis_kelamin || null,
      });
      setOpenDialog(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'warga',
        rt_rw: '',
        jenis_kelamin: '',
      });
      fetchUsers();
    } catch (error: any) {
      setFormError(error.response?.data?.error || 'Gagal membuat pengguna');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Typography variant="h5" className="font-bold text-gray-900">
          Kelola Pengguna
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6 py-2.5"
        >
          Buat User Baru
        </Button>
      </div>

      {/* Filters */}
      <Box className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            fullWidth
            size="medium"
            placeholder="Cari nama atau email..."
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
          <TextField
            fullWidth
            size="medium"
            select
            // label="Filter Peran"
            value={role}
            onChange={(e) => setRole(e.target.value)}
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
            <option value="all">Semua Peran</option>
            <option value="warga">Warga</option>
            <option value="pengurus">Pengurus</option>
            <option value="sekretaris_rt">Sekretaris RT</option>
            <option value="ketua_rt">Ketua RT</option>
            <option value="admin_rw">Admin RW</option>
            <option value="admin">Admin Sistem</option>
          </TextField>
        </div>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} className="shadow-sm rounded-2xl border border-gray-200">
        <Table>
          <TableHead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <TableRow>
              <TableCell className="font-semibold">Nama</TableCell>
              <TableCell className="font-semibold">Email</TableCell>
              <TableCell className="font-semibold">Peran</TableCell>
              <TableCell className="font-semibold">RT/RW</TableCell>
              <TableCell className="font-semibold">Gender</TableCell>
              <TableCell className="font-semibold">Dibuat</TableCell>
              <TableCell className="font-semibold text-center">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="text" width="100%" /></TableCell>
                  <TableCell><Skeleton variant="text" width={150} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                  <TableCell><Skeleton variant="text" width={120} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Typography variant="body2" className="text-gray-500">
                    Tidak ada data pengguna ditemukan
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} hover className="transition-colors">
                  <TableCell>
                    <Typography variant="body2" className="font-medium">
                      {u.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" className="text-gray-600">
                      {u.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ROLE_LABELS[u.role] || u.role}
                      size="small"
                      className="text-xs"
                      color={u.role === 'admin' ? 'error' : u.role === 'warga' ? 'default' : 'primary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" className="text-gray-600">
                      {u.rt_rw || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" className="text-gray-600 capitalize">
                      {u.jenis_kelamin?.replace('_', ' ') || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" className="text-gray-600">
                      {new Date(u.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Typography>
                  </TableCell>
                  <TableCell className="text-center">
                    <IconButton
                      size="small"
                      onClick={() => removeUser(u.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      title="Hapus Pengguna"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {!loading && users.length > 0 && (
        <Box className="flex justify-center">
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            shape="rounded"
            className="rounded-xl"
          />
        </Box>
      )}

      {/* Create User Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="font-bold text-gray-900">Buat User Baru</DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-2">
            {formError && (
              <Alert severity="error" className="rounded-xl">
                {formError}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Nama Lengkap"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              variant="outlined"
              size="medium"
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              variant="outlined"
              size="medium"
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              variant="outlined"
              size="medium"
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <FormControl fullWidth size="medium" required>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                label="Role"
                sx={{
                  borderRadius: 2,
                }}
              >
                <MenuItem value="warga">Warga</MenuItem>
                <MenuItem value="pengurus">Pengurus</MenuItem>
                <MenuItem value="sekretaris_rt">Sekretaris RT</MenuItem>
                <MenuItem value="ketua_rt">Ketua RT</MenuItem>
                <MenuItem value="admin_rw">Admin RW</MenuItem>
                <MenuItem value="admin">Admin Sistem</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="RT/RW (opsional)"
              placeholder="Contoh: RT 01/RW 05"
              value={formData.rt_rw}
              onChange={(e) => setFormData({ ...formData, rt_rw: e.target.value })}
              variant="outlined"
              size="medium"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <FormControl fullWidth size="medium">
              <InputLabel>Jenis Kelamin (opsional)</InputLabel>
              <Select
                value={formData.jenis_kelamin}
                onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                label="Jenis Kelamin (opsional)"
                sx={{
                  borderRadius: 2,
                }}
              >
                <MenuItem value="">Tidak Disediakan</MenuItem>
                <MenuItem value="laki_laki">Laki-laki</MenuItem>
                <MenuItem value="perempuan">Perempuan</MenuItem>
              </Select>
            </FormControl>
          </div>
        </DialogContent>
        <DialogActions className="px-6 py-4">
          <Button onClick={() => setOpenDialog(false)} className="text-gray-600">
            Batal
          </Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={formLoading}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6"
          >
            {formLoading ? 'Membuat...' : 'Buat User'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}


