const express = require('express');
const prisma = require('../database/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../utils/permissions');
const { processReport } = require('../services/aiService');
const { logReportToBlockchain, getReportBlockchainLogs, getAllBlockchainLogs } = require('../services/blockchainService');
const { runFraudDetection } = require('../services/fraudDetectionService');
// Note: Geocoding and location validation services removed - fields not in schema
// const { reverseGeocode, reverseGeocodeOSM } = require('../services/geocodingService');
// const { validateLocationForRT } = require('../services/locationValidationService');
const { forwardGeocode } = require('../services/geocodingService'); // Untuk convert alamat ke koordinat di map
const { ethers } = require('ethers');

const router = express.Router();

// Reverse geocoding: Convert lat/lng to address
router.post('/reverse-geocode', authenticate, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude dan longitude diperlukan' });
    }
    
    // Try Google Maps API first, fallback to OSM
    const { reverseGeocode, reverseGeocodeOSM } = require('../services/geocodingService');
    let address = await reverseGeocode(latitude, longitude);
    if (!address) {
      address = await reverseGeocodeOSM(latitude, longitude);
    }
    
    if (!address) {
      return res.status(404).json({ error: 'Alamat tidak ditemukan untuk koordinat tersebut' });
    }
    
    res.json({ address, latitude, longitude });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({ error: 'Gagal melakukan reverse geocoding' });
  }
});

