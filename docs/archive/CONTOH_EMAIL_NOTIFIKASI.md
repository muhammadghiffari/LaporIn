# 📧 Contoh Email Notifikasi Sistem LaporIn

Dokumen ini menampilkan contoh email yang dikirim oleh sistem LaporIn.

---

## 1️⃣ Email: Laporan Baru (ke Admin/Pengurus)

**Dikirim ke:** Admin RW, Ketua RT, Sekretaris RT, Pengurus di RT/RW yang sama

**Subject:** `📋 Laporan Baru dari [Nama Warga]`

**Contoh Real:**

---

**From:** LaporIn System <your-email@gmail.com>  
**To:** wadidawcihuy@gmail.com, arythegodhand@gmail.com, syncrazelled@gmail.com, gampanggaming20@gmail.com  
**Subject:** 📋 Laporan Baru dari Suroprikitiw (RT001/RW001)

---

### 📱 Versi HTML (yang terlihat di email client):

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #3B82F6;">🔔 Laporan Baru dari Suroprikitiw (RT001/RW001)</h2>
  <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>📋 Judul:</strong> Got Mampet di Jl. Kebon Jeruk</p>
    <p><strong>📍 Lokasi:</strong> Jl. Kebon Jeruk, Pondok Pinang, Jakarta Selatan</p>
    <p><strong>📝 Deskripsi:</strong></p>
    <p>Selokan di depan rumah no 45 mampet karena sampah menumpuk. Air tidak bisa mengalir dan mulai bau tidak sedap.</p>
    <p><strong>📅 Tanggal:</strong> Rabu, 26 November 2025, 18:35</p>
  </div>
  <a href="http://localhost:3000/reports/1" 
     style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
    Lihat Detail Laporan
  </a>
  <p style="color: #6B7280; margin-top: 20px; font-size: 14px;">
    RT/RW RT001/RW001
  </p>
</div>
```

### 📝 Versi Text (plain text):

```
🔔 *Laporan Baru dari Suroprikitiw (RT001/RW001)*

📋 *Judul:* Got Mampet di Jl. Kebon Jeruk
📍 *Lokasi:* Jl. Kebon Jeruk, Pondok Pinang, Jakarta Selatan
📝 *Deskripsi:* Selokan di depan rumah no 45 mampet karena sampah menumpuk. Air tidak bisa mengalir dan mulai bau tidak sedap.
📅 *Tanggal:* Rabu, 26 November 2025, 18:35

🔗 Lihat detail: http://localhost:3000/reports/1

RT/RW RT001/RW001
```

### 📬 Tampilan di Email Client (Preview):

```
┌─────────────────────────────────────────────┐
│ 🔔 Laporan Baru dari Suroprikitiw          │
│     (RT001/RW001)                           │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📋 Judul: Got Mampet di Jl. Kebon      │ │
│ │     Jeruk                                │ │
│ │                                         │ │
│ │ 📍 Lokasi: Jl. Kebon Jeruk, Pondok     │ │
│ │     Pinang, Jakarta Selatan              │ │
│ │                                         │ │
│ │ 📝 Deskripsi:                           │ │
│ │ Selokan di depan rumah no 45 mampet    │ │
│ │ karena sampah menumpuk. Air tidak bisa │ │
│ │ mengalir dan mulai bau tidak sedap.    │ │
│ │                                         │ │
│ │ 📅 Tanggal: Rabu, 26 November 2025,    │ │
│ │     18:35                                │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Lihat Detail Laporan]                      │
│                                             │
│ RT/RW RT001/RW001                           │
└─────────────────────────────────────────────┘
```

---

## 2️⃣ Email: Status Update (ke Warga)

**Dikirim ke:** Warga yang membuat laporan

**Subject:** `✅ Update Status Laporan Anda` atau `🎉 Laporan Anda Telah Diselesaikan!`

**Contoh Real:**

---

**From:** LaporIn System <your-email@gmail.com>  
**To:** suroprikitiw@gmail.com  
**Subject:** ✅ Update Status Laporan Anda

---

### 📱 Versi HTML:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #10B981;">✅ Update Status Laporan Anda</h2>
  <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>📋 Judul:</strong> Got Mampet di Jl. Kebon Jeruk</p>
    <p><strong>📊 Status:</strong> <span style="background: #10B981; color: white; padding: 4px 8px; border-radius: 4px;">Sedang Diproses</span></p>
    <p><strong>📍 Lokasi:</strong> Jl. Kebon Jeruk, Pondok Pinang, Jakarta Selatan</p>
    <p><strong>📝 Deskripsi:</strong></p>
    <p>Selokan di depan rumah no 45 mampet karena sampah menumpuk. Air tidak bisa mengalir dan mulai bau tidak sedap.</p>
  </div>
  <a href="http://localhost:3000/reports/1" 
     style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
    Lihat Detail Laporan
  </a>
  <p style="color: #6B7280; margin-top: 20px; font-size: 14px;">
    RT/RW RT001/RW001
  </p>
</div>
```

### 📝 Versi Text:

