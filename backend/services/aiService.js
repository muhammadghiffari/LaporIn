require('dotenv').config();
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    const OpenAI = require('openai');
    openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
  }
} catch (err) {
  // If OpenAI SDK throws due to missing key or other init error, proceed without it
  openai = null;
}

const CATEGORIES = {
  infrastruktur: ['jalan', 'lampu', 'got', 'selokan', 'saluran', 'drainase', 'listrik', 'air', 'pohon', 'bangunan', 'fasilitas'],
  sosial: ['keributan', 'tetangga', 'keamanan', 'ronda', 'konflik', 'mengganggu', 'kebisingan', 'tawuran', 'perkelahian', 'vandalisme'],
  administrasi: ['surat', 'domisili', 'pengantar', 'ktp', 'kk'],
  bantuan: ['bansos', 'sembako', 'tidak mampu', 'miskin', 'bantuan', 'belum diterima', 'belum dapet', 'tidak diterima', 'tidak dapet'],
};

const URGENCY_KEYWORDS = {
  high: ['kebakaran', 'listrik', 'bocor', 'berantem', 'sakit', 'darurat', 'urgent'],
  medium: ['mampet', 'rusak', 'ganggu', 'masalah'],
  low: ['permintaan', 'surat', 'informasi'],
};

async function processReport(text) {
  try {
    const startTime = Date.now();
    
    // If OpenAI is not configured, use fallback immediately
    if (!openai) {
      return fallbackProcessing(text);
    }
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Kamu adalah asisten AI untuk platform laporan warga RT/RW. 
          Tugasmu:
          1. **Ringkas laporan menjadi 1-2 kalimat yang JELAS dan INFORMATIF** - JANGAN hanya copy-paste pesan user. Buat ringkasan yang menjelaskan inti masalah dengan bahasa yang profesional dan mudah dipahami.
          2. Kategorikan: infrastruktur, sosial, administrasi, atau bantuan
          3. Tentukan urgensi: high, medium, atau low
          
          **PENTING - RINGKASAN:**
          - JANGAN hanya copy-paste pesan user sebagai ringkasan
          - Buat ringkasan yang menjelaskan MASALAH dengan jelas, bukan hanya mengulang kata-kata user
          - Contoh: Jika user bilang "saya ingin melapor terkait bansos knp sya blm dapet ya bisa tolong di laporkan" → ringkasan: "Warga melaporkan bahwa bantuan sosial (bansos) yang seharusnya diterima belum sampai. Perlu pengecekan dan tindak lanjut dari pengurus RT/RW."
          - Contoh: Jika user bilang "lampu mati di blok C" → ringkasan: "Lampu di blok C mengalami kerusakan dan tidak menyala, mengganggu aktivitas warga pada malam hari."
          - Contoh: Jika user bilang "jalan rusak berlubang di depan rumah" → ringkasan: "Jalan di depan rumah mengalami kerusakan dengan banyak lubang, membahayakan pengendara dan kendaraan yang melintas."
          
          **KATEGORI:**
          - infrastruktur: pohon, jalan, lampu, got, bangunan, fasilitas, listrik, air, drainase, sampah menumpuk
          - sosial: mengganggu aktivitas, kebisingan, keributan, tetangga, keamanan, serpihan kaca, tawuran, perkelahian, vandalisme
          - administrasi: surat, domisili, ktp, kk
          - bantuan: bansos, sembako, bantuan sosial, belum diterima, tidak dapet, belum dapet
          
          Format response JSON:
          {
            "summary": "ringkasan yang jelas dan informatif (bukan copy-paste)",
            "category": "kategori",
            "urgency": "high/medium/low"
          }`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
    });

    const content = response?.choices?.[0]?.message?.content || '';
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      // If parsing fails, use fallback
      return fallbackProcessing(text);
    }

    const processingTime = Date.now() - startTime;

    return {
      summary: result.summary || fallbackProcessing(text).summary,
      category: result.category || fallbackProcessing(text).category,
      urgency: result.urgency || fallbackProcessing(text).urgency,
      processingTime,
    };
  } catch (error) {
    console.error('AI processing error:', error);
    
    // Fallback: simple keyword matching
    return fallbackProcessing(text);
  }
}

function fallbackProcessing(text) {
  const lowerText = text.toLowerCase();
  
  // Category detection - prioritaskan "bantuan" jika ada kata bansos/bantuan
  let category = 'infrastruktur'; // default
  if (lowerText.includes('bansos') || lowerText.includes('sembako') || lowerText.includes('bantuan') || 
      lowerText.includes('belum diterima') || lowerText.includes('belum dapet') || lowerText.includes('tidak diterima') || lowerText.includes('tidak dapet')) {
    category = 'bantuan';
  } else if (lowerText.includes('surat') || lowerText.includes('domisili') || lowerText.includes('ktp') || lowerText.includes('kk') || lowerText.includes('pengantar')) {
    category = 'administrasi';
  } else if (lowerText.includes('keributan') || lowerText.includes('tetangga') || lowerText.includes('keamanan') || 
             lowerText.includes('mengganggu') || lowerText.includes('kebisingan') || lowerText.includes('tawuran') || 
             lowerText.includes('perkelahian') || lowerText.includes('vandalisme')) {
    category = 'sosial';
  } else {
    // Check other categories
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
      if (cat !== 'bantuan' && keywords.some(keyword => lowerText.includes(keyword))) {
      category = cat;
      break;
      }
    }
  }
  
  // Urgency detection
  let urgency = 'low';
  if (URGENCY_KEYWORDS.high.some(keyword => lowerText.includes(keyword))) {
    urgency = 'high';
  } else if (URGENCY_KEYWORDS.medium.some(keyword => lowerText.includes(keyword))) {
    urgency = 'medium';
  } else if (category === 'bantuan') {
    urgency = 'medium'; // Bansos biasanya medium urgency
  }
  
  // Generate better summary instead of just copying first 100 chars
  let summary = '';
  
  // Extract key information and create a meaningful summary
  if (lowerText.includes('bansos') || lowerText.includes('sembako') || lowerText.includes('bantuan')) {
    if (lowerText.includes('belum diterima') || lowerText.includes('belum dapet') || lowerText.includes('tidak diterima') || lowerText.includes('tidak dapet')) {
      summary = 'Warga melaporkan bahwa bantuan sosial (bansos) yang seharusnya diterima belum sampai. Perlu pengecekan dan tindak lanjut dari pengurus RT/RW.';
    } else {
      summary = 'Warga melaporkan masalah terkait bantuan sosial (bansos). Perlu pengecekan dan tindak lanjut dari pengurus RT/RW.';
    }
  } else if (lowerText.includes('lampu') && (lowerText.includes('mati') || lowerText.includes('padam') || lowerText.includes('tidak menyala'))) {
    summary = 'Lampu mengalami kerusakan dan tidak menyala, mengganggu aktivitas warga terutama pada malam hari.';
  } else if (lowerText.includes('jalan') && (lowerText.includes('rusak') || lowerText.includes('berlubang') || lowerText.includes('retak'))) {
    summary = 'Jalan mengalami kerusakan dengan banyak lubang atau permukaan tidak rata, membahayakan pengendara dan kendaraan yang melintas.';
  } else if (lowerText.includes('got') || lowerText.includes('selokan')) {
    if (lowerText.includes('mampet') || lowerText.includes('tersumbat') || lowerText.includes('buntu')) {
      summary = 'Got atau selokan mengalami penyumbatan, berpotensi menyebabkan genangan air dan bau tidak sedap.';
    } else {
      summary = 'Got atau selokan mengalami masalah yang perlu penanganan segera.';
    }
  } else if (lowerText.includes('pohon') && (lowerText.includes('runtuh') || lowerText.includes('tumbang') || lowerText.includes('roboh'))) {
    summary = 'Pohon mengalami keruntuhan atau tumbang, berpotensi membahayakan warga dan kendaraan di sekitarnya.';
  } else if (lowerText.includes('sampah') && (lowerText.includes('menumpuk') || lowerText.includes('bau'))) {
    summary = 'Sampah menumpuk di lokasi tersebut, menimbulkan bau tidak sedap dan berpotensi mengganggu kesehatan warga.';
  } else {
    // Fallback: create a summary from first sentence or meaningful part
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10);
    if (sentences.length > 0) {
      const firstSentence = sentences[0].trim();
      if (firstSentence.length > 20 && firstSentence.length < 150) {
        summary = firstSentence + (firstSentence.length < 100 ? '. Perlu pengecekan dan tindak lanjut dari pengurus RT/RW.' : '');
      } else {
        // Extract key words and create summary
        const words = firstSentence.split(/\s+/).filter(w => w.length > 3);
        if (words.length > 0) {
          summary = `Warga melaporkan masalah terkait ${words.slice(0, 3).join(' ')}. Perlu pengecekan dan tindak lanjut dari pengurus RT/RW.`;
        } else {
          summary = text.substring(0, 100) + (text.length > 100 ? '...' : '');
        }
      }
    } else {
      summary = text.substring(0, 100) + (text.length > 100 ? '...' : '');
    }
  }
  
  return {
    summary,
    category,
    urgency,
    processingTime: 0,
  };
}

module.exports = { processReport };