// Buat laporan baru
router.post('/', authenticate, requirePermission(PERMISSIONS.REPORT_CREATE), async (req, res) => {
  try {
    const { title, description, location, imageUrl, latitude, longitude, isSensitive } = req.body;
    
    // Validasi: Foto wajib diisi
    if (!imageUrl) {
      return res.status(400).json({ 
        error: 'Foto wajib diisi. Silakan ambil foto di tempat kejadian dengan GPS aktif.' 
      });
    }
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    
    // Get user data untuk validasi lokasi dan verifikasi
    const user = await prisma.user.findUnique({
      where: { id: idUser },
      select: {
        id: true,
        isVerified: true,
        name: true,
        rtRw: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    
    // Validasi: warga harus sudah diverifikasi oleh Admin RT/RW
    if (!user.isVerified) {
      return res.status(403).json({ 
        error: 'Akun Anda belum diverifikasi oleh Admin RT/RW. Silakan hubungi Admin RT/RW untuk melakukan verifikasi akun Anda terlebih dahulu sebelum dapat membuat laporan.',
        requiresVerification: true
      });
    }
    
    // Handle location dengan validasi terhadap RT/RW boundary
    let finalLocation = location;
    let locationWarning = null;
    let locationMismatch = false;
    let locationDistance = null;
    
    // Basic validation: check if location is provided
    if (!finalLocation || finalLocation.trim().length === 0) {
      locationWarning = 'Lokasi tidak disebutkan. Pastikan untuk menyertakan alamat lengkap.';
    }
    
    // Validasi foto: pastikan foto diambil di lokasi kejadian (bukan di rumah)
    let photoValidation = null;
    let photoWarning = null;
    let photoError = null;
    
    if (imageUrl && latitude && longitude) {
      try {
        const { validatePhotoLocation } = require('../services/photoValidationService');
        photoValidation = await validatePhotoLocation(
          imageUrl,
          parseFloat(latitude),
          parseFloat(longitude),
          {
            maxDistanceMeters: parseInt(process.env.PHOTO_LOCATION_TOLERANCE_METERS || '100'),
            maxAgeMinutes: parseInt(process.env.PHOTO_MAX_AGE_MINUTES || '60'),
            strictMode: process.env.PHOTO_STRICT_MODE === 'true'
          }
        );

        if (photoValidation.shouldBlock) {
          return res.status(400).json({
            error: photoValidation.error || photoValidation.warning || 'Foto tidak valid. Pastikan foto diambil di tempat kejadian dengan GPS aktif.',
            photoValidation: {
              isValid: false,
              distance: photoValidation.distance,
              isLocationMatch: photoValidation.isLocationMatch
            }
          });
        }

        if (!photoValidation.isValid) {
          photoWarning = photoValidation.warning || 'Foto tidak memiliki informasi lokasi GPS atau lokasi tidak sesuai. Pastikan foto diambil langsung dari kamera di tempat kejadian.';
          console.log(`[Report] ⚠️ Photo validation warning: ${photoWarning}`);
        }
      } catch (photoError) {
        console.warn('[Report] Failed to validate photo:', photoError.message);
        // Continue dengan laporan meskipun validasi foto gagal (non-blocking)
        photoWarning = 'Tidak dapat memvalidasi metadata foto. Pastikan foto diambil langsung dari kamera dengan GPS aktif.';
      }
    } else if (imageUrl && (!latitude || !longitude)) {
      // Foto ada tapi tidak ada koordinat GPS
      photoWarning = 'Foto dilampirkan tetapi lokasi GPS tidak tersedia. Pastikan GPS aktif saat mengambil foto dan melaporkan.';
    }

    // Validasi lokasi terhadap RT/RW boundary jika ada koordinat GPS
    if (latitude && longitude && user.rtRw) {
      try {
        // Get RT/RW boundary data
        const rtRwUser = await prisma.user.findFirst({
          where: { 
            rtRw: user.rtRw,
            rtRwLatitude: { not: null },
            rtRwLongitude: { not: null }
          },
          select: {
            rtRwLatitude: true,
            rtRwLongitude: true,
            rtRwRadius: true,
            rtRwPolygon: true
          }
        });
        
        if (rtRwUser && rtRwUser.rtRwLatitude && rtRwUser.rtRwLongitude) {
          const { validateLocationForRT } = require('../services/locationValidationService');
          // Validasi dengan toleransi (default 50m) dan strict mode (dari env)
          const validation = validateLocationForRT(
            parseFloat(latitude), 
            parseFloat(longitude), 
            rtRwUser,
            {
              toleranceMeters: parseInt(process.env.LOCATION_TOLERANCE_METERS || '50'),
              strictMode: process.env.LOCATION_STRICT_MODE === 'true'
            }
          );
          locationMismatch = validation.mismatch || false;
          locationDistance = validation.distance || null;
          
          // Jika strict mode aktif dan shouldBlock = true, tolak laporan
          if (validation.shouldBlock) {
            return res.status(400).json({ 
              error: 'Lokasi laporan berada di luar boundary RT/RW Anda. Silakan pastikan lokasi benar atau hubungi Admin RT/RW.',
              locationMismatch: true,
              distance: locationDistance
            });
          }
          
          if (locationMismatch) {
            locationWarning = `Lokasi laporan berada di luar boundary RT/RW Anda (${locationDistance}m dari pusat RT/RW). Pastikan lokasi benar atau hubungi Admin RT/RW jika ini adalah lokasi yang benar.`;
            console.log(`[Report] ⚠️ Location mismatch for report: ${locationDistance}m dari center RT/RW`);
            // Notifikasi email akan dikirim setelah laporan dibuat (lihat di bawah)
          }
        }
      } catch (error) {
        console.warn('[Report] Failed to validate location:', error.message);
        // Continue dengan laporan meskipun validasi gagal
      }
    }
    
    // Proses dengan AI untuk mendapatkan kategori dan urgensi
    const teksLengkap = `${title}. ${description}`;
    const hasilAI = await processReport(teksLengkap);
    
    // Run Fraud Detection (non-blocking, async)
    let fraudResult = null;
    try {
      fraudResult = await runFraudDetection({
        title,
        description,
        location: finalLocation,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      }, idUser);
    } catch (fraudError) {
      console.error('[Fraud Detection] Error (non-blocking):', fraudError.message);
      // Continue - fraud detection error tidak boleh block laporan
    }
    
    // Simpan laporan dengan hasil AI dan fraud detection (tanpa field fraud jika belum tersedia di DB)
    const reportDataToSave = {
      userId: idUser,
      title,
      description,
      location: finalLocation,
      latitude: latitude ? parseFloat(latitude) : null, // Save GPS coordinates
      longitude: longitude ? parseFloat(longitude) : null, // Save GPS coordinates
      imageUrl: imageUrl || null, // Simpan base64 atau URL gambar
      category: hasilAI.category,
      urgency: hasilAI.urgency,
      aiSummary: hasilAI.summary,
      status: 'pending',
      isSensitive: isSensitive === true || isSensitive === 'true', // Laporan sensitif/rahasia
    };
    
    const laporan = await prisma.report.create({
      data: reportDataToSave
    });
    
    // Log fraud detection results
    if (fraudResult) {
      try {
        const fraudChecks = [
          { type: 'duplicate', result: fraudResult.checks.duplicate },
          { type: 'spam', result: fraudResult.checks.spam },
          { type: 'quality', result: fraudResult.checks.quality },
          { type: 'anomaly', result: fraudResult.checks.anomaly }
        ];
        
        for (const check of fraudChecks) {
          if (check.result && (check.result.confidence > 0 || check.result.score > 0)) {
            await prisma.fraudDetectionLog.create({
              data: {
                reportId: laporan.id,
                detectionType: check.type,
                score: check.result.confidence || check.result.score || 0,
                details: check.result
              }
            });
          }
        }
      } catch (logError) {
        console.error('[Fraud Detection] Error logging results (non-blocking):', logError.message);
      }
    }
    
    // Catat proses AI
    await prisma.aiProcessingLog.create({
      data: {
        reportId: laporan.id,
        originalText: teksLengkap,
        aiSummary: hasilAI.summary,
        aiCategory: hasilAI.category,
        aiUrgency: hasilAI.urgency,
        processingTimeMs: hasilAI.processingTime
      }
    });
    
    // Simpan riwayat status awal
    await prisma.reportStatusHistory.create({
      data: {
        reportId: laporan.id,
        status: 'pending',
        updatedBy: idUser
      }
    });

    // Send email notification (async, tidak block response)
    try {
      const { sendEmailLaporanBaru, sendEmailLocationMismatch } = require('../services/emailService');
      const reporter = await prisma.user.findUnique({
        where: { id: idUser },
        include: { rtRw: true }
      });
      if (reporter) {
        // Get report dengan user data untuk email
        const reportWithUser = await prisma.report.findUnique({
          where: { id: laporan.id },
          include: { user: true }
        });
        
        // Send new report notification
        sendEmailLaporanBaru(reportWithUser, reporter).catch(err => {
          console.error('[Email] Error sending notification (non-blocking):', err.message);
        });
        
        // Send location mismatch notification jika ada
        if (locationMismatch && locationDistance) {
          sendEmailLocationMismatch(reportWithUser, reporter, locationDistance).catch(err => {
            console.error('[Email] Error sending location mismatch notification (non-blocking):', err.message);
          });
        }
      }
    } catch (emailError) {
      console.error('[Email] Error in email notification (non-blocking):', emailError.message);
      // Continue - email error tidak boleh block laporan
    }
    
    // Catat ke blockchain dengan enkripsi data sensitif
    const hashMeta = ethers.id(teksLengkap).substring(0, 10);
    const dataLaporan = {
      title: laporan.title,
      description: laporan.description,
      location: laporan.location,
    };
    const hashTransaksi = await logReportToBlockchain(
      laporan.id,
      'pending',
      hashMeta,
      dataLaporan // Pass dataLaporan untuk enkripsi
    );
    
    // PERBAIKAN: Validasi hash sebelum save
    if (hashTransaksi && hashTransaksi.length === 66 && hashTransaksi.startsWith('0x')) {
      await prisma.report.update({
        where: { id: laporan.id },
        data: { blockchainTxHash: hashTransaksi }
      });
      console.log('✅ Blockchain hash saved to database:', hashTransaksi);
    } else if (hashTransaksi) {
      console.error('❌ Invalid blockchain hash format, not saving to database:', hashTransaksi);
    } else {
      console.warn('⚠️  Blockchain transaction failed for report:', laporan.id);
      console.warn('⚠️  Check blockchain configuration in backend/.env:');
      console.warn('    - BLOCKCHAIN_RPC_URL (should be Polygon Amoy RPC, not localhost)');
      console.warn('    - PRIVATE_KEY (wallet with balance for gas)');
      console.warn('    - CONTRACT_ADDRESS (deployed contract address)');
      
      // Retry mechanism untuk blockchain logging
      console.log('🔄 Attempting retry for blockchain logging in 5 seconds...');
      setTimeout(async () => {
        const retryHash = await logReportToBlockchain(
          laporan.id,
          'pending',
          hashMeta,
          dataLaporan
        );
        if (retryHash && retryHash.length === 66 && retryHash.startsWith('0x')) {
          await prisma.report.update({
            where: { id: laporan.id },
            data: { blockchainTxHash: retryHash }
          });
          console.log('✅ Blockchain hash saved after retry:', retryHash);
        } else {
          console.warn('⚠️  Retry also failed. Check blockchain configuration.');
        }
      }, 5000);
    }
    
    // Ambil info user untuk transparansi
    const userInfo = await prisma.user.findUnique({
      where: { id: idUser },
      select: { name: true, email: true, rtRw: true }
    });
    
    // Cek apakah menggunakan mock blockchain
    const isMockBlockchain = process.env.USE_MOCK_BLOCKCHAIN === 'true';
    
    const reportData = {
      id: laporan.id,
      user_id: laporan.userId,
      title: laporan.title,
      description: laporan.description,
      category: laporan.category,
      urgency: laporan.urgency,
      status: laporan.status,
      location: laporan.location,
      blockchain_tx_hash: hashTransaksi || laporan.blockchainTxHash || null,
      blockchainTxHash: hashTransaksi || laporan.blockchainTxHash || null,
      is_mock_blockchain: isMockBlockchain, // Flag untuk frontend
      ai_summary: laporan.aiSummary,
      cancellation_reason: laporan.cancellationReason,
      is_sensitive: laporan.isSensitive || false, // Laporan sensitif/rahasia
      // Fraud detection info
      is_fraud: fraudResult?.isFraud || false,
      fraud_score: fraudResult?.fraudScore || null,
      fraud_checked: laporan.fraudChecked || false,
      fraud_reasons: fraudResult?.overallReasons || [],
      // Location warning (not saved to DB, just for frontend feedback)
      locationWarning, // Warning message untuk frontend
      locationMismatch: locationMismatch || false, // Apakah lokasi di luar boundary
      locationDistance: locationDistance || null, // Jarak dari center RT/RW (meter)
      // Photo validation warning
      photoWarning, // Warning message untuk validasi foto
      photoValidation: photoValidation ? {
        isValid: photoValidation.isValid,
        distance: photoValidation.distance,
        isLocationMatch: photoValidation.isLocationMatch,
        isTimestampValid: photoValidation.isTimestampValid
      } : null,
      created_at: laporan.createdAt,
      updated_at: laporan.updatedAt,
      user_name: userInfo?.name,
      user_email: userInfo?.email,
      rt_rw: userInfo?.rtRw
    };
    
    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('report:created', reportData);
      io.to(`report:${laporan.id}`).emit('report:updated', reportData);
    }
    
    res.json(reportData);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Ambil semua laporan (dengan filter)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, category, urgency, limit, offset, search } = req.query;
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    
    // Log query parameters untuk debugging
    console.log('[Reports API] Request query params:', {
      status,
      category,
      urgency,
      limit,
      offset,
      search,
      roleUser,
      idUser
    });
    
    // Bangun kondisi where
    const kondisiWhere = {};
    const kondisiDan = [];
    
    // Filter berdasarkan role
    // Get user untuk filter RT/RW
    const user = await prisma.user.findUnique({
      where: { id: idUser },
      select: { rtRw: true }
    });
    const rtRwUser = user?.rtRw;
    
    // Check if user wants only their own reports (for privacy in /laporan page)
    const myReportsOnly = req.query.my_reports === 'true';
    
    console.log(`[Reports API] Role: ${roleUser}, UserId: ${idUser}, my_reports: ${myReportsOnly}, rtRw: ${rtRwUser}`);
    
    if (myReportsOnly) {
      // Filter: hanya laporan user sendiri (untuk halaman /laporan)
      console.log(`[Reports API] Filter: Hanya laporan user sendiri (my_reports=true)`);
      kondisiDan.push({
        userId: idUser
      });
    } else if (roleUser === 'warga') {
      // Warga melihat semua laporan dari RT/RW mereka (transparansi di dashboard)
      if (rtRwUser && rtRwUser.trim() !== '') {
        console.log(`[Reports API] Filter: Semua laporan RT/RW (${rtRwUser}) untuk transparansi`);
        // Gunakan exact match untuk RT/RW
        kondisiDan.push({
          user: {
            rtRw: {
              equals: rtRwUser.trim(),
              mode: 'insensitive'
            }
          }
        });
      } else {
        console.log(`[Reports API] Warning: rtRw kosong untuk warga, fallback ke laporan sendiri`);
        // Fallback: jika rtRw kosong, tampilkan laporan sendiri saja
        kondisiDan.push({
          userId: idUser
        });
      }
    } else if (['ketua_rt', 'sekretaris_rt', 'sekretaris', 'admin_rw', 'pengurus'].includes(roleUser)) {
      // Untuk RT/RW, filter berdasarkan RT/RW user (jika ada)
      if (rtRwUser && rtRwUser.trim() !== '') {
        kondisiDan.push({
          user: {
            rtRw: rtRwUser
          }
        });
      }
    }
    // Admin Sistem lihat semua laporan (tidak ada filter)
    
    // Filter laporan sensitif: hanya admin dan pembuat laporan yang bisa lihat
    if (roleUser === 'warga' && !myReportsOnly) {
      // Warga hanya bisa lihat laporan non-sensitif dari RT/RW mereka
      // Atau laporan sensitif milik mereka sendiri
      // Note: isSensitive adalah Boolean (non-nullable) dengan default false, jadi tidak perlu cek null
      kondisiDan.push({
        OR: [
          { isSensitive: false }, // Laporan non-sensitif (default untuk semua laporan lama)
          { userId: idUser } // Atau laporan sensitif milik mereka sendiri
        ]
      });
    } else if (roleUser === 'warga' && myReportsOnly) {
      // Jika my_reports=true, warga bisa lihat semua laporan mereka (termasuk sensitif)
      // Tidak perlu filter isSensitive
    }
    // Admin, Admin RW, Ketua RT, Sekretaris bisa lihat semua laporan (termasuk sensitif) di wilayah mereka
    
    // Validasi limit dan offset untuk mencegah error
    const parsedLimit = limit ? parseInt(limit) : undefined;
    const parsedOffset = offset ? parseInt(offset) : undefined;
    
    if (limit && (isNaN(parsedLimit) || parsedLimit < 0)) {
      return res.status(400).json({ error: 'Parameter limit harus berupa angka positif' });
    }
    if (offset && (isNaN(parsedOffset) || parsedOffset < 0)) {
      return res.status(400).json({ error: 'Parameter offset harus berupa angka positif' });
    }
    
    // Filter status
    if (status) {
      kondisiWhere.status = status;
    }
    
    // Filter kategori
    if (category) {
      kondisiWhere.category = category;
    }
    
    // Filter urgensi
    if (urgency) {
      kondisiWhere.urgency = urgency;
    }
    
    // Filter pencarian
    if (search) {
      kondisiDan.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } }
        ]
      });
    }
    
    // Gabungkan semua kondisi
    if (kondisiDan.length > 0) {
      kondisiWhere.AND = kondisiDan;
    }
    
    // Ambil laporan dengan info user
    // Pastikan kondisiWhere valid sebelum query
    let finalWhere = {};
    if (Object.keys(kondisiWhere).length > 0) {
      finalWhere = kondisiWhere;
    }
    
    console.log('[Reports API] Final where condition:', JSON.stringify(finalWhere, null, 2));
    
    const [daftarLaporan, totalLaporan] = await Promise.all([
      prisma.report.findMany({
        where: finalWhere,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              rtRw: true  // Tambahkan rtRw untuk debugging
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parsedLimit,
        skip: parsedOffset
      }),
      prisma.report.count({ where: finalWhere })
    ]);
    
    // Debug logging
    console.log(`[Reports API] Role: ${roleUser}, UserId: ${idUser}, Found ${daftarLaporan.length} reports`);
    console.log(`[Reports API] Filter conditions:`, JSON.stringify(kondisiWhere, null, 2));
    
    // Debug: cek apakah ada laporan lain dengan RT/RW yang sama (jika warga)
    if (roleUser === 'warga' && rtRwUser && rtRwUser.trim() !== '') {
      const allReportsInRtRw = await prisma.report.findMany({
        where: {
          user: {
            rtRw: {
              equals: rtRwUser.trim(),
              mode: 'insensitive'
            }
          }
        },
        include: {
          user: {
            select: {
              name: true,
              rtRw: true
            }
          }
        },
        take: 10
      });
      console.log(`[Reports API] Debug: Total reports in RT/RW "${rtRwUser}":`, allReportsInRtRw.length);
      if (allReportsInRtRw.length > 0) {
        console.log(`[Reports API] Debug: Reports in RT/RW:`, allReportsInRtRw.map(r => ({ 
          id: r.id, 
          userId: r.userId, 
          userName: r.user?.name,
          rtRw: r.user?.rtRw 
        })));
      }
    }
    
    if (daftarLaporan.length > 0) {
      console.log(`[Reports API] Sample report RT/RW:`, daftarLaporan[0].user?.rtRw || 'N/A');
      console.log(`[Reports API] All reports RT/RW:`, daftarLaporan.map(r => ({ 
        id: r.id, 
        rtRw: r.user?.rtRw, 
        userId: r.userId,
        userName: r.user?.name
      })));
    }
    
    // Cek apakah menggunakan mock blockchain
    const isMockBlockchain = process.env.USE_MOCK_BLOCKCHAIN === 'true';
    
    // Transform data untuk format yang diharapkan
    const data = daftarLaporan.map(laporan => ({
      id: laporan.id,
      user_id: laporan.userId,
      title: laporan.title,
      description: laporan.description,
      category: laporan.category,
      urgency: laporan.urgency,
      status: laporan.status,
      location: laporan.location,
      blockchain_tx_hash: laporan.blockchainTxHash,
      is_mock_blockchain: isMockBlockchain, // Flag untuk frontend
      ai_summary: laporan.aiSummary,
      cancellation_reason: laporan.cancellationReason,
      is_sensitive: laporan.isSensitive || false, // Laporan sensitif/rahasia
      created_at: laporan.createdAt,
      updated_at: laporan.updatedAt,
      user_name: laporan.user.name,
      user_email: laporan.user.email,
      rt_rw: laporan.user.rtRw || null // Tambahkan rt_rw untuk client-side filtering
    }));
    
    res.json({
      data,
      total: totalLaporan,
      page: parsedOffset ? Math.floor(parsedOffset / (parsedLimit || 10)) + 1 : 1,
      limit: parsedLimit || 10,
    });
  } catch (error) {
    console.error('[Reports API] Error fetching reports:', error);
    console.error('[Reports API] Error name:', error.name);
    console.error('[Reports API] Error code:', error.code);
    console.error('[Reports API] Error message:', error.message);
    if (error.stack) {
      console.error('[Reports API] Error stack:', error.stack);
    }
    
    // Return error yang lebih informatif
    let errorMessage = 'Gagal mengambil data laporan';
    let statusCode = 400;
    
    // Handle Prisma errors
    if (error.code && error.code.startsWith('P')) {
      if (error.code === 'P2002') {
        statusCode = 409;
        errorMessage = 'Konflik data';
      } else if (error.code === 'P2025') {
        statusCode = 404;
        errorMessage = 'Data tidak ditemukan';
      } else {
        errorMessage = `Database error: ${error.message}`;
      }
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && {
        details: error.stack,
        errorName: error.name,
        errorCode: error.code
      })
    });
  }
});

