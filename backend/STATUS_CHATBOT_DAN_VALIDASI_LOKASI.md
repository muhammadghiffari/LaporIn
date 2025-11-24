# Status Chatbot & Validasi Lokasi

## ✅ Status Chatbot Saat Ini

### Yang Sudah Diperbaiki:
1. **Ekstraksi Lokasi** ✅
   - Regex pattern sudah diperbaiki untuk menangkap multi-word street names
   - Contoh: "jl digidaw nomr 121" → "Jl Digidaw No 121"
   - Pattern mendukung: "nomr", "nomor", "no", "nmr", "nomer"

2. **Judul Laporan** ✅
   - Post-processing untuk menghapus placeholder "di jalan bla bla"
   - Lokasi yang benar otomatis ditambahkan ke judul
   - Contoh: "Lampu Mati di Jl Sigma" (bukan "Lampu Mati di Jalan Bla Bla")

3. **Kategori & Urgensi** ✅
   - Ditentukan oleh AI (read-only, tidak bisa di-edit user)
   - Badge "AI" ditampilkan di UI untuk menunjukkan bahwa ini otomatis

4. **Draft Management** ✅
   - Draft tersimpan dengan benar
   - Button "Kirim" dan "Edit" muncul dengan benar
   - Preview draft menampilkan semua informasi

## ⚠️ Validasi Lokasi vs RT/RW - BELUM AKTIF

### Status Saat Ini:
- **Service sudah ada**: `backend/services/locationValidationService.js` ✅
- **Fungsi validasi sudah ada**: `validateLocationForRT()` ✅
- **Field di database**: ❌ **TIDAK ADA** (perlu ditambahkan ke schema)

### Yang Perlu Ditambahkan untuk Aktifkan Validasi:

#### 1. Tambahkan Field ke Schema Prisma

Edit `backend/prisma/schema.prisma`:

```prisma
model User {
  // ... field existing ...
  rtRw           String?   @map("rt_rw") @db.VarChar(50)
  
  // TAMBAHKAN INI:
  rtRwLatitude  Float?    @map("rt_rw_latitude")   // Center point RT/RW
  rtRwLongitude Float?    @map("rt_rw_longitude") // Center point RT/RW
  rtRwRadius    Float?    @map("rt_rw_radius")    // Radius dalam meter (untuk circular boundary)
  rtRwPolygon   Json?     @map("rt_rw_polygon")   // Polygon coordinates untuk boundary tidak bulat
  
  // ... field lainnya ...
}
```

#### 2. Tambahkan Field ke Model Report (untuk menyimpan koordinat laporan)

```prisma
model Report {
  // ... field existing ...
  location      String?  @db.VarChar(255)
  
  // TAMBAHKAN INI:
  latitude      Float?   // Koordinat latitude laporan
  longitude     Float?   // Koordinat longitude laporan
  locationValidated Boolean? @default(false) @map("location_validated") // Status validasi
  locationMismatch  Boolean? @default(false) @map("location_mismatch")   // Apakah di luar boundary
  locationDistance  Float?   @map("location_distance")                   // Jarak dari center RT/RW (meter)
  
  // ... field lainnya ...
}
```

#### 3. Jalankan Migration

```bash
cd backend
npx prisma migrate dev --name add_rt_rw_boundary_fields
npx prisma generate
```

#### 4. Aktifkan Kembali Service & Endpoint

Setelah field ditambahkan:

1. **Aktifkan endpoint set RT/RW location**:
   - File: `backend/routes/reports.routes.js`
   - Uncomment code di endpoint `/admin/rt-rw/set-location`

2. **Aktifkan validasi di chat.routes.js**:
   - File: `backend/routes/chat.routes.js` (line ~1990)
   - Uncomment code untuk memanggil `validateLocationForRT()`

3. **Aktifkan validasi di reports.routes.js**:
   - File: `backend/routes/reports.routes.js`
   - Uncomment code untuk geocoding dan validasi lokasi

#### 5. Cara Kerja Validasi (Setelah Diaktifkan):

1. **Admin RT/RW set boundary**:
   - Login sebagai Admin RT/RW
   - Buka halaman "Peta Laporan"
   - Klik di map untuk set center point RT/RW
   - Set radius (untuk circular) atau polygon (untuk boundary tidak bulat)

2. **Saat warga buat laporan**:
   - Jika warga kirim koordinat GPS → langsung validasi
   - Jika warga kirim alamat text → forward geocode dulu untuk dapat koordinat, lalu validasi
   - Sistem cek apakah koordinat laporan ada di dalam boundary RT/RW
   - Jika di luar boundary → set `locationMismatch = true` dan tampilkan warning

3. **Hasil Validasi**:
   - `locationValidated = true/false` → Apakah validasi sudah dilakukan
   - `locationMismatch = true/false` → Apakah lokasi di luar boundary
   - `locationDistance = number` → Jarak dari center RT/RW (dalam meter)

## 📋 Checklist Implementasi Validasi

- [ ] Tambahkan field ke schema Prisma (User & Report)
- [ ] Jalankan migration
- [ ] Aktifkan endpoint `/admin/rt-rw/set-location`
- [ ] Aktifkan validasi di `chat.routes.js`
- [ ] Aktifkan validasi di `reports.routes.js`
- [ ] Test set boundary oleh Admin RT/RW
- [ ] Test validasi saat warga buat laporan
- [ ] Test warning jika lokasi di luar boundary

## 🎯 Kesimpulan

**Chatbot sudah sesuai** untuk:
- ✅ Ekstraksi lokasi yang akurat
- ✅ Judul laporan yang benar (tanpa placeholder)
- ✅ Kategori & urgensi otomatis oleh AI
- ✅ Draft management yang bekerja

**Validasi lokasi vs RT** bisa diaktifkan nanti dengan:
1. Tambahkan field ke schema
2. Jalankan migration
3. Aktifkan kembali service & endpoint yang sudah ada

Semua service dan fungsi validasi sudah siap, tinggal tambahkan field di database dan aktifkan kembali.

