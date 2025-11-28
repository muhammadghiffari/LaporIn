const prisma = require('../database/prisma');

// Groq AI untuk content analysis (fraud detection)
let groq = null;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
try {
  if (GROQ_API_KEY && GROQ_API_KEY.trim() !== '') {
    const Groq = require('groq-sdk');
    groq = new Groq({ apiKey: GROQ_API_KEY.trim() });
    console.log('✅ Groq AI (Fraud Detection) initialized successfully');
  } else {
    console.warn('⚠️  GROQ_API_KEY not set - Fraud detection will use rule-based only');
  }
} catch (err) {
  console.error('❌ Groq initialization error (fraud detection):', err.message);
  groq = null;
}

/**
 * Calculate text similarity using simple algorithm (Levenshtein-like)
 * Returns similarity score 0-1
 */
function calculateTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  const str1 = text1.toLowerCase().trim();
  const str2 = text2.toLowerCase().trim();
  
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  // Check common words
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  const jaccardSimilarity = intersection.size / union.size;
  
  // Check substring similarity
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.includes(shorter)) {
    return Math.max(jaccardSimilarity, 0.8);
  }
  
  return jaccardSimilarity;
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * Returns distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Detect duplicate reports
 */
async function detectDuplicateReport(newReport, userId) {
  try {
    const { title, description, latitude, longitude } = newReport;
    
    // Get recent reports from same user (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentReports = await prisma.report.findMany({
      where: {
        userId: userId,
        createdAt: {
          gte: twentyFourHoursAgo
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        latitude: true,
        longitude: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Check last 10 reports
    });

    if (recentReports.length === 0) {
      return {
        isDuplicate: false,
        confidence: 0,
        similarReports: []
      };
    }

    // Calculate similarity scores
    const similarities = [];
    
    for (const report of recentReports) {
      // Text similarity
      const titleSimilarity = calculateTextSimilarity(title, report.title);
      const descSimilarity = calculateTextSimilarity(description, report.description);
      const textSimilarity = (titleSimilarity * 0.6 + descSimilarity * 0.4);
      
      // Location similarity
      let locationSimilarity = 0;
      if (latitude && longitude && report.latitude && report.longitude) {
        const distance = calculateDistance(latitude, longitude, report.latitude, report.longitude);
        // If within 50 meters, consider as same location
        if (distance < 50) {
          locationSimilarity = 1.0;
        } else if (distance < 100) {
          locationSimilarity = 0.8;
        } else if (distance < 200) {
          locationSimilarity = 0.5;
        }
      }
      
      // Time similarity (within 1 hour = more likely duplicate)
      const timeDiff = Math.abs(new Date().getTime() - report.createdAt.getTime());
      const timeSimilarity = timeDiff < 60 * 60 * 1000 ? 0.9 : 
                           timeDiff < 6 * 60 * 60 * 1000 ? 0.6 : 0.3;
      
      // Combined score
      const duplicateScore = (textSimilarity * 0.5 + locationSimilarity * 0.3 + timeSimilarity * 0.2);
      
      if (duplicateScore > 0.5) {
        similarities.push({
          reportId: report.id,
          score: duplicateScore,
          reasons: [
            textSimilarity > 0.7 ? 'Judul/deskripsi sangat mirip' : null,
            locationSimilarity > 0.7 ? 'Lokasi sangat dekat' : null,
            timeSimilarity > 0.7 ? 'Waktu pengajuan sangat berdekatan' : null
          ].filter(Boolean)
        });
      }
    }

    // Sort by score descending
    similarities.sort((a, b) => b.score - a.score);

    const highestScore = similarities.length > 0 ? similarities[0].score : 0;
    const isDuplicate = highestScore > 0.75; // Threshold 75%

    return {
      isDuplicate,
      confidence: highestScore,
      similarReports: similarities.slice(0, 3) // Top 3 similar reports
    };

  } catch (error) {
    console.error('[Fraud Detection] Error detecting duplicate:', error);
    return {
      isDuplicate: false,
      confidence: 0,
      similarReports: [],
      error: error.message
    };
  }
}

/**
 * Detect spam/fake reports
 */
