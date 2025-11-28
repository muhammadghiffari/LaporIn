# 🛡️ AI Fraud Detection - Implementasi & Keamanan

## ✅ STATUS: FULLY IMPLEMENTED & ACTIVE

AI Fraud Detection **SUDAH DIIMPLEMENTASIKAN** dan aktif di sistem LaporIn!

---

## 🎯 Apa itu AI Fraud Detection?

Sistem keamanan **otomatis** yang menganalisis setiap laporan baru untuk mendeteksi:
1. ✅ **Duplicate Reports** - Laporan yang sama/berulang
2. ✅ **Spam/Fake Reports** - Laporan palsu atau tidak relevan (dengan Groq AI)
3. ✅ **Data Quality Issues** - Laporan dengan data tidak lengkap/valid
4. ✅ **Anomaly Patterns** - Pola mencurigakan (frekuensi, lokasi, waktu)

---

## 🔧 Cara Kerja (Otomatis)

### **Flow Saat User Buat Laporan:**

```
User Submit Report
   ↓
AI Processing (kategori & urgensi)
   ↓
🛡️ FRAUD DETECTION (AUTOMATIC - PARALEL):
   ├─→ 1. Duplicate Check
   │     └─→ Text similarity + Location + Time
   ├─→ 2. Spam Detection (Groq AI)
   │     └─→ AI content analysis + Frequency + Keywords
   ├─→ 3. Quality Validation
   │     └─→ Completeness + Relevance + GPS
   └─→ 4. Anomaly Detection
         └─→ Frequency + Location + Time patterns
   ↓
Hasil disimpan ke database
   ↓
Report tetap dibuat (status: pending)
   ↓
Admin bisa review flagged reports
```

**Key Point:** Fraud detection **OTOMATIS** dan **NON-BLOCKING** (tidak memblokir laporan)

---

## 📊 Detail 4 Jenis Detection

### **1. Duplicate Detection** 🔍

**Cara Kerja:**
- ✅ Text similarity check (judul + deskripsi) - Jaccard similarity
- ✅ Location proximity check (GPS distance dalam 50-200 meter)
- ✅ Time window check (dalam 24 jam terakhir dari user yang sama)
- ✅ Combined scoring > 0.75 = Duplicate

**Contoh:**
```
User submit: "Got mampet di jl digidaw 121"
System check:
- Text similarity: 0.95 (sangat mirip dengan laporan sebelumnya)
- Location: 30 meter dari laporan sebelumnya
- Time: 2 jam setelah laporan sebelumnya
→ Result: isDuplicate = true, score = 0.9
```

---

### **2. Spam/Fake Detection** 🚫 (DENGAN GROQ AI)

**Cara Kerja:**
- ✅ **Groq AI Content Analysis** - Analisis konten dengan AI semantic understanding
- ✅ Frequency check (jumlah laporan dalam 24 jam)
- ✅ Keyword spam detection (rule-based fallback)
- ✅ Content quality (panjang, relevansi)
- ✅ User behavior patterns

**Groq AI Integration:**
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
User submit: "test test test"
System check:
- Groq AI: "isSpam: true, confidence: 0.85"
- Frequency: 15 laporan dalam 24 jam (abnormal)
- Content: Terlalu pendek, tidak relevan
→ Result: isSpam = true, score = 0.8
```

---

### **3. Quality Validation** ✅

**Cara Kerja:**
- ✅ Completeness check (judul, deskripsi, lokasi)
- ✅ Length validation (minimum requirements)
- ✅ GPS coordinates check
- ✅ Relevance check (keyword relevan)

**Contoh:**
```
User submit:
- Title: "abc"
- Description: "test"
- Location: ""
- GPS: null

System check:
- Judul terlalu pendek (< 5 karakter)
- Deskripsi terlalu pendek (< 10 karakter)
- Lokasi kosong
- GPS tidak ada
→ Result: isValid = false, qualityScore = 0.3
```

---

### **4. Anomaly Detection** ⚠️

**Cara Kerja:**
- ✅ Frequency anomaly (spike mendadak - >5 laporan/24 jam)
- ✅ Location anomaly (lokasi jauh dari lokasi sebelumnya - >1km)
- ✅ Time pattern anomaly (waktu tidak sesuai pola biasa)

**Contoh:**
```
User biasanya report dari area A (blok C)
Tiba-tiba report dari area B (10km jauhnya)