// Statistik analitik (admin/pengurus)
// GET /api/reports/map - Data laporan untuk peta (dengan lat/lng)
router.get('/map', authenticate, async (req, res) => {
  try {
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    const { rtFilter, rwFilter } = req.query; // Filter RT/RW untuk Admin RW & Super Admin
    
    // Get user untuk filter RT/RW
    const user = await prisma.user.findUnique({
      where: { id: idUser },
      select: { rtRw: true, role: true }
    });
    
    // Helper untuk format boundary response
    const formatBoundary = (boundaryUser) => ({
      center: {
        lat: boundaryUser.rtRwLatitude,
        lng: boundaryUser.rtRwLongitude
      },
      radius: boundaryUser.rtRwRadius || null,
      polygon: boundaryUser.rtRwPolygon || null
    });
    
    const fetchBoundaryForRtRw = async (rtRwValue) => {
      if (!rtRwValue) return null;
      const boundaryUser = await prisma.user.findFirst({
        where: { 
          rtRw: rtRwValue,
          rtRwLatitude: { not: null },
          rtRwLongitude: { not: null }
        },
        select: {
          rtRwLatitude: true,
          rtRwLongitude: true,
          rtRwRadius: true,
          rtRwPolygon: true
        }
      });
      return boundaryUser ? formatBoundary(boundaryUser) : null;
    };
    
    const fetchBoundaryForRw = async (rwValue) => {
      if (!rwValue) return null;
      const candidates = await prisma.user.findMany({
        where: {
          rtRw: {
            contains: `/${rwValue}`,
            mode: 'insensitive'
          },
          rtRwLatitude: { not: null },
          rtRwLongitude: { not: null },
          role: {
            in: ['admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris']
          }
        },
        select: {
          rtRwLatitude: true,
          rtRwLongitude: true,
          rtRwRadius: true,
          rtRwPolygon: true,
          role: true
        },
        take: 10
      });
      
      if (!candidates.length) return null;
      const preferred = candidates.find((c) => c.role === 'admin_rw') || candidates[0];
      return formatBoundary(preferred);
    };
    
    // Build query berdasarkan role
    let whereClause = {};
    let boundaryRtRw = null;
    let boundaryRw = null;
    let boundaryInfo = null;
    let boundaryType = null;
    let boundaryLabel = null;
    let parentBoundaryInfo = null;
    let parentBoundaryLabel = null;
    
    if (roleUser === 'warga') {
      if (user?.rtRw) {
        whereClause = {
          user: {
            rtRw: user.rtRw
          }
        };
        boundaryRtRw = user.rtRw;
      } else {
        whereClause = { userId: idUser };
      }
    } else if (roleUser === 'admin_rw') {
      const rwPart = user?.rtRw?.split('/')[1];
      if (rtFilter && rwPart) {
        const fullRt = `${rtFilter}/${rwPart}`;
        whereClause = { user: { rtRw: fullRt } };
        boundaryRtRw = fullRt;
      } else if (rwPart) {
        whereClause = {
          user: {
            rtRw: {
              contains: `/${rwPart}`,
              mode: 'insensitive'
            }
          }
        };
        boundaryRw = rwPart;
      }
    } else if (['ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'].includes(roleUser)) {
      if (user?.rtRw) {
        whereClause = {
          user: {
            rtRw: user.rtRw
          }
        };
        boundaryRtRw = user.rtRw;
      }
    } else if (roleUser === 'admin' || roleUser === 'admin_sistem') {
      if (rtFilter && rwFilter) {
        const fullRt = `${rtFilter}/${rwFilter}`;
        whereClause = { user: { rtRw: fullRt } };
        boundaryRtRw = fullRt;
      } else if (rwFilter) {
        whereClause = {
          user: {
            rtRw: {
              contains: `/${rwFilter}`,
              mode: 'insensitive'
            }
          }
        };
        boundaryRw = rwFilter;
      }
    }
    // Role lain (admin pusat tanpa filter) akan melihat semua data (whereClause tetap {})
    
    // Get reports
    const reports = await prisma.report.findMany({
      where: {
        ...whereClause
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        latitude: true,
        longitude: true,
        category: true,
        urgency: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            rtRw: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 500 // Limit untuk performa
    });
    
    // Format data untuk map (gunakan koordinat tersimpan terlebih dahulu, fallback ke geocoding)
    const mapDataPromises = reports.map(async (report) => {
      let lat = report.latitude;
      let lng = report.longitude;
      let geocodeConfidence = null;
      
      // Jika belum ada koordinat, lakukan forward geocoding
      if ((!lat || !lng) && report.location) {
        const locationLower = report.location.toLowerCase().trim();
        const genericKeywords = ['alamat', 'lokasi', 'tempat', 'tidak disebutkan', 'unknown', '[alamat]', '[lokasi]'];
        const isGeneric = genericKeywords.some(keyword => locationLower === keyword || locationLower.startsWith(`${keyword} `));
        
        if (isGeneric || report.location.trim().length < 3) {
          console.log(`[Map] Skipping geocoding for report ${report.id}: location too generic or short - "${report.location}"`);
        } else {
          try {
            let enhancedLocation = report.location;
            if (report.user.rtRw) {
              enhancedLocation = `${report.location}, ${report.user.rtRw}, Jakarta, Indonesia`;
            } else {
              enhancedLocation = `${report.location}, Jakarta, Indonesia`;
            }
            
            const geocodeResult = await forwardGeocode(enhancedLocation);
            if (geocodeResult) {
              lat = geocodeResult.lat;
              lng = geocodeResult.lng;
              geocodeConfidence = geocodeResult.confidence;
              console.log(`[Map] ✅ Geocoded report ${report.id}: "${report.location}" -> (${lat}, ${lng}) [${geocodeResult.confidence}]`);
            } else {
              console.log(`[Map] ❌ No geocoding result for report ${report.id}: "${report.location}"`);
            }
          } catch (error) {
            console.warn(`[Map] Failed to geocode location for report ${report.id}:`, report.location, error.message);
          }
        }
      }
      
      // Validasi jarak terhadap RT/RW boundary (jika ada)
      let locationMismatch = false;
      let locationDistance = null;
      
      if (lat && lng && report.user.rtRw) {
        try {
          const rtRwUser = await prisma.user.findFirst({
            where: { 
              rtRw: report.user.rtRw,
              rtRwLatitude: { not: null },
              rtRwLongitude: { not: null }
            },
            select: {
              rtRwLatitude: true,
              rtRwLongitude: true,
              rtRwRadius: true,
              rtRwPolygon: true
            }
          });
          
          if (rtRwUser && rtRwUser.rtRwLatitude && rtRwUser.rtRwLongitude) {
            const { validateLocationForRT } = require('../services/locationValidationService');
            const validation = validateLocationForRT(lat, lng, rtRwUser);
            locationMismatch = validation.mismatch || false;
            locationDistance = validation.distance || null;
            
            if (locationMismatch) {
              console.log(`[Map] ⚠️ Report ${report.id} location mismatch: ${locationDistance}m dari center RT/RW`);
            }
          }
        } catch (error) {
          console.warn(`[Map] Failed to validate location for report ${report.id}:`, error.message);
        }
      }
      
      return {
        id: report.id,
        title: report.title,
        description: report.description,
        location: report.location,
        lat,
        lng,
        geocodeConfidence,
        category: report.category,
        urgency: report.urgency,
        status: report.status,
        createdAt: report.createdAt,
        userName: report.user.name,
        rtRw: report.user.rtRw,
        locationMismatch,
        locationDistance
      };
    });
    
    const mapData = await Promise.all(mapDataPromises);
    const reportsWithCoords = mapData.filter(r => r.lat && r.lng);
    
    // Tentukan boundary yang tepat berdasarkan filter/role
    if (boundaryRtRw) {
      boundaryInfo = await fetchBoundaryForRtRw(boundaryRtRw);
      if (boundaryInfo) {
        boundaryType = 'rt';
        boundaryLabel = boundaryRtRw;
      }
    }
    if (!boundaryInfo && boundaryRw) {
      boundaryInfo = await fetchBoundaryForRw(boundaryRw);
      if (boundaryInfo) {
        boundaryType = 'rw';
        boundaryLabel = boundaryRw;
      }
    }
    if (!boundaryInfo && user?.rtRw) {
      boundaryInfo = await fetchBoundaryForRtRw(user.rtRw);
      if (boundaryInfo) {
        const userRole = user?.role || '';
        boundaryType = userRole === 'admin_rw' ? 'rw' : 'rt';
        boundaryLabel = user.rtRw;
      }
    }
    
    // Jika boundary RT terpilih, coba ambil boundary RW (parent) agar bisa ditampilkan bersamaan
    if (boundaryType === 'rt') {
      let parentLabelCandidate = null;
      if (rwFilter) {
        parentLabelCandidate = rwFilter;
      } else if (boundaryLabel?.includes('/')) {
        const parts = boundaryLabel.split('/');
        parentLabelCandidate = parts[1];
      }
      if (parentLabelCandidate) {
        const parentBoundary = await fetchBoundaryForRw(parentLabelCandidate);
        if (parentBoundary) {
          parentBoundaryInfo = {
            ...parentBoundary,
            type: 'rw',
            label: parentLabelCandidate.startsWith('RW') ? parentLabelCandidate : parentLabelCandidate
          };
          parentBoundaryLabel = parentBoundaryInfo.label;
        }
      }
    }
    
    // Kumpulan boundary global untuk super admin (lihat semua RW/RT sekaligus)
    let allBoundaries = null;
    const includeAllBoundaries = (roleUser === 'admin' || roleUser === 'admin_sistem') && !rtFilter && !rwFilter;
    if (includeAllBoundaries) {
      const [rwBoundaryUsers, rtBoundaryUsers] = await Promise.all([
        prisma.user.findMany({
          where: {
            role: 'admin_rw',
            rtRwLatitude: { not: null },
            rtRwLongitude: { not: null },
          },
          select: {
            rtRw: true,
            rtRwLatitude: true,
            rtRwLongitude: true,
            rtRwRadius: true,
            rtRwPolygon: true,
          },
        }),
        prisma.user.findMany({
          where: {
            role: { in: ['ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'] },
            rtRwLatitude: { not: null },
            rtRwLongitude: { not: null },
          },
          select: {
            rtRw: true,
            rtRwLatitude: true,
            rtRwLongitude: true,
            rtRwRadius: true,
            rtRwPolygon: true,
          },
        }),
      ]);
      
      const formatBoundary = (boundaryUser, type) => ({
        type,
        label: boundaryUser.rtRw,
        center: {
          lat: boundaryUser.rtRwLatitude,
          lng: boundaryUser.rtRwLongitude,
        },
        radius: boundaryUser.rtRwRadius,
        polygon: boundaryUser.rtRwPolygon,
      });
      
      allBoundaries = [
        ...rwBoundaryUsers.map((u) => formatBoundary(u, 'rw')),
        ...rtBoundaryUsers.map((u) => formatBoundary(u, 'rt')),
      ];
    }
    
    res.json({
      reports: mapData,
      reportsWithCoords,
      rtRwBoundary: boundaryInfo
        ? {
            ...boundaryInfo,
            type: boundaryType,
            label: boundaryLabel,
          }
        : null,
      parentBoundary: parentBoundaryInfo,
      allBoundaries,
      total: mapData.length,
      totalWithCoords: reportsWithCoords.length
    });
  } catch (error) {
    console.error('Error fetching map data:', error);
    res.status(500).json({ error: 'Gagal mengambil data peta' });
  }
});

// GET /api/reports/realtime-feed - Fetch recent reports for realtime feed (filtered by role)
router.get('/realtime-feed', authenticate, async (req, res) => {
  try {
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    
    // Get user untuk filter RT/RW
    const user = await prisma.user.findUnique({
      where: { id: idUser },
      select: { rtRw: true }
    });
    
    // Build query berdasarkan role
    let whereClause = {};
    
    if (roleUser === 'warga') {
      // Warga hanya lihat laporan di RT/RW mereka
      whereClause = {
        user: {
          rtRw: user?.rtRw || null
        }
      };
    } else if (['admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'].includes(roleUser)) {
      // Admin RT/RW lihat laporan di RT/RW mereka
      whereClause = {
        user: {
          rtRw: user?.rtRw || null
        }
      };
    }
    // admin_sistem lihat semua (whereClause tetap {})
    
    // Get recent reports (last 10, ordered by created_at desc)
    const reports = await prisma.report.findMany({
      where: whereClause,
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        location: true,
        status: true,
        category: true,
        urgency: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            rtRw: true
          }
        }
      }
    });
    
    // Format data untuk frontend
    const formattedReports = reports.map(report => ({
      id: report.id,
      title: report.title,
      location: report.location,
      status: report.status,
      category: report.category,
      urgency: report.urgency,
      user_name: report.user.name,
      rt_rw: report.user.rtRw,
      created_at: report.createdAt
    }));
    
    res.json({
      reports: formattedReports,
      total: formattedReports.length
    });
  } catch (error) {
    console.error('Error fetching realtime feed:', error);
    res.status(500).json({ error: 'Gagal mengambil data feed' });
  }
});

