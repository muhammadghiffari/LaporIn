const express = require('express');
const router = express.Router();
require('dotenv').config();
const { detectIntent, redactPII } = require('./nlp.routes');
const { authenticate } = require('../middleware/auth');
const pool = require('../database/db');
const { processReport } = require('../services/aiService');
const { logReportToBlockchain } = require('../services/blockchainService');
const { ethers } = require('ethers');

// Simpan draft laporan yang sudah dirangkum AI agar bisa dikonfirmasi dulu
const pendingReportDrafts = new Map(); // key: userId, value: { reportData, expiresAt }
const DRAFT_TTL_MS = 10 * 60 * 1000; // 10 menit

function getPendingDraft(userId) {
  const draft = pendingReportDrafts.get(userId);
  if (!draft) return null;
  if (Date.now() > draft.expiresAt) {
    pendingReportDrafts.delete(userId);
    return null;
  }
  return draft;
}

function setPendingDraft(userId, reportData) {
  pendingReportDrafts.set(userId, {
    reportData,
    expiresAt: Date.now() + DRAFT_TTL_MS,
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

// Knowledge base yang lebih dalam untuk training AI
const FAQS = [
  {
    q: ['buat laporan', 'cara lapor', 'bagaimana membuat laporan', 'mau buat laporan', 'ingin membuat laporan'],
    a: 'Untuk membuat laporan: buka Dashboard → isi formulir "Buat Laporan Baru" dengan judul, deskripsi, dan lokasi. Sertakan detail jelas agar cepat ditindak. Atau langsung sebutkan masalahnya via chat, saya akan buatkan laporan otomatis!',
  },
  {
    q: ['pending', 'status pending', 'apa itu pending', 'apa arti pending'],
    a: 'Pending = laporan baru diterima dan menunggu verifikasi/penugasan. Saat petugas mulai menangani, status berubah ke in_progress (sedang diproses). Saat selesai, berubah ke resolved (selesai). Jika ditolak, status menjadi rejected. Semua perubahan status dicatat di blockchain untuk audit trail.',
  },
  {
    q: ['status laporan', 'cek status', 'laporan saya gimana', 'progres laporan', 'gimana laporan saya'],
    a: 'Status laporan: pending (menunggu), in_progress (sedang ditangani), resolved (selesai), rejected (ditolak). Buka Dashboard → Laporan Saya untuk melihat daftar dan timeline perubahan status. Setiap perubahan dicatat di blockchain.',
  },
  {
    q: ['blockchain', 'on-chain', 'hash', 'blockchain apa', 'fungsi blockchain'],
    a: 'Blockchain di LaporIn dipakai sebagai jejak audit yang tidak bisa diubah. Setiap aksi penting (buat laporan, ubah status) dicatat di blockchain Polygon Mumbai dan menampilkan transaction hash yang bisa diverifikasi di Polygonscan. Ini memastikan transparansi dan keamanan data.',
  },
  {
    q: ['kategori', 'urgensi', 'ai', 'kategori apa saja', 'urgensi apa saja'],
    a: 'AI membantu memberi ringkasan, kategori (infrastruktur/sosial/administrasi/bantuan), dan urgensi (low/medium/high). Kategori: infrastruktur (jalan, lampu, got, pohon), sosial (kebisingan, konflik), administrasi (surat, dokumen), bantuan (bansos). Urgensi: high (darurat), medium (mengganggu), low (umum). Pengurus dapat mengoreksi bila perlu.',
  },
  {
    q: ['aplikasi apa', 'ini aplikasi apa', 'apa itu laporin', 'laporin apa'],
    a: 'LaporIn adalah aplikasi pelaporan RT/RW berbasis AI dan Blockchain. Fitur: pelaporan masalah warga, AI assistant untuk auto-processing, blockchain audit trail, dashboard analytics untuk pengurus. Tujuannya meningkatkan efisiensi dan transparansi pengelolaan laporan di level RT/RW.',
  },
];

function findFaqAnswer(text) {
  const t = (text || '').toLowerCase();
  for (const f of FAQS) {
    if (f.q.some((k) => t.includes(k))) {
      return f.a;
    }
  }
  return null;
}

async function createReportWithAI(reportData, userId) {
  const fullText = `${reportData.title}. ${reportData.description}`;
  const aiResult = await processReport(fullText);

  const result = await pool.query(
    `INSERT INTO reports (user_id, title, description, location, category, urgency, ai_summary, status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') 
     RETURNING *`,
    [
      userId,
      reportData.title,
      reportData.description,
      reportData.location,
      reportData.category || aiResult.category,
      reportData.urgency || aiResult.urgency,
      aiResult.summary,
    ]
  );

  const createdReport = result.rows[0];

  await pool.query(
    `INSERT INTO ai_processing_log (report_id, original_text, ai_summary, ai_category, ai_urgency, processing_time_ms) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      createdReport.id,
      fullText,
      aiResult.summary,
      reportData.category || aiResult.category,
      reportData.urgency || aiResult.urgency,
      aiResult.processingTime || 0,
    ]
  );

  await pool.query(
    `INSERT INTO report_status_history (report_id, status, updated_by) 
     VALUES ($1, 'pending', $2)`,
    [createdReport.id, userId]
  );

  const metaHash = ethers.id(fullText).substring(0, 10);
  const txHash = await logReportToBlockchain(createdReport.id, 'pending', metaHash);

  if (txHash) {
    await pool.query('UPDATE reports SET blockchain_tx_hash = $1 WHERE id = $2', [
      txHash,
      createdReport.id,
    ]);
    createdReport.blockchain_tx_hash = txHash;
  }

  if (typeof global !== 'undefined' && global.eventEmitter) {
    global.eventEmitter.emit('report-created', { reportId: createdReport.id });
  }

  return { createdReport, txHash };
}

// Helper function untuk fetch statistik laporan berdasarkan role
async function getReportStatsForUser(userId, userRole, rtRw) {
  try {
    if (userRole === 'warga') {
      // Untuk warga, hanya statistik laporan mereka sendiri
      const totalResult = await pool.query('SELECT COUNT(*)::int as total FROM reports WHERE user_id = $1', [userId]);
      const pendingResult = await pool.query("SELECT COUNT(*)::int as total FROM reports WHERE user_id = $1 AND status = 'pending'", [userId]);
      const inProgressResult = await pool.query("SELECT COUNT(*)::int as total FROM reports WHERE user_id = $1 AND status = 'in_progress'", [userId]);
      const resolvedResult = await pool.query("SELECT COUNT(*)::int as total FROM reports WHERE user_id = $1 AND status = 'resolved'", [userId]);
      
      return {
        total: totalResult.rows[0]?.total || 0,
        pending: pendingResult.rows[0]?.total || 0,
        in_progress: inProgressResult.rows[0]?.total || 0,
        resolved: resolvedResult.rows[0]?.total || 0,
      };
    } else {
      // Untuk pengurus/admin, statistik semua laporan (atau berdasarkan RT/RW)
      let query = 'SELECT COUNT(*)::int as total FROM reports WHERE 1=1';
      const params = [];
      
      if (rtRw && userRole !== 'admin') {
        query += ' AND location LIKE $1';
        params.push(`%${rtRw}%`);
      }
      
      const totalResult = await pool.query(query, params);
      
      let pendingQuery = "SELECT COUNT(*)::int as total FROM reports WHERE status = 'pending'";
      let inProgressQuery = "SELECT COUNT(*)::int as total FROM reports WHERE status = 'in_progress'";
      let resolvedQuery = "SELECT COUNT(*)::int as total FROM reports WHERE status = 'resolved'";
      
      if (rtRw && userRole !== 'admin') {
        pendingQuery += ' AND location LIKE $1';
        inProgressQuery += ' AND location LIKE $1';
        resolvedQuery += ' AND location LIKE $1';
      }
      
      const pendingResult = await pool.query(pendingQuery, params.length > 0 ? params : []);
      const inProgressResult = await pool.query(inProgressQuery, params.length > 0 ? params : []);
      const resolvedResult = await pool.query(resolvedQuery, params.length > 0 ? params : []);
      
      return {
        total: totalResult.rows[0]?.total || 0,
        pending: pendingResult.rows[0]?.total || 0,
        in_progress: inProgressResult.rows[0]?.total || 0,
        resolved: resolvedResult.rows[0]?.total || 0,
      };
    }
  } catch (error) {
    console.error('Error fetching report stats:', error);
    return null;
  }
}

router.post('/', authenticate, async (req, res) => {
  const startTime = Date.now();
  let detectedIntent = null;
  let aiModelUsed = 'groq';
  let conversationLogId = null;
  
  try {
    // Get user info from DB
    const userId = req.user.userId;
    const userRole = req.user.role;
    const userResult = await pool.query('SELECT id, name, email, role, rt_rw FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Fetch statistik laporan untuk konteks AI
    const reportStats = await getReportStatsForUser(userId, userRole, user.rt_rw);

    let { messages = [] } = req.body || {};
    if (!Array.isArray(messages)) {
      messages = [];
    }
    messages = messages
      .filter((m) => m && typeof m.content === 'string')
      .map((m) => ({
        role: m.role === 'user' || m.role === 'assistant' ? m.role : 'user',
        content: String(m.content).slice(0, 4000),
      }))
      .slice(-12); // limit context

    // Customize system prompt per role dengan data real-time
    let roleContext = '';
    let dataContext = '';
    
    if (userRole === 'warga') {
      roleContext = `Kamu sedang membantu warga bernama ${user.name} (RT/RW: ${user.rt_rw || 'belum diatur'}). 
- Fokus pada cara membuat laporan, cek status laporan, dan FAQ umum.
- Jawab dengan ramah dan membantu dalam Bahasa Indonesia.`;
      
      if (reportStats) {
        dataContext = `**Data Laporan User:**
- Total laporan: ${reportStats.total}
- Menunggu (pending): ${reportStats.pending}
- Sedang diproses (in_progress): ${reportStats.in_progress}
- Selesai (resolved): ${reportStats.resolved}

Gunakan data ini untuk menjawab pertanyaan tentang jumlah laporan, status, atau progres.`;
      }
    } else if (['admin', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'pengurus'].includes(userRole)) {
      const roleName = userRole === 'admin' ? 'Admin Sistem' : userRole === 'admin_rw' ? 'Admin RW' : userRole === 'ketua_rt' ? 'Ketua RT' : userRole === 'sekretaris_rt' ? 'Sekretaris RT' : 'Pengurus';
      roleContext = `Kamu sedang membantu ${roleName} bernama ${user.name} (RT/RW: ${user.rt_rw || 'semua wilayah'}).
- Fokus pada manajemen laporan, statistik, penugasan, dan update status.
- Bantu dengan informasi tentang antrian laporan, distribusi status, dan cara menindaklanjuti laporan.
- Jawab SEMUA pertanyaan tentang data, statistik, jumlah laporan dengan JAWABAN SPESIFIK menggunakan data real-time yang tersedia.
- Jangan memberikan jawaban generik jika user bertanya tentang statistik spesifik.`;
      
      if (reportStats) {
        dataContext = `**Data Laporan Real-time (${user.rt_rw || 'Semua Wilayah'}):**
- Total laporan: ${reportStats.total}
- Menunggu (pending/antrian): ${reportStats.pending}
- Sedang diproses (in_progress): ${reportStats.in_progress}
- Selesai (resolved): ${reportStats.resolved}

**PENTING:** Jika user bertanya:
- "Antrian sisa berapa?" → Jawab: "Saat ini ada ${reportStats.pending} laporan yang masih menunggu (pending)."
- "Laporan ada berapa totalnya?" → Jawab: "Total ada ${reportStats.total} laporan. Rinciannya: ${reportStats.pending} menunggu, ${reportStats.in_progress} sedang diproses, ${reportStats.resolved} sudah selesai."
- "Berapa laporan pending?" → Jawab: "Ada ${reportStats.pending} laporan yang masih menunggu tindak lanjut."
- Pertanyaan serupa tentang jumlah/statistik → Gunakan data di atas untuk jawaban SPESIFIK.

JANGAN memberikan jawaban generik seperti "warga dapat membuat laporan" jika user bertanya tentang STATISTIK atau DATA.`;
      }
    } else {
      roleContext = `Kamu sedang membantu pengguna bernama ${user.name}.`;
    }

    const systemPrompt = {
      role: 'system',
      content: `Kamu adalah asisten AI yang sangat pintar untuk aplikasi LaporIn (Platform Laporan Warga RT/RW berbasis AI & Blockchain). Jawab dalam Bahasa Indonesia dengan singkat, jelas, dan sopan.

${roleContext}

${dataContext}

**PERHATIAN PENTING:**
1. **Pertanyaan Statistik/Data:** Jika user bertanya tentang jumlah laporan, antrian, statistik - JAWAB dengan data spesifik dari konteks di atas. JANGAN berikan jawaban generik.
2. **Pertanyaan Identitas:** Jika user tanya "saya siapa" atau "kamu siapa", jawab dengan jelas sesuai role dan nama user.
3. **Laporan Masalah:** Jika user menyebutkan masalah infrastruktur/masalah (contoh: "lampu mati", "jalan rusak", "got mampet"), ini adalah LAPORAN MASALAH dan harus langsung dibuat laporan otomatis.
4. **Salam/Ucapan:** Jika user hanya mengucapkan terima kasih/salam (contoh: "terima kasih", "okee", "baik"), ini BUKAN laporan - cukup balas ramah.
5. **Konteks:** Selalu pahami konteks percakapan sebelumnya sebelum merespon.

**Panduan Jawaban:**
- Status laporan: pending (menunggu), in_progress (sedang ditangani), resolved (selesai), rejected (ditolak)
- Semua perubahan status dicatat di blockchain sebagai jejak audit yang tidak bisa diubah
- Jangan meminta atau menampilkan data sensitif (password, token)
- Jika user ingin membuat laporan, langsung buatkan struktur laporannya ATAU buatkan laporan otomatis
- Untuk pertanyaan statistik, SELALU gunakan data real-time yang tersedia
- Pahami konteks percakapan - jika user menyebutkan masalah sebelumnya dan sekarang minta "buatin laporan", gabungkan informasi dari percakapan
- Jangan mengulang jawaban yang sama - jika sudah jawab, lanjut ke tindakan atau pertanyaan follow-up
- Jika user minta bantuan atau ingin membuat laporan TANPA menyebutkan masalah, tanya apa masalahnya dengan ramah
- Jangan mengatakan "sama-sama" atau "terima kasih" jika belum ada tindakan yang dilakukan - tunggu user yang mengucapkan terima kasih terlebih dahulu

**Konteks Aplikasi:**
- LaporIn adalah platform pelaporan RT/RW dengan AI dan Blockchain
- Fitur: Pelaporan masalah, AI assistant, Blockchain audit, Dashboard analytics
- User saat ini login sebagai: ${userRole === 'warga' ? 'Warga' : userRole === 'admin' ? 'Admin Sistem' : userRole === 'admin_rw' ? 'Admin RW' : userRole === 'ketua_rt' ? 'Ketua RT' : userRole === 'sekretaris_rt' ? 'Sekretaris RT' : userRole === 'pengurus' ? 'Pengurus' : userRole}`,
    };

    // Try FAQ quick answer first / intent routing
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const redacted = redactPII(lastUserMsg);
    const intent = detectIntent(lastUserMsg);
    detectedIntent = intent.intent;
    const lowerMsg = lastUserMsg.toLowerCase();

    const confirmationPattern = /(setuju|ya kirim|kirim laporan|kirimkan|sudah sesuai|lanjut kirim|oke kirim|ok kirim|oke lanjut|lanjutkan kirim|silakan kirim)/i;
    const cancelPattern = /(batal|jangan kirim|tidak jadi|nanti saja|jangan dulu|hold dulu)/i;
    const pendingDraft = getPendingDraft(userId);

    if (confirmationPattern.test(lowerMsg)) {
      if (!pendingDraft) {
        return res.json({
          reply: 'Belum ada draft laporan yang bisa dikirim. Sebutkan masalah dan lokasi, nanti saya buatkan draftnya untuk Anda review.',
        });
      }

      try {
        const { createdReport, txHash } = await createReportWithAI(pendingDraft.reportData, userId);
        pendingReportDrafts.delete(userId);

        return res.json({
          reply:
            `✅ **Laporan berhasil dikirim!**\n\n` +
            `📋 **ID Laporan:** #${createdReport.id}\n` +
            `📝 **Judul:** ${createdReport.title}\n` +
            `📍 **Lokasi:** ${createdReport.location}\n` +
            `🏷️ **Kategori:** ${createdReport.category}\n` +
            `⚡ **Urgensi:** ${createdReport.urgency}\n` +
            `📊 **Status:** Pending (menunggu tindak lanjut)\n\n` +
            `${txHash ? `🔐 **Blockchain Hash:** [${txHash.substring(0, 10)}...] (tercatat di blockchain)\n\n` : ''}` +
            `Anda bisa melihat detail laporan di Dashboard → Laporan Saya. Terima kasih sudah melakukan konfirmasi draf!`,
          reportCreated: true,
          reportId: createdReport.id,
          report: createdReport,
        });
      } catch (err) {
        console.error('❌ Error creating report after confirmation:', err.message);
        return res.json({
          reply: 'Maaf, ada kendala saat mengirimkan laporan. Silakan coba lagi atau sebutkan jika ada perubahan pada drafnya.',
        });
      }
    }

    if (cancelPattern.test(lowerMsg) && pendingDraft) {
      pendingReportDrafts.delete(userId);
      const reply = 'Baik, draf laporan sebelumnya sudah dibatalkan. Jika ingin membuat draf baru, sebutkan masalah dan lokasinya.';
      // Log conversation
      const responseTime = Date.now() - startTime;
      try {
        await pool.query(
          `INSERT INTO chatbot_conversations (user_id, user_role, messages, detected_intent, ai_model_used, response_time_ms) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, userRole, JSON.stringify(messages), 'CANCEL_DRAFT', aiModelUsed, responseTime]
        );
      } catch (logError) {
        console.error('⚠️  Failed to log conversation:', logError.message);
      }
      return res.json({ reply });
    }
    
    // Handle pertanyaan statistik/data dengan jawaban langsung (sebelum AI)
    if (intent.intent === 'ASK_STATS' || /(berapa|jumlah|total|antrian|sisa|berapa lagi|ada berapa)/i.test(lastUserMsg)) {
      if (reportStats && ['admin', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'pengurus'].includes(userRole)) {
        // Untuk pengurus/admin, jawab dengan data spesifik
        if (/(antrian|sisa|pending|menunggu)/i.test(lastUserMsg)) {
          return res.json({
            reply: `📊 **Antrian Laporan (Pending):**\n\n` +
              `Saat ini ada **${reportStats.pending}** laporan yang masih menunggu tindak lanjut.\n\n` +
              `**Rincian Lengkap:**\n` +
              `• Total laporan: **${reportStats.total}**\n` +
              `• Menunggu (pending): **${reportStats.pending}**\n` +
              `• Sedang diproses: **${reportStats.in_progress}**\n` +
              `• Selesai: **${reportStats.resolved}**\n\n` +
              `Untuk melihat detail laporan, buka halaman Daftar Laporan atau Dashboard.`,
          });
        } else if (/(total|jumlah|semua)/i.test(lastUserMsg)) {
          return res.json({
            reply: `📊 **Total Laporan:**\n\n` +
              `Total ada **${reportStats.total}** laporan${user.rt_rw ? ` di wilayah ${user.rt_rw}` : ''}.\n\n` +
              `**Distribusi Status:**\n` +
              `• Menunggu (pending): **${reportStats.pending}** laporan\n` +
              `• Sedang diproses (in_progress): **${reportStats.in_progress}** laporan\n` +
              `• Selesai (resolved): **${reportStats.resolved}** laporan\n\n` +
              `Untuk statistik lengkap dengan chart, buka Dashboard → bagian Charts & Analytics.`,
          });
        }
      } else if (reportStats && userRole === 'warga') {
        // Untuk warga, jawab dengan statistik laporan mereka
        return res.json({
          reply: `📋 **Statistik Laporan Saya:**\n\n` +
            `• Total laporan: **${reportStats.total}**\n` +
            `• Menunggu: **${reportStats.pending}**\n` +
            `• Sedang diproses: **${reportStats.in_progress}**\n` +
            `• Selesai: **${reportStats.resolved}**\n\n` +
            `Untuk melihat detail, buka Dashboard → Laporan Saya.`,
        });
      }
    }
    
    // Handle "siapa" questions (saya siapa, kamu siapa, siapa kamu)
    const siapaPattern = /(saya|kamu|anda|kalian) (siapa|siapakah|siap)|siapa (kamu|anda|kalian|saya)/i;
    if (siapaPattern.test(lastUserMsg)) {
      // Jika tanya tentang chatbot ("kamu siapa", "siapa kamu")
      if (/kamu (siapa|siapakah)|siapa (kamu|kalian)/i.test(lastUserMsg)) {
        return res.json({
          reply: `Saya adalah Asisten LaporIn, asisten AI untuk aplikasi pelaporan RT/RW. Saya membantu ${user.name} (${userRole === 'warga' ? 'Warga' : userRole === 'admin' ? 'Admin Sistem' : userRole === 'admin_rw' ? 'Admin RW' : userRole === 'ketua_rt' ? 'Ketua RT' : userRole === 'sekretaris_rt' ? 'Sekretaris RT' : userRole === 'pengurus' ? 'Pengurus' : userRole}${user.rt_rw ? ` di ${user.rt_rw}` : ''}) dengan menjawab pertanyaan, membantu membuat laporan, dan menjelaskan fitur aplikasi. Ada yang bisa saya bantu?`,
        });
      }
      // Jika tanya tentang user sendiri ("saya siapa", "siapa saya")
      return res.json({
        reply: `Anda adalah ${user.name} dengan peran ${userRole === 'warga' ? 'Warga' : userRole === 'admin' ? 'Admin Sistem' : userRole === 'admin_rw' ? 'Admin RW' : userRole === 'ketua_rt' ? 'Ketua RT' : userRole === 'sekretaris_rt' ? 'Sekretaris RT' : userRole === 'pengurus' ? 'Pengurus' : userRole}${user.rt_rw ? ` di wilayah ${user.rt_rw}` : ''}. Ada yang bisa saya bantu terkait laporan?`,
      });
    }
    
    // Handle "tolong bantu" atau "ingin membuat laporan" - jangan langsung balas terima kasih
    if (/(tolong bantu|ingin membuat laporan|saya ingin|mau buat laporan)/i.test(lastUserMsg) && 
        !/(terima kasih|makasih|thanks)/i.test(lastUserMsg)) {
      // Jika ada masalah di pesan ini atau sebelumnya, langsung proses CREATE_REPORT
      const hasProblemInMsg = /(pohon|jalan|lampu|got|rusak|mati|mampet|runtuh|tumbang|mengganggu|perbaiki|masalah)/i.test(lastUserMsg);
      const hasProblemInPrev = messages.slice(-3, -1).some(m => 
        m.role === 'user' && /(pohon|jalan|lampu|got|rusak|mati|mampet|runtuh|tumbang|mengganggu|perbaiki|masalah)/i.test(m.content)
      );
      
      if (hasProblemInMsg || hasProblemInPrev) {
        // Ada masalah, lanjut ke CREATE_REPORT processing
      } else {
        // Tidak ada masalah disebutkan, tanya apa masalahnya
        if (userRole === 'warga') {
          return res.json({
            reply: `Baik ${user.name}, saya siap membantu! 😊\n\n` +
              `Untuk membuat laporan, silakan sebutkan:\n` +
              `📋 **Masalah yang ingin dilaporkan** (contoh: lampu mati, jalan rusak, got mampet, pohon runtuh, dll)\n` +
              `📍 **Lokasi masalah** (contoh: di blok C, depan rumah, area lapangan basket)\n` +
              `📝 **Detail lainnya** jika perlu\n\n` +
              `Atau jika Anda sudah tahu masalahnya, langsung sebutkan saja!`,
          });
        }
      }
    }

    // PRIORITAS: Handle pertanyaan kemampuan dan negasi DULU (JANGAN create report)
    if (intent.intent === 'ASK_CAPABILITY') {
      return res.json({
        reply: `Ya, saya bisa membuat laporan otomatis! 😊\n\n` +
          `**Cara menggunakannya:**\n` +
          `1. Sebutkan masalah yang ingin dilaporkan (contoh: "pohon runtuh di lapangan basket")\n` +
          `2. Saya akan membuat draf lengkap (judul, kategori, urgensi, lokasi) untuk Anda review\n` +
          `3. Setelah Anda setujui dengan mengetik "kirim laporan", saya akan mengirimnya ke sistem RT/RW\n\n` +
          `**Contoh:**\n` +
          `• "Lampu mati di blok C"\n` +
          `• "Got mampet di depan rumah"\n` +
          `• "Pohon runtuh di area lapangan basket"\n\n` +
          `Atau Anda bisa minta eksplisit: "tolong buatin laporan tentang [masalah]"`,
      });
    }
    
    if (intent.intent === 'NEGATION') {
      return res.json({
        reply: `Maaf atas kebingungannya! 🙏\n\n` +
          `Saya mengerti - Anda belum meminta untuk dibuatkan laporan. Laporan sebelumnya mungkin dibuat secara tidak sengaja.\n\n` +
          `Jika Anda ingin membuat laporan, silakan sebutkan masalahnya dengan jelas. ` +
          `Jika tidak, tidak masalah - saya siap membantu hal lain! 😊`,
      });
    }
    
    // PRIORITAS: Cek intent CREATE_REPORT dulu (jangan dulu cek FAQ)
    // Smart detection: jika pesan seperti laporan, langsung CREATE_REPORT
    
    // Deteksi pertanyaan vs perintah
    const isQuestion = /^(apakah|bisa ga|bisa gak|mungkinkah|apakah kamu|kamu bisa|bisa tidak|bisa enggak)/i.test(lastUserMsg.trim());
    const hasNegation = /(belum minta|tidak minta|saya belum|perasaan.*belum|ga minta|gak minta|enggak minta|tidak ingin|belum ingin)/i.test(lastUserMsg);
    
    // Cek apakah ada eksplisit request untuk buat laporan dari percakapan sebelumnya
    const hasExplicitCreateRequest = /(buatin|buatkan|bikin|tolong buat|bisa buat|minta buat).*(laporan|report)/i.test(lastUserMsg);
    const prevMessagesHaveProblem = messages.slice(-3, -1).some(m => 
      m.role === 'user' && /(pohon|jalan|lampu|got|rusak|mati|mampet|runtuh|tumbang|mengganggu|perbaiki|tolong perbaiki)/i.test(m.content)
    );
    
    const hasProblemKeyword = /(lampu|jalan|got|selokan|rusak|mati|bocor|mampet|masalah|pohon|runtuh|tumbang|roboh|mengganggu|ganggu|perbaiki|tolong perbaiki|ada masalah|menggangu aktivitas)/i.test(lastUserMsg);
    const hasLocationKeyword = /(di|dekat|depan|blok|jalan|rt|rw|portal|pos|itu|ini|situ|area|lapangan|taman|basket)/i.test(lastUserMsg);
    const hasRequestKeyword = /(tolong|bisa|lapor|ingin lapor|minta|perbaiki|tolong perbaiki|buatin laporan|buatkan laporan)/i.test(lastUserMsg);
    
    // JANGAN create report jika:
    // 1. Ini pertanyaan kemampuan (apakah kamu bisa, bisa ga, dll)
    // 2. Ada negasi (belum minta, tidak minta, saya belum, dll)
    // 3. Intent sudah NEGATION atau ASK_CAPABILITY
    const shouldSkipCreateReport = isQuestion || hasNegation || intent.intent === 'NEGATION' || intent.intent === 'ASK_CAPABILITY';
    
    const looksLikeReport = !shouldSkipCreateReport && lastUserMsg.length > 15 && (
      (hasProblemKeyword && hasLocationKeyword) || // Masalah + lokasi
      (hasProblemKeyword && hasRequestKeyword) || // Masalah + request
      (hasRequestKeyword && hasLocationKeyword) || // Request + lokasi
      (hasExplicitCreateRequest && prevMessagesHaveProblem) // Request buat laporan dari masalah sebelumnya
    );
    
    // Jika intent CREATE_REPORT atau terlihat seperti laporan, langsung proses (skip FAQ)
    // TAPI JANGAN jika ini pertanyaan kemampuan atau negasi
    if (!shouldSkipCreateReport && (intent.intent === 'CREATE_REPORT' || looksLikeReport || (hasExplicitCreateRequest && prevMessagesHaveProblem)) && userRole === 'warga') {
      // Generate report data using AI (Groq)
      if (groq) {
        try {
          // Improve prompt dengan context awareness - ambil lebih banyak konteks jika ada explicit request
          const contextWindow = hasExplicitCreateRequest ? messages.slice(-5, -1) : messages.slice(-3, -1);
          const conversationContext = contextWindow.map(m => 
            m.role === 'user' ? `User: ${m.content}` : `Asisten: ${m.content}`
          ).join('\n');
          
          // PRIORITAS: Jika pesan terakhir sudah spesifik tentang masalah, GUNAKAN ITU (jangan ambil dari konteks sebelumnya)
          let fullContext = redacted;
          const hasSpecificProblemInLastMsg = /(jalan.*rusak|pohon.*runtuh|lampu.*mati|got.*mampet|masalah.*mengganggu|masalah.*jalan|masalah.*pohon|masalah.*lampu)/i.test(lastUserMsg);
          
          // Jika pesan terakhir sudah spesifik tentang masalah (termasuk "masalah [jenis masalah]"), 
          // GUNAKAN PESAN TERAKHIR SAJA - jangan gabung dengan pesan sebelumnya
          if (hasSpecificProblemInLastMsg) {
            fullContext = redacted; // Gunakan pesan terakhir saja, ABADIKAN konteks sebelumnya
          } else if (hasExplicitCreateRequest && prevMessagesHaveProblem) {
            // Hanya jika pesan terakhir TIDAK spesifik tentang masalah, baru gabung dengan pesan sebelumnya
            const problemMessages = messages.slice(-5, -1).filter(m => 
              m.role === 'user' && /(pohon|jalan|lampu|got|rusak|mati|mampet|runtuh|tumbang|mengganggu|perbaiki|tolong perbaiki)/i.test(m.content)
            );
            if (problemMessages.length > 0) {
              fullContext = problemMessages.map(m => m.content).join('. ') + '. ' + redacted;
            }
          }
          
          const generatePrompt = `Kamu adalah asisten AI untuk aplikasi pelaporan RT/RW. Analisis percakapan berikut dan identifikasi apakah user ingin membuat LAPORAN MASALAH atau hanya bertanya.

**Konteks User:**
- Nama: ${user.name}
- Role: Warga
- RT/RW: ${user.rt_rw || 'belum disebutkan'}

${conversationContext ? `**Riwayat Percakapan:**\n${conversationContext}\n\n` : ''}**Pesan Terakhir User:** "${fullContext}"

${hasExplicitCreateRequest ? '**PENTING:** User meminta untuk MEMBUAT LAPORAN berdasarkan masalah yang disebutkan sebelumnya. Pastikan untuk membuat laporan dengan data lengkap dari percakapan.\n\n' : ''}

**CONTOH LAPORAN MASALAH (BUAT LAPORAN):**
- "lampu mati di blok c" → LAPORAN
- "pohon runtuh di area lapangan basket bisa tolong perbaiki" → LAPORAN
- "jalan rusak berlubang di depan rumah" → LAPORAN
- "got mampet bau sekali" → LAPORAN
- "ada masalah mengganggu aktivitas tetangga" → LAPORAN
- "tolong buatin laporan tentang pohon jatuh" → LAPORAN
- "buatkan laporan tentang pohon runtuh di lapangan" → LAPORAN

**BUKAN LAPORAN (JANGAN BUAT LAPORAN):**
- "apakah kamu bisa buat laporan otomatis?" → BUKAN (ini pertanyaan tentang kemampuan)
- "bisa ga kamu buat laporan?" → BUKAN (pertanyaan, bukan request)
- "perasaan saya belum minta dibuatkan" → BUKAN (negasi, protes)
- "saya belum minta dibuatkan deh" → BUKAN (negasi)
- "terima kasih" → BUKAN (jika tidak ada masalah disebutkan)
- "saya siapa" → BUKAN
- "bagaimana cara buat laporan" → BUKAN (ini pertanyaan cara, bukan laporan)

**DETECTION RULES:**
1. Jika pesan MULAI dengan "apakah", "bisa ga", "bisa gak", "mungkinkah" → PERTANYAAN, bukan laporan
2. Jika ada kata "belum", "tidak", "gak minta" → NEGASI, bukan laporan
3. Jika ada masalah + lokasi + request perbaikan → LAPORAN (contoh: "pohon runtuh di lapangan basket bisa tolong perbaiki")
4. Jika eksplisit "buatin laporan", "buatkan laporan" → LAPORAN

**JIKA INI LAPORAN**, buatkan JSON:
{
  "title": "Judul ringkas dan jelas (maks 100 karakter, contoh: 'Pohon Runtuh di Lapangan Basket')",
  "description": "Deskripsi lengkap: kondisi masalah, lokasi detail, dampak/akibat jika disebutkan, waktu jika ada",
  "location": "Lokasi spesifik. Jika disebutkan di pesan gunakan itu, jika tidak gunakan '${user.rt_rw || 'Lokasi tidak disebutkan'}'",
  "category": "infrastruktur|sosial|administrasi|bantuan",
  "urgency": "low|medium|high"
}

**JIKA BUKAN LAPORAN (pertanyaan atau negasi)**, return: {"title": ""}

**KATEGORI:**
- infrastruktur: pohon, jalan, lampu, got, bangunan, fasilitas, listrik, air, drainase
- sosial: mengganggu aktivitas, kebisingan, keributan, tetangga, keamanan
- administrasi: surat, domisili, ktp, kk
- bantuan: bansos, sembako

**URGENSI:**
- high: bahaya langsung (kebakaran, listrik, pohon menutup jalan)
- medium: mengganggu atau perlu segera ditangani
- low: permintaan umum, surat, informasi

**PENTING:** 
- Hanya buat laporan jika ini PERMINTAAN EKSPLISIT atau ada masalah + lokasi + request. 
- JANGAN buat laporan untuk pertanyaan kemampuan atau negasi.
- Jika user minta "review dulu" atau "lihat dulu", tetap generate JSON lengkap (untuk preview), tapi jangan langsung create.
- Prioritaskan masalah dari pesan TERAKHIR jika ada masalah spesifik di sana (jangan ambil dari konteks sebelumnya).

**EXTRAKSI MASALAH:**
- Jika user bilang "jalan rusak" → gunakan itu, jangan ambil "pohon runtuh" dari konteks sebelumnya
- Jika user bilang "masalah jalan rusak di depan rumah saya" → judul harus "Jalan Rusak di Depan Rumah"
- Ekstrak lokasi spesifik dari pesan: "di depan rumah saya" → "Depan Rumah", bukan "Alamat"

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
                    content: 'Kamu adalah asisten yang membantu membuat struktur data laporan dari pesan warga. PERHATIAN: Jika pesan adalah PERTANYAAN tentang kemampuan ("apakah kamu bisa", "bisa ga") atau NEGASI ("saya belum minta", "belum minta"), return {"title": ""}. Hanya buat laporan jika ini PERMINTAAN EKSPLISIT atau ada masalah + lokasi + request perbaikan. Selalu return JSON valid saja, tanpa markdown atau penjelasan lain.',
                  },
                  { role: 'user', content: generatePrompt },
                ],
                temperature: 0.3,
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
          reportData.category = categories.includes(reportData.category) ? reportData.category : 'infrastruktur';
          reportData.urgency = urgencies.includes(reportData.urgency) ? reportData.urgency : 'medium';
          reportData.title = (reportData.title || '').trim().substring(0, 100);
          reportData.description = (reportData.description || lastUserMsg).trim();
          reportData.location = (reportData.location || user.rt_rw || 'Lokasi tidak disebutkan').trim();

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
                reply: `Sama-sama ${user.name}! 😊 Saya senang bisa membantu. Jika ada masalah lain yang ingin dilaporkan, silakan beri tahu saya.`,
              });
            }
            // Jika title kosong, mungkin AI tidak detect sebagai laporan
            // Fallback: tetap coba create jika looksLikeReport
            if (!looksLikeReport) {
              // Tidak seperti laporan, lanjut ke AI general chat
              // (akan di-handle di bagian bawah)
            }
          }

          // Siapkan draft laporan (tidak langsung kirim tanpa konfirmasi)
          // Jalankan hanya jika ada title yang valid ATAU looksLikeReport dengan masalah jelas
          // TAPI JANGAN jika ini pertanyaan kemampuan atau negasi
          const hasValidTitle = reportData.title && reportData.title.length > 3;
          const hasClearProblem = !shouldSkipCreateReport && (
            /(pohon.*runtuh|jalan.*rusak|lampu.*mati|got.*mampet|mengganggu.*aktivitas|bangunan.*rusak)/i.test(lastUserMsg) || 
            (hasExplicitCreateRequest && prevMessagesHaveProblem)
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
            } else if (/(got.*mampet|mampet.*got)/i.test(textToCheck)) {
              problemTitle = 'Got Mampet';
              reportData.category = 'infrastruktur';
            } else if (/(mengganggu.*aktivitas|aktivitas.*terganggu)/i.test(textToCheck)) {
              problemTitle = 'Masalah Mengganggu Aktivitas';
              reportData.category = 'sosial';
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
              /(di depan|depan)\s+(rumah\s+(saya|saya|aku)?|rumah)/i,
              /(di|dekat|depan|area|lapangan|blok|jalan|rt|rw|taman|basket)\s+([a-z0-9\s]+)/i,
            ];
            
            // Prioritas: cek lastUserMsg dulu, baru fullContext
            const textToExtractFrom = lastUserMsg;
            for (const pattern of locationPatterns) {
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
            
            // Fallback: jika tidak ketemu di lastUserMsg, cek fullContext
            if (!extractedLocation && fullContext !== lastUserMsg) {
              for (const pattern of locationPatterns) {
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
            
            if (extractedLocation) {
              problemTitle += ` ${extractedLocation}`;
            }
            
            reportData.title = problemTitle.substring(0, 100) || 'Laporan Masalah';
            reportData.description = (fullContext || lastUserMsg).length > 500 ? (fullContext || lastUserMsg).substring(0, 500) + '...' : (fullContext || lastUserMsg);
            
            // Set lokasi - prioritaskan extracted location dari pesan, bukan RT/RW generic
            if (extractedLocation) {
              reportData.location = extractedLocation + (user.rt_rw ? `, ${user.rt_rw}` : '');
            } else if (!reportData.location || reportData.location === 'Lokasi tidak disebutkan' || reportData.location === 'Alamat') {
              reportData.location = user.rt_rw || 'Lokasi tidak disebutkan';
            }
            reportData.urgency = reportData.urgency || 'medium';
          }
          
          // JANGAN create report jika ini pertanyaan kemampuan atau negasi
          if (!shouldSkipCreateReport && (hasValidTitle || (hasClearProblem && looksLikeReport) || (hasExplicitCreateRequest && prevMessagesHaveProblem))) {
          try {
            setPendingDraft(userId, reportData);

            return res.json({
              reply: `📋 **Draft laporan siap untuk dicek:**\n\n` +
                `📝 **Judul:** ${reportData.title || 'Belum ditentukan'}\n` +
                `📄 **Deskripsi:** ${reportData.description || 'Belum ditentukan'}\n` +
                `📍 **Lokasi:** ${reportData.location || 'Belum ditentukan'}\n` +
                `🏷️ **Kategori:** ${reportData.category || 'Belum ditentukan'}\n` +
                `⚡ **Urgensi:** ${reportData.urgency || 'Belum ditentukan'}\n\n` +
                `Apakah ini sudah sesuai dengan laporan yang ingin Anda buat?\n` +
                `• Jika **sudah sesuai**, balas dengan "kirim laporan" atau "sudah sesuai".\n` +
                `• Jika perlu diubah, sebutkan bagian yang ingin diubah (judul, deskripsi, lokasi, kategori, urgensi).`,
              reportData,
              previewMode: true,
              awaitingConfirmation: true,
            });
          } catch (createError) {
            console.error('❌ Error menyiapkan draft report:', createError.message);
            return res.json({
              reply: 'Maaf, ada kendala saat menyiapkan draf laporan. Silakan ulangi dengan menyebutkan masalah dan lokasi, atau coba lagi sebentar.',
            });
          }
          } else {
            // Title kosong atau tidak valid, skip auto-create dan lanjut ke AI chat
            // Akan di-handle di bagian AI general chat di bawah (tidak return, lanjut ke flow)
            console.log('⚠️  Report title kosong atau tidak valid, lanjut ke AI general chat');
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

    // Handle pertanyaan "halaman apa" dengan konteks user
    if (/(halaman apa|saya di halaman apa|sedang di halaman apa|di halaman mana|ini halaman apa)/i.test(lastUserMsg)) {
      const roleName = userRole === 'warga' ? 'Warga' : userRole === 'admin' ? 'Admin Sistem' : userRole === 'admin_rw' ? 'Admin RW' : userRole === 'ketua_rt' ? 'Ketua RT' : userRole === 'sekretaris_rt' ? 'Sekretaris RT' : userRole === 'pengurus' ? 'Pengurus' : userRole;
      return res.json({
        reply: `Anda sedang berada di aplikasi LaporIn sebagai **${roleName}**${user.rt_rw ? ` di wilayah ${user.rt_rw}` : ''}.\n\n` +
          `Buka Dashboard untuk melihat fitur lengkap aplikasi. Sebagai ${roleName}, Anda dapat mengakses berbagai fitur sesuai dengan peran Anda.`,
      });
    }

    // FAQ check hanya jika bukan CREATE_REPORT dan bukan looksLikeReport
    const faqAns = findFaqAnswer(lastUserMsg);
    if (faqAns && intent.intent !== 'CREATE_REPORT' && !looksLikeReport) {
      return res.json({ reply: faqAns });
    }

    if (intent.intent === 'CREATE_REPORT' && userRole !== 'warga') {
      return res.json({
        reply:
          'Untuk membuat laporan: warga dapat mengisi formulir di Dashboard. Sebagai pengurus, Anda dapat memantau dan menindaklanjuti laporan yang masuk.',
      });
    }
    if (intent.intent === 'CHECK_STATUS') {
      if (userRole === 'warga') {
        return res.json({
          reply:
            `${user.name}, cek status laporan Anda:\n` +
            '1. Buka Dashboard → lihat bagian "Laporan Saya"\n' +
            '2. Klik laporan yang ingin dicek\n' +
            '3. Lihat status: pending (baru), in_progress (sedang ditangani), resolved (selesai), atau rejected (ditolak)\n' +
            '4. Lihat timeline perubahan status dan hash blockchain jika tersedia.\n' +
            'Jika ada ID laporan spesifik, sebutkan agar saya bantu arahkan.',
        });
      } else {
        return res.json({
          reply:
            'Sebagai pengurus, Anda dapat melihat semua laporan di Dashboard → Antrian Laporan. Gunakan filter untuk melihat laporan per status atau wilayah. Klik laporan untuk melihat detail dan update status.',
        });
      }
    }

    // Try AI untuk pertanyaan umum (Groq)
    // Build conversation history for context
    const conversationHistory = messages.slice(0, -1).map((m) => {
      return m.role === 'user' ? `User: ${m.content}` : `Asisten: ${m.content}`;
    }).join('\n');
    
    // Tambahkan konteks khusus untuk pertanyaan kemampuan
    let additionalContext = '';
    if (isQuestion || hasNegation || intent.intent === 'ASK_CAPABILITY' || intent.intent === 'NEGATION') {
      additionalContext = '\n\n**PENTING:** User bertanya tentang kemampuan atau menyatakan negasi. JANGAN buat laporan otomatis. Jawab pertanyaannya dengan ramah dan jelaskan cara membuat laporan jika diminta.';
    }
    
    const fullPrompt = `${systemPrompt.content}${additionalContext}\n\n${conversationHistory ? `Riwayat percakapan:\n${conversationHistory}\n\n` : ''}User: ${redacted}\nAsisten:`;

    // Try AI models (Groq FREE first, then OpenAI, then Gemini)
    let aiReply = '';
    
    if (groq) {
      // Try Groq first (FREE & FAST) dengan prompt yang lebih baik
      try {
        // Build messages dengan konteks lengkap
        const aiMessages = [
          systemPrompt,
          ...messages.slice(-6, -1), // Ambil 5 pesan terakhir untuk konteks (total 6 termasuk last)
          { 
            role: 'user', 
            content: `${redacted}\n\nPENTING: Jika pertanyaan tentang statistik, jumlah, atau data - gunakan data real-time yang tersedia di konteks sistem. JANGAN memberikan jawaban generik.`
          }
        ];
        
        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant', // Fast & free, active model
          messages: aiMessages,
          temperature: 0.3, // Lower temperature untuk lebih konsisten dan akurat
          max_tokens: 600, // Increase untuk jawaban yang lebih lengkap
          top_p: 0.9,
        });
        aiReply = completion.choices?.[0]?.message?.content || '';
        console.log('✅ Groq chat response successful');
      } catch (groqError) {
        console.error('❌ Groq API error:', groqError.message);
        // Groq failed, will use manual fallback
      }
    }

    // If AI worked, return the reply
    if (aiReply) {
      // Log conversation untuk supervised training
      const responseTime = Date.now() - startTime;
      try {
        await pool.query(
          `INSERT INTO chatbot_conversations (user_id, user_role, messages, detected_intent, ai_model_used, response_time_ms) 
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [userId, userRole, JSON.stringify(messages), detectedIntent || intent.intent || 'GENERAL_CHAT', aiModelUsed, responseTime]
        );
      } catch (logError) {
        console.error('⚠️  Failed to log conversation:', logError.message);
      }
      return res.json({ reply: aiReply });
    }

    // Fallback: Smart manual response based on keywords
    console.warn('⚠️  No AI model available, using smart fallback for:', lastUserMsg.substring(0, 50));
    
    // Smart keyword matching with better responses (lowerMsg sudah dideklarasi di atas)
    
    if (lowerMsg.includes('siapa') && (lowerMsg.includes('aku') || lowerMsg.includes('saya'))) {
      return res.json({
        reply: `Anda adalah ${user.name} dengan peran ${userRole === 'warga' ? 'Warga' : userRole === 'admin' ? 'Admin Sistem' : userRole === 'admin_rw' ? 'Admin RW' : userRole === 'ketua_rt' ? 'Ketua RT' : userRole === 'sekretaris_rt' ? 'Sekretaris RT' : userRole === 'pengurus' ? 'Pengurus' : userRole}${user.rt_rw ? ` di wilayah ${user.rt_rw}` : ''}. Ada yang bisa saya bantu terkait laporan?`,
      });
    }
    
    if (lowerMsg.includes('aplikasi') || lowerMsg.includes('apa ini') || lowerMsg.includes('ini apa')) {
      return res.json({
        reply: `LaporIn adalah aplikasi **pelaporan RT/RW berbasis AI dan Blockchain**.\n\n` +
          `**Fitur utama:**\n` +
          `📋 **Pelaporan Masalah** - Warga bisa laporkan masalah infrastruktur, sosial, administratif\n` +
          `🤖 **AI Assistant** - Membantu generate struktur laporan dari pesan natural\n` +
          `🔐 **Blockchain Audit** - Semua laporan dan aksi dicatat di blockchain untuk transparansi\n` +
          `📊 **Dashboard Analytics** - Pengurus bisa monitor statistik dan distribusi laporan\n` +
          `👥 **Manajemen User** - Admin bisa kelola warga dan pengurus\n\n` +
          `Anda saat ini login sebagai ${userRole === 'warga' ? 'Warga' : userRole === 'admin' ? 'Admin Sistem' : userRole}. Silakan jelajahi fitur di Dashboard!`,
      });
    }
    
    if (lowerMsg.includes('bagaimana') || lowerMsg.includes('cara') || lowerMsg.includes('bagaimana cara')) {
      if (lowerMsg.includes('laporan') || lowerMsg.includes('lapor')) {
        return res.json({
          reply: `Baik ${user.name}, berikut cara membuat laporan di LaporIn:\n\n` +
            `1. **Buka Dashboard** → Klik tombol "Buat Laporan Baru" di sidebar kanan\n` +
            `2. **Isi Formulir:**\n` +
            `   - Judul: Ringkas dan jelas (contoh: "Jalan Berlubang di Blok C")\n` +
            `   - Deskripsi: Jelaskan masalah lengkap (lokasi detail, kondisi, waktu)\n` +
            `   - Lokasi: Spesifik (RT/RW, nama jalan, landmark)\n` +
            `3. **Klik "Kirim Laporan"**\n\n` +
            `Laporan Anda akan masuk status "pending" dan akan ditindaklanjuti pengurus RT/RW. Semua laporan dicatat di blockchain untuk audit trail.`,
        });
      }
    }
    
    if (lowerMsg.includes('status') || lowerMsg.includes('cek') || lowerMsg.includes('progress')) {
      return res.json({
        reply: `${user.name}, untuk cek status laporan:\n\n` +
          `1. **Buka Dashboard** → Lihat bagian "Laporan Saya"\n` +
          `2. **Klik laporan** yang ingin dicek\n` +
          `3. **Lihat status:**\n` +
          `   - 🟡 Pending: Baru diterima, menunggu tindak lanjut\n` +
          `   - 🔵 In Progress: Sedang ditangani pengurus\n` +
          `   - 🟢 Resolved: Sudah selesai ditangani\n` +
          `   - 🔴 Rejected: Ditolak dengan alasan tertentu\n` +
          `4. **Timeline** akan menampilkan riwayat perubahan status\n` +
          `5. **Hash Blockchain** tersedia untuk verifikasi audit`,
      });
    }
    
    if (lowerMsg.includes('blockchain') || lowerMsg.includes('hash') || lowerMsg.includes('on-chain')) {
      return res.json({
        reply: `Blockchain di LaporIn berfungsi sebagai **jejak audit yang tidak bisa diubah**:\n\n` +
          `✅ Setiap aksi penting (buat laporan, ubah status) dicatat di blockchain\n` +
          `✅ Setiap transaksi memiliki hash unik yang bisa diverifikasi\n` +
          `✅ Anda bisa klik link "On-chain" di laporan untuk lihat di Polygonscan\n` +
          `✅ Memastikan transparansi dan keamanan data\n\n` +
          `Ini berbeda dari crypto - ini murni untuk audit trail dan verifikasi integritas data.`,
      });
    }
    
    // Default helpful fallback
    const fallbackReply = `Halo ${user.name}! Saya Asisten LaporIn siap membantu.\n\n` +
      `Saya bisa membantu dengan:\n` +
      `📋 **Membuat laporan** - Tanyakan "cara buat laporan"\n` +
      `📊 **Cek status** - Tanyakan "status laporan saya"\n` +
      `🔐 **Info blockchain** - Tanyakan "apa itu blockchain"\n` +
      `ℹ️ **Tentang aplikasi** - Tanyakan "ini aplikasi apa" atau "apa itu LaporIn"\n` +
      `❓ **FAQ lainnya** - Coba tanya dengan kata kunci yang jelas\n\n` +
      `Atau buka Dashboard untuk akses fitur lengkap aplikasi.`;
    
    // Log conversation untuk supervised training
    const responseTime = Date.now() - startTime;
    try {
      const logResult = await pool.query(
        `INSERT INTO chatbot_conversations (user_id, user_role, messages, detected_intent, ai_model_used, response_time_ms) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userId, userRole, JSON.stringify(messages), detectedIntent || 'UNKNOWN', aiModelUsed, responseTime]
      );
      conversationLogId = logResult.rows[0]?.id;
    } catch (logError) {
      console.error('⚠️  Failed to log conversation:', logError.message);
    }
    
    return res.json({ reply: fallbackReply });
  } catch (e) {
    // Jangan gagal total: balas fallback 200 agar UI tetap jalan
    console.error('❌ Chat route error:', e.message);
    const errorReply = 'Asisten LaporIn siap membantu. Terjadi kendala saat memproses permintaan Anda. ' +
      'Coba pertanyaan seperti: "Cara buat laporan", "Status laporan saya", atau "Apa itu blockchain di sini?".';
    
    // Log error conversation
    try {
      await pool.query(
        `INSERT INTO chatbot_conversations (user_id, user_role, messages, detected_intent, ai_model_used, response_time_ms) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user?.userId || null, req.user?.role || 'unknown', JSON.stringify(req.body.messages || []), 'ERROR', 'none', Date.now() - startTime]
      );
    } catch (logError) {
      // Ignore logging errors
    }
    
    res.json({ reply: errorReply });
  }
});

module.exports = router;
