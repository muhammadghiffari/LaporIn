# 📷 Photo Validation - LaporIn

## 🎯 Tujuan

Memastikan foto laporan diambil **di tempat kejadian**, bukan di rumah kemudian baru dilaporkan.

---

## ✨ Fitur Validasi Foto

### 1. **Validasi GPS dari Foto**
- Extract GPS coordinates dari metadata EXIF foto
- Bandingkan dengan koordinat GPS yang dilaporkan
- Toleransi default: **100 meter** (dapat dikonfigurasi)

### 2. **Validasi Timestamp Foto**
- Cek kapan foto diambil
- Foto harus baru (tidak lebih dari 60 menit sebelum laporan dibuat)
- Mencegah penggunaan foto lama dari galeri

### 3. **Validasi Metadata EXIF**
- Foto harus memiliki metadata GPS
- Jika tidak ada GPS metadata → Warning atau Error (tergantung strict mode)

---

## 🔧 Konfigurasi

### **Environment Variables**

Tambahkan ke `backend/.env`:

```env
# Photo Validation Settings
PHOTO_LOCATION_TOLERANCE_METERS=100    # Toleransi jarak GPS foto vs lokasi (default: 100m)
PHOTO_MAX_AGE_MINUTES=60               # Max umur foto dalam menit (default: 60)
PHOTO_STRICT_MODE=false                # Aktifkan strict mode (default: false)
```

### **Strict Mode: ON**
- Foto tanpa GPS metadata → **DITOLAK**
- Foto dengan GPS tidak sesuai → **DITOLAK**
- Foto terlalu lama → **DITOLAK**

### **Strict Mode: OFF** (Default)
- Foto tanpa GPS metadata → **WARNING** (tetap bisa dibuat)
- Foto dengan GPS tidak sesuai → **WARNING** (tetap bisa dibuat)
- Foto terlalu lama → **WARNING** (tetap bisa dibuat)

---

## 📊 Cara Kerja

### **Proses Validasi:**

1. **Extract EXIF Metadata**
   - GPS coordinates (lat, lng)
   - Timestamp (kapan foto diambil)
   - Camera info (make, model)

2. **Validasi GPS**
   - Hitung jarak antara GPS foto dengan GPS yang dilaporkan
   - Jika jarak > toleransi → Warning/Error

3. **Validasi Timestamp**
   - Hitung umur foto (waktu sekarang - waktu foto diambil)
   - Jika umur > maxAgeMinutes → Warning/Error

4. **Hasil Validasi**
   - ✅ Valid: GPS sesuai, timestamp baru, ada metadata
   - ⚠️ Warning: GPS tidak sesuai atau timestamp lama (tetap bisa dibuat)
   - ❌ Error: Strict mode aktif dan validasi gagal (ditolak)

---

## 📱 Frontend Requirements

### **Input File dengan Capture**

```html
<input
  type="file"
  accept="image/*"
  capture="environment"  <!-- Memaksa menggunakan kamera belakang -->
/>
```

### **Pesan untuk User:**

- ⚠️ **"Pastikan GPS aktif dan ambil foto langsung dari kamera, bukan dari galeri"**
- 📍 **"Foto harus diambil di tempat kejadian"**
- ✅ **"Koordinat GPS tersedia"** (jika GPS aktif)

---

## 🎯 Skenario Validasi

### **Skenario 1: Foto Valid**
```
GPS Foto: -6.2088, 106.8456
GPS Laporan: -6.2089, 106.8457
Jarak: 50m
Umur Foto: 5 menit

Hasil: ✅ VALID
```

### **Skenario 2: GPS Tidak Sesuai (Warning)**
```
GPS Foto: -6.2000, 106.8000  (rumah)
GPS Laporan: -6.2088, 106.8456  (tempat kejadian)
Jarak: 5.2 km

Hasil: ⚠️ WARNING (tetap bisa dibuat jika strict mode OFF)
```

### **Skenario 3: Foto Tanpa GPS Metadata**
```
Foto dari galeri lama (tidak ada EXIF GPS)
GPS Laporan: -6.2088, 106.8456

Hasil: ⚠️ WARNING atau ❌ ERROR (tergantung strict mode)
```

### **Skenario 4: Foto Terlalu Lama**
```
Timestamp Foto: 2 jam yang lalu
Max Age: 60 menit

Hasil: ⚠️ WARNING atau ❌ ERROR (tergantung strict mode)
```

---

## 🛠️ Technical Details

### **Library yang Digunakan:**
- `exifr` - Extract EXIF metadata dari foto

### **File Service:**
- `backend/services/photoValidationService.js`

### **Fungsi Utama:**
- `extractPhotoMetadata(imageData)` - Extract GPS & timestamp dari foto
- `validatePhotoLocation(imageData, reportedLat, reportedLng, options)` - Validasi lengkap
- `calculateDistance(lat1, lng1, lat2, lng2)` - Hitung jarak (Haversine)

### **Integrasi:**
- `backend/routes/reports.routes.js` - Route create report
- `components/CreateReportForm.tsx` - Frontend form

---

## ⚠️ Catatan Penting

1. **GPS Harus Aktif**
   - User harus mengaktifkan GPS saat mengambil foto
   - Foto dari galeri lama biasanya tidak punya GPS metadata

2. **Browser/Device Support**
   - `capture="environment"` hanya bekerja di mobile browser
   - Desktop browser akan tetap bisa upload dari galeri

3. **Privacy**
   - GPS metadata bisa dihapus oleh user
   - Validasi ini membantu tapi tidak 100% foolproof

4. **Fallback**
   - Jika validasi gagal (error), laporan tetap bisa dibuat dengan warning
   - Admin bisa review manual laporan dengan photo warning

---

## ✅ Checklist Implementasi

- [x] Service photoValidationService.js
- [x] Extract EXIF metadata (GPS, timestamp)
- [x] Validasi GPS coordinates
- [x] Validasi timestamp (umur foto)
- [x] Integrasi ke route create report
- [x] Frontend warning message
- [x] Input file dengan capture attribute
- [x] Konfigurasi via environment variables
- [x] Strict mode support
- [x] Error handling yang robust

---

## 🚀 Quick Start

1. **Install Dependencies:**
   ```bash
   cd backend
   npm install exifr
   ```

2. **Konfigurasi (Opsional):**
   ```env
   PHOTO_LOCATION_TOLERANCE_METERS=100
   PHOTO_MAX_AGE_MINUTES=60
   PHOTO_STRICT_MODE=false
   ```

3. **Test dengan Foto:**
   - Ambil foto dengan GPS aktif
   - Buat laporan dengan foto tersebut
   - Cek apakah validasi bekerja

**Selesai!** 🎉

