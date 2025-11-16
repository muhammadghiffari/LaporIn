const express = require('express');
const router = express.Router();

// Smart keyword-based NLP baseline
const INTENTS = [
  {
    intent: 'CREATE_REPORT',
    keywords: [
      // Explicit intent
      'buat laporan', 'lapor', 'mau lapor', 'laporan baru', 'tolong lapor', 'ada masalah',
      'tolong pak rt', 'tolong pak', 'bisa lapor', 'ingin melaporkan',
      // Infrastruktur keywords
      'lampu', 'jalan', 'rusak', 'berlubang', 'retak', 'mati', 'padam', 'nyala',
      'got', 'selokan', 'mampet', 'buntu', 'tersumbat', 'bocor', 'banjir',
      'drainase', 'saluran', 'air', 'listrik', 'pipa', 'meteran',
      'tps', 'sampah', 'menumpuk', 'bau', 'dibuang sembarangan',
      'tembok', 'jembatan', 'jembatan retak', 'jembatan rusak',
      'pohon', 'runtuh', 'tumbang', 'roboh', 'jatuh', 'cabang patah',
      'bangunan', 'fasilitas', 'lapangan', 'area', 'taman', 'parkiran',
      // Sosial keywords
      'keributan', 'ribut', 'berisik', 'tetangga', 'keamanan', 'pencurian',
      'ronda', 'siskamling', 'konflik', 'masalah sosial',
      'mengganggu', 'ganggu', 'menggangu aktivitas', 'aktivitas tetangga',
      'kebisingan', 'suara bising', 'kegaduhan',
      // Admin keywords
      'surat', 'domisili', 'pengantar', 'ktp', 'kk', 'data',
      // Bantuan keywords
      'bansos', 'sembako', 'bantuan', 'penerima bantuan',
      // Umum (jika ada lokasi + masalah)
      'di depan', 'di blok', 'di jalan', 'di rt', 'di rw',
      'dekat', 'sekitar', 'depan', 'belakang', 'samping',
    ],
    patterns: [
      // Infrastruktur masalah
      /(lampu|jalan|got|selokan|sampah|listrik|air|pohon|bangunan).*(mati|rusak|mampet|bocor|berlubang|runtuh|tumbang|roboh|jatuh)/i,
      /(ada|tolong|minta|perbaiki|tolong perbaiki).*(masalah|rusak|mati|bocor|mampet|runtuh|tumbang)/i,
      /(di|dekat|depan|blok|jalan|rt|rw|area|lapangan|taman).*(lampu|jalan|got|masalah|pohon|bangunan|fasilitas)/i,
      // Masalah sosial/gangguan
      /(mengganggu|ganggu|menggangu).*(aktivitas|tetangga|warga|masyarakat)/i,
      /(pohon|bangunan|fasilitas).*(runtuh|tumbang|roboh|jatuh).*(area|lapangan|taman|jalan|di)/i,
      // Request perbaikan dengan lokasi
      /(tolong|bisa|minta).*(perbaiki|perbaik|tindak|tindaklanjuti).*(pohon|jalan|lampu|got|bangunan|masalah)/i,
      /(ini|itu|situ).*(pohon|jalan|lampu|got|bangunan|masalah).*(runtuh|rusak|mati|mampet|mengganggu)/i,
    ],
  },
  { intent: 'CHECK_STATUS', keywords: ['status laporan', 'cek status', 'gimana laporan saya', 'laporan saya', 'progres laporan'] },
  { intent: 'ASK_STATS', keywords: ['berapa', 'jumlah', 'total', 'antrian', 'sisa', 'berapa lagi', 'ada berapa', 'total laporan', 'statistik', 'data'] },
  { intent: 'ASK_CAPABILITY', keywords: ['apakah kamu bisa', 'bisa ga', 'bisa gak', 'mungkinkah', 'apakah bisa', 'bisa tidak', 'bisa enggak', 'kamu bisa ga', 'fungsi kamu apa', 'kamu bisa apa'] },
  { intent: 'NEGATION', keywords: ['belum minta', 'tidak minta', 'saya belum', 'perasaan saya belum', 'ga minta', 'gak minta', 'tidak mau', 'belum mau', 'enggak minta', 'tidak ingin', 'belum ingin'] },
  { intent: 'PREVIEW_REPORT', keywords: ['review dulu', 'lihat dulu', 'cek dulu', 'preview', 'tunggu persetujuan', 'aku review', 'berikan isinya', 'review dulu baru', 'tunggu approval', 'tunggu konfirmasi', 'tunggu persetujuan ku', 'tunggu persetujuan saya'] },
  { intent: 'ASK_FAQ', keywords: ['cara', 'bagaimana', 'apa itu', 'kenapa', 'faq', 'pending', 'fungsinya'] },
];

