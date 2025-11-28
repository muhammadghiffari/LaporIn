# 📍 Enhanced Location Validation - LaporIn

## ✨ Fitur Baru

### 1. **Toleransi Jarak (Distance Tolerance)**
- Default: **50 meter** (dapat dikonfigurasi via env)
- Laporan yang berada di luar boundary tapi masih dalam toleransi akan tetap diterima
- Berguna untuk menangani ketidakakuratan GPS atau boundary yang terlalu ketat

**Konfigurasi:**
```env
LOCATION_TOLERANCE_METERS=50  # Toleransi dalam meter (default: 50)
```

### 2. **Strict Mode (Mode Ketat)**
- Jika aktif, laporan di luar boundary akan **ditolak** (tidak bisa dibuat)
- Jika non-aktif (default), laporan tetap bisa dibuat dengan warning

**Konfigurasi:**
```env
LOCATION_STRICT_MODE=true  # Aktifkan strict mode (default: false)
```

### 3. **Notifikasi Email ke Admin RT/RW**
- Admin RT/RW akan menerima email otomatis jika ada laporan di luar boundary
- Email berisi:
  - Detail laporan (judul, lokasi, koordinat)
  - Jarak dari center RT/RW
  - Tindakan yang disarankan
  - Link ke detail laporan

---

## 🔧 Cara Kerja

### **Validasi dengan Toleransi**

```
Boundary Radius: 500m
Toleransi: 50m
Effective Radius: 550m

Laporan di 520m → ✅ Diterima (dalam toleransi)
Laporan di 600m → ⚠️ Warning (di luar boundary, tapi bisa dibuat)
Laporan di 600m (strict mode) → ❌ Ditolak
```

### **Priority Validasi**

1. **Polygon Boundary** (jika ada)
   - Validasi menggunakan polygon shape
   - Lebih akurat untuk boundary tidak beraturan
   - Toleransi diterapkan dengan memperluas effective radius

2. **Radius Boundary** (fallback)
   - Validasi menggunakan circular radius
   - Toleransi = radius + toleranceMeters
   - Contoh: radius 500m + toleransi 50m = effective 550m

---

## 📧 Email Notifikasi

### **Kepada:**
- Admin RW
- Ketua RT
- Sekretaris RT
- Pengurus
- Admin Sistem

### **Isi Email:**
- ⚠️ Peringatan lokasi di luar boundary
- Detail laporan (judul, lokasi, koordinat)
- Jarak dari center RT/RW
- Tindakan yang disarankan:
  1. Verifikasi lokasi laporan
  2. Pertimbangkan memperluas boundary jika lokasi benar
  3. Hubungi warga jika lokasi salah
- Link ke detail laporan

---

## 🛠️ Konfigurasi

### **Environment Variables**

Tambahkan ke `backend/.env`:

```env
# Location Validation Settings
LOCATION_TOLERANCE_METERS=50      # Toleransi jarak dalam meter (default: 50)
LOCATION_STRICT_MODE=false        # Aktifkan strict mode (default: false)
```

### **Strict Mode: ON**
- Laporan di luar boundary → **DITOLAK**
- Cocok untuk: Validasi ketat, mencegah laporan dari luar wilayah

### **Strict Mode: OFF** (Default)
- Laporan di luar boundary → **WARNING** (tetap bisa dibuat)
- Admin RT/RW mendapat notifikasi email
- Cocok untuk: Fleksibilitas, admin bisa review manual

---

## 📊 Contoh Skenario

### **Skenario 1: Toleransi Aktif (Default)**
```
Boundary: 500m
Toleransi: 50m
Laporan di: 530m

Hasil:
- ✅ Diterima (dalam toleransi)
- ⚠️ Warning ditampilkan
- 📧 Email ke admin RT/RW
```

### **Skenario 2: Strict Mode Aktif**
```
Boundary: 500m
Toleransi: 50m
Laporan di: 530m

Hasil:
- ❌ DITOLAK (di luar boundary asli)
- Error message: "Lokasi laporan berada di luar boundary..."
```

### **Skenario 3: Dalam Boundary**
```
Boundary: 500m
Laporan di: 400m

Hasil:
- ✅ Diterima (dalam boundary)
- ✅ Tidak ada warning
- ✅ Tidak ada email notifikasi
```

---

## 🎯 Best Practice

1. **Mulai dengan Toleransi 50m**
   - Memberikan fleksibilitas untuk ketidakakuratan GPS
   - Masih menjaga validasi boundary

2. **Aktifkan Strict Mode untuk Produksi**
   - Setelah boundary sudah akurat
   - Untuk mencegah laporan dari luar wilayah

3. **Monitor Email Notifikasi**
   - Review laporan dengan location mismatch
   - Pertimbangkan memperluas boundary jika banyak false positive

4. **Set Boundary dengan Akurat**
   - Gunakan Google Maps untuk menentukan center point
   - Gunakan polygon untuk boundary tidak beraturan
   - Test dengan beberapa koordinat sebelum production

---

## ✅ Checklist Implementasi

- [x] Toleransi jarak (configurable via env)
- [x] Strict mode (block reports outside boundary)
- [x] Email notifikasi ke admin RT/RW
- [x] Validasi polygon dengan toleransi
- [x] Validasi radius dengan toleransi
- [x] Logging untuk debugging
- [x] Error handling yang robust

---

## 🚀 Quick Start

1. **Set Boundary RT/RW** (di halaman Peta Laporan)
2. **Konfigurasi Toleransi** (opsional, di `.env`)
3. **Aktifkan Strict Mode** (opsional, di `.env`)
4. **Test dengan Laporan Baru**
5. **Monitor Email Notifikasi**

**Selesai!** 🎉

