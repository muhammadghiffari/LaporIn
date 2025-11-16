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
  infrastruktur: ['jalan', 'lampu', 'got', 'selokan', 'saluran', 'drainase', 'listrik', 'air'],
  sosial: ['keributan', 'tetangga', 'keamanan', 'ronda', 'konflik'],
  administrasi: ['surat', 'domisili', 'pengantar', 'ktp', 'kk'],
  bantuan: ['bansos', 'sembako', 'tidak mampu', 'miskin', 'bantuan'],
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
          1. Ringkas laporan menjadi 1-2 kalimat yang jelas
          2. Kategorikan: infrastruktur, sosial, administrasi, atau bantuan
          3. Tentukan urgensi: high, medium, atau low
          
          Format response JSON:
          {
            "summary": "ringkasan singkat",
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
  
  // Category detection
  let category = 'lainnya';
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      category = cat;
      break;
    }
  }
  
  // Urgency detection
  let urgency = 'low';
  if (URGENCY_KEYWORDS.high.some(keyword => lowerText.includes(keyword))) {
    urgency = 'high';
  } else if (URGENCY_KEYWORDS.medium.some(keyword => lowerText.includes(keyword))) {
    urgency = 'medium';
  }
  
  // Simple summary (first 100 chars)
  const summary = text.substring(0, 100) + (text.length > 100 ? '...' : '');
  
  return {
    summary,
    category,
    urgency,
    processingTime: 0,
  };
}

module.exports = { processReport };

