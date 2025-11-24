const express = require('express');
const router = express.Router();
require('dotenv').config();
const { detectIntent, detectIntentWithAI, redactPII } = require('./nlp.routes');
const { authenticate } = require('../middleware/auth');
const prisma = require('../database/prisma');
const { processReport } = require('../services/aiService');
const { logReportToBlockchain } = require('../services/blockchainService');
const { forwardGeocode } = require('../services/geocodingService');
// Note: validateLocationForRT dihapus karena field RT/RW boundary tidak ada di schema saat ini
const { ethers } = require('ethers');

// Simpan draft laporan yang sudah dirangkum AI agar bisa dikonfirmasi dulu
const daftarDraftLaporan = new Map(); // key: userId, value: { reportData, expiresAt }
const WAKTU_KADALUARSA_DRAFT_MS = 10 * 60 * 1000; // 10 menit

function ambilDraftTertunda(idUser) {
  const draft = daftarDraftLaporan.get(idUser);
  if (!draft) return null;
  if (Date.now() > draft.expiresAt) {
    daftarDraftLaporan.delete(idUser);
    return null;
  }
  return draft;
}

function simpanDraftTertunda(idUser, dataLaporan) {
  daftarDraftLaporan.set(idUser, {
    reportData: dataLaporan,
    expiresAt: Date.now() + WAKTU_KADALUARSA_DRAFT_MS,
  });
}

// Gemini dan OpenAI di-skip, pakai Groq saja (GRATIS)

// Groq API (GRATIS & CEPAT - Recommended for free tier)
let groq = null;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
try {
  if (GROQ_API_KEY && GROQ_API_KEY.trim() !== '') {
    const Groq = require('groq-sdk');
    groq = new Groq({ apiKey: GROQ_API_KEY.trim() });
    console.log('✅ Groq AI (FREE) initialized successfully');
  } else {
    console.warn('⚠️  GROQ_API_KEY not set - Get free API key at https://console.groq.com');
  }
} catch (err) {
  console.error('❌ Groq initialization error:', err.message);
  groq = null;
}

// OpenAI di-skip, pakai Groq saja (GRATIS)

// FAQ statis dihapus - semua pertanyaan akan di-handle oleh AI dengan konteks lengkap

async function buatLaporanDenganAI(dataLaporan, idUser, roleUser = null) {
  // VALIDASI: Hanya role "warga" yang bisa membuat laporan
  if (roleUser && roleUser !== 'warga') {
    throw new Error('Akses ditolak. Hanya warga yang dapat membuat laporan. Role Anda: ' + roleUser);
  }
  
  const teksLengkap = `${dataLaporan.title}. ${dataLaporan.description}`;
  const hasilAI = await processReport(teksLengkap);

  const laporanDibuat = await prisma.report.create({
    data: {
      userId: idUser,
      title: dataLaporan.title,
      description: dataLaporan.description,
      location: dataLaporan.location,
      imageUrl: dataLaporan.imageUrl || null, // Support image dari chatbot
      category: dataLaporan.category || hasilAI.category,
      urgency: dataLaporan.urgency || hasilAI.urgency,
      aiSummary: hasilAI.summary,
      status: 'pending'
    }
  });

  await prisma.aiProcessingLog.create({
    data: {
      reportId: laporanDibuat.id,
      originalText: teksLengkap,
      aiSummary: hasilAI.summary,
      aiCategory: dataLaporan.category || hasilAI.category,
      aiUrgency: dataLaporan.urgency || hasilAI.urgency,
      processingTimeMs: hasilAI.processingTime || 0
    }
  });

  await prisma.reportStatusHistory.create({
    data: {
      reportId: laporanDibuat.id,
      status: 'pending',
      updatedBy: idUser
    }
  });

  const hashMeta = ethers.id(teksLengkap).substring(0, 10);
  
  // Log ke blockchain dengan data laporan untuk enkripsi
  const reportDataForBlockchain = {
    title: laporanDibuat.title,
    description: laporanDibuat.description,
    location: laporanDibuat.location,
  };
  
  console.log('🔗 Attempting to log report to blockchain:', {
    reportId: laporanDibuat.id,
    status: 'pending',
    hashMeta: hashMeta
  });
  
  const hashTransaksi = await logReportToBlockchain(
    laporanDibuat.id, 
    'pending', 
    hashMeta,
    reportDataForBlockchain // Pass reportDataForBlockchain untuk enkripsi (konsisten dengan reports.routes.js)
  );

  if (hashTransaksi) {
    console.log('✅ Blockchain transaction successful:', hashTransaksi);
    // PERBAIKAN: Validasi hash sebelum save
    if (hashTransaksi && hashTransaksi.length === 66 && hashTransaksi.startsWith('0x')) {
    await prisma.report.update({
      where: { id: laporanDibuat.id },
      data: { blockchainTxHash: hashTransaksi }
    });
    laporanDibuat.blockchain_tx_hash = hashTransaksi;
      console.log('✅ Blockchain hash saved to database:', hashTransaksi);
    } else {
      console.error('❌ Invalid blockchain hash format, not saving to database:', hashTransaksi);
    }
  } else {
    console.warn('⚠️  Blockchain transaction failed or blockchain not configured for report:', laporanDibuat.id);
    console.warn('⚠️  Report created successfully but NOT logged to blockchain. Check blockchain configuration.');
    // PERBAIKAN: Coba retry sekali lagi setelah delay
    console.log('🔄 Attempting retry for blockchain logging...');
    setTimeout(async () => {
      const retryHash = await logReportToBlockchain(
        laporanDibuat.id, 
        'pending', 
        hashMeta,
        reportDataForBlockchain
      );
      if (retryHash && retryHash.length === 66 && retryHash.startsWith('0x')) {
        await prisma.report.update({
          where: { id: laporanDibuat.id },
          data: { blockchainTxHash: retryHash }
        });
        console.log('✅ Blockchain hash saved after retry:', retryHash);
      }
    }, 5000); // Retry setelah 5 detik
  }

  if (typeof global !== 'undefined' && global.eventEmitter) {
    global.eventEmitter.emit('report-created', { reportId: laporanDibuat.id });
  }

  // Transform ke format yang diharapkan
  const laporanTerformat = {
    id: laporanDibuat.id,
    user_id: laporanDibuat.userId,
    title: laporanDibuat.title,
    description: laporanDibuat.description,
    category: laporanDibuat.category,
    urgency: laporanDibuat.urgency,
    status: laporanDibuat.status,
    location: laporanDibuat.location,
    blockchain_tx_hash: hashTransaksi || laporanDibuat.blockchainTxHash,
    ai_summary: laporanDibuat.aiSummary,
    cancellation_reason: laporanDibuat.cancellationReason,
    created_at: laporanDibuat.createdAt,
    updated_at: laporanDibuat.updatedAt
  };

  return { createdReport: laporanTerformat, txHash: hashTransaksi };
}

// Helper function untuk mengambil statistik laporan berdasarkan role
async function ambilStatistikLaporanUntukUser(idUser, roleUser, rtRw) {
  try {
    // TRANSPARANSI: Semua role (termasuk warga) melihat statistik semua laporan
    const kondisiWhere = {};
    
    // Filter RT/RW hanya untuk role RT/RW (bukan admin)
    if (rtRw && roleUser !== 'admin' && ['ketua_rt', 'sekretaris_rt', 'sekretaris', 'admin_rw'].includes(roleUser)) {
      kondisiWhere.location = { contains: rtRw, mode: 'insensitive' };
    }
    // Warga dan admin melihat semua laporan tanpa filter RT/RW
    
    const [total, pending, sedangDiproses, selesai] = await Promise.all([
      prisma.report.count({ where: kondisiWhere }),
      prisma.report.count({ where: { ...kondisiWhere, status: 'pending' } }),
      prisma.report.count({ where: { ...kondisiWhere, status: 'in_progress' } }),
      prisma.report.count({ where: { ...kondisiWhere, status: 'resolved' } })
    ]);
    
    return {
      total,
      pending,
      in_progress: sedangDiproses,
      resolved: selesai
    };
  } catch (error) {
    console.error('Error fetching report stats:', error);
    return null;
  }
}

// Helper function untuk mengambil statistik warga (untuk role admin/pengurus)
async function ambilStatistikWarga(period = 'month') {
  try {
    const totalWarga = await prisma.user.count({
      where: { role: 'warga' }
    });
    
    // Data pertumbuhan berdasarkan periode
    let queryPertumbuhan;
    if (period === 'day') {
      queryPertumbuhan = prisma.$queryRaw`
        SELECT
          to_char(date_trunc('day', created_at), 'DD Mon YYYY') as label,
          date_trunc('day', created_at) as date_key,
          COUNT(*)::int as count
        FROM users
        WHERE role = 'warga' AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at) ASC
      `;
    } else if (period === 'week') {
      queryPertumbuhan = prisma.$queryRaw`
        SELECT
          to_char(date_trunc('week', created_at), 'WW/YYYY') as label,
          date_trunc('week', created_at) as date_key,
          COUNT(*)::int as count
        FROM users
        WHERE role = 'warga' AND created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY date_trunc('week', created_at)
        ORDER BY date_trunc('week', created_at) ASC
      `;
    } else { // month
      queryPertumbuhan = prisma.$queryRaw`
        SELECT
          to_char(date_trunc('month', created_at), 'Mon YYYY') as label,
          date_trunc('month', created_at) as date_key,
          COUNT(*)::int as count
        FROM users
        WHERE role = 'warga' AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at) ASC
      `;
    }
    
    const dataPertumbuhanMentah = await queryPertumbuhan;
    const dataPertumbuhan = dataPertumbuhanMentah.map(baris => ({
      label: baris.label,
      date_key: baris.date_key,
      count: Number(baris.count)
    }));
    
    // Cari periode dengan pertumbuhan terbanyak
    const pertumbuhanTerbanyak = dataPertumbuhan.reduce((max, item) => 
      item.count > max.count ? item : max, 
      { label: 'Tidak ada data', count: 0 }
    );
    
    // Data jenis kelamin
    const dataJenisKelaminMentah = await prisma.$queryRaw`
      SELECT COALESCE(jenis_kelamin, 'tidak_disediakan') AS jenis_kelamin, COUNT(*)::int AS count
      FROM users
      WHERE role = 'warga'
      GROUP BY COALESCE(jenis_kelamin, 'tidak_disediakan')
    `;
    const dataJenisKelamin = dataJenisKelaminMentah.map(baris => ({
      jenis_kelamin: baris.jenis_kelamin,
      count: Number(baris.count)
    }));
    
    const jumlahLaki = dataJenisKelamin.find(baris => baris.jenis_kelamin === 'laki_laki')?.count || 0;
    const jumlahPerempuan = dataJenisKelamin.find(baris => baris.jenis_kelamin === 'perempuan')?.count || 0;
    
    return {
      total_warga: totalWarga,
      by_gender: dataJenisKelamin,
      persentase: {
        laki_laki: totalWarga ? Math.round((jumlahLaki / totalWarga) * 100) : 0,
        perempuan: totalWarga ? Math.round((jumlahPerempuan / totalWarga) * 100) : 0
      },
      growth: dataPertumbuhan,
      pertumbuhan_terbanyak: pertumbuhanTerbanyak
    };
  } catch (error) {
    console.error('Error fetching warga stats:', error);
    return null;
  }
}

