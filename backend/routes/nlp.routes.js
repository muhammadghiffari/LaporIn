const express = require('express');
const router = express.Router();

// Groq AI untuk NLP yang lebih canggih
let groq = null;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
try {
  if (GROQ_API_KEY && GROQ_API_KEY.trim() !== '') {
    const Groq = require('groq-sdk');
    groq = new Groq({ apiKey: GROQ_API_KEY.trim() });
    console.log('✅ Groq AI NLP initialized successfully');
  } else {
    console.warn('⚠️  GROQ_API_KEY not set - NLP will use keyword-based fallback');
  }
} catch (err) {
  console.error('❌ Groq NLP initialization error:', err.message);
  groq = null;
}

// Smart keyword-based NLP baseline (fallback)
const INTENTS = [
  {
    intent: 'CREATE_REPORT',
    keywords: [
      // Explicit intent - lebih natural dan manusiawi
      'buat laporan', 'lapor', 'mau lapor', 'laporan baru', 'tolong lapor', 'ada masalah',
      'tolong pak rt', 'tolong pak', 'bisa lapor', 'ingin melaporkan', 'butuh buat laporan',
      'saya butuh buat', 'saya perlu buat', 'saya butuh laporan', 'saya perlu laporan',
      'tolong dibuatkan', 'tolong buatkan', 'bisa dibuatkan', 'bisa buatkan', 
      'minta dibuatkan', 'minta buatkan',
      // Infrastruktur keywords
      'lampu', 'jalan', 'rusak', 'berlubang', 'retak', 'mati', 'padam', 'nyala',
      'got', 'selokan', 'mampet', 'buntu', 'tersumbat', 'bocor', 'banjir',
      'drainase', 'saluran', 'air', 'listrik', 'pipa', 'meteran',
      'tps', 'sampah', 'menumpuk', 'bau', 'dibuang sembarangan',
      'tembok', 'jembatan', 'jembatan retak', 'jembatan rusak',
      'pohon', 'runtuh', 'tumbang', 'roboh', 'jatuh', 'cabang patah',
      'bangunan', 'fasilitas', 'lapangan', 'area', 'taman', 'parkiran',
      // Sosial keywords - lebih lengkap
      'keributan', 'ribut', 'berisik', 'tetangga', 'keamanan', 'pencurian',
      'ronda', 'siskamling', 'konflik', 'masalah sosial',
      'mengganggu', 'ganggu', 'menggangu aktivitas', 'aktivitas tetangga',
      'kebisingan', 'suara bising', 'kegaduhan', 'tawuran', 'perkelahian',
      'serpihan', 'kaca', 'beling', 'pecahan', 'vandalisme',
      // Admin keywords
      'surat', 'domisili', 'pengantar', 'ktp', 'kk', 'data',
      // Bantuan keywords
      'bansos', 'sembako', 'bantuan', 'penerima bantuan',
      // Umum (jika ada lokasi + masalah)
      'di depan', 'di blok', 'di jalan', 'di rt', 'di rw',
      'dekat', 'sekitar', 'depan', 'belakang', 'samping',
    ],
    patterns: [
      // Infrastruktur masalah - lebih natural
      /(lampu|jalan|got|selokan|sampah|listrik|air|pohon|bangunan).*(mati|rusak|mampet|bocor|berlubang|runtuh|tumbang|roboh|jatuh)/i,
      /(ada|tolong|minta|perbaiki|tolong perbaiki|butuh|perlu).*(masalah|rusak|mati|bocor|mampet|runtuh|tumbang)/i,
      /(di|dekat|depan|blok|jalan|rt|rw|area|lapangan|taman|pos|portal).*(lampu|jalan|got|masalah|pohon|bangunan|fasilitas)/i,
      // Masalah sosial/gangguan - lebih lengkap
      /(mengganggu|ganggu|menggangu).*(aktivitas|tetangga|warga|masyarakat)/i,
      /(pohon|bangunan|fasilitas).*(runtuh|tumbang|roboh|jatuh).*(area|lapangan|taman|jalan|di)/i,
      // Request perbaikan dengan lokasi - lebih natural
      /(tolong|bisa|minta|butuh|perlu).*(perbaiki|perbaik|tindak|tindaklanjuti|buat|buatkan|buatin|bikin).*(pohon|jalan|lampu|got|bangunan|masalah|laporan)/i,
      /(ini|itu|situ).*(pohon|jalan|lampu|got|bangunan|masalah).*(runtuh|rusak|mati|mampet|mengganggu)/i,
      // Pattern untuk "saya butuh buat laporan" atau "tolong buatkan laporan"
      /(saya|aku|saya butuh|saya perlu|tolong|bisa).*(buat|buatkan|buatin|bikin|membuat).*(laporan|report)/i,
      // Pattern untuk masalah spesifik dengan lokasi
      /(lampu|jalan|got|selokan|pohon).*(mati|rusak|mampet|runtuh).*(di|dekat|depan|blok|jalan|rt|rw|area|lapangan|taman|pos|portal)/i,
      // Pattern untuk serpihan kaca, tawuran, dll
      /(serpihan|kaca|beling|pecahan|tawuran|perkelahian).*(di|dekat|depan|blok|jalan|rt|rw|area|lapangan|taman|pos|portal)/i,
    ],
  },
  { intent: 'CHECK_STATUS', keywords: ['status laporan', 'cek status', 'gimana laporan saya', 'laporan saya', 'progres laporan'] },
  { intent: 'ASK_STATS', keywords: ['berapa', 'jumlah', 'total', 'antrian', 'sisa', 'berapa lagi', 'ada berapa', 'total laporan', 'statistik', 'data'] },
  { intent: 'ASK_CAPABILITY', keywords: ['apakah kamu bisa', 'bisa ga', 'bisa gak', 'mungkinkah', 'apakah bisa', 'bisa tidak', 'bisa enggak', 'kamu bisa ga', 'fungsi kamu apa', 'kamu bisa apa'] },
  { intent: 'ASK_HELP', keywords: ['saya butuh bantuan', 'butuh bantuan', 'perlu bantuan', 'tolong bantu', 'bisa bantu', 'minta bantuan', 'ingin bantuan', 'saya butuh bantuan dong', 'tolong bantu dong'] },
  { intent: 'NEGATION', keywords: ['belum minta', 'tidak minta', 'saya belum', 'perasaan saya belum', 'ga minta', 'gak minta', 'tidak mau', 'belum mau', 'enggak minta', 'tidak ingin', 'belum ingin'] },
  { intent: 'PREVIEW_REPORT', keywords: ['review dulu', 'lihat dulu', 'cek dulu', 'preview', 'tunggu persetujuan', 'aku review', 'berikan isinya', 'review dulu baru', 'tunggu approval', 'tunggu konfirmasi', 'tunggu persetujuan ku', 'tunggu persetujuan saya'] },
  { intent: 'ASK_FAQ', keywords: ['cara', 'bagaimana', 'apa itu', 'kenapa', 'faq', 'pending', 'fungsinya'] },
];