// POST /api/reports/admin/rt-rw/set-location - Set RT/RW boundary (untuk Admin RT/RW)
router.post('/admin/rt-rw/set-location', authenticate, requirePermission(PERMISSIONS.RT_RW_SET_LOCATION), async (req, res) => {
  try {
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    const {
      latitude,
      longitude,
      radius,
      polygon,
      targetLevel,
      targetRw,
      targetRt,
    } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude dan longitude diperlukan' });
    }
    
    if (radius && (isNaN(radius) || radius < 100 || radius > 10000)) {
      return res.status(400).json({ error: 'Radius harus antara 100-10000 meter' });
    }
    
    const parsedRadius = radius ? parseInt(radius, 10) : null;
    const isSuperAdmin = roleUser === 'admin' || roleUser === 'admin_sistem';
    
    let targetUserId = idUser;
    let effectiveLevel = null;
    let targetLabel = null;
    
    if (targetLevel) {
      if (!isSuperAdmin) {
        return res.status(403).json({ error: 'Hanya Super Admin yang dapat menyetel lokasi untuk RT/RW lain' });
      }
      
      if (targetLevel === 'rw') {
        if (!targetRw) {
          return res.status(400).json({ error: 'targetRw diperlukan untuk menyetel lokasi RW' });
        }
        const adminRw = await prisma.user.findFirst({
          where: {
            role: 'admin_rw',
            rtRw: {
              contains: `/${targetRw}`,
              mode: 'insensitive'
            }
          },
          orderBy: { createdAt: 'asc' }
        });
        
        if (!adminRw) {
          return res.status(404).json({ error: `Admin RW untuk ${targetRw} tidak ditemukan` });
        }
        
        targetUserId = adminRw.id;
        targetLabel = adminRw.rtRw;
        effectiveLevel = 'rw';
      } else if (targetLevel === 'rt') {
        if (!targetRw || !targetRt) {
          return res.status(400).json({ error: 'targetRw dan targetRt diperlukan untuk menyetel lokasi RT' });
        }
        const targetRtRw = `${targetRt}/${targetRw}`;
        const rtManagers = await prisma.user.findMany({
          where: {
            rtRw: {
              equals: targetRtRw,
              mode: 'insensitive'
            },
            role: {
              in: ['ketua_rt', 'sekretaris_rt', 'sekretaris']
            }
          },
          orderBy: { createdAt: 'asc' },
          take: 5
        });
        
        const rolePriority = { ketua_rt: 1, sekretaris_rt: 2, sekretaris: 3 };
        const sorted = rtManagers.sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));
        const targetUser = sorted[0];
        
        if (!targetUser) {
          return res.status(404).json({ error: `Pengelola RT ${targetRtRw} tidak ditemukan` });
        }
        
        targetUserId = targetUser.id;
        targetLabel = targetUser.rtRw;
        effectiveLevel = 'rt';
      } else {
        return res.status(400).json({ error: 'targetLevel tidak valid. Gunakan "rw" atau "rt"' });
      }
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        rtRwLatitude: parseFloat(latitude),
        rtRwLongitude: parseFloat(longitude),
        rtRwRadius: parsedRadius,
        rtRwPolygon: polygon || null
      },
      select: {
        id: true,
        rtRw: true,
        role: true,
        rtRwLatitude: true,
        rtRwLongitude: true,
        rtRwRadius: true,
        rtRwPolygon: true
      }
    });
    
    if (!targetLabel) {
      targetLabel = updatedUser.rtRw;
    }
    if (!effectiveLevel) {
      effectiveLevel = ['admin_rw'].includes(updatedUser.role) ? 'rw' : 'rt';
    }
    
    res.json({ 
      success: true,
      message: `Lokasi ${effectiveLevel.toUpperCase()} berhasil disimpan`,
      target: targetLabel,
      targetLevel: effectiveLevel,
      boundary: {
        center: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
        radius: parsedRadius,
        polygon: polygon || null
      }
    });
  } catch (error) {
    console.error('Error setting RT/RW location:', error);
    res.status(500).json({ error: 'Gagal menyimpan lokasi RT/RW' });
  }
});

