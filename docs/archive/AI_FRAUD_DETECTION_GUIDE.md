# 🛡️ AI Fraud Detection - Panduan Lengkap

## ✅ Status: FULLY IMPLEMENTED

AI Fraud Detection **SUDAH DIIMPLEMENTASIKAN** dan aktif di sistem LaporIn!

---

## 🎯 Apa itu AI Fraud Detection?

Sistem keamanan yang **otomatis menganalisis setiap laporan baru** untuk mendeteksi:
- ✅ **Duplicate Reports** - Laporan duplikat/berulang
- ✅ **Spam/Fake Reports** - Laporan palsu atau tidak relevan
- ✅ **Data Quality Issues** - Laporan dengan data tidak lengkap
- ✅ **Anomaly Patterns** - Pola mencurigakan (terlalu banyak laporan, lokasi aneh, dll)

---

## 🔧 Cara Kerja

### 1. **Otomatis Berjalan Saat Laporan Dibuat**

Ketika user membuat laporan baru (via form atau chatbot), sistem **otomatis** menjalankan fraud detection:

```javascript
// Di backend/routes/reports.routes.js
// Saat POST /api/reports:

1. User submit laporan
   ↓
2. AI Processing (kategori & urgensi)
   ↓
3. 🛡️ Fraud Detection (PARALEL):
   ├─→ Duplicate Check
   ├─→ Spam Detection (dengan Groq AI)
   ├─→ Quality Validation
   └─→ Anomaly Detection
   ↓
4. Hasil disimpan ke database
   ↓
5. Laporan tetap dibuat (tetap pending)
   ↓
6. Admin bisa review flagged reports
```

---

## 📊 4 Jenis Fraud Detection

### **1. Duplicate Detection** 🔍

**Cara Kerja:**
- ✅ Cek similarity text (judul + deskripsi)
- ✅ Cek lokasi GPS (dalam radius 50-200 meter)
- ✅ Cek waktu (dalam 24 jam terakhir)
- ✅ Cek user yang sama

**Algorithm:**
```javascript
// Text similarity (Jaccard similarity)
// Location proximity (Haversine distance)
// Time window (24 hours)
// Combined score > 0.75 = Duplicate
```

**Contoh:**
```
User submit:
"Got mampet di jl digidaw 121"

System detect:
- Text similarity: 0.95 dengan laporan sebelumnya
- Location: 30 meter dari laporan sebelumnya
- Time: 2 jam setelah laporan sebelumnya
→ FLAGGED AS DUPLICATE (score: 0.9)
```

---

### **2. Spam/Fake Detection** 🚫

**Cara Kerja:**
- ✅ **Groq AI Content Analysis** - Analisis konten dengan AI
- ✅ Frequency check (jumlah laporan dalam 24 jam)
- ✅ Keyword spam detection
- ✅ Content quality check (panjang, relevansi)
- ✅ User reputation check

**Groq AI Analysis:**
```javascript
// Menggunakan Groq AI untuk analisis konten
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

**Contoh:**
```
User submit:
"test test test"

System detect:
- AI Analysis: "isSpam: true, confidence: 0.85"
- Frequency: 15 laporan dalam 24 jam (abnormal)
- Content: Terlalu pendek, tidak relevan
→ FLAGGED AS SPAM (score: 0.8)
```

---

### **3. Quality Validation** ✅

**Cara Kerja:**
- ✅ Completeness check (judul, deskripsi, lokasi)
- ✅ Length validation (minimum panjang)
- ✅ GPS coordinates check
- ✅ Relevance check (keyword relevan)

**Contoh:**
```
User submit:
Title: "abc"
Description: "test"
Location: ""

System detect:
- Judul terlalu pendek (< 5 karakter)
- Deskripsi terlalu pendek (< 10 karakter)
- Lokasi kosong
- Tidak ada GPS coordinates
→ LOW QUALITY (score: 0.3)
```

---

### **4. Anomaly Detection** ⚠️

**Cara Kerja:**
- ✅ Frequency anomaly (spike mendadak)
- ✅ Location anomaly (lokasi jauh dari biasa)
- ✅ Time pattern anomaly (waktu tidak normal)

**Contoh:**
```
User biasanya report dari area A (blok C)
Tiba-tiba report dari area B (10km jauhnya)

System detect:
- Location anomaly: Lokasi jauh dari lokasi sebelumnya
- Frequency anomaly: 8 laporan dalam 24 jam (tidak normal)
→ FLAGGED AS ANOMALY (score: 0.6)
```

---

## 🎯 Thresholds & Scoring

### **Individual Scores:**
- **Duplicate**: Score > **0.75** → Flagged
- **Spam**: Score > **0.6** → Flagged
- **Quality**: Score < **0.6** → Low quality
- **Anomaly**: Score > **0.5** → Flagged

### **Overall Fraud Score:**
```javascript
fraudScore = max(
  duplicateScore * 0.4,        // Highest weight
  spamScore * 0.3,
  (1 - qualityScore) * 0.2,
  anomalyScore * 0.1
)
```

### **Final Decision:**
```javascript
isFraud = fraudScore > 0.7 || 
          isDuplicate || 
          isSpam
