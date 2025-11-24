const express = require('express');
const prisma = require('../database/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../utils/permissions');
const { processReport } = require('../services/aiService');
const { logReportToBlockchain, getReportBlockchainLogs, getAllBlockchainLogs } = require('../services/blockchainService');
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
    const { title, description, location, imageUrl, latitude, longitude } = req.body;
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
          const validation = validateLocationForRT(parseFloat(latitude), parseFloat(longitude), rtRwUser);
          locationMismatch = validation.mismatch || false;
          locationDistance = validation.distance || null;
          
          if (locationMismatch) {
            locationWarning = `Lokasi laporan berada di luar boundary RT/RW Anda (${locationDistance}m dari pusat RT/RW). Pastikan lokasi benar atau hubungi Admin RT/RW jika ini adalah lokasi yang benar.`;
            console.log(`[Report] ⚠️ Location mismatch for report: ${locationDistance}m dari center RT/RW`);
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
    
    // Simpan laporan dengan hasil AI
    const reportDataToSave = {
        userId: idUser,
        title,
        description,
        location: finalLocation,
        imageUrl: imageUrl || null, // Simpan base64 atau URL gambar
        category: hasilAI.category,
        urgency: hasilAI.urgency,
        aiSummary: hasilAI.summary,
        status: 'pending'
    };
    
    const laporan = await prisma.report.create({
      data: reportDataToSave
    });
    
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
      // Location warning (not saved to DB, just for frontend feedback)
      locationWarning, // Warning message untuk frontend
      locationMismatch: locationMismatch || false, // Apakah lokasi di luar boundary
      locationDistance: locationDistance || null, // Jarak dari center RT/RW (meter)
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
    const [daftarLaporan, totalLaporan] = await Promise.all([
      prisma.report.findMany({
        where: kondisiWhere,
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
        take: limit ? parseInt(limit) : undefined,
        skip: offset ? parseInt(offset) : undefined
      }),
      prisma.report.count({ where: kondisiWhere })
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
      created_at: laporan.createdAt,
      updated_at: laporan.updatedAt,
      user_name: laporan.user.name,
      user_email: laporan.user.email
    }));
    
    res.json({
      data,
      total: totalLaporan,
      page: offset ? Math.floor(parseInt(offset) / parseInt(limit || 10)) + 1 : 1,
      limit: parseInt(limit || 10),
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(400).json({ error: error.message });
  }
});