async function detectSpamReport(newReport, userId) {
  try {
    const { title, description } = newReport;
    
    // Check report frequency (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentReportCount = await prisma.report.count({
      where: {
        userId: userId,
        createdAt: {
          gte: twentyFourHoursAgo
        }
      }
    });

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isVerified: true,
        createdAt: true
      }
    });

    const reasons = [];
    let spamScore = 0;

    // 1. Frequency check
    if (recentReportCount > 10) {
      spamScore += 0.4;
      reasons.push(`Terlalu banyak laporan dalam 24 jam (${recentReportCount})`);
    } else if (recentReportCount > 5) {
      spamScore += 0.2;
      reasons.push(`Banyak laporan dalam 24 jam (${recentReportCount})`);
    }

    // 2. Content quality check dengan Groq AI
    const text = `${title} ${description}`.toLowerCase();
    
    // AI Content Analysis dengan Groq (jika tersedia)
    if (groq && description && description.trim().length > 20) {
      try {
        const aiAnalysis = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [{
            role: 'system',
            content: `Analisis laporan warga untuk mendeteksi spam/fake. Return JSON: {"isSpam": boolean, "confidence": 0-1, "reason": "string"}`
          }, {
            role: 'user',
            content: `Judul: ${title}\nDeskripsi: ${description}\n\nApakah ini spam atau laporan palsu?`
          }],
          temperature: 0.3,
          max_tokens: 200
        });
        
        const aiResponse = aiAnalysis.choices[0]?.message?.content || '';
        try {
          const parsed = JSON.parse(aiResponse);
          if (parsed.isSpam && parsed.confidence > 0.6) {
            spamScore += parsed.confidence * 0.4;
            reasons.push(`AI Detection: ${parsed.reason || 'Konten mencurigakan terdeteksi'}`);
          }
        } catch (parseError) {
          // If JSON parse fails, check if AI says it's spam
          if (aiResponse.toLowerCase().includes('spam') || aiResponse.toLowerCase().includes('fake')) {
            spamScore += 0.3;
            reasons.push('AI Detection: Konten mencurigakan terdeteksi');
          }
        }
      } catch (aiError) {
        console.error('[Fraud Detection] Groq AI error (non-blocking):', aiError.message);
        // Continue with rule-based detection
      }
    }
    
    // Check for spam keywords (rule-based fallback)
    const spamKeywords = ['test', 'testing', 'coba', 'percobaan', 'asd', 'qwe', '123'];
    const foundSpamKeywords = spamKeywords.filter(keyword => text.includes(keyword));
    if (foundSpamKeywords.length > 0) {
      spamScore += 0.3;
      reasons.push(`Mengandung kata-kata mencurigakan: ${foundSpamKeywords.join(', ')}`);
    }

    // 3. Length check (too short = likely spam)
    if (description && description.trim().length < 10) {
      spamScore += 0.2;
      reasons.push('Deskripsi terlalu pendek');
    }

    if (title && title.trim().length < 5) {
      spamScore += 0.2;
      reasons.push('Judul terlalu pendek');
    }

    // 4. Repeated characters (likely spam)
    if (/(.)\1{4,}/.test(text)) {
      spamScore += 0.3;
      reasons.push('Mengandung karakter berulang mencurigakan');
    }

    // 5. User verification status
    if (user && !user.isVerified) {
      spamScore += 0.1;
      reasons.push('User belum diverifikasi');
    }

    // 6. New user check (created < 1 hour ago)
    if (user) {
      const userAge = Date.now() - user.createdAt.getTime();
      if (userAge < 60 * 60 * 1000) { // Less than 1 hour
        spamScore += 0.2;
        reasons.push('User baru (akun < 1 jam)');
      }
    }

    // Normalize score to 0-1
    spamScore = Math.min(spamScore, 1.0);

    return {
      isSpam: spamScore > 0.6, // Threshold 60%
      confidence: spamScore,
      reasons: reasons.length > 0 ? reasons : ['Tidak ada indikasi spam']
    };

  } catch (error) {
    console.error('[Fraud Detection] Error detecting spam:', error);
    return {
      isSpam: false,
      confidence: 0,
      reasons: [],
      error: error.message
    };
  }
}

/**
 * Validate report quality
 */
async function validateReportQuality(newReport) {
  try {
    const { title, description, location, latitude, longitude } = newReport;
    
    const issues = [];
    let qualityScore = 1.0;

    // 1. Completeness check
    if (!title || title.trim().length < 5) {
      qualityScore -= 0.2;
      issues.push('Judul tidak lengkap atau terlalu pendek');
    }

    if (!description || description.trim().length < 10) {
      qualityScore -= 0.3;
      issues.push('Deskripsi tidak lengkap atau terlalu pendek');
    }

    if (!location || location.trim().length < 5) {
      qualityScore -= 0.2;
      issues.push('Lokasi tidak disebutkan atau tidak lengkap');
    }

    // 2. Location validity
    if (!latitude || !longitude) {
      qualityScore -= 0.1;
      issues.push('Koordinat GPS tidak tersedia');
    }

    // 3. Relevance check (basic keyword check)
    const text = `${title} ${description}`.toLowerCase();
    const relevantKeywords = ['jalan', 'jalanan', 'jembatan', 'drainase', 'selokan', 'lampu', 'listrik', 'air', 'sampah', 'lingkungan', 'banjir', 'rusak', 'perlu'];
    const hasRelevantKeywords = relevantKeywords.some(keyword => text.includes(keyword));
    
    if (!hasRelevantKeywords && description.length > 20) {
      qualityScore -= 0.1;
      issues.push('Konten mungkin tidak relevan dengan pelaporan warga');
    }

    // Normalize score
    qualityScore = Math.max(qualityScore, 0);

    return {
      isValid: qualityScore >= 0.6, // Minimum 60% quality
      qualityScore,
      issues: issues.length > 0 ? issues : ['Tidak ada masalah kualitas']
    };

  } catch (error) {
    console.error('[Fraud Detection] Error validating quality:', error);
    return {
      isValid: true, // Default to valid if error
      qualityScore: 1.0,
      issues: [],
      error: error.message
    };
  }
}

