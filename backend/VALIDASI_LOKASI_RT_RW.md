# 📍 Validasi Lokasi Laporan terhadap RT/RW Boundary

## Status Saat Ini

**Validasi jarak RT/RW belum aktif** karena field boundary tidak ada di schema.

## Masalah yang Ditemukan

1. **Hanya 1 marker muncul di peta**:
   - ✅ **DIPERBAIKI**: Filter geocoding sudah dilonggarkan
   - Sekarang menerima semua confidence level (ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE)
   - Filter generic keywords sudah dikurangi

2. **Validasi jarak RT/RW belum ada**:
   - ⚠️ **BELUM AKTIF**: Field `rtRwLatitude`, `rtRwLongitude`, `rtRwRadius`, `rtRwPolygon` tidak ada di schema
   - Service `locationValidationService.js` sudah ada tapi tidak digunakan
   - Validasi di-comment out di `reports.routes.js`

## Cara Mengaktifkan Validasi Lokasi

### 1. Tambahkan Field ke Schema

Tambahkan field berikut ke `backend/prisma/schema.prisma`:

```prisma
model User {
  // ... field existing ...
  
  // RT/RW Boundary (untuk validasi lokasi laporan)
  rtRwLatitude   Float?   @map("rt_rw_latitude")   // Latitude center RT/RW
  rtRwLongitude  Float?   @map("rt_rw_longitude")  // Longitude center RT/RW
  rtRwRadius     Int?     @map("rt_rw_radius")     // Radius dalam meter (untuk circular boundary)
  rtRwPolygon    Json?    @map("rt_rw_polygon")    // Polygon coordinates untuk boundary tidak bulat
}
```

### 2. Jalankan Migration

```bash
cd backend
npx prisma migrate dev --name add_rt_rw_boundary_fields
npx prisma generate
```

### 3. Aktifkan Validasi di Backend

**File: `backend/routes/reports.routes.js`** (line ~570)

Uncomment kode validasi:

```javascript
if (lat && lng && report.user.rtRw) {
  try {
    // Get RT/RW boundary data
    const rtRwUser = await prisma.user.findFirst({
      where: { rtRw: report.user.rtRw },
      select: {
        rtRwLatitude: true,
        rtRwLongitude: true,
        rtRwRadius: true,
        rtRwPolygon: true
      }
    });
    
    if (rtRwUser && rtRwUser.rtRwLatitude && rtRwUser.rtRwLongitude) {
      const { validateLocationForRT } = require('../services/locationValidationService');
      const validation = validateLocationForRT(lat, lng, rtRwUser);
      locationMismatch = validation.mismatch || false;
      locationDistance = validation.distance || null;
    }
  } catch (error) {
    console.warn(`[Map] Failed to validate location for report ${report.id}:`, error.message);
  }
}
```

### 4. Aktifkan Endpoint Set RT/RW Location

**File: `backend/routes/reports.routes.js`** (endpoint `/admin/rt-rw/set-location`)

Uncomment endpoint untuk Admin RT/RW set boundary.

### 5. Cara Set RT/RW Boundary

1. Login sebagai **Admin RW** atau **Ketua RT**
2. Buka halaman **"Peta Laporan"**
3. Klik tombol **"Set Lokasi RT/RW"**
4. Klik di peta untuk set center point RT/RW
5. Set radius (dalam meter) atau polygon
6. Klik **"Simpan"**

### 6. Cara Kerja Validasi

Setelah boundary di-set:

1. **Saat warga buat laporan**:
   - Jika warga kirim koordinat GPS → langsung validasi
   - Jika warga kirim alamat text → forward geocode dulu untuk dapat koordinat, lalu validasi
   - Sistem cek apakah koordinat laporan ada di dalam boundary RT/RW
   - Jika di luar boundary → set `locationMismatch = true` dan tampilkan warning

2. **Di peta monitoring**:
   - Marker merah untuk laporan dengan `locationMismatch = true`
   - Info window menampilkan jarak dari center RT/RW
   - Warning message: "Lokasi di luar RT/RW (X meter dari pusat)"

## Perbaikan yang Sudah Dilakukan

### 1. Filter Geocoding Dilonggarkan ✅

**Sebelum:**
- Hanya menerima `ROOFTOP` dan `RANGE_INTERPOLATED`
- Filter generic keywords terlalu banyak (`'jl s', 'jl b', 'jl d'`)
- Minimum length 5 karakter

**Sesudah:**
- Menerima semua confidence level (termasuk `GEOMETRIC_CENTER` dan `APPROXIMATE`)
- Filter generic keywords dikurangi (hanya yang benar-benar generic)
- Minimum length 3 karakter

**Hasil:**
- Lebih banyak marker muncul di peta
- Marker dengan confidence rendah tetap ditampilkan dengan warning di info window

### 2. Validasi Jarak (Siap, Tapi Belum Aktif) ⚠️

- Service `locationValidationService.js` sudah ada
- Kode validasi sudah disiapkan (di-comment)
- Tinggal tambahkan field ke schema dan uncomment kode

## Catatan

- **Validasi jarak memerlukan field boundary di schema** - saat ini belum ada
- **Service validasi sudah siap** - tinggal aktifkan setelah field ditambahkan
- **Filter geocoding sudah diperbaiki** - lebih banyak marker muncul sekarang