// GET /api/reports/stats/warga - Statistik laporan untuk warga (laporan mereka sendiri)
router.get('/stats/warga', authenticate, async (req, res) => {
  try {
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    
    // Hanya untuk warga
    if (roleUser !== 'warga') {
      return res.status(403).json({ error: 'Endpoint ini hanya untuk warga' });
    }
    
    // Statistik laporan user sendiri
    const [total, pending, inProgress, resolved, rejected, cancelled] = await Promise.all([
      prisma.report.count({ where: { userId: idUser } }),
      prisma.report.count({ where: { userId: idUser, status: 'pending' } }),
      prisma.report.count({ where: { userId: idUser, status: 'in_progress' } }),
      prisma.report.count({ where: { userId: idUser, status: 'resolved' } }),
      prisma.report.count({ where: { userId: idUser, status: 'rejected' } }),
      prisma.report.count({ where: { userId: idUser, status: 'cancelled' } })
    ]);
    
    res.json({
      totals: {
        total_reports: total,
        pending_reports: pending,
        in_progress_reports: inProgress,
        resolved_reports: resolved,
        rejected_reports: rejected,
        cancelled_reports: cancelled
      }
    });
  } catch (error) {
    console.error('Error fetching warga stats:', error);
    res.status(500).json({ error: 'Gagal mengambil statistik' });
  }
});

// GET /api/reports/stats/rw-list - Daftar RW dengan ringkasan (untuk Super Admin)
router.get('/stats/rw-list', authenticate, async (req, res) => {
  try {
    const roleUser = req.user.role;
    
    if (roleUser !== 'admin' && roleUser !== 'admin_sistem') {
      return res.status(403).json({ error: 'Endpoint ini hanya untuk Super Admin' });
    }
    
    // Get all unique RW
    const rwList = await prisma.user.findMany({
      where: {
        rtRw: {
          not: null
        }
      },
      select: {
        rtRw: true
      },
      distinct: ['rtRw']
    });
    
    // Extract RW numbers
    const uniqueRWs = [...new Set(rwList.map(u => {
      const parts = u.rtRw?.split('/');
      return parts?.[1] || null;
    }).filter(Boolean))].sort((a, b) => {
      const numA = parseInt(a.replace('RW', '')) || 0;
      const numB = parseInt(b.replace('RW', '')) || 0;
      return numA - numB;
    });
    
    // Get ringkasan per RW (jumlah RT dan warga)
    const rwSummary = await Promise.all(uniqueRWs.map(async (rw) => {
      // Normalize RW format untuk exact match (RW001, RW002, dll)
      const rwNormalized = rw.toUpperCase().startsWith('RW') ? rw.toUpperCase() : `RW${rw}`;
      
      // Get unique RT dalam RW dengan exact match pattern
      // Pattern: RT001/RW001, RT002/RW001, dll (harus exact match dengan RW)
      const rtUsers = await prisma.user.findMany({
        where: {
          rtRw: {
            endsWith: `/${rwNormalized}`, // Exact match di akhir string
            mode: 'insensitive'
          }
        },
        select: {
          rtRw: true
        },
        distinct: ['rtRw']
      });
      
      // Extract unique RT numbers (filter RT000 atau RT yang tidak valid)
      const uniqueRTs = [...new Set(rtUsers.map(u => {
        if (!u.rtRw) return null;
        const parts = u.rtRw.split('/');
        if (parts.length !== 2) return null;
        const rtPart = parts[0]?.trim();
        const rwPart = parts[1]?.trim();
        // Verify RW matches
        if (rwPart?.toUpperCase() !== rwNormalized) return null;
        // Filter RT000 atau RT yang tidak valid (RT dengan angka 0 setelah RT)
        const rtNumber = parseInt(rtPart.replace(/RT/i, '').replace(/^0+/, '')) || 0;
        if (rtNumber === 0) {
          console.log(`[RW Summary] ${rwNormalized}: Filtering out invalid RT: ${rtPart}`);
          return null; // Filter RT000 atau RT yang tidak valid
        }
        return rtPart || null;
      }).filter(Boolean))].sort((a, b) => {
        // Sort by RT number
        const numA = parseInt(a.replace(/RT/i, '').replace(/^0+/, '')) || 0;
        const numB = parseInt(b.replace(/RT/i, '').replace(/^0+/, '')) || 0;
        return numA - numB;
      });
      
      console.log(`[RW Summary] ${rwNormalized}: Found ${uniqueRTs.length} RT(s):`, uniqueRTs);
      
      // Count total warga di RW dengan exact match
      const totalWarga = await prisma.user.count({
        where: {
          rtRw: {
            endsWith: `/${rwNormalized}`, // Exact match di akhir string
            mode: 'insensitive'
          },
          role: 'warga'
        }
      });
      
      // Count total laporan di RW dengan exact match
      const totalReports = await prisma.report.count({
        where: {
          user: {
            rtRw: {
              endsWith: `/${rwNormalized}`, // Exact match di akhir string
              mode: 'insensitive'
            }
          }
        }
      });
      
      console.log(`[RW Summary] ${rwNormalized}: ${totalWarga} warga, ${totalReports} laporan`);
      
      return {
        rw: rwNormalized,
        label: rwNormalized,
        rtCount: uniqueRTs.length,
        totalWarga: totalWarga,
        totalReports: totalReports,
        rtList: uniqueRTs // Tambahkan daftar RT untuk debugging
      };
    }));
    
    res.json({
      rwList: rwSummary,
      totalRW: uniqueRWs.length,
      totalRT: rwSummary.reduce((sum, rw) => sum + rw.rtCount, 0)
    });
  } catch (error) {
    console.error('Error fetching RW list:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar RW' });
  }
});

