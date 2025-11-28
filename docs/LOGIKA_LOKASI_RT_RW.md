# 📍 Logika Penentuan Lokasi RT/RW

## 🎯 Cara Kerja

### 1. **Siapa yang Bisa Set Lokasi?**

- **Admin RW** (`admin_rw`): Bisa set lokasi untuk wilayah RW mereka sendiri
- **Ketua RT** (`ketua_rt`): Bisa set lokasi untuk wilayah RT mereka sendiri
- **Sekretaris RT** (`sekretaris_rt`, `sekretaris`): Bisa set lokasi untuk wilayah RT mereka sendiri
- **Super Admin** (`admin`, `admin_sistem`): Bisa set lokasi untuk RT/RW manapun

### 2. **Cara Set Lokasi**

1. Login sebagai Admin RW/Ketua RT/Sekretaris RT
2. Buka halaman **Peta Laporan** (`/admin/peta-laporan`)
3. Klik tombol **"Set Lokasi Wilayah Saya"** (atau **"Set Lokasi RW/RT Terpilih"** untuk Super Admin)
4. Klik di peta untuk menentukan **titik pusat** (center) wilayah
5. Atur **radius** dalam meter (min: 100m, max: 10000m)
6. Klik **"Simpan"**

### 3. **Data yang Disimpan**

Lokasi disimpan di tabel `User` dengan field berikut:

```prisma
model User {
  rtRwLatitude   Float?   // Latitude titik pusat
  rtRwLongitude  Float?   // Longitude titik pusat
  rtRwRadius     Int?     // Radius dalam meter (untuk circular boundary)
  rtRwPolygon    Json?    // Polygon coordinates (untuk boundary tidak bulat)
}
```

**Catatan:**
- Jika ada **polygon**, sistem akan menggunakan polygon (lebih akurat)
- Jika tidak ada polygon tapi ada **radius**, sistem akan menggunakan circular boundary
- Jika tidak ada keduanya, validasi lokasi akan di-skip

### 4. **Validasi Lokasi Laporan**

Ketika warga membuat laporan dengan GPS:

1. Sistem mengambil boundary RT/RW dari user yang membuat laporan
2. Cek apakah koordinat laporan berada dalam boundary:
   - **Priority 1**: Cek polygon boundary (jika ada)
   - **Priority 2**: Cek radius boundary (jika ada)
   - **Jika tidak ada boundary**: Validasi di-skip (semua laporan dianggap valid)
3. Jika laporan di luar boundary:
   - Laporan tetap bisa dibuat (tidak di-block)
   - Tapi ditandai dengan `locationMismatch = true`
   - Marker di peta berwarna **merah** untuk menunjukkan mismatch
   - Jarak dari center RT/RW ditampilkan di info window

### 5. **Satu RT/RW = Satu Boundary**

- Jika beberapa user punya RT/RW yang sama (misalnya: Admin RW dan Ketua RT sama-sama RW001)
- Boundary diambil dari **user pertama yang set** (berdasarkan `createdAt`)
- Untuk Super Admin yang set boundary untuk RT/RW lain, sistem akan mencari user dengan role tertinggi:
  - **RW**: Mencari `admin_rw` dengan RT/RW yang sesuai
  - **RT**: Mencari `ketua_rt` > `sekretaris_rt` > `sekretaris` (prioritas)

### 6. **Endpoint Backend**

**POST `/api/reports/admin/rt-rw/set-location`**

**Request Body:**
```json
{
  "latitude": -6.2088,
  "longitude": 106.8456,
  "radius": 500,
  "polygon": null,  // Optional: array of {lat, lng}
  "targetLevel": "rw",  // Optional: untuk Super Admin
  "targetRw": "RW001",  // Optional: untuk Super Admin
  "targetRt": "RT001"   // Optional: untuk Super Admin
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lokasi RW berhasil disimpan",
  "target": "RT001/RW001",
  "targetLevel": "rw",
  "boundary": {
    "center": { "lat": -6.2088, "lng": 106.8456 },
    "radius": 500,
    "polygon": null
  }
}
```

### 7. **Warna di Peta**

- **🔵 Biru** (`#2563EB`): Area RW (Admin RW)
- **🟤 Coklat** (`#B45309`): Area RT (Ketua/Sekretaris RT)
- **🟡 Kuning** (`#F59E0B`): Laporan Pending
- **🟣 Ungu** (`#8B5CF6`): Laporan In Progress
- **🟢 Hijau** (`#10B981`): Laporan Resolved
- **🔴 Merah** (`#EF4444`): Laporan dengan Location Mismatch

### 8. **Toleransi Lokasi**

Sistem memiliki toleransi default **50 meter** untuk validasi lokasi:
- Jika laporan berada di luar boundary tapi masih dalam **radius + 50m**, laporan tetap dianggap valid
- Toleransi ini bisa diatur via environment variable: `LOCATION_TOLERANCE_METERS`

---

## 📝 Contoh Skenario

### Skenario 1: Admin RW Set Lokasi

1. Admin RW001 login
2. Buka Peta Laporan
3. Klik "Set Lokasi Wilayah Saya"
4. Klik di peta pada koordinat: `-6.2088, 106.8456`
5. Set radius: `500` meter
6. Klik "Simpan"

**Hasil:**
- Semua user dengan RT/RW yang mengandung `/RW001` akan menggunakan boundary ini
- Laporan dari warga RT001/RW001, RT002/RW001, dll akan divalidasi menggunakan boundary ini

### Skenario 2: Ketua RT Set Lokasi

1. Ketua RT001/RW001 login
2. Buka Peta Laporan
3. Klik "Set Lokasi Wilayah Saya"
4. Klik di peta pada koordinat: `-6.2090, 106.8458`
5. Set radius: `250` meter (lebih kecil karena RT lebih kecil dari RW)
6. Klik "Simpan"

**Hasil:**
- Boundary RT001/RW001 disimpan
- Laporan dari warga RT001/RW001 akan divalidasi menggunakan boundary ini
- Boundary ini lebih spesifik daripada boundary RW (jika ada)

### Skenario 3: Super Admin Set Lokasi untuk RT/RW Lain

1. Super Admin login
2. Buka Peta Laporan
3. Pilih RW: `RW001` dari dropdown
4. Pilih RT: `RT001` dari dropdown
5. Klik "Set Lokasi RW/RT Terpilih"
6. Klik di peta dan set radius
7. Klik "Simpan"

**Hasil:**
- Boundary disimpan untuk user dengan role tertinggi di RT001/RW001
- Jika ada Ketua RT, boundary disimpan ke akun Ketua RT
- Jika tidak ada Ketua RT, boundary disimpan ke akun Sekretaris RT

---

## ⚠️ Catatan Penting

1. **Boundary Belum Di-Set**: Jika RT/RW belum set boundary, semua laporan dianggap valid (tidak ada validasi)
2. **Multiple Users**: Jika beberapa user punya RT/RW yang sama, boundary diambil dari user pertama yang set
3. **Super Admin Override**: Super Admin bisa set boundary untuk RT/RW manapun, tidak terbatas pada RT/RW mereka sendiri
4. **Polygon vs Radius**: Polygon lebih akurat untuk boundary tidak bulat, tapi radius lebih mudah di-set

