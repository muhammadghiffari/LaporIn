const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../database/prisma');
const { authenticate } = require('../middleware/auth');
const { 
  encryptFaceDescriptor, 
  compareFaceDescriptors, 
  validateFaceDescriptor 
} = require('../services/faceRecognitionService');

const router = express.Router();

// Statistik warga berdasarkan jenis kelamin
router.get('/stats/warga', authenticate, async (req, res) => {
  try {
    const { period = 'day', rtFilter, rwFilter } = req.query; // 'day', 'week', 'month', rtFilter untuk Admin RW, rwFilter untuk Super Admin
    const idUser = req.user?.userId;
    const roleUser = req.user?.role;
    
    // Build filter untuk warga berdasarkan role
    let wargaFilter = {};
    
    if ((roleUser === 'admin' || roleUser === 'admin_sistem') && rtFilter && rwFilter) {
      // Super Admin dengan filter RT dan RW
      wargaFilter = {
        role: 'warga',
        rtRw: `${rtFilter}/${rwFilter}`
      };
    } else if ((roleUser === 'admin' || roleUser === 'admin_sistem') && rwFilter) {
      // Super Admin dengan filter RW saja
      wargaFilter = {
        role: 'warga',
        rtRw: {
          contains: `/${rwFilter}`,
          mode: 'insensitive'
        }
      };
    } else if (roleUser === 'admin_rw' && rtFilter) {
      // Admin RW dengan filter RT: ambil RW dari user, lalu filter per RT
      const user = await prisma.user.findUnique({
        where: { id: idUser },
        select: { rtRw: true }
      });
      if (user?.rtRw) {
        const rwPart = user.rtRw.split('/')[1];
        wargaFilter = {
          role: 'warga',
          rtRw: `${rtFilter}/${rwPart}`
        };
      } else {
        wargaFilter = { role: 'warga' };
      }
    } else if (roleUser === 'admin_rw' && !rtFilter) {
      // Admin RW tanpa filter: semua RT dalam RW mereka
      const user = await prisma.user.findUnique({
        where: { id: idUser },
        select: { rtRw: true }
      });
      if (user?.rtRw) {
        const rwPart = user.rtRw.split('/')[1];
        wargaFilter = {
          role: 'warga',
          rtRw: {
            contains: `/${rwPart}`,
            mode: 'insensitive'
          }
        };
      } else {
        wargaFilter = { role: 'warga' };
      }
    } else if (['ketua_rt', 'sekretaris_rt', 'sekretaris'].includes(roleUser)) {
      // Ketua RT/Sekretaris RT: filter berdasarkan RT/RW mereka
      const user = await prisma.user.findUnique({
        where: { id: idUser },
        select: { rtRw: true }
      });
      if (user?.rtRw) {
        wargaFilter = {
          role: 'warga',
          rtRw: user.rtRw
        };
      } else {
        wargaFilter = { role: 'warga' };
      }
    } else if (roleUser === 'admin' || roleUser === 'admin_sistem') {
      // Super Admin tanpa filter: semua warga
      wargaFilter = { role: 'warga' };
    } else {
      // Default: semua warga
      wargaFilter = { role: 'warga' };
    }
    
    const totalWarga = await prisma.user.count({
      where: wargaFilter
    });
    
    // Get data jenis kelamin menggunakan Prisma (menggunakan wargaFilter yang sama)
    const users = await prisma.user.findMany({
      where: wargaFilter,
      select: {
        jenisKelamin: true
      }
    });
    
    // Count by gender
    const genderCounts = {};
    users.forEach(user => {
      const gender = user.jenisKelamin || 'tidak_disediakan';
      genderCounts[gender] = (genderCounts[gender] || 0) + 1;
    });
    
    const dataJenisKelamin = Object.entries(genderCounts).map(([jenis_kelamin, count]) => ({
      jenis_kelamin,
      count: Number(count)
    }));
    
    // Data pertumbuhan berdasarkan periode menggunakan Prisma
    const now = new Date();
    let startDate = new Date();
    if (period === 'day') {
      startDate.setDate(now.getDate() - 30);
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 84); // 12 weeks
    } else { // month
      startDate.setMonth(now.getMonth() - 12);
    }
    
    const growthUsers = await prisma.user.findMany({
      where: {
        ...wargaFilter,
        createdAt: {
          gte: startDate
        }
      },
      select: {
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Group by period
    const growthMap = {};
    growthUsers.forEach(user => {
      let key = '';
      const date = new Date(user.createdAt);
      if (period === 'day') {
        key = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } else if (period === 'week') {
        const week = Math.ceil(date.getDate() / 7);
        key = `${week.toString().padStart(2, '0')}/${date.getFullYear()}`;
      } else { // month
        key = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      }
      growthMap[key] = (growthMap[key] || 0) + 1;
    });
    
    const dataPertumbuhan = Object.entries(growthMap).map(([label, count]) => ({
      label,
      date_key: label, // Simplified
      count: Number(count)
    })).sort((a, b) => a.label.localeCompare(b.label));
    
    const jumlahLaki = dataJenisKelamin.find(baris => baris.jenis_kelamin === 'laki_laki')?.count || 0;
    const jumlahPerempuan = dataJenisKelamin.find(baris => baris.jenis_kelamin === 'perempuan')?.count || 0;
    res.json({
      total_warga: totalWarga,
      by_gender: dataJenisKelamin,
      persentase: {
        laki_laki: totalWarga ? Math.round((jumlahLaki / totalWarga) * 100) : 0,
        perempuan: totalWarga ? Math.round((jumlahPerempuan / totalWarga) * 100) : 0
      },
      growth: dataPertumbuhan,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Buat user baru (hierarchical: admin, admin_rw, ketua_rt, sekretaris_rt)
router.post('/users', async (req, res) => {
  try {
    const headerAuth = req.headers.authorization;
    if (!headerAuth) return res.status(401).json({ error: 'Unauthorized' });
    const token = headerAuth.split(' ')[1];
    const tokenTerdekripsi = jwt.verify(token, process.env.JWT_SECRET);
    const creatorRole = tokenTerdekripsi.role;
    const creatorId = tokenTerdekripsi.userId;
    
    // Import helper functions
    const { canCreateRole, validateRtRwBoundary, shouldAutoVerify } = require('../utils/userHierarchy');
    
    // Cek apakah creator bisa membuat user
    if (!canCreateRole(creatorRole, req.body.role)) {
      return res.status(403).json({ 
        error: `Role ${creatorRole} tidak memiliki permission untuk membuat user dengan role ${req.body.role}` 
      });
    }
    
    const { email, password, name, role, rt_rw, jenis_kelamin } = req.body;
    
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, password, name, dan role wajib diisi' });
    }
    
    // Validasi role
    const daftarRoleValid = ['warga', 'pengurus', 'sekretaris_rt', 'sekretaris', 'ketua_rt', 'admin_rw', 'admin'];
    if (!daftarRoleValid.includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid' });
    }
    
    // Get creator data untuk validasi RT/RW boundary
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { rtRw: true, role: true }
    });
    
    if (!creator) {
      return res.status(404).json({ error: 'Creator user tidak ditemukan' });
    }
    
    // Validasi RT/RW boundary
    const rtRwValidation = validateRtRwBoundary(creatorRole, creator.rtRw, rt_rw);
    if (!rtRwValidation.valid) {
      return res.status(403).json({ error: rtRwValidation.error });
    }
    
    // Cek apakah email sudah terdaftar
    const userTerdaftar = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    if (userTerdaftar) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }
    
    // Hash password
    const hashPassword = await bcrypt.hash(password, 10);
    
    // Tentukan auto-verification
    const autoVerified = shouldAutoVerify(creatorRole, role);
    
    // Buat user baru dengan createdBy dan auto-verification
    const userBaru = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword,
        name,
        role,
        rtRw: rt_rw || null,
        jenisKelamin: jenis_kelamin || null,
        createdBy: creatorId, // Audit trail
        isVerified: autoVerified, // Auto-verify jika dibuat oleh atasan
        verifiedBy: autoVerified ? creatorId : null,
        verifiedAt: autoVerified ? new Date() : null
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        rtRw: true,
        jenisKelamin: true,
        isVerified: true,
        createdAt: true,
        createdBy: true
      }
    });
    
    console.log(`[User Creation] User ${creatorId} (${creatorRole}) created user ${userBaru.id} (${role}) - Auto-verified: ${autoVerified}`);
    
    res.json({ 
      success: true, 
      message: autoVerified ? 'User berhasil dibuat dan otomatis diverifikasi' : 'User berhasil dibuat',
      user: {
        id: userBaru.id,
        email: userBaru.email,
        name: userBaru.name,
        role: userBaru.role,
        rt_rw: userBaru.rtRw,
        jenis_kelamin: userBaru.jenisKelamin,
        is_verified: userBaru.isVerified,
        created_at: userBaru.createdAt,
        created_by: userBaru.createdBy
      }
    });
  } catch (error) {
    console.error('[User Creation] Error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Registrasi user baru (WAJIB dengan face descriptor)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, rt_rw, jenis_kelamin, faceDescriptor } = req.body;
    
    // WAJIB face descriptor untuk registrasi
    if (!faceDescriptor) {
      return res.status(400).json({ error: 'Face descriptor is required for registration' });
    }
    
    // Hash password
    const hashPassword = await bcrypt.hash(password, 10);
    
    // Validate dan encrypt face descriptor (WAJIB)
    if (!validateFaceDescriptor(faceDescriptor)) {
      return res.status(400).json({ error: 'Invalid face descriptor format' });
    }
    const encryptedFaceDescriptor = encryptFaceDescriptor(faceDescriptor);
    
    // Buat user baru (dengan face descriptor wajib)
    const userBaru = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword,
        name,
        role,
        rtRw: rt_rw || null,
        jenisKelamin: jenis_kelamin || null,
        faceDescriptor: encryptedFaceDescriptor, // Wajib ada
        faceVerified: true, // Auto verified saat registrasi
        faceVerifiedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        rtRw: true,
        jenisKelamin: true,
        faceVerified: true
      }
    });
    
    const token = jwt.sign(
      { userId: userBaru.id, role: userBaru.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      token, 
      user: {
        id: userBaru.id,
        email: userBaru.email,
        name: userBaru.name,
        role: userBaru.role,
        rt_rw: userBaru.rtRw,
        jenis_kelamin: userBaru.jenisKelamin,
        face_verified: userBaru.faceVerified
      },
      faceRegistered: !!encryptedFaceDescriptor
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Save face descriptor untuk user yang sudah terdaftar
router.post('/register-face', authenticate, async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    const userId = req.user.userId;
    
    if (!faceDescriptor) {
      return res.status(400).json({ error: 'Face descriptor is required' });
    }
    
    if (!validateFaceDescriptor(faceDescriptor)) {
      return res.status(400).json({ error: 'Invalid face descriptor format' });
    }
    
    // Encrypt face descriptor
    const encryptedFaceDescriptor = encryptFaceDescriptor(faceDescriptor);
    
    // Update user dengan face descriptor
    const userUpdated = await prisma.user.update({
      where: { id: userId },
      data: {
        faceDescriptor: encryptedFaceDescriptor,
        faceVerified: true,
        faceVerifiedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        faceVerified: true,
        faceVerifiedAt: true
      }
    });
    
    res.json({
      success: true,
      message: 'Face descriptor registered successfully',
      face_verified: userUpdated.faceVerified,
      face_verified_at: userUpdated.faceVerifiedAt
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login user (dengan password atau face verification)
router.post('/login', async (req, res) => {
  try {
    const { email, password, faceDescriptor } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        rtRw: true,
        passwordHash: true,
        faceDescriptor: true,
        faceVerified: true,
        isVerified: true // Tambahkan isVerified untuk validasi
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // VALIDASI: Warga yang belum diverifikasi tidak bisa login
    if (user.role === 'warga' && !user.isVerified) {
      return res.status(403).json({ 
        error: 'Akun Anda belum diverifikasi oleh Admin RT/RW. Silakan hubungi Admin RT/RW untuk melakukan verifikasi akun Anda terlebih dahulu.',
        requiresVerification: true,
        isVerified: false
      });
    }
    
    // Login dengan face verification (jika user sudah punya face descriptor)
    if (faceDescriptor && user.faceDescriptor) {
      if (!validateFaceDescriptor(faceDescriptor)) {
        return res.status(400).json({ error: 'Invalid face descriptor format' });
      }
      
      const comparison = compareFaceDescriptors(user.faceDescriptor, faceDescriptor);
      
      // Track verification attempt ke database
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || null;
      
      try {
        await prisma.faceVerificationLog.create({
          data: {
            userId: user.id,
            verified: comparison.isMatch,
            distance: comparison.distance,
            threshold: comparison.threshold,
            confidence: comparison.confidence || null,
            context: 'login',
            ipAddress: ipAddress,
            userAgent: userAgent
          }
        });
        
        console.log(`[Face Verification Login] User ${user.id} (${user.email}) - Verified: ${comparison.isMatch}, Distance: ${comparison.distance}, Confidence: ${comparison.confidence}%`);
      } catch (logError) {
        console.error('[Face Verification Login] Failed to log verification:', logError);
        // Jangan gagal request karena logging error
      }
      
      if (!comparison.isMatch) {
        return res.status(401).json({ 
          error: 'Face verification failed', 
          details: {
            distance: comparison.distance,
            threshold: comparison.threshold,
            confidence: comparison.confidence
          }
        });
      }
      
      // VALIDASI: Warga yang belum diverifikasi tidak bisa login (face verification)
      if (user.role === 'warga' && !user.isVerified) {
        return res.status(403).json({ 
          error: 'Akun Anda belum diverifikasi oleh Admin RT/RW. Silakan hubungi Admin RT/RW untuk melakukan verifikasi akun Anda terlebih dahulu.',
          requiresVerification: true,
          isVerified: false
        });
      }
      
      // Face verification successful
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return res.json({ 
        token, 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          rt_rw: user.rtRw
        },
        loginMethod: 'face',
        faceMatch: {
          distance: comparison.distance,
          confidence: comparison.confidence
        }
      });
    }
    
    // Login dengan password (traditional)
    if (!password) {
      return res.status(400).json({ 
        error: 'Password or face descriptor is required',
        hasFaceRegistered: !!user.faceDescriptor
      });
    }
    
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Check if user has face descriptor (wajib verifikasi wajah jika ada)
    const hasFaceDescriptor = Boolean(user.faceDescriptor) === true;
    const hasFaceVerified = Boolean(user.faceVerified) === true;
    
    console.log(`[Login] User ${user.email}:`, {
      hasFaceDescriptor,
      hasFaceVerified,
      faceDescriptorLength: user.faceDescriptor ? user.faceDescriptor.length : 0
    });
    
    res.json({ 
      token, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        rt_rw: user.rtRw
      },
      loginMethod: 'password',
      hasFaceRegistered: hasFaceDescriptor, // true jika punya face descriptor
      requiresFaceVerification: hasFaceDescriptor // WAJIB verifikasi wajah jika ada face descriptor
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Face verification saja (untuk user yang sudah login)
router.post('/verify-face', authenticate, async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    const userId = req.user.userId;
    
    if (!faceDescriptor) {
      return res.status(400).json({ error: 'Face descriptor is required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        faceDescriptor: true,
        faceVerified: true
      }
    });
    
    if (!user || !user.faceDescriptor) {
      return res.status(400).json({ error: 'Face descriptor not registered for this user' });
    }
    
    if (!validateFaceDescriptor(faceDescriptor)) {
      return res.status(400).json({ error: 'Invalid face descriptor format' });
    }
    
    const comparison = compareFaceDescriptors(user.faceDescriptor, faceDescriptor);
    
    // Track verification attempt ke database
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || null;
    
    try {
      await prisma.faceVerificationLog.create({
        data: {
          userId: userId,
          verified: comparison.isMatch,
          distance: comparison.distance,
          threshold: comparison.threshold,
          confidence: comparison.confidence || null,
          context: 'verify_face',
          ipAddress: ipAddress,
          userAgent: userAgent
        }
      });
      
      console.log(`[Face Verification] User ${userId} - Verified: ${comparison.isMatch}, Distance: ${comparison.distance}, Confidence: ${comparison.confidence}%`);
    } catch (logError) {
      console.error('[Face Verification] Failed to log verification:', logError);
      // Jangan gagal request karena logging error
    }
    
    res.json({
      verified: comparison.isMatch,
      distance: comparison.distance,
      threshold: comparison.threshold,
      confidence: comparison.confidence
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get current user (untuk validate token)
// GET /api/auth/me - Get current user info
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        rtRw: true,
        jenisKelamin: true,
        faceVerified: true,
        isVerified: true,
        verifiedAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      rt_rw: user.rtRw,
      jenis_kelamin: user.jenisKelamin,
      face_verified: user.faceVerified,
      is_verified: user.isVerified,
      verified_at: user.verifiedAt
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Hapus user (dibatasi berdasarkan role). Untuk keamanan, hanya admin/admin_rw/ketua_rt/sekretaris_rt.
router.delete('/users/:id', async (req, res) => {
  try {
    // Validasi: header Authorization harus ada dan role diizinkan
    const headerAuth = req.headers.authorization;
    if (!headerAuth) return res.status(401).json({ error: 'Unauthorized' });
    const token = headerAuth.split(' ')[1];
    const tokenTerdekripsi = jwt.verify(token, process.env.JWT_SECRET);
    const daftarRoleDiizinkan = ['admin', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris'];
    if (!daftarRoleDiizinkan.includes(tokenTerdekripsi.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const { id } = req.params;
    // Cegah menghapus admin lain kecuali admin sistem
    if (tokenTerdekripsi.role !== 'admin') {
      const userTarget = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        select: { role: true }
      });
      if (userTarget?.role === 'admin') {
        return res.status(403).json({ error: 'Cannot delete admin' });
      }
    }
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Daftar semua users (hanya admin sistem)
router.get('/users', async (req, res) => {
  try {
    const headerAuth = req.headers.authorization;
    if (!headerAuth) return res.status(401).json({ error: 'Unauthorized' });
    const token = headerAuth.split(' ')[1];
    const tokenTerdekripsi = jwt.verify(token, process.env.JWT_SECRET);
    if (tokenTerdekripsi.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const { role, search, limit = 50, offset = 0 } = req.query;
    
    const kondisiWhere = {};
    if (role) {
      kondisiWhere.role = role;
    }
    if (search) {
      kondisiWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [daftarUser, totalUser] = await Promise.all([
      prisma.user.findMany({
        where: kondisiWhere,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          rtRw: true,
          jenisKelamin: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.user.count({ where: kondisiWhere })
    ]);
    
    res.json({
      data: daftarUser.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        rt_rw: user.rtRw,
        jenis_kelamin: user.jenisKelamin,
        created_at: user.createdAt
      })),
      total: totalUser,
      page: Math.floor(Number(offset) / Number(limit)) + 1,
      limit: Number(limit),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/auth/warga/pending-verification - List warga yang belum diverifikasi (untuk Admin RT/RW)
router.get('/warga/pending-verification', authenticate, async (req, res) => {
  try {
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    
    // Hanya Admin RT/RW, Ketua RT, Sekretaris RT yang bisa akses
    const allowedRoles = ['admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'admin', 'admin_sistem'];
    if (!allowedRoles.includes(roleUser)) {
      return res.status(403).json({ error: 'Akses ditolak. Hanya Admin RT/RW yang dapat mengakses endpoint ini.' });
    }
    
    // Get user RT/RW untuk filter
    const user = await prisma.user.findUnique({
      where: { id: idUser },
      select: { rtRw: true }
    });
    
    // Build filter: warga yang belum diverifikasi di RT/RW yang sama
    let whereClause = {
      role: 'warga',
      isVerified: false
    };
    
    // Filter berdasarkan RT/RW (kecuali Super Admin)
    if (roleUser !== 'admin' && roleUser !== 'admin_sistem' && user?.rtRw) {
      whereClause.rtRw = user.rtRw;
    }
    
    const pendingWarga = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        rtRw: true,
        jenisKelamin: true,
        createdAt: true,
        faceVerified: true,
        faceDescriptor: true, // Tambahkan untuk cek apakah ada face descriptor
        verifiedBy: true,
        verifiedAt: true,
        verificationNotes: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Format response dengan field yang benar
    const formattedWarga = pendingWarga.map(warga => ({
      id: warga.id,
      email: warga.email,
      name: warga.name,
      rt_rw: warga.rtRw || null, // Pastikan null jika tidak ada
      jenis_kelamin: warga.jenisKelamin || null, // Pastikan null jika tidak ada
      created_at: warga.createdAt.toISOString(), // Convert ke ISO string untuk format yang benar
      face_verified: warga.faceVerified || (warga.faceDescriptor ? true : false), // Cek faceVerified atau faceDescriptor
      verified_by: warga.verifiedBy || null,
      verified_at: warga.verifiedAt ? warga.verifiedAt.toISOString() : null,
      verification_notes: warga.verificationNotes || null
    }));
    
    res.json({
      pendingWarga: formattedWarga,
      total: formattedWarga.length
    });
  } catch (error) {
    console.error('Error fetching pending verification:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar warga yang perlu diverifikasi' });
  }
});

// POST /api/auth/warga/:userId/verify - Verifikasi warga (approve/reject)
router.post('/warga/:userId/verify', authenticate, async (req, res) => {
  try {
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    const { userId } = req.params;
    const { approved, notes } = req.body;
    
    // Hanya Admin RT/RW, Ketua RT, Sekretaris RT yang bisa verifikasi
    const allowedRoles = ['admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'admin', 'admin_sistem'];
    if (!allowedRoles.includes(roleUser)) {
      return res.status(403).json({ error: 'Akses ditolak. Hanya Admin RT/RW yang dapat melakukan verifikasi.' });
    }
    
    if (typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'Parameter "approved" harus boolean (true/false)' });
    }
    
    // Get warga yang akan diverifikasi
    const warga = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        rtRw: true,
        isVerified: true
      }
    });
    
    if (!warga) {
      return res.status(404).json({ error: 'Warga tidak ditemukan' });
    }
    
    if (warga.role !== 'warga') {
      return res.status(400).json({ error: 'Hanya warga yang dapat diverifikasi' });
    }
    
    // Cek apakah warga sudah diverifikasi
    if (warga.isVerified && approved) {
      return res.status(400).json({ error: 'Warga ini sudah diverifikasi sebelumnya' });
    }
    
    // Get verifier RT/RW untuk validasi
    const verifier = await prisma.user.findUnique({
      where: { id: idUser },
      select: { rtRw: true }
    });
    
    // Validasi: Admin RT/RW hanya bisa verifikasi warga di RT/RW mereka (kecuali Super Admin)
    if (roleUser !== 'admin' && roleUser !== 'admin_sistem') {
      if (!verifier?.rtRw || !warga.rtRw || verifier.rtRw !== warga.rtRw) {
        return res.status(403).json({ 
          error: 'Anda hanya dapat memverifikasi warga di RT/RW Anda sendiri',
          yourRtRw: verifier?.rtRw,
          wargaRtRw: warga.rtRw
        });
      }
    }
    
    // Update status verifikasi
    const updatedWarga = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        isVerified: approved,
        verifiedBy: approved ? idUser : null,
        verifiedAt: approved ? new Date() : null,
        verificationNotes: notes || null
      },
      select: {
        id: true,
        email: true,
        name: true,
        rtRw: true,
        isVerified: true,
        verifiedBy: true,
        verifiedAt: true,
        verificationNotes: true,
        verifier: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });
    
    console.log(`[User Verification] User ${idUser} (${roleUser}) ${approved ? 'approved' : 'rejected'} verification for warga ${userId} (${warga.email})`);
    
    res.json({
      success: true,
      message: approved ? 'Warga berhasil diverifikasi' : 'Verifikasi warga ditolak',
      warga: updatedWarga
    });
  } catch (error) {
    console.error('Error verifying warga:', error);
    res.status(500).json({ error: 'Gagal melakukan verifikasi warga' });
  }
});

module.exports = router;