// GET /api/reports/stats/rt-list - Daftar RT dalam RW (untuk Admin RW atau Super Admin dengan RW filter)
router.get('/stats/rt-list', authenticate, async (req, res) => {
  try {
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    const { rwFilter } = req.query; // Untuk Super Admin: filter RT berdasarkan RW
    
    let rwPart = null;
    
    if (roleUser === 'admin_rw') {
      // Admin RW: ambil RT dalam RW mereka
      // Get user RT/RW
      const user = await prisma.user.findUnique({
        where: { id: idUser },
        select: { rtRw: true }
      });
      
      if (!user?.rtRw) {
        return res.json({ rtList: [] });
      }
      
      // Extract RW part
      rwPart = user.rtRw.split('/')[1];
    } else if ((roleUser === 'admin' || roleUser === 'admin_sistem') && rwFilter) {
      // Super Admin dengan RW filter: ambil RT dalam RW tertentu
      rwPart = rwFilter;
    } else if (roleUser === 'admin' || roleUser === 'admin_sistem') {
      // Super Admin tanpa RW filter: return empty (harus pilih RW dulu)
      return res.json({ rtList: [], rw: null });
    } else {
      return res.status(403).json({ error: 'Endpoint ini hanya untuk Admin RW atau Super Admin' });
    }
    
    // Normalize RW format
    const rwNormalized = rwPart.toUpperCase().startsWith('RW') ? rwPart.toUpperCase() : `RW${rwPart}`;
    
    // Get all unique RT/RW yang memiliki RW yang sama dengan exact match
    const rtList = await prisma.user.findMany({
      where: {
        rtRw: {
          endsWith: `/${rwNormalized}`, // Exact match di akhir string
          mode: 'insensitive'
        },
        role: {
          in: ['warga', 'ketua_rt', 'sekretaris_rt', 'sekretaris']
        }
      },
      select: {
        rtRw: true
      },
      distinct: ['rtRw']
    });
    
    console.log(`[RT List] Role: ${roleUser}, RW Part: ${rwNormalized}, Found ${rtList.length} RT/RW entries`);
    
    // Extract RT numbers and format dengan verifikasi RW
    const uniqueRTs = [...new Set(rtList.map(u => {
      if (!u.rtRw) return null;
      const parts = u.rtRw.split('/');
      if (parts.length !== 2) return null;
      const rtPart = parts[0]?.trim();
      const rwPart = parts[1]?.trim();
      // Verify RW matches
      if (rwPart?.toUpperCase() !== rwNormalized) return null;
      return rtPart || null;
    }).filter(Boolean))].sort((a, b) => {
      // Sort RT numbers naturally (RT001, RT002, etc)
      const numA = parseInt(a.replace(/RT/i, '').replace(/^0+/, '')) || 0;
      const numB = parseInt(b.replace(/RT/i, '').replace(/^0+/, '')) || 0;
      return numA - numB;
    });
    
    console.log(`[RT List] Unique RTs:`, uniqueRTs);
    
    const result = {
      rtList: uniqueRTs.map(rt => ({
        rt: rt,
        rtRw: `${rt}/${rwNormalized}`,
        label: `${rt}/${rwNormalized}`
      })),
      rw: rwNormalized
    };
    
    console.log(`[RT List] Response:`, result);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching RT list:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar RT' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const { period = 'day', rtFilter, rwFilter } = req.query; // 'day', 'week', 'month', rtFilter untuk Admin RW, rwFilter untuk Super Admin
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    
    // Get user untuk filter RT/RW
    const user = await prisma.user.findUnique({
      where: { id: idUser },
      select: { rtRw: true }
    });
    const rtRwUser = user?.rtRw;
    
    // Build filter untuk reports berdasarkan role
    let reportFilter = '';
    let reportFilterParams = [];
    
    if (roleUser === 'admin' || roleUser === 'admin_sistem') {
      // Super Admin: bisa filter per RW atau RT
      if (rtFilter && rwFilter) {
        // Filter per RT tertentu dalam RW tertentu
        reportFilter = `AND users.rt_rw = $1`;
        reportFilterParams = [`${rtFilter}/${rwFilter}`];
      } else if (rwFilter) {
        // Filter semua RT dalam RW tertentu
        reportFilter = `AND users.rt_rw LIKE $1`;
        reportFilterParams = [`%/${rwFilter}`];
      } else {
        // Tidak ada filter: lihat semua
        reportFilter = '';
      }
    } else if (roleUser === 'admin_rw') {
      // Admin RW: filter berdasarkan RW mereka, atau RT tertentu jika rtFilter diberikan
      if (rtFilter && rtRwUser) {
        // Filter per RT tertentu dalam RW
        const rwPart = rtRwUser.split('/')[1]; // Ambil bagian RW
        reportFilter = `AND (users.rt_rw = $1 OR users.rt_rw LIKE $2)`;
        reportFilterParams = [`${rtFilter}/${rwPart}`, `${rtFilter}/${rwPart}`];
      } else if (rtRwUser) {
        // Filter semua RT dalam RW mereka
        const rwPart = rtRwUser.split('/')[1];
        reportFilter = `AND users.rt_rw LIKE $1`;
        reportFilterParams = [`%/${rwPart}`];
      }
    } else if (['ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'].includes(roleUser)) {
      // Ketua RT/Sekretaris RT: filter berdasarkan RT/RW mereka
      if (rtRwUser) {
        reportFilter = `AND users.rt_rw = $1`;
        reportFilterParams = [rtRwUser];
      }
    }
    
    // Build where clause untuk Prisma query berdasarkan filter
    let whereClause = {};
    
    if (roleUser === 'admin' || roleUser === 'admin_sistem') {
      // Super Admin: bisa filter per RW atau RT
      if (rtFilter && rwFilter) {
        // Filter per RT tertentu dalam RW tertentu
        whereClause = {
          user: { rtRw: `${rtFilter}/${rwFilter}` }
        };
      } else if (rwFilter) {
        // Filter semua RT dalam RW tertentu
        whereClause = {
          user: { 
            rtRw: { 
              contains: `/${rwFilter}`,
              mode: 'insensitive'
            } 
          }
        };
      }
      // Jika tidak ada filter: lihat semua (default untuk superadmin)
    } else if (roleUser === 'admin_rw') {
      // Admin RW: filter berdasarkan RW mereka, atau RT tertentu jika rtFilter diberikan
      if (rtFilter && rtRwUser) {
        // Filter per RT tertentu dalam RW
        const rwPart = rtRwUser.split('/')[1];
        whereClause = {
          user: { rtRw: `${rtFilter}/${rwPart}` }
        };
      } else if (rtRwUser) {
        // Filter semua RT dalam RW mereka
        const rwPart = rtRwUser.split('/')[1];
        whereClause = {
          user: { 
            rtRw: { 
              contains: `/${rwPart}`,
              mode: 'insensitive'
            } 
          }
        };
      }
    } else if (['ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'].includes(roleUser)) {
      // Ketua RT/Sekretaris RT: filter berdasarkan RT/RW mereka
      if (rtRwUser) {
        whereClause = {
          user: { rtRw: rtRwUser }
        };
      }
    }

    // Jendela waktu dinamis berdasarkan periode
    const timeWindowDays = period === 'day' ? 30 : period === 'week' ? 84 : 365;
    const timeWindowMs = timeWindowDays * 24 * 60 * 60 * 1000;
    
    // Time series dengan filter RT/RW
    const reportsForTimeSeries = await prisma.report.findMany({
      where: {
        ...whereClause,
        createdAt: {
          gte: new Date(Date.now() - timeWindowMs)
        }
      },
      include: {
        user: {
          select: {
            rtRw: true
          }
        }
      }
    });

    // Group by period
    const groupedByPeriod = {};
    reportsForTimeSeries.forEach(report => {
      const date = new Date(report.createdAt);
      let key = '';
      if (period === 'day') {
        key = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      } else if (period === 'week') {
        const week = getWeek(date);
        key = `${week}/${date.getFullYear()}`;
      } else {
        key = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      }
      groupedByPeriod[key] = (groupedByPeriod[key] || 0) + 1;
    });

    const seriWaktu = Object.entries(groupedByPeriod)
      .map(([label, count]) => ({ label, count: Number(count) }))
      .sort((a, b) => {
        // Simple sort by label (bisa diperbaiki dengan date parsing)
        return a.label.localeCompare(b.label);
      });

    // Status distribution dengan filter
    const dataStatusMentah = await prisma.report.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { id: true }
    });
    const berdasarkanStatus = dataStatusMentah.map(baris => ({
      status: baris.status,
      count: Number(baris._count.id)
    }));

    // Category distribution dengan filter
    const dataKategoriMentah = await prisma.report.groupBy({
      by: ['category'],
      where: whereClause,
      _count: { id: true }
    });
    const berdasarkanKategori = dataKategoriMentah.map(baris => ({
      category: baris.category || 'unknown',
      count: Number(baris._count.id)
    }));

    // Urgency distribution dengan filter
    const dataUrgensiMentah = await prisma.report.groupBy({
      by: ['urgency'],
      where: whereClause,
      _count: { id: true }
    });
    const berdasarkanUrgensi = dataUrgensiMentah.map(baris => ({
      urgency: baris.urgency || 'unknown',
      count: Number(baris._count.id)
    }));

    // Totals dengan filter
    const totalReports = await prisma.report.count({ where: whereClause });
    const resolvedReports = await prisma.report.count({ 
      where: { ...whereClause, status: 'resolved' } 
    });
    const inProgressReports = await prisma.report.count({ 
      where: { ...whereClause, status: 'in_progress' } 
    });
    const pendingReports = await prisma.report.count({ 
      where: { ...whereClause, status: 'pending' } 
    });
    const cancelledReports = await prisma.report.count({ 
      where: { ...whereClause, status: 'cancelled' } 
    });

    const total = {
      total_reports: totalReports,
      resolved_reports: resolvedReports,
      in_progress_reports: inProgressReports,
      pending_reports: pendingReports,
      cancelled_reports: cancelledReports
    };

    res.json({
      timeSeries: seriWaktu,
      byStatus: berdasarkanStatus,
      byCategory: berdasarkanKategori,
      byUrgency: berdasarkanUrgensi,
      totals: total,
      filter: {
        rtFilter: rtFilter || null,
        rwFilter: rwFilter || null,
        rtRw: rtRwUser || null
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Helper function untuk get week number
function getWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// GET /api/reports/stats/by-rt - Statistik per RT dalam RW (untuk Admin RW atau Super Admin dengan RW filter)
router.get('/stats/by-rt', authenticate, async (req, res) => {
  try {
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    const { rwFilter } = req.query;
    
    let rwPart = null;
    
    if (roleUser === 'admin_rw') {
      const user = await prisma.user.findUnique({
        where: { id: idUser },
        select: { rtRw: true }
      });
      if (!user?.rtRw) {
        return res.json({ rtStats: [] });
      }
      rwPart = user.rtRw.split('/')[1];
    } else if ((roleUser === 'admin' || roleUser === 'admin_sistem') && rwFilter) {
      rwPart = rwFilter;
    } else {
      return res.status(403).json({ error: 'Endpoint ini hanya untuk Admin RW atau Super Admin dengan RW filter' });
    }
    
    // Normalize RW format
    const rwNormalized = rwPart.toUpperCase().startsWith('RW') ? rwPart.toUpperCase() : `RW${rwPart}`;
    
    // Get all RT dalam RW dengan exact match
    const rtUsers = await prisma.user.findMany({
      where: {
        rtRw: {
          endsWith: `/${rwNormalized}`, // Exact match di akhir string
          mode: 'insensitive'
        },
        role: {
          in: ['warga', 'ketua_rt', 'sekretaris_rt', 'sekretaris']
        }
      },
      select: {
        rtRw: true
      },
      distinct: ['rtRw']
    });
    
    // Extract unique RT numbers dengan verifikasi RW (filter RT000 atau RT yang tidak valid)
    const uniqueRTs = [...new Set(rtUsers.map(u => {
      if (!u.rtRw) return null;
      const parts = u.rtRw.split('/');
      if (parts.length !== 2) return null;
      const rtPart = parts[0]?.trim();
      const rwPart = parts[1]?.trim();
      // Verify RW matches
      if (rwPart?.toUpperCase() !== rwNormalized) return null;
      // Filter RT000 atau RT yang tidak valid (RT dengan angka 0 setelah RT)
      const rtNumber = parseInt(rtPart.replace(/RT/i, '').replace(/^0+/, '')) || 0;
      if (rtNumber === 0) {
        console.log(`[By-RT] ${rwNormalized}: Filtering out invalid RT: ${rtPart}`);
        return null; // Filter RT000 atau RT yang tidak valid
      }
      return rtPart || null;
    }).filter(Boolean))].sort((a, b) => {
      const numA = parseInt(a.replace(/RT/i, '').replace(/^0+/, '')) || 0;
      const numB = parseInt(b.replace(/RT/i, '').replace(/^0+/, '')) || 0;
      return numA - numB;
    });
    
    console.log(`[By-RT] RW: ${rwNormalized}, Found ${uniqueRTs.length} RT(s):`, uniqueRTs);
    
    // Get statistik per RT
    const rtStats = await Promise.all(uniqueRTs.map(async (rt) => {
      // Normalize RT format
      const rtNormalized = rt.toUpperCase().startsWith('RT') ? rt.toUpperCase() : `RT${rt}`;
      const rtRw = `${rtNormalized}/${rwNormalized}`;
      
      // Count warga per RT dengan exact match
      const wargaCount = await prisma.user.count({
        where: {
          rtRw: rtRw, // Exact match
          role: 'warga'
        }
      });
      
      // Count reports per RT dengan exact match
      const reportsData = await prisma.report.groupBy({
        by: ['status'],
        where: {
          user: {
            rtRw: rtRw // Exact match
          }
        },
        _count: {
          id: true
        }
      });
      
      const totalReports = reportsData.reduce((sum, item) => sum + item._count.id, 0);
      const pendingReports = reportsData.find(r => r.status === 'pending')?._count.id || 0;
      const inProgressReports = reportsData.find(r => r.status === 'in_progress')?._count.id || 0;
      const resolvedReports = reportsData.find(r => r.status === 'resolved' || r.status === 'completed')?._count.id || 0;
      
      return {
        rt: rtNormalized,
        rtRw: rtRw,
        label: rtRw,
        wargaCount,
        totalReports,
        pendingReports,
        inProgressReports,
        resolvedReports
      };
    }));
    
    res.json({
      rw: rwNormalized,
      rtStats: rtStats.sort((a, b) => {
        const numA = parseInt(a.rt.replace(/RT/i, '').replace(/^0+/, '')) || 0;
        const numB = parseInt(b.rt.replace(/RT/i, '').replace(/^0+/, '')) || 0;
        return numA - numB;
      })
    });
  } catch (error) {
    console.error('Error fetching RT stats:', error);
    res.status(500).json({ error: 'Gagal mengambil statistik per RT' });
  }
});

// GET /api/reports/stats/rw-summary - Ringkasan statistik RW untuk Super Admin (default RW 1)
router.get('/stats/rw-summary', authenticate, async (req, res) => {
  try {
    const roleUser = req.user.role;
    const { rwFilter = 'RW001' } = req.query; // Default RW001 untuk Super Admin
    
    if (roleUser !== 'admin' && roleUser !== 'admin_sistem') {
      return res.status(403).json({ error: 'Endpoint ini hanya untuk Super Admin' });
    }
    
    // Normalize RW format
    const rwNormalized = rwFilter.toUpperCase().startsWith('RW') ? rwFilter.toUpperCase() : `RW${rwFilter}`;
    
    // Get all RT dalam RW dengan exact match
    const rtUsers = await prisma.user.findMany({
      where: {
        rtRw: {
          endsWith: `/${rwNormalized}`, // Exact match di akhir string
          mode: 'insensitive'
        },
        role: {
          in: ['warga', 'ketua_rt', 'sekretaris_rt', 'sekretaris']
        }
      },
      select: {
        rtRw: true
      },
      distinct: ['rtRw']
    });
    
    // Extract unique RT numbers dengan verifikasi RW (filter RT000 atau RT yang tidak valid)
    const uniqueRTs = [...new Set(rtUsers.map(u => {
      if (!u.rtRw) return null;
      const parts = u.rtRw.split('/');
      if (parts.length !== 2) return null;
      const rtPart = parts[0]?.trim();
      const rwPart = parts[1]?.trim();
      // Verify RW matches
      if (rwPart?.toUpperCase() !== rwNormalized) return null;
      // Filter RT000 atau RT yang tidak valid (RT dengan angka 0 setelah RT)
      const rtNumber = parseInt(rtPart.replace(/RT/i, '').replace(/^0+/, '')) || 0;
      if (rtNumber === 0) {
        console.log(`[RW Summary] ${rwNormalized}: Filtering out invalid RT: ${rtPart}`);
        return null; // Filter RT000 atau RT yang tidak valid
      }
      return rtPart || null;
    }).filter(Boolean))].sort((a, b) => {
      const numA = parseInt(a.replace(/RT/i, '').replace(/^0+/, '')) || 0;
      const numB = parseInt(b.replace(/RT/i, '').replace(/^0+/, '')) || 0;
      return numA - numB;
    });
    
    // Total warga di RW dengan exact match
    const totalWarga = await prisma.user.count({
      where: {
        rtRw: {
          endsWith: `/${rwNormalized}`, // Exact match di akhir string
          mode: 'insensitive'
        },
        role: 'warga'
      }
    });
    
    // Warga per RT untuk mencari RT terbesar
    const wargaPerRT = await Promise.all(uniqueRTs.map(async (rt) => {
      // Normalize RT format
      const rtNormalized = rt.toUpperCase().startsWith('RT') ? rt.toUpperCase() : `RT${rt}`;
      const rtRw = `${rtNormalized}/${rwNormalized}`;
      const count = await prisma.user.count({
        where: {
          rtRw: rtRw,
          role: 'warga'
        }
      });
      return { rt: rtNormalized, rtRw, count };
    }));
    
    const rtTerbesar = wargaPerRT.sort((a, b) => b.count - a.count)[0];
    
    // Total laporan di RW dengan exact match
    const reportsData = await prisma.report.groupBy({
      by: ['status'],
      where: {
        user: {
          rtRw: {
            endsWith: `/${rwNormalized}`, // Exact match di akhir string
            mode: 'insensitive'
          }
        }
      },
      _count: {
        id: true
      }
    });
    
    const totalReports = reportsData.reduce((sum, item) => sum + item._count.id, 0);
    const pendingReports = reportsData.find(r => r.status === 'pending')?._count.id || 0;
    const inProgressReports = reportsData.find(r => r.status === 'in_progress')?._count.id || 0;
    const resolvedReports = reportsData.find(r => r.status === 'resolved' || r.status === 'completed')?._count.id || 0;
    
    res.json({
      rw: rwNormalized,
      totalRT: uniqueRTs.length,
      totalWarga,
      rtTerbesar: rtTerbesar ? {
        rt: rtTerbesar.rt,
        rtRw: rtTerbesar.rtRw,
        wargaCount: rtTerbesar.count
      } : null,
      totalReports,
      pendingReports,
      inProgressReports,
      resolvedReports,
      rtList: uniqueRTs // Tambahkan daftar RT untuk debugging
    });
  } catch (error) {
    console.error('Error fetching RW summary:', error);
    res.status(500).json({ error: 'Gagal mengambil ringkasan RW' });
  }
});

// Ambil satu laporan berdasarkan ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const laporan = await prisma.report.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            name: true,
            rtRw: true
          }
        }
      }
    });
    
    if (!laporan) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Ambil riwayat status
    const riwayatStatus = await prisma.reportStatusHistory.findMany({
      where: { reportId: parseInt(id) },
      include: {
        updater: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    // Cek apakah menggunakan mock blockchain
    const isMockBlockchain = process.env.USE_MOCK_BLOCKCHAIN === 'true';
    
    res.json({
      id: laporan.id,
      user_id: laporan.userId,
      title: laporan.title,
      description: laporan.description,
      category: laporan.category,
      urgency: laporan.urgency,
      status: laporan.status,
      location: laporan.location,
      image_url: laporan.imageUrl, // Tambahkan image URL
      blockchain_tx_hash: laporan.blockchainTxHash,
      is_mock_blockchain: isMockBlockchain, // Flag untuk frontend
      ai_summary: laporan.aiSummary,
      cancellation_reason: laporan.cancellationReason,
      is_sensitive: laporan.isSensitive || false, // Laporan sensitif/rahasia
      created_at: laporan.createdAt,
      updated_at: laporan.updatedAt,
      user_name: laporan.user.name,
      rt_rw: laporan.user.rtRw,
      history: riwayatStatus.map(riwayat => ({
        id: riwayat.id,
        report_id: riwayat.reportId,
        status: riwayat.status,
        notes: riwayat.notes,
        updated_by: riwayat.updatedBy,
        blockchain_tx_hash: riwayat.blockchainTxHash,
        created_at: riwayat.createdAt,
        updated_by_name: riwayat.updater.name
      }))
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update status laporan (hanya pengurus)
router.patch('/:id/status', authenticate, requirePermission(PERMISSIONS.REPORT_UPDATE_STATUS), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const idUser = req.user.userId;
    
    // Get old status sebelum update
    const oldReport = await prisma.report.findUnique({
      where: { id: parseInt(id) },
      select: { status: true }
    });
    const oldStatus = oldReport?.status || 'pending';
    
    // Update laporan
    await prisma.report.update({
      where: { id: parseInt(id) },
      data: { status }
    });
    
    // Catat ke blockchain
    const hashMeta = ethers.id(`${id}-${status}`).substring(0, 10);
    const hashTransaksi = await logReportToBlockchain(id, status, hashMeta);
    
    // Tambahkan ke riwayat
    await prisma.reportStatusHistory.create({
      data: {
        reportId: parseInt(id),
        status,
        notes,
        updatedBy: idUser,
        blockchainTxHash: hashTransaksi
      }
    });
    
    const laporanTerupdate = await prisma.report.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            rtRw: true
          }
        }
      }
    });

    // Send email notification ke warga (async, tidak block response)
    if (oldStatus !== status && laporanTerupdate && laporanTerupdate.user) {
      try {
        const { sendEmailStatusUpdate } = require('../services/emailService');
        sendEmailStatusUpdate(laporanTerupdate, laporanTerupdate.user, oldStatus, status).catch(err => {
          console.error('[Email] Error sending status update notification (non-blocking):', err.message);
        });
      } catch (emailError) {
        console.error('[Email] Error in email notification (non-blocking):', emailError.message);
        // Continue - email error tidak boleh block update
      }
    }
    
    const reportData = {
      id: laporanTerupdate.id,
      user_id: laporanTerupdate.userId,
      title: laporanTerupdate.title,
      description: laporanTerupdate.description,
      category: laporanTerupdate.category,
      urgency: laporanTerupdate.urgency,
      status: laporanTerupdate.status,
      location: laporanTerupdate.location,
      blockchain_tx_hash: laporanTerupdate.blockchainTxHash,
      ai_summary: laporanTerupdate.aiSummary,
      cancellation_reason: laporanTerupdate.cancellationReason,
      created_at: laporanTerupdate.createdAt,
      updated_at: laporanTerupdate.updatedAt,
      user_name: laporanTerupdate.user?.name,
      user_email: laporanTerupdate.user?.email,
      rt_rw: laporanTerupdate.user?.rtRw
    };
    
    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('report:updated', reportData);
      io.to(`report:${parseInt(id)}`).emit('report:updated', reportData);
    }
    
    res.json(reportData);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Batalkan laporan (warga saja, hanya jika status masih pending)
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    
    // Cek apakah laporan milik user (untuk warga) atau user adalah admin
    const laporan = await prisma.report.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!laporan) {
      return res.status(404).json({ error: 'Laporan tidak ditemukan' });
    }
    
    // Warga hanya bisa cancel laporan mereka sendiri
    // Admin/pengurus bisa cancel laporan apapun
    if (roleUser === 'warga' && laporan.userId !== idUser) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin untuk membatalkan laporan ini' });
    }
    
    // Hanya bisa cancel jika status masih pending
    if (laporan.status !== 'pending') {
      return res.status(400).json({ 
        error: `Laporan tidak bisa dibatalkan karena status sudah ${laporan.status}. Hanya laporan dengan status "pending" yang bisa dibatalkan.` 
      });
    }
    
    // Update status ke cancelled
    await prisma.report.update({
      where: { id: parseInt(id) },
      data: {
        status: 'cancelled',
        cancellationReason: reason || 'Dibatalkan oleh pengguna'
      }
    });
    
    // Catat ke blockchain
    const hashMeta = ethers.id(`${id}-cancelled-${reason || ''}`).substring(0, 10);
    const hashTransaksi = await logReportToBlockchain(id, 'cancelled', hashMeta);
    
    // Tambahkan ke riwayat
    await prisma.reportStatusHistory.create({
      data: {
        reportId: parseInt(id),
        status: 'cancelled',
        notes: reason || 'Laporan dibatalkan oleh pengguna',
        updatedBy: idUser,
        blockchainTxHash: hashTransaksi
      }
    });
    
    const laporanTerupdate = await prisma.report.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            rtRw: true
          }
        }
      }
    });
    
    const reportData = {
      id: laporanTerupdate.id,
      user_id: laporanTerupdate.userId,
      title: laporanTerupdate.title,
      description: laporanTerupdate.description,
      category: laporanTerupdate.category,
      urgency: laporanTerupdate.urgency,
      status: laporanTerupdate.status,
      location: laporanTerupdate.location,
      blockchain_tx_hash: laporanTerupdate.blockchainTxHash,
      ai_summary: laporanTerupdate.aiSummary,
      cancellation_reason: laporanTerupdate.cancellationReason,
      created_at: laporanTerupdate.createdAt,
      updated_at: laporanTerupdate.updatedAt,
      user_name: laporanTerupdate.user?.name,
      user_email: laporanTerupdate.user?.email,
      rt_rw: laporanTerupdate.user?.rtRw
    };
    
    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('report:updated', reportData);
      io.to(`report:${parseInt(id)}`).emit('report:updated', reportData);
    }
    
    res.json({ 
      success: true, 
      report: reportData,
      message: 'Laporan berhasil dibatalkan. Status perubahan telah dicatat di blockchain untuk transparansi.'
    });
  } catch (error) {
    console.error('Error cancelling report:', error);
    res.status(400).json({ error: error.message });
  }
});