System check:
- Location anomaly: Lokasi jauh dari lokasi sebelumnya (10km)
- Frequency anomaly: 8 laporan dalam 24 jam (tidak normal)
→ Result: isAnomaly = true, score = 0.6
```

---

## 🔒 Keamanan

### **1. Non-Blocking Design** ✅

**Keamanan:**
- ✅ Fraud detection **TIDAK memblokir** laporan legitimate
- ✅ Laporan tetap dibuat (status: pending)
- ✅ Admin yang review dan decide (human in the loop)
- ✅ Jika fraud detection error, laporan tetap bisa dibuat (reliability)

**Kenapa Non-Blocking?**
- Mencegah false positive yang memblokir laporan legitimate
- Admin tetap punya kontrol final
- System tetap reliable meskipun fraud detection error

---

### **2. Privacy & Security** ✅

**Data Protection:**
- ✅ **No PII Exposure** - Data user tidak di-expose ke AI
- ✅ Hanya text content (title, description) yang dianalisis
- ✅ No personal information sent to Groq AI
- ✅ Email, phone, address tidak dikirim ke AI

**Audit Trail:**
- ✅ Semua fraud detection results disimpan di database
- ✅ `fraud_detection_logs` table untuk audit
- ✅ Timestamp dan details lengkap

---

### **3. Rate Limiting & Performance** ✅

**Optimization:**
- ✅ Duplicate check hanya cek 10 laporan terakhir (24 jam)
- ✅ Spam detection limit: max 10 laporan/24 jam per user
- ✅ Parallel processing (semua checks berjalan bersamaan)
- ✅ Error handling (tidak block jika error)

---

## 📋 Data yang Disimpan

### **Di Tabel `reports`:**

```sql
-- Fraud Detection Fields
is_duplicate BOOLEAN,
duplicate_score FLOAT,
similar_report_id INT,
is_spam BOOLEAN,
spam_score FLOAT,
spam_reasons JSON,
quality_score FLOAT,
quality_issues JSON,
is_anomaly BOOLEAN,
anomaly_score FLOAT,
anomaly_reasons JSON,
fraud_score FLOAT,           -- Overall fraud score (0-1)
fraud_checked BOOLEAN,
fraud_checked_at TIMESTAMP
```

### **Audit Trail di Tabel `fraud_detection_logs`:**

```sql
-- Setiap check disimpan untuk audit
report_id INT,
detection_type VARCHAR(50),  -- 'duplicate', 'spam', 'quality', 'anomaly'
score FLOAT,
details JSON                 -- Full result details
```

---

## 🎯 Thresholds & Scoring

### **Individual Thresholds:**
- **Duplicate**: Score > **0.75** → Flagged
- **Spam**: Score > **0.6** → Flagged  
- **Quality**: Score < **0.6** → Low quality
- **Anomaly**: Score > **0.5** → Flagged

### **Overall Fraud Score:**
```javascript
fraudScore = max(
  duplicateScore * 0.4,        // Highest weight (40%)
  spamScore * 0.3,             // Second priority (30%)
  (1 - qualityScore) * 0.2,    // Low quality = higher fraud (20%)
  anomalyScore * 0.1           // Lowest weight (10%)
)

isFraud = fraudScore > 0.7 || 
          isDuplicate || 
          isSpam
```

---

## 👨‍💼 Penggunaan untuk Admin

### **1. Review Flagged Reports**

Admin bisa filter dan review:
- ✅ Laporan dengan `fraudScore > 0.7`
- ✅ Laporan dengan `isDuplicate = true`
- ✅ Laporan dengan `isSpam = true`
- ✅ Lihat detail: `spamReasons`, `qualityIssues`, `anomalyReasons`

### **2. API Endpoint untuk Filter:**

```javascript
GET /api/reports?fraudScore_min=0.7
GET /api/reports?isDuplicate=true
GET /api/reports?isSpam=true
```

### **3. Admin Actions:**
- ✅ **Approve** - Unflag report (clear fraud flags)
- ✅ **Reject** - Delete report (if confirmed spam/fake)
- ✅ **Review** - Check details and decide

---

## 📊 Contoh Output

### **Laporan Normal (Clean):**
```json
{
  "id": 123,
  "title": "Lampu mati di blok C",
  "isDuplicate": false,
  "isSpam": false,
  "qualityScore": 0.9,
  "fraudScore": 0.1,
  "fraudChecked": true
}
```

### **Laporan dengan Fraud Detected:**
```json
{
  "id": 124,
  "title": "Got mampet",
  "description": "Got mampet",
  "isDuplicate": true,
  "duplicateScore": 0.95,
  "similarReportId": 120,
  "isSpam": false,
  "qualityScore": 0.4,
  "fraudScore": 0.85,
  "fraudChecked": true,
  "fraudCheckedAt": "2024-11-28T10:30:00Z"
}
```

---

## 🧪 Testing

### **Test Script:**
```bash
cd backend
node scripts/test-fraud-detection.js
```

Script ini akan test:
1. ✅ Duplicate detection
2. ✅ Spam detection (dengan Groq AI)
3. ✅ Quality validation
4. ✅ Normal report (should pass)

---

## ✅ Status Implementasi

- ✅ **Backend Service**: `backend/services/fraudDetectionService.js`
- ✅ **Integration**: Terintegrasi di `POST /api/reports` (otomatis)
- ✅ **Database Schema**: Fields sudah ditambahkan & migrated
- ✅ **Groq AI**: Untuk spam detection content analysis
- ✅ **Audit Trail**: `fraud_detection_logs` table
- ✅ **Non-Blocking**: Tidak memblokir laporan legitimate
- ✅ **Error Handling**: Reliable meskipun fraud detection gagal

---

## 🔒 Keamanan Summary

### **Privacy:**
- ✅ No PII exposure to AI
- ✅ Only text content analyzed
- ✅ User data tetap private

### **Reliability:**
- ✅ Non-blocking (tidak block legitimate reports)
- ✅ Error handling (tidak crash jika error)
- ✅ Fallback mechanisms (rule-based jika AI gagal)

### **Transparency:**
- ✅ Audit trail lengkap
- ✅ Admin bisa review semua flagged reports
- ✅ Human in the loop (admin decision is final)

---

## 🎯 Impact untuk Hackathon

### **Innovation** ⭐⭐⭐⭐⭐
- AI-powered fraud detection dengan Groq AI
- Multi-layer detection (4 jenis checks)
- Automated security system

### **Real-world Impact** ⭐⭐⭐⭐⭐
- Mencegah spam dan duplicate reports
- Maintain data quality
- Reduce admin workload

### **Security** ⭐⭐⭐⭐⭐
- Privacy-friendly (no PII exposure)
- Non-blocking (tidak block legitimate users)
- Comprehensive audit trail

---

**AI Fraud Detection adalah KILLER FEATURE untuk keamanan dan kualitas data sistem LaporIn!** 🛡️

