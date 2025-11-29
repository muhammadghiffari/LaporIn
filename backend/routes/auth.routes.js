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
const { 
  extractFaceDescriptor, 
  saveFaceImage,
  loadModels 
} = require('../services/faceExtractionService');

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
      const rtNormalized = rtFilter.toUpperCase().startsWith('RT') ? rtFilter.toUpperCase() : `RT${rtFilter}`;
      const rwNormalized = rwFilter.toUpperCase().startsWith('RW') ? rwFilter.toUpperCase() : `RW${rwFilter}`;
      wargaFilter = {
        role: 'warga',
        rtRw: `${rtNormalized}/${rwNormalized}` // Exact match
      };
    } else if ((roleUser === 'admin' || roleUser === 'admin_sistem') && rwFilter) {
      // Super Admin dengan filter RW saja - gunakan exact match
      const rwNormalized = rwFilter.toUpperCase().startsWith('RW') ? rwFilter.toUpperCase() : `RW${rwFilter}`;
      wargaFilter = {
        role: 'warga',
        rtRw: {
          endsWith: `/${rwNormalized}`, // Exact match di akhir string
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
        const rtNormalized = rtFilter.toUpperCase().startsWith('RT') ? rtFilter.toUpperCase() : `RT${rtFilter}`;
        const rwNormalized = rwPart.toUpperCase().startsWith('RW') ? rwPart.toUpperCase() : `RW${rwPart}`;
        wargaFilter = {
          role: 'warga',
          rtRw: `${rtNormalized}/${rwNormalized}` // Exact match
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
        const rwNormalized = rwPart.toUpperCase().startsWith('RW') ? rwPart.toUpperCase() : `RW${rwPart}`;
        wargaFilter = {
          role: 'warga',
          rtRw: {
            endsWith: `/${rwNormalized}`, // Exact match di akhir string
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
    
    // Count by gender dengan normalisasi
    const genderCounts = {
      laki_laki: 0,
      perempuan: 0,
      tidak_disediakan: 0
    };
    
    users.forEach(user => {
      if (!user.jenisKelamin) {
        genderCounts.tidak_disediakan++;
      } else {
        // Normalisasi: case-insensitive dan handle berbagai format
        const normalized = user.jenisKelamin.toLowerCase().trim();
        if (normalized === 'laki_laki' || normalized === 'laki-laki' || normalized === 'laki laki' || normalized === 'pria') {
          genderCounts.laki_laki++;
        } else if (normalized === 'perempuan' || normalized === 'wanita') {
          genderCounts.perempuan++;
        } else {
          genderCounts.tidak_disediakan++;
        }
      }
    });
    
    const dataJenisKelamin = [
      { jenis_kelamin: 'laki_laki', count: genderCounts.laki_laki },
      { jenis_kelamin: 'perempuan', count: genderCounts.perempuan }
    ].filter(item => item.count > 0); // Hanya tampilkan yang ada datanya
    
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
    
    const jumlahLaki = genderCounts.laki_laki;
    const jumlahPerempuan = genderCounts.perempuan;
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

// Registrasi user baru (WAJIB dengan OTP email verification)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, rt_rw, jenis_kelamin, faceDescriptor, verificationCode } = req.body;
    
    // Validasi input wajib
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, password, name, dan role wajib diisi' });
    }
    
    // WAJIB verifikasi OTP email sebelum registrasi
    if (!verificationCode) {
      return res.status(400).json({ 
        error: 'Kode verifikasi email wajib diisi. Silakan minta kode verifikasi terlebih dahulu.',
        requiresVerification: true
      });
    }
    
    // Verify OTP code
    const { verifyCode } = require('../services/emailVerificationService');
    const otpResult = await verifyCode(email, verificationCode, 'registration');
    
    if (!otpResult.success) {
      return res.status(400).json({ 
        error: otpResult.error || 'Kode verifikasi tidak valid atau sudah kedaluwarsa',
        requiresVerification: true
      });
    }
    
    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }
    
    // Hash password
    const hashPassword = await bcrypt.hash(password, 10);
    
    // Prepare user data
    const userData = {
      email,
      passwordHash: hashPassword,
      name,
      role,
      rtRw: rt_rw || null,
      jenisKelamin: jenis_kelamin || null,
      isVerified: false, // Warga perlu diverifikasi oleh admin RT/RW
      // Face descriptor optional (bisa ditambahkan nanti)
      faceDescriptor: null,
      faceVerified: false
    };
    
    // Jika ada face descriptor, validate dan encrypt
    if (faceDescriptor) {
      if (!validateFaceDescriptor(faceDescriptor)) {
        return res.status(400).json({ error: 'Invalid face descriptor format' });
      }
      userData.faceDescriptor = encryptFaceDescriptor(faceDescriptor);
      userData.faceVerified = true;
      userData.faceVerifiedAt = new Date();
    }
    
    // Buat user baru
    const userBaru = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        rtRw: true,
        jenisKelamin: true,
        faceVerified: true,
        isVerified: true
      }
    });
    
    const token = jwt.sign(
      { userId: userBaru.id, role: userBaru.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log(`[Registration] ✅ User ${userBaru.email} (${userBaru.role}) registered with OTP verification`);
    
    res.json({ 
      token, 
      user: {
        id: userBaru.id,
        email: userBaru.email,
        name: userBaru.name,
        role: userBaru.role,
        rt_rw: userBaru.rtRw,
        jenis_kelamin: userBaru.jenisKelamin,
        face_verified: userBaru.faceVerified,
        is_verified: userBaru.isVerified
      },
      faceRegistered: !!userData.faceDescriptor,
      message: userBaru.role === 'warga' 
        ? 'Registrasi berhasil! Akun Anda akan diverifikasi oleh Admin RT/RW sebelum dapat digunakan.'
        : 'Registrasi berhasil!'
    });
  } catch (error) {
    console.error('[Registration] Error:', error);
    res.status(400).json({ error: error.message || 'Gagal melakukan registrasi' });
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
    
    // Generate hash dari face descriptor untuk blockchain
    const { ethers } = require('ethers');
    const biometricHash = ethers.id(faceDescriptor).substring(0, 20);
    
    // Log ke blockchain (async, tidak block response)
    let blockchainTxHash = null;
    try {
      const { logBiometricToBlockchain } = require('../services/blockchainService');
      blockchainTxHash = await logBiometricToBlockchain(userId, biometricHash, 'register');
      
      if (blockchainTxHash) {
        console.log(`[Face Register] ✅ Biometric registered to blockchain: ${blockchainTxHash}`);
      }
    } catch (blockchainError) {
      console.error('[Face Register] Blockchain error (non-critical):', blockchainError.message);
    }
    
    // Update user dengan face descriptor dan blockchain hash
    const userUpdated = await prisma.user.update({
      where: { id: userId },
      data: {
        faceDescriptor: encryptedFaceDescriptor,
        faceVerified: true,
        faceVerifiedAt: new Date(),
        faceBlockchainTxHash: blockchainTxHash
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
      face_verified_at: userUpdated.faceVerifiedAt,
      blockchain_tx_hash: blockchainTxHash,
      blockchain_verified: !!blockchainTxHash
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Detect face dari foto (untuk real-time detection di mobile, tidak perlu auth)
router.post('/face/detect', async (req, res) => {
  try {
    const { photo } = req.body; // Base64 image string
    
    if (!photo) {
      return res.status(400).json({ error: 'Foto wajah diperlukan' });
    }

    // Validate base64 format
    if (!photo.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Format foto tidak valid. Harus base64 image.' });
    }

    // Extract face descriptor dari foto (hanya untuk deteksi, tidak disimpan)
    try {
      const faceDescriptor = await extractFaceDescriptor(photo, true);
      
      // Return success dengan info deteksi
      return res.json({
        detected: true,
        message: 'Wajah terdeteksi dengan baik',
        descriptorLength: faceDescriptor.length
      });
    } catch (extractError) {
      // User-friendly error messages
      const errorMessage = extractError?.message || extractError?.toString() || 'Unknown error';
      let userMessage = errorMessage;
      
      if (errorMessage && typeof errorMessage === 'string') {
        if (errorMessage.includes('models not found') || errorMessage.includes('models')) {
          userMessage = 'Sistem pengenalan wajah sedang dalam perbaikan.';
        } else if (errorMessage.includes('No face detected') || errorMessage.includes('Tidak ada wajah')) {
          userMessage = 'Tidak ada wajah terdeteksi. Pastikan wajah terlihat jelas dengan pencahayaan cukup.';
        } else if (errorMessage.includes('Multiple faces') || errorMessage.includes('lebih dari satu')) {
          userMessage = 'Terdeteksi lebih dari satu wajah. Pastikan hanya satu wajah yang terlihat.';
        }
      }
      
      return res.status(400).json({ 
        detected: false,
        error: userMessage || 'Gagal mendeteksi wajah dari foto.' 
      });
    }
  } catch (error) {
    console.error('[Face Detect] Error:', error);
    return res.status(500).json({ 
      detected: false,
      error: 'Terjadi kesalahan saat mendeteksi wajah' 
    });
  }
});

// Register face dari foto (upload image, extract embedding otomatis)
router.post('/face/register', authenticate, async (req, res) => {
  try {
    const { photo } = req.body; // Base64 image string
    const userId = req.user.userId;
    
    if (!photo) {
      return res.status(400).json({ error: 'Foto wajah diperlukan' });
    }

    // Validate base64 format
    if (!photo.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Format foto tidak valid. Harus base64 image.' });
    }

    console.log(`[Face Register] User ${userId} uploading face photo...`);

    // Extract face descriptor dari foto
    let faceDescriptor;
    try {
      faceDescriptor = await extractFaceDescriptor(photo, true);
    } catch (extractError) {
      console.error('[Face Register] Extraction error:', extractError);
      
      // User-friendly error messages
      const errorMessage = extractError?.message || extractError?.toString() || 'Unknown error';
      let userMessage = errorMessage;
      
      if (errorMessage && typeof errorMessage === 'string') {
        if (errorMessage.includes('models not found') || errorMessage.includes('models')) {
          userMessage = 'Sistem pengenalan wajah sedang dalam perbaikan. Silakan coba lagi nanti atau hubungi administrator.';
        } else if (errorMessage.includes('No face detected') || errorMessage.includes('Tidak ada wajah')) {
          userMessage = 'Tidak ada wajah terdeteksi. Pastikan wajah Anda terlihat jelas di depan kamera dengan pencahayaan yang cukup.';
        } else if (errorMessage.includes('Multiple faces') || errorMessage.includes('lebih dari satu')) {
          userMessage = 'Terdeteksi lebih dari satu wajah. Pastikan hanya wajah Anda yang terlihat di kamera.';
        }
      }
      
      return res.status(400).json({ 
        error: userMessage || 'Gagal mendeteksi wajah dari foto. Pastikan wajah terlihat jelas dan hanya satu wajah yang terlihat.' 
      });
    }

    // Convert descriptor ke JSON string untuk encryption
    const descriptorJson = JSON.stringify(faceDescriptor);
    
    // Validate descriptor
    if (!validateFaceDescriptor(descriptorJson)) {
      return res.status(400).json({ error: 'Face descriptor tidak valid setelah ekstraksi' });
    }

    // Encrypt face descriptor
    const encryptedFaceDescriptor = encryptFaceDescriptor(descriptorJson);

    // Generate hash dari face descriptor untuk blockchain (bukan data asli)
    // Hash ini digunakan untuk audit trail di blockchain tanpa membocorkan data biometric
    const { ethers } = require('ethers');
    const biometricHash = ethers.id(descriptorJson).substring(0, 20); // Hash 20 karakter untuk efisiensi

    // Optional: Save image to disk (untuk audit/backup)
    try {
      const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      await saveFaceImage(imageBuffer, userId);
    } catch (saveError) {
      console.warn('[Face Register] Failed to save image (non-critical):', saveError);
      // Continue anyway, image saving is optional
    }

    // Log ke blockchain (async, tidak block response)
    let blockchainTxHash = null;
    try {
      const { logBiometricToBlockchain } = require('../services/blockchainService');
      blockchainTxHash = await logBiometricToBlockchain(userId, biometricHash, 'register');
      
      if (blockchainTxHash) {
        console.log(`[Face Register] ✅ Biometric registered to blockchain: ${blockchainTxHash}`);
      } else {
        console.warn('[Face Register] ⚠️ Blockchain logging failed (non-critical)');
      }
    } catch (blockchainError) {
      console.error('[Face Register] Blockchain error (non-critical):', blockchainError.message);
      // Continue - blockchain error tidak boleh block registration
    }

    // Update user dengan face descriptor dan blockchain hash
    const userUpdated = await prisma.user.update({
      where: { id: userId },
      data: {
        faceDescriptor: encryptedFaceDescriptor,
        faceVerified: true,
        faceVerifiedAt: new Date(),
        faceBlockchainTxHash: blockchainTxHash // Simpan blockchain transaction hash
      },
      select: {
        id: true,
        email: true,
        faceVerified: true,
        faceVerifiedAt: true
      }
    });

    console.log(`[Face Register] User ${userId} face registered successfully`);

    res.json({
      success: true,
      message: 'Wajah berhasil didaftarkan',
      face_verified: userUpdated.faceVerified,
      face_verified_at: userUpdated.faceVerifiedAt,
      blockchain_tx_hash: blockchainTxHash, // Return blockchain hash untuk verifikasi
      blockchain_verified: !!blockchainTxHash
    });
  } catch (error) {
    console.error('[Face Register] Error:', error);
    res.status(400).json({ error: error.message || 'Gagal mendaftarkan wajah' });
  }
});

// Verify face dari foto (upload image, extract embedding, compare)
router.post('/face/verify', authenticate, async (req, res) => {
  try {
    const { photo } = req.body; // Base64 image string
    const userId = req.user.userId;
    
    if (!photo) {
      return res.status(400).json({ error: 'Foto wajah diperlukan' });
    }

    // Validate base64 format
    if (!photo.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Format foto tidak valid. Harus base64 image.' });
    }

    // Get user face descriptor
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        faceDescriptor: true,
        faceVerified: true
      }
    });

    if (!user || !user.faceDescriptor) {
      return res.status(400).json({ 
        error: 'Wajah belum terdaftar. Silakan daftarkan wajah terlebih dahulu di Pengaturan.' 
      });
    }

    console.log(`[Face Verify] User ${userId} verifying face...`);

    // Extract face descriptor dari foto
    let newDescriptor;
    try {
      newDescriptor = await extractFaceDescriptor(photo, true);
    } catch (extractError) {
      console.error('[Face Verify] Extraction error:', extractError);
      
      // User-friendly error messages
      const errorMessage = extractError?.message || extractError?.toString() || 'Unknown error';
      let userMessage = errorMessage;
      
      if (errorMessage && typeof errorMessage === 'string') {
        if (errorMessage.includes('models not found') || errorMessage.includes('models')) {
          userMessage = 'Sistem pengenalan wajah sedang dalam perbaikan. Silakan coba lagi nanti atau hubungi administrator.';
        } else if (errorMessage.includes('No face detected') || errorMessage.includes('Tidak ada wajah')) {
          userMessage = 'Tidak ada wajah terdeteksi. Pastikan wajah Anda terlihat jelas di depan kamera dengan pencahayaan yang cukup.';
        } else if (errorMessage.includes('Multiple faces') || errorMessage.includes('lebih dari satu')) {
          userMessage = 'Terdeteksi lebih dari satu wajah. Pastikan hanya wajah Anda yang terlihat di kamera.';
        }
      }
      
      return res.status(400).json({ 
        error: userMessage || 'Gagal mendeteksi wajah dari foto. Pastikan wajah terlihat jelas dan hanya satu wajah yang terlihat.' 
      });
    }

    // Convert descriptor ke JSON string untuk comparison
    const newDescriptorJson = JSON.stringify(newDescriptor);

    // Compare dengan stored descriptor
    const comparison = compareFaceDescriptors(user.faceDescriptor, newDescriptorJson);

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
          context: 'face_verify',
          ipAddress: ipAddress,
          userAgent: userAgent
        }
      });

      console.log(`[Face Verify] User ${userId} - Verified: ${comparison.isMatch}, Distance: ${comparison.distance}, Confidence: ${comparison.confidence}%`);
    } catch (logError) {
      console.error('[Face Verify] Failed to log verification:', logError);
      // Don't fail request because of logging error
    }

    if (!comparison.isMatch) {
      return res.status(401).json({ 
        verified: false,
        error: 'Verifikasi wajah gagal. Wajah tidak cocok dengan yang terdaftar. Pastikan Anda menggunakan akun yang benar dan wajah terlihat jelas.',
        details: {
          distance: comparison.distance,
          threshold: comparison.threshold,
          confidence: comparison.confidence
        }
      });
    }

    res.json({
      verified: true,
      message: 'Verifikasi wajah berhasil',
      distance: comparison.distance,
      threshold: comparison.threshold,
      confidence: comparison.confidence
    });
  } catch (error) {
    console.error('[Face Verify] Error:', error);
    res.status(400).json({ error: error.message || 'Gagal memverifikasi wajah' });
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

// Daftar users berdasarkan role (admin: semua, admin_rw: RT dan warga di RW, ketua_rt/sekretaris: warga di RT)
router.get('/users', authenticate, async (req, res) => {
  try {
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    const { role, search, limit = 50, offset = 0, rtFilter } = req.query;
    
    // Hanya role tertentu yang bisa akses
    const allowedRoles = ['admin', 'admin_sistem', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris'];
    if (!allowedRoles.includes(roleUser)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Get user RT/RW untuk filter
    const currentUser = await prisma.user.findUnique({
      where: { id: idUser },
      select: { rtRw: true }
    });
    
    // Build filter berdasarkan role
    const kondisiWhere = {};
    
    if (roleUser === 'admin' || roleUser === 'admin_sistem') {
      // Super Admin: lihat semua user (semua role)
      // Tidak ada filter RT/RW - kondisiWhere tetap kosong untuk melihat semua
      console.log('[Users API] Super Admin: Fetching all users (no RT/RW filter)');
    } else if (roleUser === 'admin_rw') {
      // Admin RW: lihat RT dan warga di RW mereka
      if (currentUser?.rtRw) {
        const rwPart = currentUser.rtRw.split('/')[1];
        const rwNormalized = rwPart.toUpperCase().startsWith('RW') ? rwPart.toUpperCase() : `RW${rwPart}`;
        
        // Jika ada rtFilter, filter per RT tertentu
        if (rtFilter) {
          const rtNormalized = rtFilter.toUpperCase().startsWith('RT') ? rtFilter.toUpperCase() : `RT${rtFilter}`;
          kondisiWhere.rtRw = {
            equals: `${rtNormalized}/${rwNormalized}`,
            mode: 'insensitive'
          };
        } else {
          kondisiWhere.rtRw = {
            endsWith: `/${rwNormalized}`, // Exact match di akhir string
            mode: 'insensitive'
          };
        }
        
        // Hanya role yang relevan: RT (ketua_rt, sekretaris_rt, sekretaris, pengurus) dan warga
        kondisiWhere.role = {
          in: ['warga', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus']
        };
      } else {
        return res.json({ data: [], total: 0, page: 1, limit: Number(limit) });
      }
    } else if (['ketua_rt', 'sekretaris_rt', 'sekretaris'].includes(roleUser)) {
      // Ketua RT/Sekretaris: lihat warga di RT mereka saja
      if (currentUser?.rtRw) {
        kondisiWhere.rtRw = currentUser.rtRw; // Exact match RT/RW
        kondisiWhere.role = 'warga'; // Hanya warga
      } else {
        return res.json({ data: [], total: 0, page: 1, limit: Number(limit) });
      }
    }
    
    // Filter role (jika ada)
    if (role && role !== 'all') {
      if (kondisiWhere.role) {
        // Jika sudah ada filter role, gabungkan dengan AND
        if (Array.isArray(kondisiWhere.role.in)) {
          kondisiWhere.role = {
            in: kondisiWhere.role.in.filter(r => r === role)
          };
        } else {
          kondisiWhere.role = role;
        }
      } else {
        kondisiWhere.role = role;
      }
    }
    
    // Filter search
    if (search) {
      kondisiWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Untuk superadmin, jika kondisiWhere kosong, gunakan {} untuk melihat semua
    // Cek apakah kondisiWhere benar-benar kosong (tidak ada property)
    const isWhereEmpty = Object.keys(kondisiWhere).length === 0;
    const finalWhere = isWhereEmpty ? {} : kondisiWhere;
    
    console.log('[Users API] Role:', roleUser);
    console.log('[Users API] Is where empty?', isWhereEmpty);
    console.log('[Users API] Final where clause:', JSON.stringify(finalWhere, null, 2));
    console.log('[Users API] Query params - limit:', limit, 'offset:', offset);
    
    const [daftarUser, totalUser] = await Promise.all([
      prisma.user.findMany({
        where: finalWhere,
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
      prisma.user.count({ where: finalWhere })
    ]);
    
    console.log(`[Users API] Found ${daftarUser.length} users (total: ${totalUser})`);
    if (roleUser === 'admin' || roleUser === 'admin_sistem') {
      const roleCounts = {};
      daftarUser.forEach(u => {
        roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
      });
      console.log('[Users API] Super Admin - Role distribution in this page:', roleCounts);
      console.log('[Users API] Super Admin - Sample users:', daftarUser.slice(0, 5).map(u => `${u.name} (${u.role})`));
      console.log('[Users API] Super Admin - Total users in DB:', totalUser);
    }
    
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

// Update user profile (untuk user yang sudah login)
router.patch('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, jenis_kelamin } = req.body;
    
    // Validasi input
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Nama wajib diisi' });
    }
    
    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name.trim(),
        jenisKelamin: jenis_kelamin || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        rtRw: true,
        jenisKelamin: true,
        isVerified: true,
      }
    });
    
    console.log(`[Profile Update] User ${userId} updated profile`);
    
    res.json({
      success: true,
      message: 'Profil berhasil diperbarui',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        rt_rw: updatedUser.rtRw,
        jenis_kelamin: updatedUser.jenisKelamin,
        is_verified: updatedUser.isVerified,
      }
    });
  } catch (error) {
    console.error('[Profile Update] Error:', error);
    res.status(400).json({ error: error.message || 'Gagal memperbarui profil' });
  }
});

// Change password (untuk user yang sudah login)
router.patch('/password', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    
    // Validasi input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Password lama dan password baru wajib diisi' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
    }
    
    // Get user dengan password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Password lama tidak benar' });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      }
    });
    
    console.log(`[Password Change] User ${userId} changed password`);
    
    res.json({
      success: true,
      message: 'Password berhasil diubah'
    });
  } catch (error) {
    console.error('[Password Change] Error:', error);
    res.status(400).json({ error: error.message || 'Gagal mengubah password' });
  }
});