// NLP dengan Groq AI untuk semantic understanding
async function detectIntentWithAI(text, context = '') {
  if (!groq) {
    return null; // Fallback ke keyword-based
  }
  
  try {
    const prompt = `Kamu adalah sistem NLP untuk chatbot pelaporan RT/RW. Analisis pesan user dan tentukan intent-nya.

**INTENTS yang tersedia:**
1. CREATE_REPORT - User ingin membuat laporan (ada masalah + lokasi + request)
2. CHECK_STATUS - User menanyakan status laporan
3. ASK_STATS - User menanyakan statistik/data
4. ASK_CAPABILITY - User bertanya tentang kemampuan chatbot
5. ASK_HELP - User meminta bantuan umum (tanpa masalah spesifik)
6. NEGATION - User menyatakan negasi/tidak mau
7. PREVIEW_REPORT - User minta preview/review laporan
8. ASK_FAQ - User bertanya cara/fungsi
9. GENERAL - Percakapan umum

**Konteks:** ${context || 'Tidak ada konteks sebelumnya'}

**Pesan User:** "${text}"

**Instruksi:**
- Jika user menyebutkan masalah spesifik (lampu mati, jalan rusak, pohon runtuh, dll) + lokasi + request → CREATE_REPORT
- Jika user hanya bertanya "bisa ga", "apakah bisa" tanpa masalah spesifik → ASK_CAPABILITY
- Jika user bilang "saya butuh bantuan" tanpa masalah spesifik → ASK_HELP
- Jika user bilang "belum minta", "tidak minta" → NEGATION
- Jika user bertanya "status laporan", "gimana laporan saya" → CHECK_STATUS
- Jika user bertanya "berapa", "jumlah", "total" → ASK_STATS

Return HANYA JSON:
{
  "intent": "nama_intent",
  "confidence": 0.0-1.0,
  "entities": {
    "problem": "masalah yang disebutkan (jika ada)",
    "location": "lokasi yang disebutkan (jika ada)",
    "urgency": "high/medium/low (jika bisa diinfer)"
  }
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'Kamu adalah sistem NLP yang sangat akurat. Return HANYA JSON, tanpa markdown, tanpa penjelasan.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower untuk konsistensi
      max_tokens: 300
    });

    const response = completion.choices?.[0]?.message?.content || '';
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      console.log('🤖 AI NLP Intent Detection:', result);
      return result;
    }
  } catch (error) {
    console.error('❌ AI NLP error:', error.message);
  }
  
  return null; // Fallback ke keyword-based
}

function detectIntent(text) {
  const t = (text || '').toLowerCase().trim();
  
  // PRIORITAS 1: Cek dulu apakah ini permintaan bantuan umum (JANGAN CREATE_REPORT)
  const askHelpIntent = INTENTS.find(i => i.intent === 'ASK_HELP');
  if (askHelpIntent && askHelpIntent.keywords.some((k) => t.includes(k))) {
    return { intent: 'ASK_HELP', confidence: 0.95 };
  }
  
  // PRIORITAS 2: Cek dulu apakah ini pertanyaan tentang kemampuan (JANGAN CREATE_REPORT)
  const askCapabilityIntent = INTENTS.find(i => i.intent === 'ASK_CAPABILITY');
  if (askCapabilityIntent && askCapabilityIntent.keywords.some((k) => t.includes(k))) {
    return { intent: 'ASK_CAPABILITY', confidence: 0.95 };
  }
  
  // PRIORITAS 3: Cek dulu apakah ini request preview/review (JANGAN CREATE_REPORT langsung)
  const previewIntent = INTENTS.find(i => i.intent === 'PREVIEW_REPORT');
  if (previewIntent && previewIntent.keywords.some((k) => t.includes(k))) {
    return { intent: 'PREVIEW_REPORT', confidence: 0.95 };
  }
  
  // PRIORITAS 4: Cek dulu apakah ini negasi/protes (JANGAN CREATE_REPORT)
  const negationIntent = INTENTS.find(i => i.intent === 'NEGATION');
  if (negationIntent && negationIntent.keywords.some((k) => t.includes(k))) {
    return { intent: 'NEGATION', confidence: 0.95 };
  }
  
  // PRIORITAS 5: Cek apakah ini pertanyaan (menggunakan kata tanya) tanpa masalah spesifik
  const isQuestion = /^(apakah|apakah kamu|bisa ga|bisa gak|mungkinkah|bisa tidak|kamu bisa|fungsi|apa fungsi)/i.test(t.trim());
  const hasProblemInQuestion = /(pohon|jalan|lampu|got|rusak|mati|mampet|runtuh|tumbang|mengganggu|perbaiki|masalah)/i.test(t);
  if (isQuestion && !hasProblemInQuestion) {
    // Ini pertanyaan umum tentang kemampuan, bukan request create report
    return { intent: 'ASK_CAPABILITY', confidence: 0.9 };
  }
  
  // Check CREATE_REPORT dengan pattern yang lebih pintar dan TIDAK AGRESIF
  const createReportIntent = INTENTS.find(i => i.intent === 'CREATE_REPORT');
  if (createReportIntent) {
    // Heuristik: jika ada lokasi + kata masalah/infrastruktur/sosial
    // TAPI JANGAN jika ini pertanyaan kemampuan atau negasi
    const hasLocation = /(di|dekat|depan|blok|jalan|rt|rw|portal|pos|area|lapangan|taman)/i.test(t);
    const hasProblem = /(lampu|jalan|got|selokan|rusak|mati|bocor|mampet|masalah|pohon|runtuh|tumbang|roboh|mengganggu|ganggu|aktivitas|perbaiki|serpihan|kaca|beling|pecahan|tawuran|perkelahian)/i.test(t);
    const hasRequest = /(tolong|bisa|minta|ingin|harap|buatin|buatkan|bikin|butuh|perlu|saya butuh|saya perlu)/i.test(t);
    const hasNegation = /(belum|tidak|ga|gak|enggak|perasaan.*belum)/i.test(t);
    const isQuestionOnly = /^(apakah|bisa ga|bisa gak|mungkinkah)/i.test(t.trim());
    
    // JANGAN CREATE_REPORT jika:
    // 1. Ini pertanyaan kemampuan tanpa masalah spesifik
    // 2. Ada kata negasi (belum, tidak, gak minta)
    if (isQuestionOnly || hasNegation) {
      return { intent: 'GENERAL', confidence: 0.7 };
    }
    
    // PERBAIKAN: Hanya CREATE_REPORT jika informasi LENGKAP (masalah + lokasi + request)
    // Jangan langsung CREATE_REPORT hanya karena ada keyword
    // Check keywords - tapi HARUS ada kombinasi yang jelas
    if (!isQuestion && createReportIntent.keywords.some((k) => t.includes(k))) {
      // Hanya CREATE_REPORT jika ada kombinasi yang jelas (masalah + lokasi + request)
      if (hasLocation && hasProblem && hasRequest && t.length > 20) {
        return { intent: 'CREATE_REPORT', confidence: 0.9 };
      }
      // Atau jika eksplisit "buat laporan"
      if (/(buat|buatkan|buatin|bikin).*(laporan|report)/i.test(t) && hasProblem) {
        return { intent: 'CREATE_REPORT', confidence: 0.9 };
      }
    }
    
    // Check patterns (regex) - lebih ketat
    if (createReportIntent.patterns && createReportIntent.patterns.some(p => p.test(t))) {
      // Cek lagi apakah ini benar-benar request, bukan pertanyaan
      if (!isQuestion && t.length > 15) {
        return { intent: 'CREATE_REPORT', confidence: 0.85 };
      }
    }
    
    // Jika ada lokasi + masalah + request perbaikan = laporan (pastinya)
    if (hasLocation && hasProblem && hasRequest && t.length > 20 && !isQuestion) {
      return { intent: 'CREATE_REPORT', confidence: 0.95 };
    }
    // Jika ada masalah yang jelas dengan detail + ada request + lokasi = laporan
    if ((/(pohon.*runtuh|bangunan.*rusak|masalah.*mengganggu|aktivitas.*terganggu|serpihan.*kaca|tawuran|perkelahian)/i.test(t)) && hasRequest && hasLocation && t.length > 20) {
      return { intent: 'CREATE_REPORT', confidence: 0.95 };
    }
    // PERBAIKAN: Jangan langsung CREATE_REPORT jika hanya ada lokasi + masalah tanpa request
    // Biarkan sistem tanya dulu apakah user ingin buat laporan
    // Pattern khusus: "saya butuh buat laporan" atau "tolong buatkan laporan"
    if (/(saya|aku|tolong|bisa).*(butuh|perlu|minta).*(buat|buatkan|buatin|bikin).*(laporan|report)/i.test(t)) {
      return { intent: 'CREATE_REPORT', confidence: 0.95 };
    }
  }
  
  // Check other intents
  for (const item of INTENTS) {
    if (item.intent !== 'CREATE_REPORT' && item.keywords.some((k) => t.includes(k))) {
      return { intent: item.intent, confidence: 0.85 };
    }
  }
  
  // Default
  if (t.length < 8) return { intent: 'GENERAL', confidence: 0.5 };
  return { intent: 'GENERAL', confidence: 0.6 };
}

const CATEGORIES = {
  infrastruktur: ['jalan', 'lampu', 'got', 'selokan', 'saluran', 'drainase', 'listrik', 'air', 'tps', 'sampah', 'pohon', 'bangunan', 'fasilitas', 'lapangan', 'taman', 'parkiran', 'jembatan', 'tembok'],
  sosial: ['keributan', 'tetangga', 'keamanan', 'ronda', 'konflik', 'kebisingan', 'mengganggu', 'ganggu', 'aktivitas', 'kegaduhan'],
  administrasi: ['surat', 'domisili', 'pengantar', 'ktp', 'kk', 'data warga'],
  bantuan: ['bansos', 'sembako', 'bantuan', 'penerima'],
};
const URGENCY_MAP = {
  high: ['darurat', 'urgent', 'kebakaran', 'mati', 'bocor', 'tumbang'],
  medium: ['rusak', 'mampet', 'ganggu', 'masalah'],
};

function classifyReport(title = '', description = '') {
  const text = `${title}. ${description}`.toLowerCase();
  let category = 'lainnya';
  for (const [cat, kws] of Object.entries(CATEGORIES)) {
    if (kws.some((k) => text.includes(k))) {
      category = cat;
      break;
    }
  }
  let urgency = 'low';
  if (URGENCY_MAP.high.some((k) => text.includes(k))) urgency = 'high';
  else if (URGENCY_MAP.medium.some((k) => text.includes(k))) urgency = 'medium';
  return { category, urgency, confidence: 0.6 };
}

// PII redaction sederhana
function redactPII(text = '') {
  return text
    .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[email]')
    .replace(/\b(\+62|0)(\d[\s-]?){8,13}\b/g, '[telp]')
    .replace(/\b(Jl\.?|Jalan)\s+[A-Za-z0-9 .-]+/gi, '[alamat]');
}

// Enhanced intent detection dengan AI + keyword fallback
router.post('/intent', async (req, res) => {
  try {
    const { text = '', context = '' } = req.body || {};
    
    // Coba AI NLP dulu untuk semantic understanding
    const aiResult = await detectIntentWithAI(text, context);
    
    if (aiResult && aiResult.confidence > 0.7) {
      // Gunakan hasil AI jika confidence tinggi
      return res.json(aiResult);
    }
    
    // Fallback ke keyword-based jika AI tidak yakin atau gagal
    const keywordResult = detectIntent(text);
    
    // Gabungkan hasil AI dengan keyword (jika ada)
    if (aiResult && aiResult.intent === keywordResult.intent) {
      // Jika keduanya setuju, tingkatkan confidence
      return res.json({
        ...aiResult,
        confidence: Math.min(0.95, (aiResult.confidence + keywordResult.confidence) / 2 + 0.1)
      });
    }
    
    // Jika berbeda, prioritaskan keyword untuk keamanan
    return res.json(keywordResult);
  } catch (e) {
    console.error('Intent detection error:', e);
    // Fallback ke keyword-based
    const { text = '' } = req.body || {};
    const out = detectIntent(text);
    res.json(out);
  }
});

router.post('/classify', (req, res) => {
  try {
    const { title = '', description = '' } = req.body || {};
    const out = classifyReport(title, description);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/redact', (req, res) => {
  try {
    const { text = '' } = req.body || {};
    res.json({ text: redactPII(text) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Export dengan AI-enhanced version
module.exports = { 
  router, 
  detectIntent, 
  detectIntentWithAI, // Export AI version untuk digunakan di chat.routes.js
  classifyReport, 
  redactPII 
};