```
✅ *Update Status Laporan*

📋 Judul: Got Mampet di Jl. Kebon Jeruk
📊 Status: *Sedang Diproses*

📍 Lokasi: Jl. Kebon Jeruk, Pondok Pinang, Jakarta Selatan
👤 Pelapor: Suroprikitiw (RT001/RW001)

🔗 Lihat detail: http://localhost:3000/reports/1

RT/RW RT001/RW001
```

### 📬 Tampilan di Email Client:

```
┌─────────────────────────────────────────────┐
│ ✅ Update Status Laporan Anda               │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📋 Judul: Got Mampet di Jl. Kebon      │ │
│ │     Jeruk                                │ │
│ │                                         │ │
│ │ 📊 Status: [Sedang Diproses]           │ │
│ │                                         │ │
│ │ 📍 Lokasi: Jl. Kebon Jeruk, Pondok     │ │
│ │     Pinang, Jakarta Selatan              │ │
│ │                                         │ │
│ │ 📝 Deskripsi:                           │ │
│ │ Selokan di depan rumah no 45 mampet    │ │
│ │ karena sampah menumpuk...               │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Lihat Detail Laporan]                      │
│                                             │
│ RT/RW RT001/RW001                           │
└─────────────────────────────────────────────┘
```

---

## 3️⃣ Email: Laporan Selesai (ke Warga)

**Dikirim ke:** Warga yang membuat laporan (ketika status = resolved/completed)

**Subject:** `🎉 Laporan Anda Telah Diselesaikan!`

**Contoh Real:**

---

**From:** LaporIn System <your-email@gmail.com>  
**To:** suroprikitiw@gmail.com  
**Subject:** 🎉 Laporan Anda Telah Diselesaikan!

---

### 📱 Versi HTML:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #10B981;">🎉 Laporan Anda Telah Diselesaikan!</h2>
  <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>📋 Judul:</strong> Got Mampet di Jl. Kebon Jeruk</p>
    <p><strong>✅ Status:</strong> <span style="background: #10B981; color: white; padding: 4px 8px; border-radius: 4px;">Selesai</span></p>
    <p><strong>📍 Lokasi:</strong> Jl. Kebon Jeruk, Pondok Pinang, Jakarta Selatan</p>
    <p><strong>👤 Pelapor:</strong> Suroprikitiw (RT001/RW001)</p>
  </div>
  <a href="http://localhost:3000/reports/1" 
     style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
    Lihat Detail Laporan
  </a>
  <p style="color: #6B7280; margin-top: 20px; font-size: 14px;">
    Terima kasih atas partisipasi Anda!<br>
    RT/RW RT001/RW001
  </p>
</div>
```

### 📝 Versi Text:

```
🎉 *Laporan Selesai*

📋 Judul: Got Mampet di Jl. Kebon Jeruk
✅ Status: *Selesai*

📍 Lokasi: Jl. Kebon Jeruk, Pondok Pinang, Jakarta Selatan
👤 Pelapor: Suroprikitiw (RT001/RW001)

🔗 Lihat detail: http://localhost:3000/reports/1

Terima kasih atas partisipasi Anda!
RT/RW RT001/RW001
```

---

## 📊 Kapan Email Dikirim?

### 1. **Laporan Baru** → Email ke Admin/Pengurus
- ✅ Trigger: Warga membuat laporan baru
- 📧 Dikirim ke: Semua Admin RW, Ketua RT, Sekretaris RT, Pengurus di RT/RW yang sama
- 📬 Contoh penerima: 
  - `wadidawcihuy@gmail.com` (Admin RW001)
  - `arythegodhand@gmail.com` (Ketua RT001/RW001)
  - `syncrazelled@gmail.com` (Sekretaris RT001/RW001)
  - `gampanggaming20@gmail.com` (Pengurus RT001/RW001)

### 2. **Status Update** → Email ke Warga
- ✅ Trigger: Admin/Pengurus mengubah status laporan
- 📧 Dikirim ke: Warga yang membuat laporan
- 📊 Status yang trigger email:
  - `pending` → `in_progress`: "Update Status Laporan"
  - `in_progress` → `resolved`: "Laporan Selesai"
  - `pending` → `resolved`: "Laporan Selesai"
  - `pending` → `rejected`: "Update Status Laporan"

### 3. **Broadcast** → Email ke Semua Warga RT/RW
- ✅ Trigger: Admin mengirim broadcast (fitur tersedia)
- 📧 Dikirim ke: Semua warga di RT/RW tertentu
- 💬 Contoh: Pengumuman penting, informasi kegiatan, dll

---

## 🔧 Konfigurasi Email

Untuk email bisa dikirim, pastikan `backend/.env` sudah dikonfigurasi:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
FRONTEND_URL=http://localhost:3000
```

**Note:** Untuk Gmail, perlu membuat App Password:
1. Buka: https://myaccount.google.com/apppasswords
2. Generate app password untuk "Mail"
3. Copy 16-character password ke `EMAIL_PASS`

---

## ✅ Test Email

Untuk test email, buat laporan baru dengan akun warga:
- Email: `suroprikitiw@gmail.com`
- Password: `demo123`

Email akan otomatis dikirim ke admin/pengurus yang sudah dikonfigurasi!

---

**Email notification system sudah siap digunakan!** 📧✨