// Send email verification code (OTP)
router.post('/send-verification-code', async (req, res) => {
  try {
    const { email, type = 'registration' } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email wajib diisi' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Format email tidak valid' });
    }
    
    const { sendVerificationCode } = require('../services/emailVerificationService');
    const result = await sendVerificationCode(email, type, null);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Gagal mengirim kode verifikasi' });
    }
    
    res.json({
      success: true,
      message: result.message || 'Kode verifikasi telah dikirim ke email Anda',
      codeId: result.codeId
    });
  } catch (error) {
    console.error('[Send Verification Code] Error:', error);
    res.status(500).json({ error: 'Gagal mengirim kode verifikasi' });
  }
});

// Verify email verification code (OTP)
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code, type = 'registration' } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email dan kode verifikasi wajib diisi' });
    }
    
    if (!code.match(/^\d{6}$/)) {
      return res.status(400).json({ error: 'Kode verifikasi harus 6 digit angka' });
    }
    
    const { verifyCode } = require('../services/emailVerificationService');
    const result = await verifyCode(email, code, type);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Kode verifikasi tidak valid' });
    }
    
    res.json({
      success: true,
      message: 'Email berhasil diverifikasi',
      codeId: result.codeId,
      userId: result.userId
    });
  } catch (error) {
    console.error('[Verify Code] Error:', error);
    res.status(500).json({ error: 'Gagal memverifikasi kode' });
  }
});

module.exports = router;