/**
 * Detect anomalies in report pattern
 */
async function detectAnomaly(newReport, userId) {
  try {
    // Get user history
    const userReports = await prisma.report.findMany({
      where: { userId: userId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        status: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    if (userReports.length < 3) {
      // Not enough history
      return {
        isAnomaly: false,
        confidence: 0,
        anomalies: []
      };
    }

    const anomalies = [];
    let anomalyScore = 0;

    // 1. Frequency anomaly (sudden spike)
    const recentCount = userReports.filter(r => {
      const timeDiff = Date.now() - r.createdAt.getTime();
      return timeDiff < 24 * 60 * 60 * 1000; // Last 24 hours
    }).length;

    if (recentCount > 5) {
      anomalyScore += 0.3;
      anomalies.push(`Frekuensi laporan tidak normal (${recentCount} laporan dalam 24 jam)`);
    }

    // 2. Location anomaly (sudden location change)
    const { latitude, longitude } = newReport;
    if (latitude && longitude && userReports.length > 0) {
      const recentReportsWithLocation = userReports
        .filter(r => r.latitude && r.longitude)
        .slice(0, 5);
      
      if (recentReportsWithLocation.length > 0) {
        const distances = recentReportsWithLocation.map(r => 
          calculateDistance(latitude, longitude, r.latitude, r.longitude)
        );
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        
        // If new location is > 1km from average, it's an anomaly
        if (avgDistance > 1000) {
          anomalyScore += 0.3;
          anomalies.push('Lokasi laporan jauh dari lokasi sebelumnya');
        }
      }
    }

    // 3. Time pattern anomaly (unusual hour)
    const currentHour = new Date().getHours();
    const recentHours = userReports
      .slice(0, 10)
      .map(r => new Date(r.createdAt).getHours());
    
    if (recentHours.length > 0) {
      const avgHour = recentHours.reduce((a, b) => a + b, 0) / recentHours.length;
      const hourDiff = Math.abs(currentHour - avgHour);
      
      if (hourDiff > 6) {
        anomalyScore += 0.2;
        anomalies.push('Waktu pengajuan tidak sesuai pola biasa');
      }
    }

    // Normalize score
    anomalyScore = Math.min(anomalyScore, 1.0);

    return {
      isAnomaly: anomalyScore > 0.5,
      confidence: anomalyScore,
      anomalies: anomalies.length > 0 ? anomalies : ['Tidak ada anomali terdeteksi']
    };

  } catch (error) {
    console.error('[Fraud Detection] Error detecting anomaly:', error);
    return {
      isAnomaly: false,
      confidence: 0,
      anomalies: [],
      error: error.message
    };
  }
}

/**
 * Main fraud detection function
 * Runs all fraud detection checks and returns combined result
 */
async function runFraudDetection(newReport, userId) {
  try {
    console.log(`[Fraud Detection] Running fraud detection for user ${userId}...`);

    // Run all detection checks in parallel
    const [duplicateResult, spamResult, qualityResult, anomalyResult] = await Promise.all([
      detectDuplicateReport(newReport, userId),
      detectSpamReport(newReport, userId),
      validateReportQuality(newReport),
      detectAnomaly(newReport, userId)
    ]);

    // Calculate overall fraud score
    const fraudScore = Math.max(
      duplicateResult.confidence * 0.4,  // Duplicate is highest weight
      spamResult.confidence * 0.3,
      (1 - qualityResult.qualityScore) * 0.2, // Low quality = higher fraud score
      anomalyResult.confidence * 0.1
    );

    const isFraud = fraudScore > 0.7 || duplicateResult.isDuplicate || spamResult.isSpam;

    const result = {
      isFraud,
      fraudScore,
      checks: {
        duplicate: duplicateResult,
        spam: spamResult,
        quality: qualityResult,
        anomaly: anomalyResult
      },
      overallReasons: []
    };

    // Collect reasons
    if (duplicateResult.isDuplicate) {
      result.overallReasons.push('Laporan duplikat terdeteksi');
    }
    if (spamResult.isSpam) {
      result.overallReasons.push(...spamResult.reasons);
    }
    if (!qualityResult.isValid) {
      result.overallReasons.push(...qualityResult.issues);
    }
    if (anomalyResult.isAnomaly) {
      result.overallReasons.push(...anomalyResult.anomalies);
    }

    console.log(`[Fraud Detection] Result: ${isFraud ? 'FRAUD DETECTED' : 'CLEAN'} (score: ${fraudScore.toFixed(2)})`);

    return result;

  } catch (error) {
    console.error('[Fraud Detection] Error running fraud detection:', error);
    // Return safe default (no fraud) if error
    return {
      isFraud: false,
      fraudScore: 0,
      checks: {},
      overallReasons: [],
      error: error.message
    };
  }
}

module.exports = {
  detectDuplicateReport,
  detectSpamReport,
  validateReportQuality,
  detectAnomaly,
  runFraudDetection
};