```

---

## 🔒 Keamanan

### **1. Non-Blocking Design**
- ✅ Fraud detection **TIDAK memblokir** laporan
- ✅ Laporan tetap dibuat (status: pending)
- ✅ Admin yang review dan decide
- ✅ Jika fraud detection error, laporan tetap bisa dibuat (reliability)

### **2. Privacy & Security**
- ✅ Data user tidak di-expose ke AI
- ✅ Hanya text content yang dianalisis
- ✅ No PII (Personally Identifiable Information) sent to AI
- ✅ Audit trail lengkap di `fraud_detection_logs` table

### **3. Rate Limiting**
- ✅ Duplicate check hanya cek laporan 24 jam terakhir
- ✅ Spam detection limit: max 10 laporan/24 jam per user
- ✅ Cache hasil untuk efisiensi

---

## 📋 Data yang Disimpan

### **Di Database (tabel `reports`):**
```javascript
{
  isDuplicate: boolean,
  duplicateScore: float (0-1),
  similarReportId: int,
  isSpam: boolean,
  spamScore: float (0-1),
  spamReasons: JSON array,
  qualityScore: float (0-1),
  qualityIssues: JSON array,
  isAnomaly: boolean,
  anomalyScore: float (0-1),
  anomalyReasons: JSON array,
  fraudScore: float (0-1),      // Overall score
  fraudChecked: boolean,
  fraudCheckedAt: datetime
}
```

### **Audit Trail (tabel `fraud_detection_logs`):**
```javascript
{
  reportId: int,
  detectionType: 'duplicate' | 'spam' | 'quality' | 'anomaly',
  score: float,
  details: JSON (full result)
}
```

---

## 👨‍💼 Penggunaan untuk Admin

### **1. Review Flagged Reports**

Admin bisa:
- ✅ Lihat semua laporan dengan `fraudScore > 0.7`
- ✅ Lihat detail fraud detection results
- ✅ Lihat reasons mengapa di-flag
- ✅ Approve (unflag) atau Reject (delete)

### **2. Filter Reports**

Bisa filter berdasarkan:
- `isDuplicate = true`
- `isSpam = true`
- `fraudScore > X`
- `qualityScore < 0.6`

---

## 🔍 Contoh Output

### **Laporan dengan Fraud Detected:**

```json
{
  "id": 123,
  "title": "Got mampet",
  "description": "Got mampet",
  "isDuplicate": true,
  "duplicateScore": 0.95,
  "similarReportId": 120,
  "isSpam": false,
  "isAnomaly": false,
  "fraudScore": 0.85,
  "fraudChecked": true,
  "fraudCheckedAt": "2024-11-28T10:30:00Z"
}
```

---

## 💡 Best Practices

### **Untuk Admin:**
1. ✅ Review laporan dengan `fraudScore > 0.7`
2. ✅ Check `spamReasons` dan `qualityIssues`
3. ✅ Compare dengan `similarReportId` untuk duplicate
4. ✅ Jangan langsung reject, review dulu

### **Untuk System:**
1. ✅ Fraud detection non-blocking (tidak block laporan)
2. ✅ Admin decision is final
3. ✅ Audit trail lengkap untuk transparansi

---

## ✅ Status Implementasi

- ✅ **Backend Service**: `fraudDetectionService.js`
- ✅ **Integration**: Terintegrasi di `POST /api/reports`
- ✅ **Database Schema**: Fields sudah ditambahkan
- ✅ **Groq AI**: Untuk spam detection content analysis
- ✅ **Audit Trail**: `fraud_detection_logs` table
- ⏳ **Admin UI**: Bisa ditambahkan untuk review panel (optional)

---

## 🎯 Keamanan & Reliability

### **Keamanan:**
- ✅ Non-blocking (tidak block legitimate reports)
- ✅ Privacy-friendly (no PII exposure)
- ✅ Audit trail lengkap
- ✅ Admin control (human in the loop)

### **Reliability:**
- ✅ Error handling (jika fraud detection gagal, laporan tetap dibuat)
- ✅ Fallback mechanisms (rule-based jika AI gagal)
- ✅ Performance optimized (parallel processing)

---

## 📈 Impact untuk Hackathon

### **Innovation** ⭐⭐⭐⭐⭐
- AI-powered fraud detection yang canggih
- Multi-layer detection (4 jenis checks)
- Automated security

### **Real-world Impact** ⭐⭐⭐⭐⭐
- Mencegah spam dan duplicate reports
- Maintain data quality
- Reduce admin workload

### **Technical Excellence** ⭐⭐⭐⭐⭐
- Groq AI integration
- Efficient algorithms
- Comprehensive audit trail

---

**AI Fraud Detection adalah KILLER FEATURE untuk keamanan dan kualitas data!** 🛡️