router.post('/', authenticate, async (req, res) => {
  const waktuMulai = Date.now();
  let intentTerdeteksi = null;
  let modelAIDigunakan = 'groq';
  let idLogPercakapan = null;
  
  try {
    // Ambil info user dari database
    const idUser = req.user.userId;
    const roleUser = req.user.role;
    const user = await prisma.user.findUnique({
      where: { id: idUser },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        rtRw: true
      }
    });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Transform ke format yang diharapkan
    const userTerformat = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      rt_rw: user.rtRw
    };
    
    // Ambil statistik laporan untuk konteks AI
    const statistikLaporan = await ambilStatistikLaporanUntukUser(idUser, roleUser, userTerformat.rt_rw);
    
    // Ambil statistik warga untuk role admin/pengurus (untuk menjawab pertanyaan tentang data warga)
    let statistikWarga = null;
    if (['admin', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'].includes(roleUser)) {
      statistikWarga = await ambilStatistikWarga('month');
    }

    let { messages = [] } = req.body || {};
    if (!Array.isArray(messages)) {
      messages = [];
    }
    // Process messages - keep imageUrl for user messages
    messages = messages
      .filter((m) => m && (typeof m.content === 'string' || m.imageUrl))
      .map((m) => ({
        role: m.role === 'user' || m.role === 'assistant' ? m.role : 'user',
        content: String(m.content || '').slice(0, 4000),
        imageUrl: m.imageUrl || m.image_url || null, // Preserve imageUrl
      }))
      .slice(-12); // limit context

    // Kustomisasi system prompt per role dengan data real-time
    let konteksRole = '';
    let konteksData = '';
    
    if (roleUser === 'warga') {
      konteksRole = `Kamu sedang membantu warga bernama ${userTerformat.name} (RT/RW: ${userTerformat.rt_rw || 'belum diatur'}). 
- Fokus pada cara membuat laporan, cek status laporan, dan FAQ umum.
- Jawab dengan ramah dan membantu dalam Bahasa Indonesia.`;
      
      if (statistikLaporan) {
        konteksData = `**Data Laporan User:**
- Total laporan: ${statistikLaporan.total}
- Menunggu (pending): ${statistikLaporan.pending}
- Sedang diproses (in_progress): ${statistikLaporan.in_progress}
- Selesai (resolved): ${statistikLaporan.resolved}

Gunakan data ini untuk menjawab pertanyaan tentang jumlah laporan, status, atau progres.`;
      }
    } else if (['admin', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'].includes(roleUser)) {
      const namaRole = roleUser === 'admin' ? 'Admin Sistem' : roleUser === 'admin_rw' ? 'Admin RW' : roleUser === 'ketua_rt' ? 'Ketua RT' : roleUser === 'sekretaris_rt' ? 'Sekretaris RT' : roleUser === 'sekretaris' ? 'Sekretaris' : 'Pengurus';
      konteksRole = `Kamu sedang membantu ${namaRole} bernama ${userTerformat.name} (RT/RW: ${userTerformat.rt_rw || 'semua wilayah'}).

**PENTING - BACA INI DENGAN TELITI:**
- ${namaRole} TIDAK BISA membuat laporan. Hanya warga yang bisa membuat laporan.
- Jika user bertanya "bisa buat laporan ga" atau "bisa membuat laporan", jawab: "Maaf, sebagai ${namaRole}, Anda tidak dapat membuat laporan. Hanya warga yang dapat membuat laporan. Sebagai ${namaRole}, Anda dapat mengelola dan menindaklanjuti laporan yang sudah dibuat oleh warga."
- JANGAN pernah menawarkan untuk membuat laporan atau memberikan opsi membuat laporan.
- Fokus pada manajemen laporan, statistik, penugasan, dan update status.
- Bantu dengan informasi tentang antrian laporan, distribusi status, dan cara menindaklanjuti laporan.
- Jawab SEMUA pertanyaan tentang data, statistik, jumlah laporan dengan JAWABAN SPESIFIK menggunakan data real-time yang tersedia.
- Jangan memberikan jawaban generik jika user bertanya tentang statistik spesifik.`;
      
      if (statistikLaporan) {
        let konteksDataWarga = '';
        if (statistikWarga) {
          const pertumbuhanTerbanyak = statistikWarga.pertumbuhan_terbanyak?.label || 'Tidak ada data';
          const countPertumbuhan = statistikWarga.pertumbuhan_terbanyak?.count || 0;
          const totalWarga = statistikWarga.total_warga || 0;
          const jumlahLaki = statistikWarga.by_gender?.find(g => g.jenis_kelamin === 'laki_laki')?.count || 0;
          const jumlahPerempuan = statistikWarga.by_gender?.find(g => g.jenis_kelamin === 'perempuan')?.count || 0;
          const persenLaki = statistikWarga.persentase?.laki_laki || 0;
          const persenPerempuan = statistikWarga.persentase?.perempuan || 0;
          
          konteksDataWarga = `\n\n**Data Warga Real-time:**
- Total warga: ${totalWarga}
- Laki-laki: ${jumlahLaki} (${persenLaki}%)
- Perempuan: ${jumlahPerempuan} (${persenPerempuan}%)
- Pertumbuhan terbanyak: ${pertumbuhanTerbanyak} dengan ${countPertumbuhan} warga baru
- Data pertumbuhan bulanan: ${statistikWarga.growth?.map(g => `${g.label} (${g.count} warga)`).join(', ') || 'Tidak ada data'}`;
        }
        
        konteksData = `**Data Laporan Real-time (${userTerformat.rt_rw || 'Semua Wilayah'}):**
- Total laporan: ${statistikLaporan.total}
- Menunggu (pending/antrian): ${statistikLaporan.pending}
- Sedang diproses (in_progress): ${statistikLaporan.in_progress}
- Selesai (resolved): ${statistikLaporan.resolved}${konteksDataWarga}

**PENTING:** Jika user bertanya:
- "Antrian sisa berapa?" atau "Berapa laporan pending?" → Jawab: "Saat ini ada ${statistikLaporan.pending} laporan yang masih menunggu (pending)."
- "Laporan ada berapa totalnya?" → Jawab: "Total ada ${statistikLaporan.total} laporan. Rinciannya: ${statistikLaporan.pending} menunggu, ${statistikLaporan.in_progress} sedang diproses, ${statistikLaporan.resolved} sudah selesai."
- "Total ada berapa warga?" atau "Berapa total warga?" atau "total warga" → Jawab: "Total ada ${statistikWarga?.total_warga || 0} warga terdaftar."
- "Pertumbuhan warga terbanyak di tanggal/bulan/tahun berapa?" atau "kapan pertumbuhan warga terbanyak?" → Jawab: "Pertumbuhan warga terbanyak terjadi pada ${statistikWarga?.pertumbuhan_terbanyak?.label || 'tidak ada data'} dengan ${statistikWarga?.pertumbuhan_terbanyak?.count || 0} warga baru."
- "Berapa warga laki-laki?" atau "Berapa warga perempuan?" → Jawab: "Laki-laki: ${statistikWarga?.by_gender?.find(g => g.jenis_kelamin === 'laki_laki')?.count || 0} (${statistikWarga?.persentase?.laki_laki || 0}%), Perempuan: ${statistikWarga?.by_gender?.find(g => g.jenis_kelamin === 'perempuan')?.count || 0} (${statistikWarga?.persentase?.perempuan || 0}%)"
- Pertanyaan serupa tentang jumlah/statistik → Gunakan data di atas untuk jawaban SPESIFIK.

JANGAN memberikan jawaban generik seperti "warga dapat membuat laporan" jika user bertanya tentang STATISTIK atau DATA.`;
      }
    } else {
      konteksRole = `Kamu sedang membantu pengguna bernama ${userTerformat.name}.`;
    }

    // System prompt yang lebih singkat dan efektif
    const promptSistem = {
      role: 'system',
      content: `Kamu adalah Asisten LaporIn - AI assistant untuk platform pelaporan RT/RW yang SANGAT PINTAR dan RAMAH.

${konteksRole}

${konteksData}

**USER:** ${userTerformat.name} (${roleUser === 'warga' ? 'Warga' : roleUser === 'admin' ? 'Admin Sistem' : roleUser === 'admin_rw' ? 'Admin RW' : roleUser === 'ketua_rt' ? 'Ketua RT' : roleUser === 'sekretaris_rt' ? 'Sekretaris RT' : roleUser === 'sekretaris' ? 'Sekretaris' : roleUser === 'pengurus' ? 'Pengurus' : roleUser})${userTerformat.rt_rw ? ` di ${userTerformat.rt_rw}` : ''}

**CARA KERJA (PENTING - BACA DENGAN TELITI):**
1. **VALIDASI ROLE PENTING:**
   - Jika user adalah ${roleUser === 'warga' ? 'WARGA' : 'ADMIN/PENGURUS/RT/RW'}, ${roleUser === 'warga' ? 'bisa membantu membuat laporan' : 'TIDAK BISA membuat laporan. Hanya warga yang bisa membuat laporan.'}
   - ${roleUser !== 'warga' ? `Jika user bertanya "bisa buat laporan ga" atau "bisa membuat laporan", jawab: "Maaf, sebagai ${roleUser === 'admin' ? 'Admin Sistem' : roleUser === 'admin_rw' ? 'Admin RW' : roleUser === 'ketua_rt' ? 'Ketua RT' : roleUser === 'sekretaris_rt' ? 'Sekretaris RT' : roleUser === 'sekretaris' ? 'Sekretaris' : 'Pengurus'}, Anda tidak dapat membuat laporan. Hanya warga yang dapat membuat laporan. Sebagai ${roleUser === 'admin' ? 'Admin Sistem' : roleUser === 'admin_rw' ? 'Admin RW' : roleUser === 'ketua_rt' ? 'Ketua RT' : roleUser === 'sekretaris_rt' ? 'Sekretaris RT' : roleUser === 'sekretaris' ? 'Sekretaris' : 'Pengurus'}, Anda dapat mengelola dan menindaklanjuti laporan yang sudah dibuat oleh warga."` : ''}
   - ${roleUser !== 'warga' ? 'JANGAN pernah menawarkan untuk membuat laporan atau memberikan opsi membuat laporan.' : ''}
2. **JANGAN LANGSUNG BUAT KESIMPULAN** - Tanya dulu jika informasi kurang jelas atau ambigu
3. **BERTANYA LEBIH BANYAK** - Jika user sebutkan sesuatu tapi tidak jelas, tanya:
   - "Bisa tolong jelaskan lebih detail?"
   - "Di mana lokasinya?"
   - "Masalahnya seperti apa?"
   - "Kapan terjadi?"
   - "Seberapa parah?"
   - "Apakah ada yang perlu saya ketahui lagi?"
4. **Jawab SINGKAT, JELAS, RAMAH** dalam Bahasa Indonesia (MAKSIMAL 2-3 kalimat)
5. **Gunakan data real-time** untuk statistik (JANGAN generik!)
6. **${roleUser === 'warga' ? 'Jika informasi LENGKAP (masalah + lokasi + request) → Sistem akan OTOMATIS buatkan draft' : 'Fokus pada manajemen laporan, statistik, dan update status laporan yang sudah ada'}**
7. **JANGAN berikan format laporan panjang** seperti "Laporan Pelaporan RT/RW", "Tanggal Laporan", dll
8. **JANGAN bilang "laporan telah dikirimkan"** - sistem yang handle
9. **JANGAN minta user memilih jenis laporan** - sistem otomatis menentukan
10. **JANGAN buat nomor laporan palsu** seperti "#LAPORIN001"
11. **JANGAN tanya login** (user sudah login!)

**CONTOH PERILAKU PINTAR:**
${roleUser === 'warga' ? `- User: "ada masalah" → Kamu: "Baik, bisa tolong jelaskan masalahnya seperti apa? Dan di mana lokasinya?"
- User: "lampu mati" → Kamu: "Baik, di mana lokasi lampu yang mati? (contoh: di blok C, depan rumah, dll)"
- User: "di blok C" → Kamu: "Baik, apa masalahnya di blok C? (contoh: lampu mati, jalan rusak, dll)"
- User: "lampu mati di blok C" → Kamu: "Baik, draft laporan sudah dibuat. Klik tombol di bawah untuk mengirim."` : `- User: "bisa buat laporan ga" → Kamu: "Maaf, sebagai ${roleUser === 'admin' ? 'Admin Sistem' : roleUser === 'admin_rw' ? 'Admin RW' : roleUser === 'ketua_rt' ? 'Ketua RT' : roleUser === 'sekretaris_rt' ? 'Sekretaris RT' : roleUser === 'sekretaris' ? 'Sekretaris' : 'Pengurus'}, Anda tidak dapat membuat laporan. Hanya warga yang dapat membuat laporan. Sebagai ${roleUser === 'admin' ? 'Admin Sistem' : roleUser === 'admin_rw' ? 'Admin RW' : roleUser === 'ketua_rt' ? 'Ketua RT' : roleUser === 'sekretaris_rt' ? 'Sekretaris RT' : roleUser === 'sekretaris' ? 'Sekretaris' : 'Pengurus'}, Anda dapat mengelola dan menindaklanjuti laporan yang sudah dibuat oleh warga."
- User: "mau buat laporan" → Kamu: "Maaf, hanya warga yang dapat membuat laporan. Sebagai ${roleUser === 'admin' ? 'Admin Sistem' : roleUser === 'admin_rw' ? 'Admin RW' : roleUser === 'ketua_rt' ? 'Ketua RT' : roleUser === 'sekretaris_rt' ? 'Sekretaris RT' : roleUser === 'sekretaris' ? 'Sekretaris' : 'Pengurus'}, Anda dapat melihat dan mengelola laporan warga di Dashboard."`}
- "Berapa pending?" → "Ada ${statistikLaporan?.pending || 0} laporan pending."
- "Saya siapa?" → "Anda ${userTerformat.name}, ${roleUser === 'warga' ? 'Warga' : roleUser === 'admin' ? 'Admin Sistem' : roleUser}${userTerformat.rt_rw ? ` di ${userTerformat.rt_rw}` : ''}."

**PENTING:** 
${roleUser !== 'warga' ? '- JANGAN pernah menawarkan untuk membuat laporan. Hanya warga yang bisa membuat laporan.' : '- JANGAN langsung buat kesimpulan dengan satu pertanyaan'}
${roleUser === 'warga' ? '- TANYA DULU jika informasi kurang lengkap atau ambigu' : '- Fokus pada manajemen dan statistik laporan'}
${roleUser === 'warga' ? '- Hanya buat draft laporan jika informasi SUDAH LENGKAP (masalah + lokasi + request)' : '- Jawab pertanyaan tentang statistik dan manajemen laporan dengan data real-time'}`,
    };

    // Coba jawaban FAQ cepat terlebih dahulu / routing intent
    const pesanUserTerakhir = messages[messages.length - 1]?.content || '';
    const lastUserMsg = pesanUserTerakhir; // Alias untuk konsistensi
    const pesanTeredit = redactPII(pesanUserTerakhir);
    
    // Enhanced NLP: Coba AI NLP dulu untuk semantic understanding
    const contextMessages = messages.slice(-3, -1).map(m => m.content).join(' ');
    let intent = null;
    
    try {
      // Coba AI NLP untuk intent detection yang lebih canggih
      const aiIntent = await detectIntentWithAI(pesanUserTerakhir, contextMessages);
      if (aiIntent && aiIntent.confidence > 0.7) {
        intent = aiIntent;
        console.log('🤖 AI NLP Intent:', intent);
      } else {
        // Fallback ke keyword-based
        intent = detectIntent(pesanUserTerakhir);
        console.log('🔍 Keyword-based Intent:', intent);
      }
    } catch (error) {
      console.error('⚠️  AI NLP error, using keyword fallback:', error.message);
      intent = detectIntent(pesanUserTerakhir);
    }
    
    intentTerdeteksi = intent.intent;
    const pesanKecil = pesanUserTerakhir.toLowerCase();

    const polaKonfirmasi = /(setuju|ya kirim|kirim laporan|kirimkan|sudah sesuai|lanjut kirim|oke kirim|ok kirim|oke lanjut|lanjutkan kirim|silakan kirim|tolong.*kirim|kirim.*segera|segera.*kirim|kirim.*tolong|tolong.*segera.*kirim|segera.*kirimkan|kirimkan.*segera)/i;
    const polaBatal = /(batal|jangan kirim|tidak jadi|nanti saja|jangan dulu|hold dulu)/i;
    const polaKirimLangsung = /(langsung.*kirim|kirim.*langsung|otomatis.*kirim|kirim.*otomatis|langsung.*buat|buat.*langsung|langsung.*send|send.*langsung|segera.*kirim|kirim.*segera)/i;
    const draftTertunda = ambilDraftTertunda(idUser);
    
    // Log untuk debugging
    if (draftTertunda) {
      console.log('📋 Draft ditemukan untuk user:', idUser, {
        title: draftTertunda.reportData?.title,
        location: draftTertunda.reportData?.location,
        hasImage: !!draftTertunda.reportData?.imageUrl
      });
    }

    // PENTING: Cek apakah ada draft yang menunggu foto (pendingPhoto)
    const draftPendingPhoto = draftTertunda && draftTertunda.reportData?.pendingPhoto;
    const hasImageInMessage = messages[messages.length - 1]?.imageUrl || messages[messages.length - 1]?.image_url;
    
    // Jika ada draft yang menunggu foto DAN user kirim foto, gabungkan foto dengan draft
    if (draftPendingPhoto && hasImageInMessage) {
      console.log('📷 User mengirim foto untuk draft yang menunggu foto');
      
      const imageUrl = messages[messages.length - 1]?.imageUrl || messages[messages.length - 1]?.image_url;
      const reportDataDenganFoto = {
        ...draftTertunda.reportData,
        imageUrl: imageUrl,
        pendingPhoto: false // Hapus flag pendingPhoto
      };
      
      // Simpan draft dengan foto
      simpanDraftTertunda(idUser, reportDataDenganFoto);
      
      // Catat percakapan
      const waktuRespon = Date.now() - waktuMulai;
      try {
        await prisma.chatbotConversation.create({
          data: {
            userId: idUser,
            userRole: roleUser,
            messages: messages,
            detectedIntent: 'CREATE_REPORT',
            aiModelUsed: 'rule-based',
            responseTimeMs: waktuRespon
          }
        });
      } catch (errorLog) {
        console.error('⚠️  Failed to log conversation:', errorLog.message);
      }
      
      // Kembalikan draft dengan foto untuk konfirmasi
      return res.json({
        reply: `Terima kasih ${userTerformat.name}! 😊 Foto bukti sudah diterima. Saya sudah membuatkan draft laporan lengkap untuk Anda:\n\n` +
          `📝 **${reportDataDenganFoto.title}**\n` +
          `📍 **Lokasi:** ${reportDataDenganFoto.location}\n` +
          `📷 **Foto:** Terlampir\n\n` +
          `Silakan review draft di atas. Jika sudah sesuai, klik tombol **"Kirim Laporan"** di bawah untuk mengirim. Terima kasih! 🙏`,
        reportData: reportDataDenganFoto,
        previewMode: true,
        awaitingConfirmation: true,
      });
    }

    // PENTING: Cek apakah pesan mengandung LAPORAN BARU (masalah + lokasi) SEBELUM cek konfirmasi
    // Jika ada laporan baru di pesan, ini BUKAN konfirmasi untuk draft lama, tapi laporan baru
    // Note: hasImageInMessage sudah dideklarasikan di atas (line 322)
    // Termasuk bansos, bantuan, dll sebagai masalah yang valid
    const hasNewReportInMessage = /(selokan|got|mampet|lampu|jalan|rusak|mati|pohon|runtuh|masalah|terdapat|ada|bansos|sembako|bantuan|belum.*diterima|belum.*dapet|tidak.*diterima|tidak.*dapet|knp.*blm|kenapa.*belum|ingin.*melapor|mau.*lapor|tolong.*lapor|butuh.*lapor|perlu.*lapor)/i.test(pesanUserTerakhir) && 
                                   (/(jalan|jl|blok|nomor|no|di|dekat|depan|cihuy|rt|rw)/i.test(pesanUserTerakhir) || userTerformat.rt_rw);
    
    // Jika ada laporan baru di pesan (masalah + lokasi) ATAU ada gambar, ini adalah LAPORAN BARU, bukan konfirmasi
    const isNewReport = hasNewReportInMessage || hasImageInMessage;
    
    console.log('🔍 Cek konfirmasi vs laporan baru:', {
      pesan: pesanUserTerakhir.substring(0, 100),
      isKonfirmasi: polaKonfirmasi.test(pesanKecil),
      isNewReport,
      hasNewReportInMessage,
      hasImageInMessage,
      draftAda: !!draftTertunda
    });
    
    if (polaKonfirmasi.test(pesanKecil) && !isNewReport && draftTertunda) {
      // HANYA jika ini benar-benar konfirmasi (tidak ada laporan baru di pesan DAN draft sudah ada)
      console.log('✅ Konfirmasi terdeteksi (bukan laporan baru, draft ada):', pesanKecil);
      
      console.log('✅ Mengirim draft laporan (konfirmasi user):', {
        title: draftTertunda.reportData?.title,
        location: draftTertunda.reportData?.location,
        hasImage: !!draftTertunda.reportData?.imageUrl
      });

      try {
        const { createdReport, txHash } = await buatLaporanDenganAI(draftTertunda.reportData, idUser, roleUser);
        daftarDraftLaporan.delete(idUser);

        return res.json({
          reply:
            `✅ **Laporan berhasil dikirim!**\n\n` +
            `📋 **ID Laporan:** #${createdReport.id}\n` +
            `📝 **Judul:** ${createdReport.title}\n` +
            `📍 **Lokasi:** ${createdReport.location}\n` +
            `🏷️ **Kategori:** ${createdReport.category}\n` +
            `⚡ **Urgensi:** ${createdReport.urgency}\n` +
            `📊 **Status:** Pending (menunggu tindak lanjut)\n\n` +
            `${txHash ? `🔐 **Tercatat di Blockchain:**\n` +
            `**Transaction Hash:** \`${txHash}\`\n` +
            `**Status:** ✅ Tersimpan di Polygon Amoy Testnet\n` +
            `**Verifikasi:** [Lihat di Explorer](https://amoy.polygonscan.com/tx/${txHash})\n\n` : 
            `⚠️ **Catatan:** Laporan berhasil dibuat, namun transaksi blockchain sedang diproses. Hash akan muncul setelah transaksi dikonfirmasi.\n\n`}` +
            `Anda bisa melihat detail laporan di Dashboard → Laporan Saya. Terima kasih sudah melakukan konfirmasi draf!`,
          reportCreated: true,
          reportId: createdReport.id,
          report: createdReport,
          blockchainTxHash: txHash || null
        });
      } catch (err) {
        console.error('❌ Error creating report after confirmation:', err.message);
        return res.json({
          reply: 'Maaf, ada kendala saat mengirimkan laporan. Silakan coba lagi atau sebutkan jika ada perubahan pada drafnya.',
        });
      }
    }

    if (polaBatal.test(pesanKecil) && draftTertunda) {
      daftarDraftLaporan.delete(idUser);
      const balasan = 'Baik, draf laporan sebelumnya sudah dibatalkan. Jika ingin membuat draf baru, sebutkan masalah dan lokasinya.';
      // Catat percakapan
      const waktuRespon = Date.now() - waktuMulai;
      try {
        await prisma.chatbotConversation.create({
          data: {
            userId: idUser,
            userRole: roleUser,
            messages: messages,
            detectedIntent: 'CANCEL_DRAFT',
            aiModelUsed: modelAIDigunakan,
            responseTimeMs: waktuRespon
          }
        });
      } catch (errorLog) {
        console.error('⚠️  Failed to log conversation:', errorLog.message);
      }
      return res.json({ reply: balasan });
    }
    
    // Handle pertanyaan statistik/data dengan jawaban langsung (sebelum AI)
    if (intent.intent === 'ASK_STATS' || /(berapa|jumlah|total|antrian|sisa|berapa lagi|ada berapa)/i.test(pesanUserTerakhir)) {
      if (statistikLaporan && ['admin', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'].includes(roleUser)) {
        // Untuk pengurus/admin, jawab dengan data spesifik
        if (/(antrian|sisa|pending|menunggu)/i.test(pesanUserTerakhir)) {
          const balasan = `📊 **Antrian Laporan (Pending):**\n\n` +
            `Saat ini ada **${statistikLaporan.pending}** laporan yang masih menunggu tindak lanjut.\n\n` +
              `**Rincian Lengkap:**\n` +
            `• Total laporan: **${statistikLaporan.total}**\n` +
            `• Menunggu (pending): **${statistikLaporan.pending}**\n` +
            `• Sedang diproses: **${statistikLaporan.in_progress}**\n` +
            `• Selesai: **${statistikLaporan.resolved}**\n\n` +
            `Untuk melihat detail laporan, buka halaman Daftar Laporan atau Dashboard.`;
          
          // Catat percakapan untuk training data
          const waktuRespon = Date.now() - waktuMulai;
          try {
            await prisma.chatbotConversation.create({
              data: {
                userId: idUser,
                userRole: roleUser,
                messages: messages,
                detectedIntent: 'ASK_STATS',
                aiModelUsed: 'rule-based',
                responseTimeMs: waktuRespon
              }
            });
          } catch (errorLog) {
            console.error('⚠️  Failed to log conversation:', errorLog.message);
          }
          
          return res.json({ reply: balasan });
        } else if (/(total|jumlah|semua)/i.test(pesanUserTerakhir) && !/(warga|citizen)/i.test(pesanUserTerakhir)) {
          // Jika tidak menyebutkan "warga", berarti pertanyaan tentang laporan
          const balasan = `📊 **Total Laporan:**\n\n` +
            `Total ada **${statistikLaporan.total}** laporan${userTerformat.rt_rw ? ` di wilayah ${userTerformat.rt_rw}` : ''}.\n\n` +
              `**Distribusi Status:**\n` +
            `• Menunggu (pending): **${statistikLaporan.pending}** laporan\n` +
            `• Sedang diproses (in_progress): **${statistikLaporan.in_progress}** laporan\n` +
            `• Selesai (resolved): **${statistikLaporan.resolved}** laporan\n\n` +
            `Untuk statistik lengkap dengan chart, buka Dashboard → bagian Charts & Analytics.`;
          
          // Catat percakapan untuk training data
          const waktuRespon = Date.now() - waktuMulai;
          try {
            await prisma.chatbotConversation.create({
              data: {
                userId: idUser,
                userRole: roleUser,
                messages: messages,
                detectedIntent: 'ASK_STATS',
                aiModelUsed: 'rule-based',
                responseTimeMs: waktuRespon
              }
            });
          } catch (errorLog) {
            console.error('⚠️  Failed to log conversation:', errorLog.message);
          }
          
          return res.json({ reply: balasan });
        }
      } else if (statistikLaporan && roleUser === 'warga') {
        // Untuk warga, jawab dengan statistik semua laporan (transparansi)
        const balasan = `📋 **Statistik Semua Laporan (Transparansi):**\n\n` +
          `• Total laporan: **${statistikLaporan.total}**\n` +
          `• Menunggu: **${statistikLaporan.pending}**\n` +
          `• Sedang diproses: **${statistikLaporan.in_progress}**\n` +
          `• Selesai: **${statistikLaporan.resolved}**\n\n` +
          `Semua warga dapat melihat semua laporan untuk transparansi. Untuk melihat detail, buka Dashboard → Laporan.`;
        
        // Catat percakapan untuk training data
        const waktuRespon = Date.now() - waktuMulai;
        try {
          await prisma.chatbotConversation.create({
            data: {
              userId: idUser,
              userRole: roleUser,
              messages: messages,
              detectedIntent: 'ASK_STATS',
              aiModelUsed: 'rule-based',
              responseTimeMs: waktuRespon
            }
          });
        } catch (errorLog) {
          console.error('⚠️  Failed to log conversation:', errorLog.message);
        }
        
        return res.json({ reply: balasan });
      }
    }
    
    // Handle pertanyaan tentang statistik warga (untuk role admin/pengurus)
    if (['admin', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'].includes(roleUser) && statistikWarga) {
      const polaTotalWarga = /(total.*warga|warga.*total|berapa.*warga|jumlah.*warga|total.*ada.*berapa.*warga)/i.test(pesanUserTerakhir);
      const polaPertumbuhanWarga = /(pertumbuhan.*warga.*terbanyak|warga.*terbanyak|kapan.*pertumbuhan|pertumbuhan.*terbanyak.*kapan|tanggal.*pertumbuhan|bulan.*pertumbuhan|tahun.*pertumbuhan)/i.test(pesanUserTerakhir);
      const polaJenisKelamin = /(warga.*laki|warga.*perempuan|berapa.*laki|berapa.*perempuan|jumlah.*laki|jumlah.*perempuan)/i.test(pesanUserTerakhir);
      
      if (polaTotalWarga) {
        const balasan = `📊 **Total Warga:**\n\n` +
          `Total ada **${statistikWarga.total_warga}** warga terdaftar${userTerformat.rt_rw ? ` di wilayah ${userTerformat.rt_rw}` : ''}.\n\n` +
          `**Distribusi Jenis Kelamin:**\n` +
          `• Laki-laki: **${statistikWarga.by_gender?.find(g => g.jenis_kelamin === 'laki_laki')?.count || 0}** warga (${statistikWarga.persentase?.laki_laki || 0}%)\n` +
          `• Perempuan: **${statistikWarga.by_gender?.find(g => g.jenis_kelamin === 'perempuan')?.count || 0}** warga (${statistikWarga.persentase?.perempuan || 0}%)\n\n` +
          `Untuk statistik lengkap dengan chart, buka Dashboard → bagian Charts & Analytics.`;
        
        const waktuRespon = Date.now() - waktuMulai;
        try {
          await prisma.chatbotConversation.create({
            data: {
              userId: idUser,
              userRole: roleUser,
              messages: messages,
              detectedIntent: 'ASK_STATS',
              aiModelUsed: 'rule-based',
              responseTimeMs: waktuRespon
            }
          });
        } catch (errorLog) {
          console.error('⚠️  Failed to log conversation:', errorLog.message);
        }
        
        return res.json({ reply: balasan });
      }
      
      if (polaPertumbuhanWarga) {
        const pertumbuhanTerbanyak = statistikWarga.pertumbuhan_terbanyak;
        const balasan = `📈 **Pertumbuhan Warga Terbanyak:**\n\n` +
          `Pertumbuhan warga terbanyak terjadi pada **${pertumbuhanTerbanyak?.label || 'tidak ada data'}** dengan **${pertumbuhanTerbanyak?.count || 0}** warga baru.\n\n` +
          `**Data Pertumbuhan Bulanan (12 bulan terakhir):**\n` +
          `${statistikWarga.growth?.map(g => `• ${g.label}: ${g.count} warga baru`).join('\n') || 'Tidak ada data'}\n\n` +
          `Untuk chart pertumbuhan, buka Dashboard → bagian Charts & Analytics.`;
        
        const waktuRespon = Date.now() - waktuMulai;
        try {
          await prisma.chatbotConversation.create({
            data: {
              userId: idUser,
              userRole: roleUser,
              messages: messages,
              detectedIntent: 'ASK_STATS',
              aiModelUsed: 'rule-based',
              responseTimeMs: waktuRespon
            }
          });
        } catch (errorLog) {
          console.error('⚠️  Failed to log conversation:', errorLog.message);
        }
        
        return res.json({ reply: balasan });
      }
      
      if (polaJenisKelamin) {
        const jumlahLaki = statistikWarga.by_gender?.find(g => g.jenis_kelamin === 'laki_laki')?.count || 0;
        const jumlahPerempuan = statistikWarga.by_gender?.find(g => g.jenis_kelamin === 'perempuan')?.count || 0;
        const balasan = `👥 **Distribusi Warga Berdasarkan Jenis Kelamin:**\n\n` +
          `• Laki-laki: **${jumlahLaki}** warga (${statistikWarga.persentase?.laki_laki || 0}%)\n` +
          `• Perempuan: **${jumlahPerempuan}** warga (${statistikWarga.persentase?.perempuan || 0}%)\n` +
          `• Tidak disebutkan: **${statistikWarga.by_gender?.find(g => g.jenis_kelamin === 'tidak_disediakan')?.count || 0}** warga\n\n` +
          `**Total:** ${statistikWarga.total_warga} warga terdaftar.`;
        
        const waktuRespon = Date.now() - waktuMulai;
        try {
          await prisma.chatbotConversation.create({
            data: {
              userId: idUser,
              userRole: roleUser,
              messages: messages,
              detectedIntent: 'ASK_STATS',
              aiModelUsed: 'rule-based',
              responseTimeMs: waktuRespon
            }
          });
        } catch (errorLog) {
          console.error('⚠️  Failed to log conversation:', errorLog.message);
        }
        
        return res.json({ reply: balasan });
      }
    }
    
    // Handle pertanyaan "bisa buat laporan ga" untuk role selain warga
    const polaBuatLaporan = /(bisa|bisa ga|bisa gak|bisa tidak|bisa enggak|mungkinkah|apakah bisa|apakah kamu bisa).*(buat|membuat|buatkan|buatin|bikin).*(laporan|report)/i;
    if (polaBuatLaporan.test(pesanUserTerakhir) && roleUser !== 'warga') {
      const namaRole = roleUser === 'admin' ? 'Admin Sistem' : roleUser === 'admin_rw' ? 'Admin RW' : roleUser === 'ketua_rt' ? 'Ketua RT' : roleUser === 'sekretaris_rt' ? 'Sekretaris RT' : roleUser === 'sekretaris' ? 'Sekretaris' : 'Pengurus';
      const balasanAksesDitolak = `Maaf ${userTerformat.name}, sebagai ${namaRole}, Anda tidak dapat membuat laporan. 😊\n\n` +
        `**Hanya warga yang dapat membuat laporan.**\n\n` +
        `Sebagai ${namaRole}, Anda dapat:\n` +
        `📊 Melihat dan mengelola laporan warga\n` +
        `📈 Melihat statistik dan analitik\n` +
        `✏️ Mengupdate status laporan (pending → in_progress → resolved)\n` +
        `📋 Menindaklanjuti laporan warga\n\n` +
        `Untuk membuat laporan, silakan gunakan akun dengan role "warga".`;
      
      // Catat percakapan
      const waktuRespon = Date.now() - waktuMulai;
      try {
        await prisma.chatbotConversation.create({
          data: {
            userId: idUser,
            userRole: roleUser,
            messages: messages,
            detectedIntent: 'ASK_CAPABILITY',
            aiModelUsed: 'rule-based',
            responseTimeMs: waktuRespon
          }
        });
      } catch (errorLog) {
        console.error('⚠️  Failed to log conversation:', errorLog.message);
      }
      
      return res.json({ reply: balasanAksesDitolak });
    }
    
    // Handle pertanyaan "siapa" (saya siapa, kamu siapa, siapa kamu)
    const polaSiapa = /(saya|kamu|anda|kalian) (siapa|siapakah|siap)|siapa (kamu|anda|kalian|saya)/i;
    if (polaSiapa.test(pesanUserTerakhir)) {
      // Jika tanya tentang chatbot ("kamu siapa", "siapa kamu")
      if (/kamu (siapa|siapakah)|siapa (kamu|kalian)/i.test(pesanUserTerakhir)) {
        let balasan = '';
        if (roleUser === 'warga') {
          balasan = `Saya adalah Asisten LaporIn, asisten AI untuk aplikasi pelaporan RT/RW. Saya membantu ${userTerformat.name} (Warga${userTerformat.rt_rw ? ` di ${userTerformat.rt_rw}` : ''}) dengan menjawab pertanyaan, membantu membuat laporan, dan menjelaskan fitur aplikasi. Ada yang bisa saya bantu?`;
        } else {
          const namaRole = roleUser === 'admin' ? 'Admin Sistem' : roleUser === 'admin_rw' ? 'Admin RW' : roleUser === 'ketua_rt' ? 'Ketua RT' : roleUser === 'sekretaris_rt' ? 'Sekretaris RT' : roleUser === 'sekretaris' ? 'Sekretaris' : 'Pengurus';
          balasan = `Saya adalah Asisten LaporIn, asisten AI untuk aplikasi pelaporan RT/RW. Saya membantu ${userTerformat.name} (${namaRole}${userTerformat.rt_rw ? ` di ${userTerformat.rt_rw}` : ''}) dengan menjawab pertanyaan tentang manajemen laporan, statistik, dan fitur aplikasi. 

**Catatan:** Sebagai ${namaRole}, Anda tidak dapat membuat laporan. Hanya warga yang dapat membuat laporan. Anda dapat mengelola dan menindaklanjuti laporan yang sudah dibuat oleh warga.

Ada yang bisa saya bantu?`;
        }
        
        // Catat percakapan untuk training data
        const waktuRespon = Date.now() - waktuMulai;
        try {
          await prisma.chatbotConversation.create({
            data: {
              userId: idUser,
              userRole: roleUser,
              messages: messages,
              detectedIntent: 'ASK_IDENTITY',
              aiModelUsed: 'rule-based',
              responseTimeMs: waktuRespon
            }
          });
        } catch (errorLog) {
          console.error('⚠️  Failed to log conversation:', errorLog.message);
        }
        
        return res.json({ reply: balasan });
      }
      // Jika tanya tentang user sendiri ("saya siapa", "siapa saya")
      const balasanUser = `Anda adalah ${userTerformat.name} dengan peran ${roleUser === 'warga' ? 'Warga' : roleUser === 'admin' ? 'Admin Sistem' : roleUser === 'admin_rw' ? 'Admin RW' : roleUser === 'ketua_rt' ? 'Ketua RT' : roleUser === 'sekretaris_rt' ? 'Sekretaris RT' : roleUser === 'sekretaris' ? 'Sekretaris' : roleUser === 'pengurus' ? 'Pengurus' : roleUser}${userTerformat.rt_rw ? ` di wilayah ${userTerformat.rt_rw}` : ''}. Ada yang bisa saya bantu terkait laporan?`;
      
      // Catat percakapan untuk training data
      const waktuResponUser = Date.now() - waktuMulai;
      try {
        await prisma.chatbotConversation.create({
          data: {
            userId: idUser,
            userRole: roleUser,
            messages: messages,
            detectedIntent: 'ASK_IDENTITY',
            aiModelUsed: 'rule-based',
            responseTimeMs: waktuResponUser
          }
        });
      } catch (errorLog) {
        console.error('⚠️  Failed to log conversation:', errorLog.message);
      }
      
      return res.json({ reply: balasanUser });
    }
    
    // Handle intent ASK_HELP atau permintaan bantuan umum - JANGAN langsung buat laporan
    if (intent.intent === 'ASK_HELP' || /(tolong bantu|saya butuh bantuan|butuh bantuan|perlu bantuan|bisa bantu|minta bantuan)/i.test(pesanUserTerakhir)) {
      // Cek apakah ada masalah spesifik di pesan ini atau sebelumnya (termasuk bansos, bantuan, dll)
      const adaMasalahDiPesan = /(pohon|jalan|lampu|got|selokan|rusak|mati|bocor|mampet|runtuh|tumbang|roboh|mengganggu|perbaiki|masalah|serpihan|kaca|tawuran|bansos|sembako|bantuan|belum.*diterima|belum.*dapet|tidak.*diterima|tidak.*dapet|knp.*blm|kenapa.*belum|mengapa.*belum|mengapa.*tidak|kenapa.*tidak|knp.*tidak|ingin.*melapor|mau.*lapor|tolong.*lapor|butuh.*lapor|perlu.*lapor)/i.test(pesanUserTerakhir);
      const adaMasalahDiSebelumnya = messages.slice(-3, -1).some(m => 
        m.role === 'user' && /(pohon|jalan|lampu|got|selokan|rusak|mati|bocor|mampet|runtuh|tumbang|roboh|mengganggu|perbaiki|masalah|serpihan|kaca|tawuran|bansos|sembako|bantuan|belum.*diterima|belum.*dapet|tidak.*diterima|tidak.*dapet|knp.*blm|kenapa.*belum|mengapa.*belum|mengapa.*tidak|kenapa.*tidak|knp.*tidak|ingin.*melapor|mau.*lapor|tolong.*lapor|butuh.*lapor|perlu.*lapor)/i.test(m.content)
      );
      
      // Jika ada masalah spesifik, mungkin user ingin buat laporan (tapi cek lagi dengan AI)
      if (adaMasalahDiPesan || adaMasalahDiSebelumnya) {
        // Ada masalah, tapi tetap cek dengan AI apakah ini benar-benar permintaan buat laporan
        // atau hanya tanya tentang masalah tersebut
        // Lanjut ke AI processing untuk keputusan yang lebih pintar
      } else {
        // Tidak ada masalah disebutkan, ini jelas permintaan bantuan umum
        if (roleUser === 'warga') {
          const balasan = `Baik ${userTerformat.name}, saya siap membantu! 😊\n\n` +
              `Saya bisa membantu Anda dengan:\n` +
              `📋 **Membuat laporan** - Sebutkan masalah dan lokasinya (contoh: "lampu mati di blok C")\n` +
              `📊 **Cek status laporan** - Tanyakan "status laporan saya"\n` +
              `❓ **Pertanyaan umum** - Tanyakan apapun tentang LaporIn\n\n` +
              `**Untuk membuat laporan, silakan sebutkan:**\n` +
              `• Masalah yang ingin dilaporkan (lampu mati, jalan rusak, got mampet, dll)\n` +
              `• Lokasi masalah (di blok C, depan rumah, area lapangan, dll)\n\n` +
              `Atau langsung sebutkan masalah dan lokasinya sekaligus! 😊`;
          
          // Catat percakapan untuk training data
          const waktuRespon = Date.now() - waktuMulai;
          try {
            await prisma.chatbotConversation.create({
              data: {
                userId: idUser,
                userRole: roleUser,
                messages: messages,
                detectedIntent: 'ASK_HELP',
                aiModelUsed: 'rule-based',
                responseTimeMs: waktuRespon
              }
            });
          } catch (errorLog) {
            console.error('⚠️  Failed to log conversation:', errorLog.message);
          }
    
          return res.json({ reply: balasan });
        }
      }
    }
    
    // Handle "ingin membuat laporan" atau "mau buat laporan" - ini lebih spesifik
    if (/(ingin membuat laporan|mau buat laporan|saya ingin buat laporan)/i.test(pesanUserTerakhir) && 
        !/(terima kasih|makasih|thanks)/i.test(pesanUserTerakhir)) {
      // Jika ada masalah di pesan ini atau sebelumnya, langsung proses CREATE_REPORT (termasuk bansos, bantuan, dll)
      const adaMasalahDiPesan = /(pohon|jalan|lampu|got|selokan|rusak|mati|bocor|mampet|runtuh|tumbang|roboh|mengganggu|perbaiki|masalah|serpihan|kaca|tawuran|bansos|sembako|bantuan|belum.*diterima|belum.*dapet|tidak.*diterima|tidak.*dapet|knp.*blm|kenapa.*belum|mengapa.*belum|mengapa.*tidak|kenapa.*tidak|knp.*tidak|ingin.*melapor|mau.*lapor|tolong.*lapor|butuh.*lapor|perlu.*lapor)/i.test(pesanUserTerakhir);
      const adaMasalahDiSebelumnya = messages.slice(-3, -1).some(m => 
        m.role === 'user' && /(pohon|jalan|lampu|got|selokan|rusak|mati|bocor|mampet|runtuh|tumbang|roboh|mengganggu|perbaiki|masalah|serpihan|kaca|tawuran|bansos|sembako|bantuan|belum.*diterima|belum.*dapet|tidak.*diterima|tidak.*dapet|knp.*blm|kenapa.*belum|mengapa.*belum|mengapa.*tidak|kenapa.*tidak|knp.*tidak|ingin.*melapor|mau.*lapor|tolong.*lapor|butuh.*lapor|perlu.*lapor)/i.test(m.content)
      );
      
      if (adaMasalahDiPesan || adaMasalahDiSebelumnya) {
        // Ada masalah, lanjut ke CREATE_REPORT processing
      } else {
        // Tidak ada masalah disebutkan, tanya apa masalahnya
        if (roleUser === 'warga') {
          const balasan = `Baik ${userTerformat.name}, saya siap membantu membuat laporan! 😊\n\n` +
              `Silakan sebutkan:\n` +
              `📋 **Masalah yang ingin dilaporkan** (contoh: lampu mati, jalan rusak, got mampet, pohon runtuh, dll)\n` +
              `📍 **Lokasi masalah** (contoh: di blok C, depan rumah, area lapangan basket)\n` +
              `📝 **Detail lainnya** jika perlu\n\n` +
            `Atau langsung sebutkan masalah dan lokasinya sekaligus! 😊`;
          
          // Catat percakapan untuk training data
          const waktuRespon = Date.now() - waktuMulai;
          try {
            await prisma.chatbotConversation.create({
              data: {
                userId: idUser,
                userRole: roleUser,
                messages: messages,
                detectedIntent: 'ASK_HELP',
                aiModelUsed: 'rule-based',
                responseTimeMs: waktuRespon
              }
            });
          } catch (errorLog) {
            console.error('⚠️  Failed to log conversation:', errorLog.message);
    }
    
          return res.json({ reply: balasan });
        }
      }
    }

    // Biarkan AI yang handle semua pertanyaan termasuk ASK_CAPABILITY dan NEGATION
    // dengan konteks lengkap tentang LaporIn
    
    // PRIORITAS: Cek intent CREATE_REPORT dulu (jangan dulu cek FAQ)
    // Smart detection: jika pesan seperti laporan, langsung CREATE_REPORT
    
    // Deteksi pertanyaan vs perintah
    const isQuestion = /^(apakah|bisa ga|bisa gak|mungkinkah|apakah kamu|kamu bisa|bisa tidak|bisa enggak)/i.test(lastUserMsg.trim());
    const hasNegation = /(belum minta|tidak minta|saya belum|perasaan.*belum|ga minta|gak minta|enggak minta|tidak ingin|belum ingin)/i.test(lastUserMsg);
    
    // Cek apakah ada eksplisit request untuk buat laporan dari percakapan sebelumnya
    const hasExplicitCreateRequest = /(buatin|buatkan|bikin|tolong buat|bisa buat|minta buat).*(laporan|report)/i.test(lastUserMsg);
    const prevMessagesHaveProblem = messages.slice(-3, -1).some(m => 
      m.role === 'user' && (/(pohon|jalan|lampu|got|rusak|mati|bocor|mampet|runtuh|tumbang|mengganggu|perbaiki|tolong perbaiki|serpihan|kaca|beling|pecahan|tawuran|sampah|menumpuk|banjir|masalah|bansos|sembako|bantuan|belum.*diterima|belum.*dapet|tidak.*diterima|tidak.*dapet|knp.*blm|kenapa.*belum|ingin.*melapor|mau.*lapor|tolong.*lapor|butuh.*lapor|perlu.*lapor)/i.test(m.content) || m.imageUrl || m.image_url)
    );
    
    // Deteksi masalah yang lebih lengkap (termasuk serpihan kaca, tawuran, bansos, dll)
    const hasProblemKeyword = /(lampu|jalan|got|selokan|rusak|mati|bocor|mampet|masalah|pohon|runtuh|tumbang|roboh|mengganggu|ganggu|perbaiki|tolong perbaiki|ada masalah|menggangu aktivitas|serpihan|kaca|beling|pecahan|tawuran|perkelahian|kejahatan|pencurian|vandalisme|sampah|menumpuk|banjir|kebocoran|kebakaran|darurat|bahaya|mengancam|terdapat|ada|bansos|sembako|bantuan|belum.*diterima|belum.*dapet|tidak.*diterima|tidak.*dapet|knp.*blm|kenapa.*belum|ingin.*melapor|mau.*lapor|tolong.*lapor|butuh.*lapor|perlu.*lapor)/i.test(lastUserMsg);
    const hasLocationKeyword = /(di|dekat|depan|blok|jalan|jl|rt|rw|portal|pos|itu|ini|situ|area|lapangan|taman|basket|sigma|futsal|depan|belakang|samping|sekitar|nomor|no|cihuy|blok c)/i.test(lastUserMsg);
    const hasRequestKeyword = /(tolong|bisa|lapor|ingin lapor|minta|perbaiki|tolong perbaiki|buatin laporan|buatkan laporan|kirim|buat|bikin|ingin dibuatkan)/i.test(lastUserMsg);
    
    // JANGAN create report jika:
    // 1. Ini pertanyaan kemampuan (apakah kamu bisa, bisa ga, dll)
    // 2. Ada negasi (belum minta, tidak minta, saya belum, dll)
    // 3. Intent sudah NEGATION, ASK_CAPABILITY, atau ASK_HELP (permintaan bantuan umum)
    const shouldSkipCreateReport = isQuestion || hasNegation || intent.intent === 'NEGATION' || intent.intent === 'ASK_CAPABILITY' || intent.intent === 'ASK_HELP';
    
    // Cek apakah ada gambar di pesan terakhir atau sebelumnya
    const lastMessageWithImage = messages[messages.length - 1];
    const hasImageInLastMsg = !!(lastMessageWithImage?.imageUrl || lastMessageWithImage?.image_url);
    const hasImageInPrevMsgs = messages.slice(-3, -1).some(m => m.imageUrl || m.image_url);
    
    console.log('🔍 Cek gambar:', {
      hasImageInLastMsg,
      hasImageInPrevMsgs,
      lastMessage: lastMessageWithImage ? {
        hasImageUrl: !!lastMessageWithImage.imageUrl,
        hasImage_url: !!lastMessageWithImage.image_url,
        content: lastMessageWithImage.content?.substring(0, 50)
      } : 'no message'
    });
    
    // PERBAIKAN: Jangan langsung CREATE_REPORT jika informasi kurang lengkap
    // Harus ada MASALAH + LOKASI + REQUEST yang jelas, atau eksplisit "buat laporan"
    const hasCompleteInfo = (hasProblemKeyword && hasLocationKeyword && hasRequestKeyword) || 
                            (hasExplicitCreateRequest && prevMessagesHaveProblem) ||
                            (hasImageInLastMsg && hasProblemKeyword && hasLocationKeyword);
    
    const looksLikeReport = !shouldSkipCreateReport && (
      (lastUserMsg.length > 20 && hasCompleteInfo) || // Harus lengkap dan cukup panjang
      (hasExplicitCreateRequest && prevMessagesHaveProblem && hasLocationKeyword) || // Request eksplisit + masalah + lokasi
      (hasImageInLastMsg && hasProblemKeyword && hasLocationKeyword && hasRequestKeyword) // Gambar + masalah + lokasi + request
    );
    
    // PERBAIKAN: Jika informasi kurang lengkap, TANYA DULU sebelum CREATE_REPORT
    // Jangan langsung buat laporan jika hanya ada masalah tanpa lokasi, atau hanya lokasi tanpa masalah
    const hasIncompleteInfo = (hasProblemKeyword && !hasLocationKeyword) || 
                              (hasLocationKeyword && !hasProblemKeyword) ||
                              (hasProblemKeyword && hasLocationKeyword && !hasRequestKeyword && !hasExplicitCreateRequest);
    
    // Jika informasi tidak lengkap, tanya dulu
    if (!shouldSkipCreateReport && hasIncompleteInfo && roleUser === 'warga' && !hasExplicitCreateRequest) {
      let pertanyaanKlarifikasi = '';
      
      if (hasProblemKeyword && !hasLocationKeyword) {
        // Ada masalah tapi tidak ada lokasi
        pertanyaanKlarifikasi = `Baik ${userTerformat.name}, saya sudah memahami masalahnya. 😊\n\n` +
          `Untuk melengkapi laporan, saya perlu tahu:\n` +
          `📍 **Di mana lokasi masalahnya? (contoh: di blok C, depan rumah, area lapangan basket, dll)\n\n` +
          `Silakan sebutkan lokasinya, lalu saya akan buatkan draft laporan untuk Anda. 🙏`;
      } else if (hasLocationKeyword && !hasProblemKeyword) {
        // Ada lokasi tapi tidak ada masalah
        pertanyaanKlarifikasi = `Baik ${userTerformat.name}, saya sudah memahami lokasinya. 😊\n\n` +
          `Untuk melengkapi laporan, saya perlu tahu:\n` +
          `📋 **Apa masalah yang ingin dilaporkan? (contoh: lampu mati, jalan rusak, got mampet, pohon runtuh, dll)\n\n` +
          `Silakan sebutkan masalahnya, lalu saya akan buatkan draft laporan untuk Anda. 🙏`;
      } else if (hasProblemKeyword && hasLocationKeyword && !hasRequestKeyword) {
        // Ada masalah dan lokasi tapi tidak ada request eksplisit
        pertanyaanKlarifikasi = `Baik ${userTerformat.name}, saya sudah memahami masalah dan lokasinya. 😊\n\n` +
          `Apakah Anda ingin saya buatkan laporan untuk masalah ini?\n\n` +
          `Jika ya, silakan konfirmasi atau sebutkan "buat laporan" untuk melanjutkan. 🙏`;
      }
      
      if (pertanyaanKlarifikasi) {
        // Catat percakapan
        const waktuRespon = Date.now() - waktuMulai;
        try {
          await prisma.chatbotConversation.create({
            data: {
              userId: idUser,
              userRole: roleUser,
              messages: messages,
              detectedIntent: 'CREATE_REPORT',
              aiModelUsed: 'clarification',
              responseTimeMs: waktuRespon
            }
          });
        } catch (errorLog) {
          console.error('⚠️  Failed to log conversation:', errorLog.message);
        }
        
        return res.json({ reply: pertanyaanKlarifikasi });
          }
        }
        
    // VALIDASI: Hanya role "warga" yang bisa membuat laporan
    if (!shouldSkipCreateReport && (intent.intent === 'CREATE_REPORT' || looksLikeReport || (hasExplicitCreateRequest && prevMessagesHaveProblem) || hasImageAndProblemAndLocation)) {
      // Cek role sebelum membuat laporan
      if (roleUser !== 'warga') {
        const balasanAksesDitolak = `Maaf ${userTerformat.name}, hanya warga yang dapat membuat laporan melalui chatbot ini. 😊\n\n` +
          `Sebagai ${roleUser === 'admin' ? 'Admin Sistem' : roleUser === 'admin_rw' ? 'Admin RW' : roleUser === 'ketua_rt' ? 'Ketua RT' : roleUser === 'sekretaris_rt' ? 'Sekretaris RT' : roleUser === 'sekretaris' ? 'Sekretaris' : roleUser === 'pengurus' ? 'Pengurus' : roleUser}, Anda dapat:\n` +
          `📊 Melihat dan mengelola laporan warga\n` +
          `📈 Melihat statistik dan analitik\n` +
          `✏️ Mengupdate status laporan\n\n` +
          `Untuk membuat laporan, silakan gunakan akun dengan role "warga".`;
        
        // Catat percakapan
        const waktuRespon = Date.now() - waktuMulai;
        try {
          await prisma.chatbotConversation.create({
            data: {
              userId: idUser,
              userRole: roleUser,
              messages: messages,
              detectedIntent: 'CREATE_REPORT',
              aiModelUsed: 'access-denied',
              responseTimeMs: waktuRespon
            }
          });
        } catch (errorLog) {
          console.error('⚠️  Failed to log conversation:', errorLog.message);
        }
        
        return res.json({ reply: balasanAksesDitolak });
      }
      
      // Jika role adalah warga, lanjutkan proses CREATE_REPORT
      // Generate report data using AI (Groq) - SELALU gunakan AI meskipun ada gambar
      if (groq) {
        try {
          // Improve prompt dengan context awareness - ambil lebih banyak konteks jika ada explicit request
          const contextWindow = hasExplicitCreateRequest ? messages.slice(-5, -1) : messages.slice(-3, -1);
          const conversationContext = contextWindow.map(m => 
            m.role === 'user' ? `User: ${m.content}` : `Asisten: ${m.content}`
          ).join('\n');
          
          // Cek apakah ada gambar di pesan terakhir ATAU pesan sebelumnya (dalam 3 pesan terakhir)
          const lastMessageWithImage = messages[messages.length - 1];
          const hasImageInLast = lastMessageWithImage?.imageUrl || lastMessageWithImage?.image_url;
          const hasImageInPrev = messages.slice(-3, -1).some(m => m.imageUrl || m.image_url);
          const hasImage = hasImageInLast || hasImageInPrev;
          const messageWithImage = messages.slice(-3).find(m => m.imageUrl || m.image_url);
          
          // PRIORITAS: Jika pesan terakhir sudah spesifik tentang masalah, GUNAKAN ITU (jangan ambil dari konteks sebelumnya)
          let fullContext = pesanTeredit; // Fix: gunakan pesanTeredit yang sudah didefinisikan
          const hasSpecificProblemInLastMsg = /(jalan.*rusak|pohon.*runtuh|lampu.*mati|got.*mampet|masalah.*mengganggu|masalah.*jalan|masalah.*pohon|masalah.*lampu|bansos|sembako|bantuan|belum.*diterima|belum.*dapet|tidak.*diterima|tidak.*dapet|knp.*blm|kenapa.*belum|ingin.*melapor|mau.*lapor|tolong.*lapor|butuh.*lapor|perlu.*lapor)/i.test(lastUserMsg);
          
          // Jika pesan terakhir sudah spesifik tentang masalah (termasuk "masalah [jenis masalah]", bansos, dll), 
          // GUNAKAN PESAN TERAKHIR SAJA - jangan gabung dengan pesan sebelumnya
          if (hasSpecificProblemInLastMsg) {
            fullContext = pesanTeredit; // Fix: gunakan pesanTeredit yang sudah didefinisikan
          } else if (hasExplicitCreateRequest && prevMessagesHaveProblem) {
            // Hanya jika pesan terakhir TIDAK spesifik tentang masalah, baru gabung dengan pesan sebelumnya
            const problemMessages = messages.slice(-5, -1).filter(m => 
              m.role === 'user' && /(pohon|jalan|lampu|got|rusak|mati|mampet|runtuh|tumbang|mengganggu|perbaiki|tolong perbaiki|bansos|sembako|bantuan|belum.*diterima|belum.*dapet|tidak.*diterima|tidak.*dapet|knp.*blm|kenapa.*belum|ingin.*melapor|mau.*lapor|tolong.*lapor|butuh.*lapor|perlu.*lapor)/i.test(m.content)
            );
            if (problemMessages.length > 0) {
              // Redact PII dari setiap pesan sebelum digabung
              const redactedMessages = problemMessages.map(m => redactPII(m.content));
              fullContext = redactedMessages.join('. ') + '. ' + pesanTeredit;
            }
          }
          
          const generatePrompt = `Kamu adalah asisten AI untuk aplikasi pelaporan RT/RW. User SUDAH LOGIN dan terautentikasi - bisa langsung membuat laporan.

**Konteks User:**
- User SUDAH TERAUTENTIKASI - tidak perlu login lagi
- Nama: ${user.name}
- Role: Warga
- RT/RW: ${user.rt_rw || 'belum disebutkan'}

${hasImage ? '**PENTING:** User telah melampirkan FOTO/GAMBAR dalam percakapan. Deskripsi laporan harus menjelaskan kondisi masalah yang terlihat dalam foto tersebut dengan detail. Jangan hanya copy-paste pesan user, tapi kembangkan menjadi deskripsi lengkap berdasarkan konteks bahwa ada foto terlampir.\n\n' : ''}${conversationContext ? `**Riwayat Percakapan:**\n${conversationContext}\n\n` : ''}**Pesan Terakhir User:** "${fullContext}"

${hasExplicitCreateRequest ? '**PENTING:** User meminta untuk MEMBUAT LAPORAN berdasarkan masalah yang disebutkan sebelumnya. Pastikan untuk membuat laporan dengan data lengkap dari percakapan.\n\n' : ''}

**CONTOH LAPORAN MASALAH (BUAT LAPORAN):**
- "lampu mati di blok c" → LAPORAN
- "pohon runtuh di area lapangan basket bisa tolong perbaiki" → LAPORAN
- "jalan rusak berlubang di depan rumah" → LAPORAN
- "got mampet bau sekali" → LAPORAN
- "ada masalah mengganggu aktivitas tetangga" → LAPORAN
- "tolong buatin laporan tentang pohon jatuh" → LAPORAN
- "buatkan laporan tentang pohon runtuh di lapangan" → LAPORAN
- "serpihan kaca di depan jalan sigma" → LAPORAN (sosial, high urgency)
- "tolong terdapat serpihan kaca di depan jalan sigma depan lapangan futsal sepertinya itu habis ada yang tawuran" → LAPORAN (sosial, high urgency)
- "tawuran di depan lapangan futsal" → LAPORAN (sosial, high urgency)
- "bansos tak kungjung di terima" → LAPORAN (bantuan, medium urgency)
- "saya ingin melapor terkait bansos knp sya blm dapet ya bisa tolong di laporkan" → LAPORAN (bantuan, medium urgency)
- "bansos belum diterima" → LAPORAN (bantuan, medium urgency)
- "kenapa saya belum dapat bansos" → LAPORAN (bantuan, medium urgency)
- "tolong lapor bansos saya belum diterima" → LAPORAN (bantuan, medium urgency)

**BUKAN LAPORAN (JANGAN BUAT LAPORAN - RETURN {"title": ""}):**
- "apakah kamu bisa buat laporan otomatis?" → BUKAN (ini pertanyaan tentang kemampuan)
- "bisa ga kamu buat laporan?" → BUKAN (pertanyaan, bukan request)
- "saya butuh bantuan" → BUKAN (permintaan bantuan umum, TIDAK ada masalah spesifik)
- "saya butuh bantuan dong" → BUKAN (permintaan bantuan umum, TIDAK ada masalah spesifik)
- "tolong bantu" → BUKAN (permintaan bantuan umum, TIDAK ada masalah spesifik)
- "butuh bantuan" → BUKAN (permintaan bantuan umum, TIDAK ada masalah spesifik)
- "perasaan saya belum minta dibuatkan" → BUKAN (negasi, protes)
- "saya belum minta dibuatkan deh" → BUKAN (negasi)
- "terima kasih" → BUKAN (jika tidak ada masalah disebutkan)
- "saya siapa" → BUKAN
- "bagaimana cara buat laporan" → BUKAN (ini pertanyaan cara, bukan laporan)
- "apa fungsi blockchain di sini?" → BUKAN (pertanyaan umum)

**PENTING - BEDAKAN:**
- "saya butuh bantuan" → BUKAN LAPORAN (tidak ada masalah spesifik)
- "saya butuh buat laporan tentang lampu mati" → LAPORAN (ada masalah spesifik: lampu mati)
- "tolong bantu" → BUKAN LAPORAN (tidak ada masalah spesifik)
- "tolong bantu perbaiki lampu mati di blok C" → LAPORAN (ada masalah spesifik: lampu mati + lokasi)

**DETECTION RULES:**
1. Jika pesan MULAI dengan "apakah", "bisa ga", "bisa gak", "mungkinkah" → PERTANYAAN, bukan laporan
2. Jika ada kata "belum", "tidak", "gak minta" → NEGASI, bukan laporan
3. Jika ada masalah + lokasi + request perbaikan → LAPORAN (contoh: "pohon runtuh di lapangan basket bisa tolong perbaiki")
4. Jika eksplisit "buatin laporan", "buatkan laporan" → LAPORAN

**JIKA INI LAPORAN**, buatkan JSON:
{
  "title": "Judul ringkas dan jelas (maks 100 karakter, contoh: 'Pohon Runtuh di Lapangan Basket'). **PENTING:** Jangan gunakan kata generic seperti 'Alamat', 'Lokasi', 'Tempat' di judul. Gunakan lokasi spesifik seperti 'Blok C', 'Depan Rumah', 'Jl. Merdeka', dll. Jika lokasi tidak spesifik, cukup gunakan masalah saja tanpa lokasi (contoh: 'Jalan Rusak' bukan 'Jalan Rusak di Alamat').",
  "description": "Deskripsi LENGKAP dan DETAIL (minimal 2-3 kalimat): \n- Perluas dan jelaskan kondisi masalah dengan detail\n- ${hasImage ? '**PENTING:** User telah melampirkan foto. Deskripsi harus menjelaskan kondisi masalah yang terlihat dalam foto dengan detail, bukan hanya copy-paste pesan user. Contoh: Jika user kirim foto jalan rusak dengan pesan "jalan rusak", deskripsi harus: "Jalan di lokasi tersebut mengalami kerusakan parah dengan banyak lubang dan permukaan tidak rata seperti terlihat dalam foto. Kondisi ini membahayakan pengendara dan kendaraan yang melintas, terutama saat hujan. Perlu perbaikan segera untuk keselamatan warga."\n- ' : ''}Jika user hanya bilang singkat (misal 'lampu mati'), kembangkan menjadi deskripsi lengkap: 'Lampu di lokasi tersebut mengalami kerusakan dan tidak menyala. Kondisi ini mengganggu aktivitas warga terutama pada malam hari. Perlu perbaikan segera untuk keamanan dan kenyamanan warga.'\n- JANGAN hanya copy-paste pesan singkat user sebagai description\n- Jelaskan dampak/akibat jika disebutkan atau bisa diinfer, waktu jika ada, detail lokasi\n- Contoh: User bilang 'jalan rusak' → description: 'Jalan di lokasi tersebut mengalami kerusakan dengan banyak lubang dan permukaan tidak rata. Kondisi ini membahayakan pengendara dan kendaraan yang melintas, terutama saat hujan. Perlu perbaikan segera untuk keselamatan warga.'",
  "location": "Lokasi spesifik yang disebutkan di pesan. **PENTING:** JANGAN gunakan placeholder seperti '[alamat]', 'Alamat', 'Lokasi', 'Tempat', atau kata generic lainnya. Jika user menyebutkan alamat spesifik seperti 'jl sigma nomor 69', 'jl digidaw nomr 121', 'blok C', 'depan rumah', gunakan itu. Jika user menyebutkan 'di jl bla bla nomor 69' atau 'jl digidaw nomr 121', ekstrak menjadi 'Jl Bla Bla No 69' atau 'Jl Digidaw No 121'. Catatan: 'nomr' sama dengan 'nomor'. Jika tidak ada lokasi spesifik di pesan, gunakan '${user.rt_rw || 'Lokasi tidak disebutkan'}'",
  "category": "infrastruktur|sosial|administrasi|bantuan",
  "urgency": "low|medium|high"
}

**JIKA BUKAN LAPORAN (pertanyaan atau negasi)**, return: {"title": ""}

**KATEGORI:**
- infrastruktur: pohon, jalan, lampu, got, bangunan, fasilitas, listrik, air, drainase, sampah menumpuk
- sosial: mengganggu aktivitas, kebisingan, keributan, tetangga, keamanan, serpihan kaca, tawuran, perkelahian, vandalisme
- administrasi: surat, domisili, ktp, kk
- bantuan: bansos, sembako

**URGENSI (PENTING - untuk analisis data yang akurat):**
- **high**: Bahaya langsung, darurat, mengancam keselamatan/keamanan warga
  - Contoh: kebakaran, listrik berbahaya (bocor/korsleting), pohon menutup jalan raya, serpihan kaca di jalan ramai, tawuran aktif, banjir tinggi, bangunan retak parah, gas bocor, kecelakaan serius
  - Keyword: kebakaran, listrik, bocor berbahaya, korsleting, darurat, bahaya, serpihan kaca di jalan, tawuran, banjir tinggi, gas bocor, retak parah, kecelakaan
- **medium**: Mengganggu aktivitas, perlu segera ditangani tapi tidak darurat
  - Contoh: sampah menumpuk, got mampet, jalan rusak berlubang, lampu mati, suara bising mengganggu, saluran air tersumbat, fasilitas rusak, bangunan retak kecil
  - Keyword: mampet, rusak, berlubang, mati, mengganggu, tersumbat, bising, retak kecil, sampah menumpuk
- **low**: Permintaan rutin, tidak mendesak, permintaan informasi/dokumen
  - Contoh: permintaan surat, pengantar, informasi umum, perbaikan estetika, permintaan bantuan non-darurat
  - Keyword: surat, pengantar, informasi, dokumen, ktp, kk, permintaan umum, estetika

**PENTING:** 
- Hanya buat laporan jika ini PERMINTAAN EKSPLISIT atau ada masalah + lokasi + request. 
- JANGAN buat laporan untuk pertanyaan kemampuan atau negasi.
- Jika user minta "review dulu" atau "lihat dulu", tetap generate JSON lengkap (untuk preview), tapi jangan langsung create.
- Prioritaskan masalah dari pesan TERAKHIR jika ada masalah spesifik di sana (jangan ambil dari konteks sebelumnya).
- **JANGAN MENGULANG PERTANYAAN** jika user sudah memberikan masalah di pesan ini atau sebelumnya. Jika user sudah menyebutkan masalah (misal: "bansos tak kungjung di terima", "lampu mati", "jalan rusak"), LANGSUNG buat laporan, jangan tanya lagi "apa masalahnya?".
- Jika di riwayat percakapan user sudah menyebutkan masalah (misal: "bansos", "lampu mati", "jalan rusak"), dan di pesan terakhir user mengulang atau memperjelas masalah tersebut, LANGSUNG buat laporan dengan informasi dari seluruh percakapan.

**EXTRAKSI MASALAH:**
- Jika user bilang "jalan rusak" → gunakan itu, jangan ambil "pohon runtuh" dari konteks sebelumnya
- Jika user bilang "masalah jalan rusak di depan rumah saya" → judul harus "Jalan Rusak di Depan Rumah"
- Ekstrak lokasi spesifik dari pesan: "di depan rumah saya" → "Depan Rumah", bukan "Alamat"
- Jika user bilang "bansos tak kungjung di terima" atau "bansos belum diterima" → masalahnya adalah "Bansos belum diterima", kategori: "bantuan", urgency: "medium"
- Jika user bilang "saya ingin melapor terkait bansos knp sya blm dapet" → masalahnya adalah "Bansos belum diterima", kategori: "bantuan", urgency: "medium"

Response HANYA JSON, tanpa markdown, tanpa penjelasan.`;

          let aiResponse = '';
          
          // Try Groq first (FREE & FAST)
          if (groq) {
            try {
              const completion = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant', // Fast & free, active model
                messages: [
                  {
                    role: 'system',
                    content: 'Kamu adalah asisten yang SANGAT PINTAR untuk membuat struktur data laporan dari pesan warga. PERHATIAN PENTING:\n' +
                      '1. **JANGAN LANGSUNG BUAT KESIMPULAN** - Jika informasi kurang lengkap atau ambigu, return {"title": ""}\n' +
                      '2. Jika pesan adalah PERTANYAAN tentang kemampuan ("apakah kamu bisa", "bisa ga") → return {"title": ""}\n' +
                      '3. Jika pesan adalah PERMINTAAN BANTUAN UMUM ("saya butuh bantuan", "tolong bantu") TANPA masalah spesifik → return {"title": ""}\n' +
                      '4. Jika pesan adalah NEGASI ("saya belum minta", "belum minta") → return {"title": ""}\n' +
                      '5. **HANYA buat laporan jika informasi LENGKAP**: MASALAH SPESIFIK (lampu mati, jalan rusak, pohon runtuh, dll) + LOKASI + REQUEST perbaikan\n' +
                      '6. Jika hanya ada masalah TANPA lokasi → return {"title": ""} (biarkan sistem tanya lokasi dulu)\n' +
                      '7. Jika hanya ada lokasi TANPA masalah → return {"title": ""} (biarkan sistem tanya masalah dulu)\n' +
                      '8. "saya butuh bantuan" TANPA masalah spesifik = BUKAN laporan, return {"title": ""}\n' +
                      '9. "saya butuh buat laporan tentang lampu mati" = LAPORAN (ada masalah spesifik)\n' +
                      '10. "lampu mati" TANPA lokasi = return {"title": ""} (biarkan sistem tanya lokasi dulu)\n' +
                      '11. "di blok C" TANPA masalah = return {"title": ""} (biarkan sistem tanya masalah dulu)\n' +
                      '12. **PENTING - EKSTRAKSI LOKASI:** Jika user menyebutkan alamat seperti "jl sigma nomor 69", "jl digidaw nomr 121", atau "jl bla bla nomor 69", ekstrak menjadi "Jl Sigma No 69", "Jl Digidaw No 121", atau "Jl Bla Bla No 69". Catatan: "nomr" sama dengan "nomor". JANGAN gunakan placeholder seperti "[alamat]", "Alamat", "Lokasi", atau kata generic lainnya.\n' +
                      '13. **EKSTRAKSI LOKASI MULTI-WORD:** Pattern "jl [kata1] [kata2] [kata3] nomor/nomr [angka]" harus diekstrak menjadi "Jl Kata1 Kata2 Kata3 No [angka]". Contoh: "jl jalan raya nomor 69" → "Jl Jalan Raya No 69", "jl digidaw nomr 121" → "Jl Digidaw No 121"\n' +
                      'Selalu return JSON valid saja, tanpa markdown atau penjelasan lain.',
                  },
                  { role: 'user', content: generatePrompt },
                ],
                temperature: 0.5, // Increased untuk ekstraksi yang lebih baik
                max_tokens: 500,
              });
              aiResponse = completion.choices?.[0]?.message?.content || '';
              console.log('✅ Groq generated report data successfully');
            } catch (groqError) {
              console.error('❌ Groq API error:', groqError.message);
              // Groq failed, will use manual fallback
            }
          }
          
          let reportData;
          try {
            // Extract JSON dari response (bisa ada markdown code block)
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              reportData = JSON.parse(jsonMatch[0]);
            } else {
              reportData = JSON.parse(aiResponse);
            }
          } catch (parseError) {
            // Fallback jika parsing gagal
            reportData = {
              title: lastUserMsg.length > 100 ? lastUserMsg.substring(0, 97) + '...' : lastUserMsg,
              description: lastUserMsg,
              location: user.rt_rw || 'Lokasi tidak disebutkan',
              category: 'infrastruktur',
              urgency: 'medium',
            };
          }

          // Validate dan clean data
          const categories = ['infrastruktur', 'sosial', 'administrasi', 'bantuan'];
          const urgencies = ['low', 'medium', 'high'];
          
          // Improved urgency detection - pastikan tidak salah klasifikasi
          const descLower = (reportData.description || lastUserMsg).toLowerCase();
          const titleLower = (reportData.title || '').toLowerCase();
          const fullText = `${titleLower} ${descLower}`;
          
          // PENTING: Pastikan bansos/bantuan masuk ke kategori "bantuan", bukan "infrastruktur"
          if (fullText.includes('bansos') || fullText.includes('sembako') || 
              (fullText.includes('bantuan') && (fullText.includes('belum diterima') || fullText.includes('belum dapet') || fullText.includes('tidak diterima') || fullText.includes('tidak dapet')))) {
            reportData.category = 'bantuan';
          } else {
            reportData.category = categories.includes(reportData.category) ? reportData.category : 'infrastruktur';
          }
          
          // High urgency keywords (bahaya langsung)
          const highUrgencyKeywords = ['kebakaran', 'listrik bocor', 'listrik berbahaya', 'korsleting', 'darurat', 'bahaya', 'serpihan kaca', 'tawuran', 'banjir tinggi', 'gas bocor', 'retak parah', 'kecelakaan', 'menutup jalan raya'];
          // Medium urgency keywords (mengganggu)
          const mediumUrgencyKeywords = ['mampet', 'rusak', 'berlubang', 'lampu mati', 'mengganggu', 'tersumbat', 'bising', 'retak kecil', 'sampah menumpuk', 'jalan rusak', 'got mampet', 'saluran air tersumbat'];
          // Low urgency keywords (permintaan umum)
          const lowUrgencyKeywords = ['surat', 'pengantar', 'informasi', 'dokumen', 'ktp', 'kk', 'permintaan umum', 'estetika'];
          
          // Jika AI sudah set urgency, validasi dengan keyword check
          let detectedUrgency = reportData.urgency || 'medium';
          if (highUrgencyKeywords.some(kw => fullText.includes(kw))) {
            detectedUrgency = 'high';
          } else if (mediumUrgencyKeywords.some(kw => fullText.includes(kw))) {
            detectedUrgency = 'medium';
          } else if (lowUrgencyKeywords.some(kw => fullText.includes(kw))) {
            detectedUrgency = 'low';
          }
          
          reportData.urgency = urgencies.includes(detectedUrgency) ? detectedUrgency : 'medium';
          reportData.title = (reportData.title || '').trim().substring(0, 100);
          
          // POST-PROCESSING: Hapus "[alamat]", "Alamat", "di jalan bla bla", dll dari title
          if (reportData.title) {
            // Hapus placeholder yang umum dari AI
            reportData.title = reportData.title
              .replace(/\s*\[alamat\]/gi, '')
              .replace(/\s*\[lokasi\]/gi, '')
              .replace(/\s*di\s+alamat/gi, '')
              .replace(/\s*di\s+lokasi/gi, '')
              .replace(/\s*di\s+tempat/gi, '')
              .replace(/\s*di\s+jalan\s+bla\s+bla/gi, '') // Hapus "di jalan bla bla"
              .replace(/\s*di\s+jalan\s+[a-z\s]+bla/gi, '') // Hapus "di jalan [kata] bla"
              .replace(/\s*alamat/gi, '')
              .replace(/\s+di\s+$/gi, '') // Hapus "di" di akhir jika tidak ada lokasi
              .trim();
            
            // Jika title kosong setelah cleaning, buat dari masalah saja
            if (!reportData.title || reportData.title.length <= 3) {
              // Coba extract masalah dari lastUserMsg
              if (/(konslet|korslet|listrik|mati)/i.test(lastUserMsg)) {
                reportData.title = 'Masalah Listrik';
              } else if (/(jalan.*rusak|rusak.*jalan)/i.test(lastUserMsg)) {
                reportData.title = 'Jalan Rusak';
              } else if (/(lampu.*mati|mati.*lampu)/i.test(lastUserMsg)) {
                reportData.title = 'Lampu Mati';
              } else {
                reportData.title = 'Laporan Masalah';
              }
            }
          }
          
          // Ensure description is expanded (not just copy of short user message)
          let finalDescription = (reportData.description || lastUserMsg).trim();
          // Jika deskripsi terlalu pendek (kurang dari 50 karakter), coba expand dengan context
          if (finalDescription.length < 50 && lastUserMsg.trim().length < 100) {
            // Use AI untuk expand description jika terlalu singkat
            finalDescription = finalDescription || lastUserMsg.trim();
          }
          // Jangan biarkan description sama persis dengan pesan user jika terlalu singkat
          if (finalDescription === lastUserMsg.trim() && lastUserMsg.trim().length < 80) {
            // Tambahkan konteks minimal
            finalDescription = `${lastUserMsg.trim()}. Masalah ini perlu ditangani oleh pengurus RT/RW untuk kenyamanan warga.`;
          }
          
          reportData.description = finalDescription;
          
          // POST-PROCESSING: Ekstrak location dari pesan jika AI mengembalikan placeholder
          let finalLocation = (reportData.location || user.rt_rw || 'Lokasi tidak disebutkan').trim();
          
          // Cek apakah location adalah placeholder generic
          const genericLocationPatterns = ['alamat', 'lokasi', 'tempat', 'tidak disebutkan', 'unknown', '\\[alamat\\]', '\\[lokasi\\]'];
          const isGenericLocation = genericLocationPatterns.some(pattern => {
            const regex = new RegExp(pattern, 'i');
            return regex.test(finalLocation);
          });
          
          // PERBAIKAN: Cek di lastUserMsg DAN fullContext untuk ekstraksi location
          const textToSearch = lastUserMsg + ' ' + (fullContext || '');
          
          // Jika location generic, coba extract dari pesan (cek di lastUserMsg dulu, baru fullContext)
          if (isGenericLocation || finalLocation.toLowerCase() === 'alamat' || finalLocation === '[alamat]' || finalLocation.toLowerCase().includes('[alamat]')) {
            // Pattern 1: "jl [multiple words] nomor [angka]" - cek di lastUserMsg dulu
            // PERBAIKAN: Tambahkan "nomr" (tanpa "o") dan gunakan greedy + untuk menangkap semua kata
            let simpleLocationMatch = lastUserMsg.match(/(jalan|jl|jl\.|jl\s)\s+([a-z\s]+)\s+(?:nomor|nomr|no|nmr|nomer)\s+([0-9]+)/i);
            if (!simpleLocationMatch && fullContext) {
              // Jika tidak ketemu di lastUserMsg, cek di fullContext
              simpleLocationMatch = fullContext.match(/(jalan|jl|jl\.|jl\s)\s+([a-z\s]+)\s+(?:nomor|nomr|no|nmr|nomer)\s+([0-9]+)/i);
            }
            
            if (simpleLocationMatch) {
              const namaJalan = simpleLocationMatch[2]?.trim() || '';
              const nomor = simpleLocationMatch[3]?.trim() || '';
              if (namaJalan && nomor) {
                const namaJalanFormatted = namaJalan.split(/\s+/).map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ');
                finalLocation = `Jl ${namaJalanFormatted} No ${nomor}` + (user.rt_rw ? `, ${user.rt_rw}` : '');
                console.log('📍 Location extracted from message (post-processing):', finalLocation);
              }
            } else {
              // Pattern 2: "jl [multiple words] blok [x] nomor [angka]" - cek di lastUserMsg dulu
              // PERBAIKAN: Tambahkan "nomr" dan gunakan greedy + untuk menangkap semua kata
              let fullLocationMatch = lastUserMsg.match(/(jalan|jl|jl\.|jl\s)\s+([a-z0-9\s]+)(?:\s+(blok|block)\s+([a-z0-9\s\/]+))?(?:\s+(no|nomor|nomr|nmr|nomer)\s+([0-9]+))?/i);
              if (!fullLocationMatch && fullContext) {
                // Jika tidak ketemu di lastUserMsg, cek di fullContext
                fullLocationMatch = fullContext.match(/(jalan|jl|jl\.|jl\s)\s+([a-z0-9\s]+)(?:\s+(blok|block)\s+([a-z0-9\s\/]+))?(?:\s+(no|nomor|nomr|nmr|nomer)\s+([0-9]+))?/i);
              }
              
              if (fullLocationMatch) {
                const jalan = fullLocationMatch[2]?.trim() || '';
                const blok = fullLocationMatch[4]?.trim() || '';
                const nomor = fullLocationMatch[6]?.trim() || '';
                if (jalan) {
                  const jalanFormatted = jalan.split(/\s+/).map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ');
                  let locationParts = [`Jl ${jalanFormatted}`];
                  if (blok) {
                    const blokFormatted = blok.split(/\s+/).map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                    locationParts.push(`Blok ${blokFormatted}`);
                  }
                  if (nomor) locationParts.push(`No ${nomor}`);
                  finalLocation = locationParts.join(', ') + (user.rt_rw ? `, ${user.rt_rw}` : '');
                  console.log('📍 Location extracted from message (post-processing full):', finalLocation);
                }
              } else {
                // Fallback ke RT/RW jika tidak ada lokasi spesifik
                finalLocation = user.rt_rw || 'Lokasi tidak disebutkan';
              }
            }
          }
          
          // FINAL VALIDATION: Pastikan location tidak pernah "Alamat" atau "[alamat]"
          const finalLocationPatterns = ['alamat', 'lokasi', 'tempat', 'tidak disebutkan', 'unknown', '\\[alamat\\]', '\\[lokasi\\]'];
          const isFinalLocationGeneric = finalLocationPatterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\\/g, ''), 'i');
            return regex.test(finalLocation);
          });
          
          if (isFinalLocationGeneric || finalLocation.toLowerCase() === 'alamat' || finalLocation.toLowerCase().includes('[alamat]')) {
            // Jika masih generic, coba extract sekali lagi dari lastUserMsg dengan lebih agresif
            console.log('⚠️  Location masih generic, coba extract lagi dengan lebih agresif');
            
            // PRIORITAS 1: Pattern khusus untuk "di jl [nama jalan]" atau "jl [nama jalan]"
            // PERBAIKAN: Pattern lebih spesifik untuk menangkap nama jalan setelah "jl"
            // Contoh: "di jl digidaw" atau "jl digidaw" atau "di jl digidaw, berikut"
            // Gunakan pattern yang menangkap sampai koma atau kata stop
            let jlPatternMatch = lastUserMsg.match(/(?:di\s+)?(jalan|jl|jl\.|jl\s)\s+([a-z0-9]+(?:\s+[a-z0-9]+)*?)(?:\s*,\s*|\s+(?:nomor|nomr|no|nmr|nomer|blok|block|rt|rw|depan|belakang|samping|dekat|di|berikut|lampirannya|tersebut|tolong|ada|yang|nih|ini|konslet|listrik|mati|rusak))/i);
            
            // Jika tidak match, coba pattern lebih sederhana: "jl [kata]" sampai koma atau akhir kalimat
            if (!jlPatternMatch) {
              jlPatternMatch = lastUserMsg.match(/(?:di\s+)?(jalan|jl|jl\.|jl\s)\s+([a-z0-9]+(?:\s+[a-z0-9]+)*)/i);
            }
            
            if (jlPatternMatch && jlPatternMatch[2]) {
              let namaJalan = jlPatternMatch[2].trim();
              
              // Bersihkan nama jalan dari kata stop di akhir
              namaJalan = namaJalan.replace(/\s+(nomor|nomr|no|nmr|nomer|blok|block|rt|rw|depan|belakang|samping|dekat|di|berikut|lampirannya|tersebut|tolong|ada|yang|nih|ini|konslet|listrik|mati|rusak).*$/i, '');
              
              // Validasi: nama jalan harus lebih dari 1 karakter dan bukan kata generic
              if (namaJalan && namaJalan.length > 1 && !finalLocationPatterns.some(p => {
                const regex = new RegExp(p.replace(/\\/g, ''), 'i');
                return regex.test(namaJalan);
              })) {
                const namaJalanFormatted = namaJalan.split(/\s+/).map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ');
                finalLocation = `Jl ${namaJalanFormatted}`;
                finalLocation += user.rt_rw ? `, ${user.rt_rw}` : '';
                console.log('✅ Location extracted dengan pattern jl khusus:', finalLocation);
              }
            }
            
            // PRIORITAS 2: Pattern untuk "di [lokasi]" (bukan jl)
            if (isFinalLocationGeneric && (!finalLocation || finalLocation.length <= 2)) {
              const aggressiveLocationMatch = lastUserMsg.match(/(?:di|dekat|depan|belakang|samping|area|lapangan|taman|blok|block)\s+([a-z0-9\s]{2,}?)(?:\s*,\s*|\s+(?:nomor|nomr|no|nmr|nomer|berikut|lampirannya|tersebut))/i);
              if (aggressiveLocationMatch && aggressiveLocationMatch[1]) {
                const loc = aggressiveLocationMatch[1].trim();
                
                // Validasi: loc harus lebih dari 1 karakter dan bukan kata generic
                if (loc && loc.length > 1 && !finalLocationPatterns.some(p => {
                  const regex = new RegExp(p.replace(/\\/g, ''), 'i');
                  return regex.test(loc);
                })) {
                  const locFormatted = loc.split(/\s+/).map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ');
                  finalLocation = locFormatted;
                  finalLocation += user.rt_rw ? `, ${user.rt_rw}` : '';
                  console.log('✅ Location extracted dengan pattern agresif:', finalLocation);
                }
              }
            }
            
            // PRIORITAS 3: Gunakan location dari NLP entities jika ada (fallback terakhir)
            // Note: intent didefinisikan di scope function buatLaporanDenganAI, jadi tersedia di sini
            if (isFinalLocationGeneric && (!finalLocation || finalLocation.length <= 2)) {
              // Cek apakah ada intent dengan entities.location (dari detectIntentWithAI)
              // intent didefinisikan di line 471, tersedia di scope ini
              try {
                if (typeof intent !== 'undefined' && intent && intent.entities && intent.entities.location) {
                  const nlpLocation = intent.entities.location.trim();
                  // Validasi: location dari NLP harus lebih dari 1 karakter dan bukan generic
                  if (nlpLocation && nlpLocation.length > 1 && !finalLocationPatterns.some(p => {
                    const regex = new RegExp(p.replace(/\\/g, ''), 'i');
                    return regex.test(nlpLocation);
                  })) {
                    // Format location dari NLP (bisa "jl digidaw" atau "digidaw")
                    let formattedLocation = nlpLocation;
                    if (!/^(jalan|jl|jl\.)/i.test(formattedLocation)) {
                      formattedLocation = `Jl ${formattedLocation}`;
                    }
                    // Capitalize
                    formattedLocation = formattedLocation.split(/\s+/).map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                    finalLocation = formattedLocation;
                    finalLocation += user.rt_rw ? `, ${user.rt_rw}` : '';
                    console.log('✅ Location extracted dari NLP entities:', finalLocation);
                  }
                }
              } catch (err) {
                // Intent mungkin tidak tersedia di scope ini, skip
                console.log('⚠️  Intent tidak tersedia untuk NLP entities fallback');
              }
            }
            
            // Jika masih generic setelah semua usaha, gunakan RT/RW
            const stillGenericAfterAggressive = finalLocationPatterns.some(pattern => {
              const regex = new RegExp(pattern.replace(/\\/g, ''), 'i');
              return regex.test(finalLocation);
            });
            
            if (stillGenericAfterAggressive || finalLocation.toLowerCase() === 'alamat' || finalLocation.toLowerCase().includes('[alamat]')) {
              finalLocation = user.rt_rw || 'Lokasi tidak disebutkan';
              console.log('⚠️  Location fallback ke RT/RW setelah semua usaha:', finalLocation);
            }
          }
          
          // ABSOLUTE FINAL CHECK: Pastikan tidak pernah "Alamat" atau "[alamat]"
          // Validasi finalLocation sebelum assign ke reportData
          if (finalLocation && (
            finalLocation.toLowerCase() === 'alamat' || 
            finalLocation.toLowerCase().includes('[alamat]') ||
            (finalLocation.toLowerCase().includes('alamat') && !finalLocation.toLowerCase().includes('jalan'))
          )) {
            console.log('🚨 CRITICAL: finalLocation masih "Alamat", force replace dengan RT/RW');
            finalLocation = user.rt_rw || 'Lokasi tidak disebutkan';
          }
          
          reportData.location = finalLocation;
          
          // Double check setelah assign
          if (reportData.location && (
            reportData.location.toLowerCase() === 'alamat' || 
            reportData.location.toLowerCase().includes('[alamat]') ||
            (reportData.location.toLowerCase().includes('alamat') && !reportData.location.toLowerCase().includes('jalan'))
          )) {
            console.log('🚨 CRITICAL: reportData.location masih "Alamat" setelah assign, force replace');
            reportData.location = user.rt_rw || 'Lokasi tidak disebutkan';
          }

          // Cek apakah ini benar-benar laporan atau hanya ucapan (terima kasih, dll)
          // JANGAN deteksi sebagai terima kasih jika ada masalah disebutkan
          const hasProblem = /(lampu|jalan|got|selokan|rusak|mati|bocor|mampet|masalah|pohon|runtuh|tumbang|mengganggu|perbaiki|tolong perbaiki|ada masalah)/i.test(lastUserMsg);
          const isThankYouOnly = /^(terima kasih|thanks|makasih|makasi|terimakasih|okee|oke|baik|ya|yes|sama-sama)/i.test(lastUserMsg.trim()) && 
                                   !hasProblem &&
                                   lastUserMsg.length < 50;
          
          // Jika title kosong atau hanya ucapan terima kasih PURE (tanpa masalah), jangan create report
          if (!reportData.title || isThankYouOnly) {
            // Jika ucapan terima kasih setelah laporan dibuat, beri respon yang ramah
            if (isThankYouOnly) {
              return res.json({
              reply: `Sama-sama ${userTerformat.name}! 😊 Saya senang bisa membantu. Jika ada masalah lain yang ingin dilaporkan, silakan beri tahu saya.`,
              });
            }
            // Jika title kosong, mungkin AI tidak detect sebagai laporan
            // Fallback: tetap coba create jika looksLikeReport
            if (!looksLikeReport) {
              // Tidak seperti laporan, lanjut ke AI general chat
              // (akan di-handle di bagian bawah)
            }
          }
          
          // PENTING: Set imageUrl ke reportData SEBELUM cek auto-send
          // Note: lastMessageWithImage, hasImageInLast, hasImageInPrev, hasImage, messageWithImage sudah dideklarasikan di atas (line 697-701)
          if (hasImage && messageWithImage) {
            reportData.imageUrl = messageWithImage.imageUrl || messageWithImage.image_url;
            console.log('📷 Image ditemukan dan ditambahkan ke reportData:', !!reportData.imageUrl);
          }

          // VALIDASI FOTO: Jika laporan dibuat TANPA foto, minta foto terlebih dahulu
          const hasValidTitle = reportData.title && reportData.title.length > 3;
          if (hasValidTitle && !hasImage) {
            // Ada laporan yang valid tapi TIDAK ada foto - minta foto terlebih dahulu
            console.log('⚠️  Laporan valid tapi TIDAK ada foto, minta foto terlebih dahulu');
            
            // Simpan draft sementara untuk konteks (tapi jangan tampilkan ke user)
            simpanDraftTertunda(idUser, {
              ...reportData,
              pendingPhoto: true, // Flag bahwa ini menunggu foto
              originalMessage: lastUserMsg
            });
            
            // Catat percakapan
            const waktuRespon = Date.now() - waktuMulai;
            try {
              await prisma.chatbotConversation.create({
                data: {
                  userId: idUser,
                  userRole: roleUser,
                  messages: messages,
                  detectedIntent: 'CREATE_REPORT',
                  aiModelUsed: modelAIDigunakan,
                  responseTimeMs: waktuRespon
                }
              });
            } catch (errorLog) {
              console.error('⚠️  Failed to log conversation:', errorLog.message);
            }
            
            // Minta foto dengan pesan yang ramah
            const balasanMintaFoto = `Baik ${userTerformat.name}! 😊 Saya sudah memahami laporan Anda:\n\n` +
              `📝 **${reportData.title}**\n` +
              `📍 **Lokasi:** ${reportData.location}\n\n` +
              `📷 **Untuk melengkapi laporan, mohon kirimkan foto bukti masalahnya terlebih dahulu.**\n\n` +
              `Foto bukti sangat penting untuk membantu pengurus RT/RW memahami kondisi masalah dengan lebih jelas. Setelah foto dikirim, saya akan segera membuatkan draft laporan untuk Anda. 🙏`;
            
            return res.json({ 
              reply: balasanMintaFoto,
              awaitingPhoto: true,
              reportPreview: {
                title: reportData.title,
                location: reportData.location
              }
            });
          }

          // Siapkan draft laporan (tidak langsung kirim tanpa konfirmasi)
          // Jalankan hanya jika ada title yang valid ATAU looksLikeReport dengan masalah jelas
          // TAPI JANGAN jika ini pertanyaan kemampuan atau negasi
          const hasClearProblem = !shouldSkipCreateReport && (
            /(pohon.*runtuh|jalan.*rusak|lampu.*mati|got.*mampet|selokan.*mampet|mengganggu.*aktivitas|bangunan.*rusak)/i.test(lastUserMsg) || 
            (hasExplicitCreateRequest && prevMessagesHaveProblem) ||
            hasImage // Jika ada gambar, anggap sebagai laporan
          );
          
          // Jika title kosong tapi ada masalah jelas, buat title dari masalah
          // TAPI JANGAN jika ini pertanyaan atau negasi
          // PRIORITASKAN masalah dari pesan TERAKHIR, bukan dari konteks sebelumnya
          if (!shouldSkipCreateReport && (hasClearProblem || hasExplicitCreateRequest) && (!reportData.title || reportData.title.length <= 3)) {
            let problemTitle = '';
            const textToCheck = lastUserMsg; // Prioritas: gunakan pesan terakhir saja untuk extract
            
            // Prioritaskan masalah dari pesan terakhir (cek lastUserMsg dulu)
            if (/(jalan.*rusak|rusak.*jalan|masalah.*jalan.*rusak)/i.test(textToCheck)) {
              problemTitle = 'Jalan Rusak';
              reportData.category = 'infrastruktur';
            } else if (/(pohon.*runtuh|pohon.*tumbang|runtuh.*pohon)/i.test(textToCheck)) {
              problemTitle = 'Pohon Runtuh';
              reportData.category = 'infrastruktur';
            } else if (/(lampu.*mati|mati.*lampu)/i.test(textToCheck)) {
              problemTitle = 'Lampu Mati';
              reportData.category = 'infrastruktur';
            } else if (/(got.*mampet|mampet.*got|selokan.*mampet|mampet.*selokan)/i.test(textToCheck)) {
              problemTitle = 'Got/Selokan Mampet';
              reportData.category = 'infrastruktur';
              reportData.urgency = 'medium';
            } else if (/(mengganggu.*aktivitas|aktivitas.*terganggu)/i.test(textToCheck)) {
              problemTitle = 'Masalah Mengganggu Aktivitas';
              reportData.category = 'sosial';
            } else if (/(serpihan|kaca|beling|pecahan)/i.test(textToCheck)) {
              problemTitle = 'Serpihan Kaca/Beling';
              reportData.category = 'sosial';
              reportData.urgency = 'high'; // Serpihan kaca berbahaya
            } else if (/(tawuran|perkelahian|keributan)/i.test(textToCheck)) {
              problemTitle = 'Tawuran/Perkelahian';
              reportData.category = 'sosial';
              reportData.urgency = 'high';
            } else if (/(sampah|menumpuk|kotor)/i.test(textToCheck)) {
              problemTitle = 'Sampah Menumpuk';
              reportData.category = 'infrastruktur';
              reportData.urgency = 'medium';
            } else if (/(banjir|kebocoran|air)/i.test(textToCheck)) {
              problemTitle = 'Masalah Air/Banjir';
              reportData.category = 'infrastruktur';
              reportData.urgency = 'high';
            } else if (/(pohon.*runtuh|pohon.*tumbang|runtuh.*pohon)/i.test(fullContext)) {
              // Fallback: cek fullContext hanya jika tidak ada di lastUserMsg
              problemTitle = 'Pohon Runtuh';
              reportData.category = 'infrastruktur';
            } else {
              problemTitle = 'Laporan Masalah';
            }
            
            // Extract lokasi spesifik jika ada - prioritaskan dari pesan TERAKHIR
            let extractedLocation = '';
            const locationPatterns = [
              // Pattern untuk alamat lengkap: "jl cihuy blok c nomor 54"
              /(jalan|jl|jl\.|jl\s)\s*([a-z0-9\s]+?)(?:\s+(blok|block|no|nomor|rt|rw|kelurahan|kecamatan|kota|provinsi|depan|belakang|samping|dekat|di)\s+([a-z0-9\s\/]+))?/i,
              // Pattern untuk "di blok c nomor 5"
              /(di|dekat|depan|belakang|samping|area|lapangan|blok|block|jalan|rt|rw|taman|basket|sigma|futsal)\s+([a-z0-9\s\/]+)/i,
              // Pattern untuk "depan rumah"
              /(di depan|depan)\s+(rumah\s+(saya|saya|aku)?|rumah|jalan|portal|pos)/i,
            ];
            
            // Prioritas: cek lastUserMsg dulu, baru fullContext
            const textToExtractFrom = lastUserMsg;
            
            // PERBAIKAN: Pattern untuk "jl sigma nomor 69" atau "jl digidaw nomr 121" (tanpa blok)
            // Cek pattern sederhana dulu: "jl [nama jalan bisa multiple words] nomor [angka]"
            // PERBAIKAN: Gunakan greedy + untuk menangkap semua kata, tambahkan "nomr" (tanpa "o")
            const simpleAddressMatch = textToExtractFrom.match(/(jalan|jl|jl\.|jl\s)\s+([a-z\s]+)\s+(?:nomor|nomr|no|nmr|nomer)\s+([0-9]+)/i);
            if (simpleAddressMatch) {
              const namaJalan = simpleAddressMatch[2]?.trim() || '';
              const nomor = simpleAddressMatch[3]?.trim() || '';
              if (namaJalan && nomor) {
                // Capitalize setiap kata di nama jalan
                const namaJalanFormatted = namaJalan.split(/\s+/).map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ');
                extractedLocation = `Jl ${namaJalanFormatted} No ${nomor}`;
                console.log('📍 Location extracted (simple pattern):', extractedLocation);
              }
            }
            
            // Cek pattern alamat lengkap (jalan + blok + nomor)
            // Pattern: "jalan cihuy blok c nomor 54" atau "jl cihuy blok c no 54"
            // PERBAIKAN: Pattern lebih fleksibel untuk multiple words di nama jalan, tambahkan "nomr"
            if (!extractedLocation) {
              // Pattern yang lebih baik: menangkap multiple words sebelum "blok" atau "nomor", gunakan greedy +
              const fullAddressMatch = textToExtractFrom.match(/(jalan|jl|jl\.|jl\s)\s+([a-z0-9\s]+)(?:\s+(blok|block)\s+([a-z0-9\s\/]+))?(?:\s+(no|nomor|nomr|nmr|nomer)\s+([0-9]+))?/i);
            if (fullAddressMatch) {
              const jalan = fullAddressMatch[2]?.trim() || '';
              const blok = fullAddressMatch[4]?.trim() || '';
              const nomor = fullAddressMatch[6]?.trim() || '';
              
              if (jalan) {
                  // Capitalize setiap kata di nama jalan
                  const jalanFormatted = jalan.split(/\s+/).map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ');
                  
                  let locationParts = [`Jl ${jalanFormatted}`];
                  if (blok) {
                    const blokFormatted = blok.split(/\s+/).map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                    locationParts.push(`Blok ${blokFormatted}`);
                  }
                if (nomor) locationParts.push(`No ${nomor}`);
                extractedLocation = locationParts.join(', ');
                  console.log('📍 Location extracted (full pattern):', extractedLocation);
                }
              }
            }
            
            // Jika belum ketemu, cek pattern alternatif: "di jalan cihuy blok c nomor 54"
            // PERBAIKAN: Pattern lebih fleksibel untuk multiple words, tambahkan "nomr", gunakan greedy +
            if (!extractedLocation) {
              const altMatch = textToExtractFrom.match(/(di\s+)?(jalan|jl|jl\.|jl\s)\s+([a-z0-9\s]+)(?:\s+(blok|block)\s+([a-z0-9\s\/]+))?(?:\s+(no|nomor|nomr|nmr|nomer)\s+([0-9]+))?/i);
              if (altMatch) {
                const jalan = altMatch[3]?.trim() || '';
                const blok = altMatch[5]?.trim() || '';
                const nomor = altMatch[7]?.trim() || '';
                
                if (jalan) {
                  // Capitalize setiap kata di nama jalan
                  const jalanFormatted = jalan.split(/\s+/).map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ');
                  
                  let locationParts = [`Jl ${jalanFormatted}`];
                  if (blok) {
                    const blokFormatted = blok.split(/\s+/).map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                    locationParts.push(`Blok ${blokFormatted}`);
                  }
                  if (nomor) locationParts.push(`No ${nomor}`);
                  extractedLocation = locationParts.join(', ');
                  console.log('📍 Location extracted (alt pattern):', extractedLocation);
                }
              }
            }
            
            // Jika belum ketemu, cek pattern lainnya
            if (!extractedLocation) {
              for (const pattern of locationPatterns.slice(1)) {
              const match = textToExtractFrom.match(pattern);
              if (match) {
                if (match[0] && match[0].includes('depan rumah')) {
                  extractedLocation = 'Depan Rumah';
                } else if (match[2]) {
                  extractedLocation = match[2].trim();
                } else if (match[0]) {
                  extractedLocation = match[0].trim().replace(/^(di|dekat|depan)\s+/i, '');
                }
                break;
                }
              }
            }
            
            // Fallback: jika tidak ketemu di lastUserMsg, cek fullContext
            if (!extractedLocation && fullContext !== lastUserMsg) {
              const fullAddressMatchContext = fullContext.match(/(jalan|jl|jl\.|jl\s)\s*([a-z0-9\s]+?)(?:\s+(blok|block|no|nomor)\s+([a-z0-9\s\/]+))?/i);
              if (fullAddressMatchContext) {
                const jalan = fullAddressMatchContext[2]?.trim() || '';
                const blok = fullAddressMatchContext[4]?.trim() || '';
                if (jalan) {
                  extractedLocation = blok ? `Jl ${jalan}, ${blok}` : `Jl ${jalan}`;
                  const nomorMatch = fullContext.match(/(no|nomor)\s+([0-9]+)/i);
                  if (nomorMatch && nomorMatch[2]) {
                    extractedLocation += ` No ${nomorMatch[2]}`;
                  }
                }
              }
              
              if (!extractedLocation) {
                for (const pattern of locationPatterns.slice(1)) {
                const match = fullContext.match(pattern);
                if (match) {
                  if (match[0] && match[0].includes('depan rumah')) {
                    extractedLocation = 'Depan Rumah';
                  } else if (match[2]) {
                    extractedLocation = match[2].trim();
                  } else if (match[0]) {
                    extractedLocation = match[0].trim().replace(/^(di|dekat|depan)\s+/i, '');
                  }
                  break;
                  }
                }
              }
            }
            
            // PERBAIKAN: Replace placeholder di judul dengan lokasi yang benar
            // Jika judul mengandung placeholder seperti "di jalan bla bla", "di alamat", dll, replace dengan lokasi yang benar
            const placeholderPatterns = [
              /di\s+jalan\s+bla\s+bla/gi,
              /di\s+alamat/gi,
              /di\s+lokasi/gi,
              /di\s+tempat/gi,
              /di\s+\[alamat\]/gi,
              /di\s+\[lokasi\]/gi,
              /di\s+jalan\s+[a-z\s]+(?:\s+nomor\s+[0-9]+)?/gi // Pattern untuk "di jalan [kata] nomor [angka]" yang mungkin salah
            ];
            
            // Hapus placeholder dari judul terlebih dahulu
            let cleanTitle = problemTitle;
            placeholderPatterns.forEach(pattern => {
              cleanTitle = cleanTitle.replace(pattern, '');
            });
            cleanTitle = cleanTitle.trim();
            
            // Hanya tambahkan lokasi ke title jika lokasi spesifik (bukan generic)
            if (extractedLocation) {
              // Jangan tambahkan jika lokasi generic atau tidak jelas
              const genericLocations = ['alamat', 'lokasi', 'tempat', 'lokasi tidak disebutkan', 'tidak disebutkan', 'unknown'];
              const isGenericLocation = genericLocations.some(generic => 
                extractedLocation.toLowerCase().includes(generic)
              );
              
              // Hanya tambahkan jika lokasi spesifik dan tidak generic
              if (!isGenericLocation && extractedLocation.trim().length > 3) {
                // Pastikan lokasi belum ada di judul
                if (!cleanTitle.toLowerCase().includes(extractedLocation.toLowerCase())) {
                  cleanTitle += ` di ${extractedLocation}`;
                }
              }
            }
            
            // Fallback: jika ada reportData.location yang spesifik, gunakan itu
            if (reportData.location && reportData.location.trim() && 
                !reportData.location.toLowerCase().includes('tidak disebutkan') &&
                !reportData.location.toLowerCase().includes('alamat') &&
                reportData.location.trim().length > 3) {
              // Extract lokasi spesifik (hilangkan RT/RW jika ada)
              const specificLocation = reportData.location.split(',')[0].trim();
              // Cek apakah location belum ada di title
              if (!cleanTitle.toLowerCase().includes(specificLocation.toLowerCase()) && 
                  !cleanTitle.toLowerCase().includes('di ')) {
                cleanTitle += ` di ${specificLocation}`;
              }
            }
            
            // Final post-processing: Pastikan lokasi yang benar ada di judul
            // Jika lokasi sudah di-extract tapi belum ada di judul, tambahkan
            if (extractedLocation && !cleanTitle.toLowerCase().includes(extractedLocation.toLowerCase())) {
              const genericLocations = ['alamat', 'lokasi', 'tempat', 'lokasi tidak disebutkan', 'tidak disebutkan', 'unknown'];
              const isGenericLocation = genericLocations.some(generic => 
                extractedLocation.toLowerCase().includes(generic)
              );
              
              if (!isGenericLocation && extractedLocation.trim().length > 3) {
                // Hapus "di" di akhir jika ada, lalu tambahkan lokasi yang benar
                cleanTitle = cleanTitle.replace(/\s+di\s*$/gi, '').trim();
                cleanTitle += ` di ${extractedLocation}`;
              }
            }
            
            reportData.title = cleanTitle.substring(0, 100) || 'Laporan Masalah';
            reportData.description = (fullContext || lastUserMsg).length > 500 ? (fullContext || lastUserMsg).substring(0, 500) + '...' : (fullContext || lastUserMsg);
            
            // Set lokasi - prioritaskan extracted location dari pesan, bukan RT/RW generic
            // PENTING: Jangan set lokasi ke "Alamat" yang generic
            const genericLocationKeywords = ['alamat', 'lokasi', 'tempat', 'tidak disebutkan', 'unknown', '\\[alamat\\]', '\\[lokasi\\]'];
            const isExtractedLocationGeneric = extractedLocation && genericLocationKeywords.some(keyword => {
              const regex = new RegExp(keyword.replace(/\\/g, ''), 'i');
              return regex.test(extractedLocation);
            });
            
            // PERBAIKAN: Pastikan reportData.location juga tidak generic
            const isReportDataLocationGeneric = reportData.location && genericLocationKeywords.some(keyword => {
              const regex = new RegExp(keyword.replace(/\\/g, ''), 'i');
              return regex.test(reportData.location);
            });
            
            // Validasi lokasi yang di-extract dengan forward geocoding (optional, untuk task awal)
            let locationValidated = false;
            let locationWarning = null;
            
            if (extractedLocation && !isExtractedLocationGeneric) {
              // Validasi alamat dengan forward geocoding (jika GOOGLE_MAPS_API_KEY tersedia)
              try {
                const geocodeResult = await forwardGeocode(extractedLocation);
                if (geocodeResult) {
                  // Alamat valid, bisa dapat lat/lng untuk validasi lebih lanjut
                  locationValidated = true;
                  console.log('✅ Location validated via forward geocoding:', geocodeResult.formatted);
                  
                  // Note: RT/RW boundary validation dihapus karena field tidak ada di schema saat ini
                  // Jika diperlukan di masa depan, tambahkan field rtRwLatitude, rtRwLongitude, dll ke schema
                } else {
                  // Alamat tidak ditemukan (mungkin typo atau ngasal)
                  locationWarning = 'Alamat tidak ditemukan di Google Maps. Pastikan alamat benar.';
                  console.warn('⚠️ Address not found:', extractedLocation);
                }
              } catch (error) {
                console.error('❌ Location validation error:', error.message);
                // Continue dengan lokasi yang di-extract meskipun validasi gagal
              }
              
              reportData.location = extractedLocation + (user.rtRw ? `, ${user.rtRw}` : '');
              console.log('✅ Location set dari extracted:', reportData.location);
            } else if (reportData.location && !isReportDataLocationGeneric && 
                       reportData.location !== 'Lokasi tidak disebutkan' && 
                       reportData.location !== 'Alamat' &&
                       !reportData.location.toLowerCase().includes('alamat') &&
                       !reportData.location.toLowerCase().includes('[alamat]')) {
              // reportData.location sudah valid, tidak perlu diubah
              console.log('✅ Location sudah valid dari AI:', reportData.location);
            } else {
              // Fallback: gunakan RT/RW atau "Lokasi tidak disebutkan"
              reportData.location = user.rt_rw || 'Lokasi tidak disebutkan';
              console.log('⚠️  Location fallback ke RT/RW:', reportData.location);
            }
            
            // Simpan warning ke reportData untuk ditampilkan ke user
            if (locationWarning) {
              reportData.locationWarning = locationWarning;
            }
            reportData.urgency = reportData.urgency || 'medium';
          }
          
          // Cek apakah user minta kirim langsung/otomatis
          const mintaKirimLangsung = polaKirimLangsung.test(lastUserMsg);
          
          // Cek apakah ada gambar di reportData (SUDAH di-set di atas)
          const hasImageInReportData = !!reportData.imageUrl;
          
          // Cek lokasi valid (bukan generic) - pastikan lokasi sudah di-extract
          // Jika lokasi belum di-extract, coba extract dari lastUserMsg dengan pattern yang lebih baik
          if (!reportData.location || reportData.location === 'Lokasi tidak disebutkan' || reportData.location === 'Alamat' || reportData.location.toLowerCase() === 'alamat') {
            // Coba extract lokasi dari pesan dengan pattern yang lebih fleksibel
            // Pattern 1: "jl [multiple words] nomor [angka]" - PERBAIKAN: tambahkan "nomr", gunakan greedy +
            const simpleLocationMatch = lastUserMsg.match(/(jalan|jl|jl\.|jl\s)\s+([a-z\s]+)\s+(?:nomor|nomr|no|nmr|nomer)\s+([0-9]+)/i);
            if (simpleLocationMatch) {
              const namaJalan = simpleLocationMatch[2]?.trim() || '';
              const nomor = simpleLocationMatch[3]?.trim() || '';
              if (namaJalan && nomor) {
                const namaJalanFormatted = namaJalan.split(/\s+/).map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ');
                reportData.location = `Jl ${namaJalanFormatted} No ${nomor}` + (user.rt_rw ? `, ${user.rt_rw}` : '');
                console.log('📍 Lokasi di-extract dari pesan (simple pattern):', reportData.location);
              }
            } else {
              // Pattern 2: "jl [multiple words] blok [x] nomor [angka]" - PERBAIKAN: tambahkan "nomr", gunakan greedy +
              const fullLocationMatch = lastUserMsg.match(/(jalan|jl|jl\.|jl\s)\s+([a-z0-9\s]+)(?:\s+(blok|block)\s+([a-z0-9\s\/]+))?(?:\s+(no|nomor|nomr|nmr|nomer)\s+([0-9]+))?/i);
              if (fullLocationMatch) {
                const jalan = fullLocationMatch[2]?.trim() || '';
                const blok = fullLocationMatch[4]?.trim() || '';
                const nomor = fullLocationMatch[6]?.trim() || '';
              if (jalan) {
                  const jalanFormatted = jalan.split(/\s+/).map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ');
                  let locationParts = [`Jl ${jalanFormatted}`];
                  if (blok) {
                    const blokFormatted = blok.split(/\s+/).map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                    locationParts.push(`Blok ${blokFormatted}`);
                  }
                if (nomor) locationParts.push(`No ${nomor}`);
                  reportData.location = locationParts.join(', ') + (user.rt_rw ? `, ${user.rt_rw}` : '');
                  console.log('📍 Lokasi di-extract dari pesan (full pattern):', reportData.location);
                }
              }
            }
          }
          
          const hasValidLocation = reportData.location && 
                                   reportData.location !== 'Lokasi tidak disebutkan' &&
                                   reportData.location !== 'Alamat' &&
                                   reportData.location.length > 5;
          
          // Cek description valid (minimal ada isi) - jika belum ada, gunakan lastUserMsg
          if (!reportData.description || reportData.description.length < 5) {
            reportData.description = lastUserMsg.length > 500 ? lastUserMsg.substring(0, 500) : lastUserMsg;
          }
          const hasValidDescription = reportData.description && reportData.description.length > 5;
          
          // Informasi lengkap: title + description + lokasi valid
          const informasiLengkap = hasValidTitle && hasValidDescription && hasValidLocation;
          
          // SELALU BUAT DRAFT DULU - user harus konfirmasi via button
          // Auto-send HANYA jika user eksplisit minta "kirim langsung" atau "segera kirim"
          const hasProblemAndLocation = hasProblemKeyword && hasLocationKeyword;
          const canAutoSend = mintaKirimLangsung; // HANYA jika user minta kirim langsung
          
          // Log untuk debugging - DETAIL
          console.log('🔍 Draft creation check:', {
            mintaKirimLangsung,
            hasImageInReportData,
            hasImage: hasImage,
            hasProblemKeyword,
            hasLocationKeyword,
            hasProblemAndLocation,
            hasValidTitle,
            hasValidLocation,
            hasValidDescription,
            informasiLengkap,
            willAutoSend: canAutoSend,
            willCreateDraft: !canAutoSend,
            imageUrl: reportData.imageUrl ? 'present' : 'missing',
            location: reportData.location,
            title: reportData.title,
            description: reportData.description?.substring(0, 50) + '...',
            lastUserMsg: lastUserMsg.substring(0, 100)
          });
          
          // JANGAN create report jika ini pertanyaan kemampuan atau negasi
          // TAPI jika ada gambar + masalah + lokasi, LANGSUNG buat laporan (lebih agresif)
          const shouldCreateReport = !shouldSkipCreateReport && (
            hasValidTitle || 
            (hasClearProblem && looksLikeReport) || 
            (hasExplicitCreateRequest && prevMessagesHaveProblem) ||
            (hasImageInReportData && hasProblemKeyword && hasLocationKeyword) // Jika ada gambar + masalah + lokasi, langsung buat
          );
          
          if (shouldCreateReport) {
          try {
            // SELALU BUAT DRAFT DULU - user harus konfirmasi via button
            // Auto-send HANYA jika user eksplisit minta "kirim langsung"
            if (canAutoSend && mintaKirimLangsung) {
              console.log('🚀 AUTO-SEND (user minta kirim langsung)');
              
              // Pastikan description ada (jika belum ada, gunakan pesan user)
              if (!reportData.description || reportData.description.length < 5) {
                reportData.description = lastUserMsg.length > 500 ? lastUserMsg.substring(0, 500) : lastUserMsg;
              }
              
              // Langsung buat laporan tanpa draft
              const { createdReport, txHash } = await buatLaporanDenganAI(reportData, idUser, roleUser);
              
              // Catat percakapan untuk training data
              const waktuRespon = Date.now() - waktuMulai;
              try {
                await prisma.chatbotConversation.create({
                  data: {
                    userId: idUser,
                    userRole: roleUser,
                    messages: messages,
                    detectedIntent: intentTerdeteksi || 'CREATE_REPORT',
                    aiModelUsed: modelAIDigunakan,
                    responseTimeMs: waktuRespon
                  }
                });
              } catch (errorLog) {
                console.error('⚠️  Failed to log conversation:', errorLog.message);
              }
              
              // Response singkat untuk auto-send
            return res.json({
                reply: `✅ **Laporan berhasil dikirim!**\n\n` +
                  `📋 ID: #${createdReport.id} | 📍 ${createdReport.location}\n` +
                  `🏷️ ${createdReport.category} | ⚡ ${createdReport.urgency}\n\n` +
                  `Lihat detail di Dashboard → Laporan Saya.`,
                reportCreated: true,
                reportId: createdReport.id,
                report: createdReport,
              });
            }
            
            // SELALU BUAT DRAFT - user harus konfirmasi via button
            console.log('📋 Creating draft (user harus konfirmasi via button)', {
              title: reportData.title,
              location: reportData.location,
              hasImage: !!reportData.imageUrl,
              hasValidTitle,
              hasValidLocation,
              hasImageInReportData
            });
            
            // Pastikan imageUrl tersimpan di draft
            if (hasImage && messageWithImage && !reportData.imageUrl) {
              reportData.imageUrl = messageWithImage.imageUrl || messageWithImage.image_url;
              console.log('📷 Menambahkan imageUrl ke draft:', !!reportData.imageUrl);
            }
            
            simpanDraftTertunda(idUser, reportData);
            console.log('💾 [Chat] Draft disimpan untuk userId:', idUser, {
              title: reportData.title,
              location: reportData.location,
              hasImage: !!reportData.imageUrl
            });

            // Catat percakapan untuk training data
            const waktuResponDraft = Date.now() - waktuMulai;
            try {
              await prisma.chatbotConversation.create({
                data: {
                  userId: idUser,
                  userRole: roleUser,
                  messages: messages,
                  detectedIntent: intentTerdeteksi || 'CREATE_REPORT',
                  aiModelUsed: modelAIDigunakan,
                  responseTimeMs: waktuResponDraft
                }
              });
            } catch (errorLog) {
              console.error('⚠️  Failed to log conversation:', errorLog.message);
            }

            // Response singkat untuk draft - SELALU sertakan reportData untuk CTA button
            console.log('📤 [Chat] Mengirim response draft dengan CTA button:', {
              hasReportData: !!reportData,
              title: reportData.title,
              location: reportData.location,
              hasImage: !!reportData.imageUrl,
              userId: idUser
            });
            
            // Verifikasi draft tersimpan
            const draftVerifikasi = ambilDraftTertunda(idUser);
            console.log('✅ [Chat] Verifikasi draft tersimpan:', {
              hasDraft: !!draftVerifikasi,
              draftTitle: draftVerifikasi?.reportData?.title
            });
            
            return res.json({
              reply: `Baik ${userTerformat.name}! 😊 Saya sudah membuatkan draft laporan untuk Anda:\n\n` +
                `📝 **${reportData.title || 'Laporan Masalah'}**\n` +
                `📍 **Lokasi:** ${reportData.location || 'Lokasi'}\n` +
                `${reportData.imageUrl ? `📷 **Foto:** Terlampir\n` : ''}` +
                `\nSilakan review draft di atas. Jika sudah sesuai, klik tombol **"Kirim Laporan"** di bawah untuk mengirim. Terima kasih! 🙏`,
              reportData: reportData, // SELALU sertakan reportData
              previewMode: true, // SELALU true untuk draft
              awaitingConfirmation: true, // SELALU true untuk draft
            });
          } catch (createError) {
            console.error('❌ Error menyiapkan draft report:', createError.message);
            return res.json({
              reply: 'Maaf, ada kendala saat menyiapkan draf laporan. Silakan ulangi dengan menyebutkan masalah dan lokasi, atau coba lagi sebentar.',
            });
          }
          } else {
            // Title kosong atau tidak valid
            // TAPI jika ada gambar + masalah + lokasi, tetap buat draft (tidak perlu title perfect)
            if (hasImageInReportData && hasProblemKeyword && hasLocationKeyword && hasValidLocation) {
              console.log('📋 Membuat draft meskipun title belum perfect (ada gambar + masalah + lokasi)');
              
              // Buat title sederhana dari masalah
              if (!reportData.title || reportData.title.length <= 3) {
                if (/(selokan|got).*mampet|mampet.*(selokan|got)/i.test(lastUserMsg)) {
                  reportData.title = 'Got/Selokan Mampet';
                  reportData.category = 'infrastruktur';
                } else {
                  reportData.title = 'Laporan Masalah';
                }
              }
              
              // Pastikan description ada
              if (!reportData.description || reportData.description.length < 5) {
                reportData.description = lastUserMsg.length > 500 ? lastUserMsg.substring(0, 500) : lastUserMsg;
              }
              
              // Simpan draft
              simpanDraftTertunda(idUser, reportData);
              
              // Catat percakapan
              const waktuResponDraft = Date.now() - waktuMulai;
              try {
                await prisma.chatbotConversation.create({
                  data: {
                    userId: idUser,
                    userRole: roleUser,
                    messages: messages,
                    detectedIntent: 'CREATE_REPORT',
                    aiModelUsed: 'rule-based',
                    responseTimeMs: waktuResponDraft
                  }
                });
              } catch (errorLog) {
                console.error('⚠️  Failed to log conversation:', errorLog.message);
              }
              
              // Return draft dengan CTA button
      return res.json({
                reply: `Baik ${userTerformat.name}! 😊 Saya sudah membuatkan draft laporan untuk Anda:\n\n` +
                  `📝 **${reportData.title}**\n` +
                  `📍 **Lokasi:** ${reportData.location}\n` +
                  `${reportData.imageUrl ? `📷 **Foto:** Terlampir\n` : ''}` +
                  `\nSilakan review draft di atas. Jika sudah sesuai, klik tombol **"Kirim Laporan"** di bawah untuk mengirim. Terima kasih! 🙏`,
                reportData: reportData,
                previewMode: true,
                awaitingConfirmation: true,
              });
            }
            
            // Jika tidak ada gambar + masalah + lokasi, skip dan lanjut ke AI chat
            console.log('⚠️  Report tidak dibuat, lanjut ke AI general chat:', {
              shouldSkipCreateReport,
              hasValidTitle,
              hasClearProblem,
              looksLikeReport,
              hasExplicitCreateRequest,
              prevMessagesHaveProblem,
              hasImageInReportData,
              hasProblemKeyword,
              hasLocationKeyword
            });
          }
        } catch (aiError) {
          // Fallback jika AI error - lanjut ke AI general chat atau manual fallback
          console.error('AI generation error:', aiError);
          // Jangan return early, biarkan lanjut ke AI general chat di bawah
        }
      }
      
      // Jika sampai sini dan masih belum return (title kosong atau AI gagal), 
      // lanjut ke AI general chat di bawah (tidak return early)
    }

    // Hapus semua fallback statis - biarkan AI yang handle semua pertanyaan

    // Coba AI untuk pertanyaan umum (Groq)
    // Bangun riwayat percakapan untuk konteks (maksimal 4 pesan terakhir untuk efisiensi)
    const riwayatPercakapan = messages.slice(-5, -1).map((m) => {
      return m.role === 'user' ? `User: ${m.content}` : `Asisten: ${m.content}`;
    }).join('\n');
    
    // Tambahkan konteks khusus untuk pertanyaan kemampuan
    let konteksTambahan = '';
    if (isQuestion || hasNegation || intent.intent === 'ASK_CAPABILITY' || intent.intent === 'NEGATION') {
      konteksTambahan = '\n\n**PENTING:** User bertanya tentang kemampuan atau menyatakan negasi. JANGAN buat laporan otomatis. Jawab pertanyaannya dengan ramah dan jelaskan cara membuat laporan jika diminta.';
    }
    
    // PENTING: Jangan biarkan AI bilang hal yang salah atau berikan format laporan panjang
    konteksTambahan += '\n\n**PENTING:** JANGAN pernah bilang "masih dalam tahap pengembangan", "masih development", atau "akan diintegrasikan nanti". Sistem LaporIn SUDAH TERINTEGRASI dengan database dan laporan langsung tersimpan. JANGAN bilang "laporan telah dikirimkan" atau "akan dikirimkan" - sistem yang handle pengiriman. JANGAN minta user memilih jenis laporan (1-7) - sistem yang otomatis menentukan kategori. JANGAN buat nomor laporan palsu seperti "#LAPORIN001". JANGAN berikan format laporan panjang seperti "Laporan Pelaporan RT/RW", "Tanggal Laporan: [tanggal]", "Nomor Pelaporan: [nomor]", "Kota/Kabupaten", "Alamat:", dll. Jika user sebutkan masalah + lokasi + gambar, sistem akan OTOMATIS membuat draft dengan tombol konfirmasi. Kamu hanya perlu merespons SINGKAT (1-2 kalimat) bahwa draft sudah dibuat, TANPA format laporan panjang.';
    
    // Buat prompt user yang lebih sederhana dan langsung
    const promptUser = pesanTeredit;

    // Coba model AI (Groq GRATIS dulu, lalu OpenAI, lalu Gemini)
    let balasanAI = '';
    
    if (groq) {
      // Coba Groq dulu (GRATIS & CEPAT) dengan prompt yang lebih baik
      try {
        // Bangun messages dengan konteks yang lebih sederhana dan efektif
        // Hanya ambil 3 pesan terakhir untuk konteks (lebih efisien)
        const contextMessages = messages.slice(-4, -1).map(m => ({
          role: m.role,
          content: m.content.substring(0, 300) // Limit lebih ketat untuk efisiensi
        }));
        
        const pesanAI = [
          promptSistem,
          ...contextMessages,
          { 
            role: 'user', 
            content: promptUser
          }
        ];
        
        console.log('📤 Sending to Groq:', {
          messagesCount: pesanAI.length,
          lastUserMessage: promptUser.substring(0, 100),
          systemPromptLength: promptSistem.content.length
        });
        
        const hasil = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant', // Fast & free, active model
          messages: pesanAI,
          temperature: 0.7, // Dinaikkan sedikit untuk lebih natural
          max_tokens: 500, // Optimal untuk jawaban yang jelas
          top_p: 0.9,
          frequency_penalty: 0.5, // Lebih tinggi untuk mengurangi pengulangan
          presence_penalty: 0.4, // Lebih tinggi untuk variasi topik
        });
        balasanAI = hasil.choices?.[0]?.message?.content || '';
        if (balasanAI) {
          console.log('✅ Groq chat response successful, length:', balasanAI.length);
        } else {
          console.warn('⚠️  Groq returned empty response');
        }
      } catch (errorGroq) {
        console.error('❌ Groq API error:', errorGroq.message);
        console.error('❌ Groq error details:', JSON.stringify(errorGroq.response || errorGroq, null, 2));
        // Groq failed, will retry with simpler prompt
      }
    }

    // Jika AI berhasil, return balasan
    if (balasanAI) {
      // Catat percakapan untuk supervised training
      const waktuRespon = Date.now() - waktuMulai;
      try {
        await prisma.chatbotConversation.create({
          data: {
            userId: idUser,
            userRole: roleUser,
            messages: messages,
            detectedIntent: intentTerdeteksi || intent.intent || 'GENERAL_CHAT',
            aiModelUsed: modelAIDigunakan,
            responseTimeMs: waktuRespon
          }
        });
      } catch (errorLog) {
        console.error('⚠️  Failed to log conversation:', errorLog.message);
      }
      
      // Cek apakah ada draft yang sudah dibuat sebelumnya
      const draftAI = ambilDraftTertunda(idUser);
      const responseData = { reply: balasanAI };
      
      // SELALU sertakan reportData jika ada draft
      if (draftAI && draftAI.reportData) {
        responseData.reportData = draftAI.reportData;
        responseData.previewMode = true;
        responseData.awaitingConfirmation = true;
        console.log('📋 [Chat] Menyertakan draft reportData dalam AI general response:', {
          title: draftAI.reportData.title,
          location: draftAI.reportData.location
        });
      }
      
      return res.json(responseData);
    }

    // Jika AI gagal, coba lagi dengan prompt yang lebih sederhana tapi tetap dengan konteks
    if (groq) {
      try {
        console.warn('⚠️  First AI attempt failed, retrying with simpler prompt...');
        const pesanAISederhana = [
          {
            role: 'system',
            content: `Kamu adalah Asisten LaporIn - AI assistant untuk platform pelaporan RT/RW berbasis AI & Blockchain.

**Fitur LaporIn:**
- Pelaporan masalah warga (infrastruktur, sosial, administrasi, bantuan)
- AI assistant untuk auto-create laporan
- Blockchain audit trail (Polygon Mumbai)
- Dashboard analytics untuk pengurus
- Manajemen laporan dan user

**Status Laporan:** pending, in_progress, resolved, rejected, cancelled

Jawab dalam Bahasa Indonesia dengan singkat, jelas, dan ramah. User: ${userTerformat.name}, Role: ${roleUser}, RT/RW: ${userTerformat.rt_rw || 'belum diatur'}.`
          },
          ...messages.slice(-2, -1).map(m => ({
            role: m.role,
            content: m.content.substring(0, 300)
          })),
          { role: 'user', content: pesanTeredit }
        ];
        
        const hasilRetry = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: pesanAISederhana,
          temperature: 0.6,
          max_tokens: 500,
        });
        
        const balasanRetry = hasilRetry.choices?.[0]?.message?.content || '';
        if (balasanRetry) {
          console.log('✅ Groq retry successful');
          const waktuRespon = Date.now() - waktuMulai;
          try {
            await prisma.chatbotConversation.create({
              data: {
                userId: idUser,
                userRole: roleUser,
                messages: messages,
                detectedIntent: intentTerdeteksi || 'GENERAL_CHAT',
                aiModelUsed: 'groq-retry',
                responseTimeMs: waktuRespon
              }
            });
          } catch (errorLog) {
            console.error('⚠️  Failed to log conversation:', errorLog.message);
          }
          
          // Cek apakah ada draft yang sudah dibuat sebelumnya
          const draftRetry = ambilDraftTertunda(idUser);
          const responseData = { reply: balasanRetry };
          
          // SELALU sertakan reportData jika ada draft
          if (draftRetry && draftRetry.reportData) {
            responseData.reportData = draftRetry.reportData;
            responseData.previewMode = true;
            responseData.awaitingConfirmation = true;
            console.log('📋 [Chat Retry] Menyertakan draft reportData:', {
              title: draftRetry.reportData.title,
              location: draftRetry.reportData.location
            });
          }
          
          return res.json(responseData);
        }
      } catch (retryError) {
        console.error('❌ Groq retry also failed:', retryError.message);
      }
    }

    // Fallback terakhir: minimal response dengan info error
    console.error('❌ All AI attempts failed, using minimal fallback');
    const waktuRespon = Date.now() - waktuMulai;
    try {
      await prisma.chatbotConversation.create({
        data: {
          userId: idUser,
          userRole: roleUser,
          messages: messages,
          detectedIntent: intentTerdeteksi || 'ERROR',
          aiModelUsed: 'fallback',
          responseTimeMs: waktuRespon
        }
      });
    } catch (errorLog) {
      console.error('⚠️  Failed to log conversation:', errorLog.message);
    }
    
    // Cek apakah ada draft yang sudah dibuat sebelumnya
    const draftFallback = ambilDraftTertunda(idUser);
    const responseData = {
      reply: `Maaf ${userTerformat.name}, terjadi kendala saat memproses permintaan Anda. Silakan coba lagi sebentar atau gunakan fitur di Dashboard untuk akses langsung. Jika masalah berlanjut, hubungi administrator.`
    };
    
    // SELALU sertakan reportData jika ada draft
    if (draftFallback && draftFallback.reportData) {
      responseData.reportData = draftFallback.reportData;
      responseData.previewMode = true;
      responseData.awaitingConfirmation = true;
      console.log('📋 [Chat Fallback] Menyertakan draft reportData:', {
        title: draftFallback.reportData.title,
        location: draftFallback.reportData.location
      });
    }
    
    return res.json(responseData);
  } catch (e) {
    // Jangan gagal total: balas fallback 200 agar UI tetap jalan
    console.error('❌ Chat route error:', e.message);
    console.error('❌ Error stack:', e.stack);
    console.error('❌ Request body:', JSON.stringify(req.body, null, 2));
    
    // Coba sekali lagi dengan AI jika masih bisa
    if (groq && req.body?.messages) {
      try {
        const lastMessage = req.body.messages[req.body.messages.length - 1]?.content || '';
        const simplePrompt = [
          {
            role: 'system',
            content: `Kamu adalah Asisten LaporIn untuk platform pelaporan RT/RW. Jawab dalam Bahasa Indonesia dengan singkat dan jelas. User: ${req.user?.name || 'User'}, Role: ${req.user?.role || 'warga'}.`
          },
          { role: 'user', content: lastMessage }
        ];
        
        const emergencyResponse = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: simplePrompt,
          temperature: 0.7,
          max_tokens: 400,
        });
        
        const emergencyReply = emergencyResponse.choices?.[0]?.message?.content || '';
        if (emergencyReply) {
          console.log('✅ Emergency AI response successful');
          
          // Cek apakah ada draft yang sudah dibuat sebelumnya
          const draftEmergency = ambilDraftTertunda(req.user?.userId || idUser);
          const responseData = { reply: emergencyReply };
          
          // SELALU sertakan reportData jika ada draft
          if (draftEmergency && draftEmergency.reportData) {
            responseData.reportData = draftEmergency.reportData;
            responseData.previewMode = true;
            responseData.awaitingConfirmation = true;
            console.log('📋 [Chat Emergency] Menyertakan draft reportData:', {
              title: draftEmergency.reportData.title,
              location: draftEmergency.reportData.location
            });
          }
          
          return res.json(responseData);
        }
      } catch (emergencyError) {
        console.error('❌ Emergency AI also failed:', emergencyError.message);
    }
    }
    
    // Fallback terakhir dengan pesan yang lebih informatif
    const errorReply = `Maaf, terjadi kendala saat memproses permintaan Anda. Silakan coba lagi atau gunakan fitur di Dashboard. Jika masalah berlanjut, hubungi administrator.`;
    
    // Catat percakapan error
    try {
      await prisma.chatbotConversation.create({
        data: {
          userId: req.user?.userId || null,
          userRole: req.user?.role || 'unknown',
          messages: req.body?.messages || [],
          detectedIntent: 'ERROR',
          aiModelUsed: 'error-fallback',
          responseTimeMs: Date.now() - waktuMulai
        }
      });
    } catch (errorLog) {
      // Ignore logging errors
    }
    
    res.json({ reply: errorReply });
  }
});

module.exports = router;