function detectIntent(text) {
  const t = (text || '').toLowerCase().trim();
  
  // PRIORITAS 1: Cek dulu apakah ini pertanyaan tentang kemampuan (JANGAN CREATE_REPORT)
  const askCapabilityIntent = INTENTS.find(i => i.intent === 'ASK_CAPABILITY');
  if (askCapabilityIntent && askCapabilityIntent.keywords.some((k) => t.includes(k))) {
    return { intent: 'ASK_CAPABILITY', confidence: 0.95 };
  }
  
  // PRIORITAS 2: Cek dulu apakah ini request preview/review (JANGAN CREATE_REPORT langsung)
  const previewIntent = INTENTS.find(i => i.intent === 'PREVIEW_REPORT');
  if (previewIntent && previewIntent.keywords.some((k) => t.includes(k))) {
    return { intent: 'PREVIEW_REPORT', confidence: 0.95 };
  }
  
  // PRIORITAS 3: Cek dulu apakah ini negasi/protes (JANGAN CREATE_REPORT)
  const negationIntent = INTENTS.find(i => i.intent === 'NEGATION');
  if (negationIntent && negationIntent.keywords.some((k) => t.includes(k))) {
    return { intent: 'NEGATION', confidence: 0.95 };
  }
  
  // PRIORITAS 4: Cek apakah ini pertanyaan (menggunakan kata tanya) tanpa masalah spesifik
  const isQuestion = /^(apakah|apakah kamu|bisa ga|bisa gak|mungkinkah|bisa tidak|kamu bisa|fungsi|apa fungsi)/i.test(t.trim());
  const hasProblemInQuestion = /(pohon|jalan|lampu|got|rusak|mati|mampet|runtuh|tumbang|mengganggu|perbaiki|masalah)/i.test(t);
  if (isQuestion && !hasProblemInQuestion) {
    // Ini pertanyaan umum tentang kemampuan, bukan request create report
    return { intent: 'ASK_CAPABILITY', confidence: 0.9 };
  }
  
  // Check CREATE_REPORT dengan pattern yang lebih pintar
  const createReportIntent = INTENTS.find(i => i.intent === 'CREATE_REPORT');
  if (createReportIntent) {
    // Check keywords - tapi JANGAN jika ini pertanyaan kemampuan
    if (!isQuestion && createReportIntent.keywords.some((k) => t.includes(k))) {
      return { intent: 'CREATE_REPORT', confidence: 0.9 };
    }
    // Check patterns (regex)
    if (createReportIntent.patterns && createReportIntent.patterns.some(p => p.test(t))) {
      return { intent: 'CREATE_REPORT', confidence: 0.85 };
    }
    // Heuristik: jika ada lokasi + kata masalah/infrastruktur/sosial
    // TAPI JANGAN jika ini pertanyaan kemampuan atau negasi
    const hasLocation = /(di|dekat|depan|blok|jalan|rt|rw|portal|pos|area|lapangan|taman)/i.test(t);
    const hasProblem = /(lampu|jalan|got|selokan|rusak|mati|bocor|mampet|masalah|pohon|runtuh|tumbang|roboh|mengganggu|ganggu|aktivitas|perbaiki)/i.test(t);
    const hasRequest = /(tolong|bisa|minta|ingin|harap|buatin|buatkan|bikin)/i.test(t);
    const hasNegation = /(belum|tidak|ga|gak|enggak|perasaan.*belum)/i.test(t);
    const isQuestionOnly = /^(apakah|bisa ga|bisa gak|mungkinkah)/i.test(t.trim());
    
    // JANGAN CREATE_REPORT jika:
    // 1. Ini pertanyaan kemampuan tanpa masalah spesifik
    // 2. Ada kata negasi (belum, tidak, gak minta)
    if (isQuestionOnly || hasNegation) {
      return { intent: 'GENERAL', confidence: 0.7 };
    }
    
    // Jika ada lokasi + masalah + request perbaikan = laporan (pastinya)
    if (hasLocation && hasProblem && hasRequest && t.length > 15 && !isQuestion) {
      return { intent: 'CREATE_REPORT', confidence: 0.9 };
    }
    // Jika ada masalah yang jelas dengan detail + ada request = laporan
    if ((/(pohon.*runtuh|bangunan.*rusak|masalah.*mengganggu|aktivitas.*terganggu)/i.test(t)) && hasRequest && t.length > 20) {
      return { intent: 'CREATE_REPORT', confidence: 0.9 };
    }
    // Jika ada lokasi + masalah = kemungkinan laporan (tapi cek lagi)
    if (hasLocation && hasProblem && t.length > 15 && !isQuestion) {
      return { intent: 'CREATE_REPORT', confidence: 0.8 };
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

router.post('/intent', (req, res) => {
  try {
    const { text = '' } = req.body || {};
    const out = detectIntent(text);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
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

module.exports = { router, detectIntent, classifyReport, redactPII };


