# 🔄 Alur Kerja (Workflow) - LaporIn

Dokumentasi lengkap alur kerja dan workflow sistem LaporIn.

---

## 📋 Alur Pelaporan Warga

### Opsi 1: Via Form

```
1. Warga Login
   ↓
2. Klik "Buat Laporan"
   ↓
3. Isi Form:
   - Judul laporan
   - Deskripsi masalah
   - Lokasi (GPS picker atau manual)
   - Kategori (infrastruktur, sosial, administrasi, bantuan)
   - Urgensi (tinggi, sedang, rendah)
   - Upload foto (opsional)
   ↓
4. Submit Laporan
   ↓
5. AI Auto-Processing:
   - Auto-categorization (jika belum dipilih)
   - Auto-urgency detection (jika belum dipilih)
   - Auto-summarization
   ↓
6. Blockchain Logging:
   - Laporan dicatat ke blockchain
   - Transaction hash tersimpan
   ↓
7. Status: PENDING
   ↓
8. Notifikasi ke Admin/Pengurus RT/RW
```

### Opsi 2: Via Chatbot AI (Recommended) ⭐

```
1. Warga Login
   ↓
2. Buka Chatbot (floating button atau menu)
   ↓
3. Chat Natural Language:
   User: "ada got mampet di jl digidaw nomer 121"
   ↓
4. AI NLP Processing:
   - Intent Detection: CREATE_REPORT
   - Entity Extraction:
     * Problem: "got mampet"
     * Location: "jl digidaw nomer 121"
     * Category: infrastruktur (auto-infer)
     * Urgency: medium (auto-infer)
   - Context Analysis: memahami konteks percakapan
   ↓
5. Jika informasi LENGKAP:
   - Generate draft laporan
   - Auto-fill: title, description, location, category, urgency
   - Ambil GPS location otomatis dari device
   ↓
6. Preview & Konfirmasi:
   - Tampilkan draft laporan dengan tombol:
     * Edit (buka form untuk edit manual)
     * Batal (batalkan draft)
     * Kirim (submit laporan)
   ↓
7. User konfirmasi:
   - Klik "Kirim" → Laporan dibuat
   - Klik "Edit" → Buka form untuk edit manual
   - Klik "Batal" → Draft dibatalkan
   ↓
8. Laporan dibuat:
   - AI auto-processing
   - Blockchain logging
   - Status: PENDING
   - Notifikasi ke admin
```

---

## 🔄 Alur Status Laporan

### Status Flow

```
PENDING → IN_PROGRESS → RESOLVED
   ↓           ↓
CANCELLED  CANCELLED
```

### Penjelasan Status

- **`pending`**: Laporan baru dibuat, menunggu review oleh pengurus/RT/RW
- **`in_progress`**: Sedang diproses (oleh pengurus atau RT/RW)
- **`resolved`**: Selesai ditangani
- **`cancelled`**: Dibatalkan (bisa dari status manapun, hanya jika masih pending)

### Transisi Status

1. **PENDING → IN_PROGRESS**
   - Trigger: Pengurus/RT/RW klik "Mulai Proses"
   - Action: Update status, log ke blockchain
   - Notifikasi: Email ke warga

2. **IN_PROGRESS → RESOLVED**
   - Trigger: Pengurus/RT/RW klik "Selesaikan"
   - Action: Update status, log ke blockchain
   - Notifikasi: Email ke warga

3. **PENDING/IN_PROGRESS → CANCELLED**
   - Trigger: Warga klik "Batal" (hanya jika pending) atau Admin batalkan
   - Action: Update status, log ke blockchain
   - Notifikasi: Email ke warga (jika dibatalkan admin)

---

## 👔 Alur Penanganan Laporan (Admin/Pengurus RT/RW)

### Opsi 1: Pengurus → RT/RW (Recommended) ✅

**Alur:**
1. **Warga** membuat laporan → Status: `pending`
2. **Pengurus** meninjau dan memproses laporan → Status: `in_progress`
3. Setelah pengurus selesai memproses, laporan diteruskan ke **RT/RW** → Status: `resolved` atau tetap `in_progress` dengan catatan

**Keuntungan:**
- ✅ Quality control: Pengurus memastikan laporan valid dan lengkap sebelum ke RT/RW
- ✅ Mengurangi beban RT/RW dengan laporan yang sudah terverifikasi
- ✅ RT/RW fokus pada eksekusi, bukan validasi
- ✅ Lebih efisien untuk RT/RW yang memiliki banyak laporan

### Opsi 2: Langsung ke RT/RW (Alternatif)

**Alur:**
1. **Warga** membuat laporan → Status: `pending`
2. **RT/RW** langsung melihat dan memproses → Status: `in_progress` → `resolved`

**Keuntungan:**
- ✅ Lebih cepat, tanpa tahap intermediate
- ✅ RT/RW memiliki kontrol penuh sejak awal
- ✅ Cocok untuk RT/RW kecil dengan sedikit laporan

**Kekurangan:**
- ❌ RT/RW harus memvalidasi semua laporan sendiri
- ❌ Bisa membebani RT/RW dengan laporan yang tidak valid/spam

---

## 🤖 Alur Chatbot AI

### 1. Intent Detection

```
User: "ada got mampet di jl digidaw nomer 121"
   ↓
AI NLP Processing:
   - Groq AI (Llama 3.1) untuk semantic understanding
   - Keyword-based fallback jika AI tidak yakin
   ↓
Intent: CREATE_REPORT (confidence: 0.95)
```

### 2. Entity Extraction

```
Pesan: "ada got mampet di jl digidaw nomer 121"
   ↓
Extracted Entities:
   - Problem: "got mampet"
   - Location: "jl digidaw nomer 121"
   - Category: infrastruktur (auto-infer)
   - Urgency: medium (auto-infer)
```

