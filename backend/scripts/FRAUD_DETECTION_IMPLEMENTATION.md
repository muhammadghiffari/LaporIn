# 🛡️ AI Fraud Detection - Implementation

## ✅ Status: IMPLEMENTED

AI Fraud Detection sudah diimplementasikan dengan Groq AI untuk analisis konten canggih.

---

## 🔧 Fitur yang Diimplementasikan

### 1. **Duplicate Detection** ✅
- ✅ Semantic similarity check (text matching)
- ✅ Location proximity check (GPS distance)
- ✅ Time-window detection (24 jam terakhir)
- ✅ Confidence scoring

### 2. **Spam/Fake Detection** ✅
- ✅ **Groq AI Content Analysis** - Analisis konten dengan AI
- ✅ Frequency-based detection (jumlah laporan dalam 24 jam)
- ✅ Keyword-based detection (fallback)
- ✅ User behavior patterns

### 3. **Quality Validation** ✅
- ✅ Completeness check
- ✅ Location validity
- ✅ Content relevance

### 4. **Anomaly Detection** ✅
- ✅ Frequency anomaly
- ✅ Location pattern anomaly
- ✅ Time pattern anomaly

---

## 🎯 Cara Kerja

### Saat Laporan Dibuat:

1. **AI Processing** (untuk kategori & urgensi)
2. **Fraud Detection** (paralel dengan AI processing):
   - Duplicate check
   - Spam detection (dengan Groq AI)
   - Quality validation
   - Anomaly detection
3. **Results disimpan** di database:
   - `isDuplicate`, `duplicateScore`
   - `isSpam`, `spamScore`, `spamReasons`
   - `qualityScore`, `qualityIssues`
   - `isAnomaly`, `anomalyScore`
   - `fraudScore` (overall)

### Groq AI untuk Spam Detection:

```javascript
// Groq AI menganalisis konten laporan
const aiAnalysis = await groq.chat.completions.create({
  model: 'llama-3.1-8b-instant',
  messages: [{
    role: 'system',
    content: 'Analisis laporan untuk deteksi spam/fake'
  }, {
    role: 'user',
    content: `Judul: ${title}\nDeskripsi: ${description}`
  }]
});
```

---

## 📊 Database Schema

Fields di tabel `reports`:
- `isDuplicate` - Boolean
- `duplicateScore` - Float (0-1)
- `isSpam` - Boolean
- `spamScore` - Float (0-1)
- `spamReasons` - JSON array
- `qualityScore` - Float (0-1)
- `qualityIssues` - JSON array
- `isAnomaly` - Boolean
- `anomalyScore` - Float (0-1)
- `fraudScore` - Float (0-1) - Overall fraud score
- `fraudChecked` - Boolean
- `fraudCheckedAt` - DateTime

Plus `fraud_detection_logs` table untuk audit trail.

---

## 🎯 Thresholds

- **Duplicate**: Score > 0.75 → Flagged
- **Spam**: Score > 0.6 → Flagged
- **Quality**: Score < 0.6 → Low quality
- **Anomaly**: Score > 0.5 → Flagged
- **Overall Fraud**: Score > 0.7 → Suspicious

---

## ✅ Integration

Fraud detection otomatis berjalan saat:
- User membuat laporan baru via `/api/reports` POST
- Hasil disimpan ke database
- Admin bisa review flagged reports

**Non-blocking**: Jika fraud detection error, laporan tetap bisa dibuat (untuk reliability).

---

**Status: Production Ready** ✅