// Statistik analitik (admin/pengurus)
// GET /api/reports/map - Data laporan untuk peta (dengan lat/lng)
router.get('/map', authenticate, async (req, res) => {
  try {
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    const { rtFilter } = req.query; // Filter RT untuk Admin RW
    
    // Get user untuk filter RT/RW
    const user = await prisma.user.findUnique({
      where: { id: idUser },
      select: { rtRw: true }
      // Note: RT/RW boundary fields tidak ada di schema saat ini
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
    } else if (roleUser === 'admin_rw') {
      // Admin RW: bisa filter per RT atau lihat semua RT dalam RW mereka
      if (rtFilter && user?.rtRw) {
        // Filter per RT tertentu
        const rwPart = user.rtRw.split('/')[1]; // Ambil bagian RW
        whereClause = {
          user: {
            rtRw: `${rtFilter}/${rwPart}`
          }
        };
      } else if (user?.rtRw) {
        // Lihat semua RT dalam RW mereka
        const rwPart = user.rtRw.split('/')[1];
        whereClause = {
          user: {
            rtRw: {
              contains: `/${rwPart}`
            }
          }
        };
      }
    } else if (['ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'].includes(roleUser)) {
      // Ketua RT/Sekretaris RT: hanya lihat RT/RW mereka (tidak ada filter)
      whereClause = {
        user: {
          rtRw: user?.rtRw || null
        }
      };
    }
    // admin_sistem lihat semua (whereClause tetap {})
    
    // Get reports (simplified - no geolocation fields in schema)
    const reports = await prisma.report.findMany({
      where: {
        ...whereClause
        // Note: latitude/longitude fields tidak ada di schema, filter dihapus
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
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
    
    // Format data untuk map dengan forward geocoding untuk mendapatkan koordinat
    const mapDataPromises = reports.map(async (report) => {
      let lat = null;
      let lng = null;
      let geocodeConfidence = null;
      
      // Jika ada location, lakukan forward geocoding untuk mendapatkan koordinat
      if (report.location) {
        // Filter alamat yang terlalu singkat atau generic (dilonggarkan)
        const locationLower = report.location.toLowerCase().trim();
        const genericKeywords = ['alamat', 'lokasi', 'tempat', 'tidak disebutkan', 'unknown', '[alamat]', '[lokasi]'];
        const isGeneric = genericKeywords.some(keyword => locationLower === keyword || locationLower.startsWith(keyword + ' '));
        
        // Skip geocoding hanya untuk alamat yang benar-benar generic atau terlalu singkat (< 3 karakter)
        if (isGeneric || report.location.trim().length < 3) {
          console.log(`[Map] Skipping geocoding for report ${report.id}: location too generic or short - "${report.location}"`);
        } else {
          try {
            // Tambahkan konteks RT/RW dan "Jakarta, Indonesia" untuk meningkatkan akurasi
            let enhancedLocation = report.location;
            if (report.user.rtRw) {
              enhancedLocation = `${report.location}, ${report.user.rtRw}, Jakarta, Indonesia`;
            } else {
              enhancedLocation = `${report.location}, Jakarta, Indonesia`;
            }
            
            const geocodeResult = await forwardGeocode(enhancedLocation);
            if (geocodeResult) {
              // Terima semua confidence level untuk lebih banyak marker
              // ROOFTOP = paling akurat, RANGE_INTERPOLATED = cukup akurat
              // GEOMETRIC_CENTER dan APPROXIMATE = kurang akurat tapi tetap ditampilkan dengan warning
              lat = geocodeResult.lat;
              lng = geocodeResult.lng;
              geocodeConfidence = geocodeResult.confidence;
              console.log(`[Map] ✅ Geocoded report ${report.id}: "${report.location}" -> (${lat}, ${lng}) [${geocodeResult.confidence}]`);
            } else {
              console.log(`[Map] ❌ No geocoding result for report ${report.id}: "${report.location}"`);
            }
          } catch (error) {
            console.warn(`[Map] Failed to geocode location for report ${report.id}:`, report.location, error.message);
            // Continue tanpa koordinat jika geocoding gagal
          }
        }
      }
      
      // Validasi jarak terhadap RT/RW boundary (jika ada)
      let locationMismatch = false;
      let locationDistance = null;
      
      if (lat && lng && report.user.rtRw) {
        try {
          // Get RT/RW boundary data (ambil dari user pertama yang punya RT/RW yang sama)
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
        lat: lat,
        lng: lng,
        geocodeConfidence: geocodeConfidence, // Untuk debugging
        category: report.category,
        urgency: report.urgency,
        status: report.status,
        createdAt: report.createdAt,
        userName: report.user.name,
        rtRw: report.user.rtRw,
        locationMismatch: locationMismatch,
        locationDistance: locationDistance
      };
    });
    
    // Wait for all geocoding to complete
    const mapData = await Promise.all(mapDataPromises);
    
    // Filter hanya reports yang punya koordinat untuk ditampilkan di map
    const reportsWithCoords = mapData.filter(r => r.lat && r.lng);
    
    // Get RT/RW boundary jika ada (untuk user yang sedang login)
    let rtRwBoundary = null;
    if (user?.rtRw) {
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
        rtRwBoundary = {
          center: {
            lat: rtRwUser.rtRwLatitude,
            lng: rtRwUser.rtRwLongitude
          },
          radius: rtRwUser.rtRwRadius || null,
          polygon: rtRwUser.rtRwPolygon || null
        };
      }
    }
    
    res.json({
      reports: mapData, // Return semua data (termasuk yang tidak punya koordinat untuk info)
      reportsWithCoords: reportsWithCoords, // Hanya yang punya koordinat untuk marker
      rtRwBoundary,
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
    const { latitude, longitude, radius, polygon } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude dan longitude diperlukan' });
    }
    
    // Validasi radius jika diberikan
    if (radius && (isNaN(radius) || radius < 100 || radius > 10000)) {
      return res.status(400).json({ error: 'Radius harus antara 100-10000 meter' });
    }
    
    // Update user dengan RT/RW boundary
    await prisma.user.update({
      where: { id: idUser },
      data: {
        rtRwLatitude: parseFloat(latitude),
        rtRwLongitude: parseFloat(longitude),
        rtRwRadius: radius ? parseInt(radius) : null,
        rtRwPolygon: polygon || null
      }
    });
    
    res.json({ 
      success: true,
      message: 'Lokasi RT/RW berhasil di-set',
      boundary: {
        center: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
        radius: radius ? parseInt(radius) : null,
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

// GET /api/reports/stats/rw-list - Daftar RW (untuk Super Admin)
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
    
    res.json({
      rwList: uniqueRWs.map(rw => ({
        rw: rw,
        label: rw
      }))
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
    
    // Get all unique RT/RW yang memiliki RW yang sama
    const rtList = await prisma.user.findMany({
      where: {
        rtRw: {
          contains: `/${rwPart}`,
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
    
    console.log(`[RT List] Role: ${roleUser}, RW Part: ${rwPart}, Found ${rtList.length} RT/RW entries`);
    
    // Extract RT numbers and format
    const uniqueRTs = [...new Set(rtList.map(u => {
      const parts = u.rtRw?.split('/');
      return parts?.[0] || null;
    }).filter(Boolean))].sort((a, b) => {
      // Sort RT numbers naturally (RT001, RT002, etc)
      const numA = parseInt(a.replace('RT', '')) || 0;
      const numB = parseInt(b.replace('RT', '')) || 0;
      return numA - numB;
    });
    
    console.log(`[RT List] Unique RTs:`, uniqueRTs);
    
    const result = {
      rtList: uniqueRTs.map(rt => ({
        rt: rt,
        rtRw: `${rt}/${rwPart}`,
        label: `${rt}/${rwPart}`
      })),
      rw: rwPart
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
    
    // Jendela waktu dinamis berdasarkan periode
    let querySeriWaktu;
    if (period === 'day') {
      querySeriWaktu = prisma.$queryRaw`
        SELECT
          to_char(date_trunc('day', created_at), 'DD Mon YYYY') as label,
          date_trunc('day', created_at) as date_key,
          COUNT(*)::int as count
        FROM reports
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at) ASC
      `;
    } else if (period === 'week') {
      querySeriWaktu = prisma.$queryRaw`
        SELECT
          to_char(date_trunc('week', created_at), 'WW/YYYY') as label,
          date_trunc('week', created_at) as date_key,
          COUNT(*)::int as count
        FROM reports
        WHERE created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY date_trunc('week', created_at)
        ORDER BY date_trunc('week', created_at) ASC
      `;
    } else { // month
      querySeriWaktu = prisma.$queryRaw`
        SELECT
          to_char(date_trunc('month', created_at), 'Mon YYYY') as label,
          date_trunc('month', created_at) as date_key,
          COUNT(*)::int as count
        FROM reports
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at) ASC
      `;
    }

    const dataSeriWaktuMentah = await querySeriWaktu;
    const seriWaktu = dataSeriWaktuMentah.map(baris => ({
      label: baris.label,
      date_key: baris.date_key,
      count: Number(baris.count)
    }));

    const dataStatusMentah = await prisma.$queryRaw`
      SELECT status, COUNT(*)::int as count
      FROM reports
      GROUP BY status
    `;
    const berdasarkanStatus = dataStatusMentah.map(baris => ({
      status: baris.status,
      count: Number(baris.count)
    }));

    const dataKategoriMentah = await prisma.$queryRaw`
      SELECT COALESCE(category, 'unknown') as category, COUNT(*)::int as count
      FROM reports
      GROUP BY COALESCE(category, 'unknown')
    `;
    const berdasarkanKategori = dataKategoriMentah.map(baris => ({
      category: baris.category,
      count: Number(baris.count)
    }));

    const dataUrgensiMentah = await prisma.$queryRaw`
      SELECT COALESCE(urgency, 'unknown') as urgency, COUNT(*)::int as count
      FROM reports
      GROUP BY COALESCE(urgency, 'unknown')
    `;
    const berdasarkanUrgensi = dataUrgensiMentah.map(baris => ({
      urgency: baris.urgency,
      count: Number(baris.count)
    }));

    const dataTotalMentah = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int as total_reports,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END)::int as resolved_reports,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)::int as in_progress_reports,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)::int as pending_reports,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)::int as cancelled_reports
      FROM reports
    `;
    const total = dataTotalMentah[0] ? {
      total_reports: Number(dataTotalMentah[0].total_reports),
      resolved_reports: Number(dataTotalMentah[0].resolved_reports),
      in_progress_reports: Number(dataTotalMentah[0].in_progress_reports),
      pending_reports: Number(dataTotalMentah[0].pending_reports),
      cancelled_reports: Number(dataTotalMentah[0].cancelled_reports)
    } : {
      total_reports: 0,
      resolved_reports: 0,
      in_progress_reports: 0,
      pending_reports: 0,
      cancelled_reports: 0
    };

    res.json({
      timeSeries: seriWaktu,
      byStatus: berdasarkanStatus,
      byCategory: berdasarkanKategori,
      byUrgency: berdasarkanUrgensi,
      totals: total,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
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