### 3. Context-Aware Conversation

```
Turn 1:
User: "ada masalah nih"
Bot: "Ada masalah apa? Tolong jelaskan detailnya"

Turn 2:
User: "lampu mati"
Bot: "Baik, di mana lokasi lampu yang mati?"

Turn 3:
User: "di blok C"
Bot: "Baik, draft laporan sudah dibuat. Klik tombol di bawah untuk mengirim."
```

### 4. Draft Generation & Confirmation

```
Informasi LENGKAP (problem + location + request)
   ↓
Generate Draft:
   - Title: "Got Mampet di Jl Digidaw Nomor 121"
   - Description: "Ada got mampet di jl digidaw nomer 121"
   - Location: "Jl Digidaw Nomor 121" (GPS: lat, lng)
   - Category: infrastruktur
   - Urgency: medium
   ↓
Preview dengan Tombol:
   - Edit (buka form untuk edit manual)
   - Batal (batalkan draft)
   - Kirim (submit laporan)
   ↓
User Klik "Kirim"
   ↓
Laporan Dibuat:
   - AI auto-processing
   - Blockchain logging
   - Status: PENDING
   - Notifikasi ke admin
```

### 5. Intent Types yang Didukung

- **CREATE_REPORT**: User ingin membuat laporan
- **CHECK_STATUS**: User cek status laporan
- **ASK_STATS**: User tanya statistik
- **ASK_CAPABILITY**: User tanya kemampuan bot
- **ASK_HELP**: User minta bantuan
- **NEGATION**: User bilang tidak/tidak mau
- **PREVIEW_REPORT**: User minta preview
- **ASK_FAQ**: User tanya FAQ
- **GENERAL**: Percakapan umum

---

## ⛓️ Alur Blockchain

### 1. Report Creation

```
Laporan Dibuat
   ↓
Generate Meta Hash:
   - Hash dari: reportId, title, description, location, category, urgency
   ↓
Call Smart Contract:
   - logReportEvent(reportId, "pending", metaHash)
   ↓
Transaction Sent ke Polygon Mumbai
   ↓
Transaction Confirmed
   ↓
Transaction Hash Disimpan di Database
   ↓
Link ke Polygonscan untuk Verification
```

### 2. Status Update

```
Status Diupdate (pending → in_progress)
   ↓
Generate Meta Hash:
   - Hash dari: reportId, newStatus, timestamp, actor
   ↓
Call Smart Contract:
   - logReportEvent(reportId, "in_progress", metaHash)
   ↓
Transaction Sent ke Polygon Mumbai
   ↓
Transaction Confirmed
   ↓
Transaction Hash Disimpan di Database
   ↓
Link ke Polygonscan untuk Verification
```

### 3. Biometric Registration

```
User Register Face
   ↓
Generate Face Descriptor
   ↓
Encrypt dengan AES
   ↓
Generate Hash dari Face Descriptor
   ↓
Call Smart Contract:
   - logBiometricEvent(userId, biometricHash, "register")
   ↓
Transaction Sent ke Polygon Mumbai
   ↓
Transaction Confirmed
   ↓
Transaction Hash Disimpan di Database
   ↓
Face Descriptor (encrypted) Disimpan di Database
   ↓
Hash Tersimpan di Blockchain (privacy-first)
```

---

## 📊 Alur Analytics

### 1. Data Collection

```
Laporan Dibuat/Diupdate
   ↓
Update Statistics:
   - Total laporan
   - Laporan per status
   - Laporan per kategori
   - Laporan per urgensi
   - Laporan per periode (hari/minggu/bulan)
   ↓
Store di Database
```

### 2. Dashboard Display

```
User Buka Dashboard
   ↓
Fetch Statistics:
   - KPI Cards (Total, Selesai, Diproses, Menunggu, Dibatalkan)
   - Tren Laporan (Line Chart)
   - Distribusi Status (Bar Chart)
   - Distribusi Kategori (Bar Chart)
   - Distribusi Urgensi (Bar Chart)
   - Pertumbuhan Warga (Line Chart)
   ↓
Display dengan Charts (Chart.js)
```

---

## 🔒 Alur Laporan Sensitif

### 1. Detection

```
User Chat: "ada korupsi di RT 1"
   ↓
AI Detect Sensitive Keywords:
   - "korupsi", "pencurian", "kekerasan", dll
   ↓
Auto-Mark sebagai Sensitif
   ↓
Notify User:
   "Laporan Anda telah ditandai sebagai SENSITIF/RAHASIA"
```

### 2. Access Control

```
Laporan Sensitif Dibuat
   ↓
Access Control:
   - Superadmin: ✅ Bisa lihat semua
   - Admin RW/RT di wilayah: ✅ Bisa lihat di wilayah mereka
   - Pembuat laporan: ✅ Bisa lihat laporan mereka
   - Warga lain: ❌ Tidak bisa lihat
   ↓
Email Notification:
   - Hanya ke Superadmin (dengan warning)
   - Tidak ke Admin RW/RT biasa
```

---

## 💡 Best Practice

### Untuk RT/RW Besar (Banyak Warga):
Gunakan **Opsi 1** (Pengurus → RT/RW):
- Pengurus sebagai filter pertama
- RT/RW hanya terima laporan yang sudah divalidasi
- Efisiensi lebih tinggi

### Untuk RT/RW Kecil (Sedikit Warga):
Bisa gunakan **Opsi 2** (Langsung ke RT/RW):
- RT/RW bisa langsung handle
- Tidak perlu tahap intermediate

---

**📖 Detail lengkap fitur**: [FEATURES.md](./FEATURES.md)  
**🤖 Detail lengkap chatbot**: [CHATBOT.md](./CHATBOT.md)