// Ambil blockchain logs untuk laporan tertentu (HANYA ADMIN SISTEM)
router.get('/:id/blockchain-logs', authenticate, requirePermission(PERMISSIONS.BLOCKCHAIN_VIEW_LOGS), async (req, res) => {
  try {
    const { id } = req.params;
    const reportId = parseInt(id);
    
    console.log(`[API] Admin ${req.user.userId} fetching blockchain logs for reportId: ${reportId}`);
    
    // Cek apakah laporan memiliki blockchain_tx_hash (ada transaksi blockchain)
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { blockchainTxHash: true }
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Cek apakah blockchain service tersedia
    const { canUseBlockchain } = require('../services/blockchainService');
    const blockchainAvailable = canUseBlockchain();
    
    if (!blockchainAvailable) {
      return res.json({
        reportId: reportId,
        logs: [],
        total: 0,
        hasBlockchainTx: !!report.blockchainTxHash,
        blockchainTxHash: report.blockchainTxHash,
        error: 'Blockchain service not configured. Please set BLOCKCHAIN_RPC_URL, PRIVATE_KEY, and CONTRACT_ADDRESS in environment variables.',
        blockchainConfigured: false,
      });
    }
    
    const logs = await getReportBlockchainLogs(reportId);
    
    console.log(`[API] Found ${logs.length} blockchain logs for reportId: ${reportId}`);
    
    res.json({
      reportId: reportId,
      logs: logs,
      total: logs.length,
      hasBlockchainTx: !!report.blockchainTxHash,
      blockchainTxHash: report.blockchainTxHash,
      blockchainConfigured: true,
    });
  } catch (error) {
    console.error('[API] Error fetching blockchain logs:', error);
    res.status(400).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Ambil semua blockchain logs (untuk admin)
router.get('/blockchain/all-logs', authenticate, requirePermission(PERMISSIONS.BLOCKCHAIN_VIEW_ALL_LOGS), async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logs = await getAllBlockchainLogs(parseInt(limit));
    
    res.json({
      reportEvents: logs.reportEvents,
      bantuanEvents: logs.bantuanEvents,
      totalReports: logs.reportEvents.length,
      totalBantuan: logs.bantuanEvents.length,
    });
  } catch (error) {
    console.error('Error fetching all blockchain logs:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
