## Error Type
Console Error

## Error Message
React has detected a change in the order of Hooks called by PetaLaporanPage. This will lead to bugs and errors if not fixed. For more information, read the Rules of Hooks: https://react.dev/link/rules-of-hooks

   Previous render            Next render
   ------------------------------------------------------
1. useRef                     useRef
2. useMemo                    useMemo
3. useSyncExternalStore       useSyncExternalStore
4. useEffect                  useEffect
5. useDebugValue              useDebugValue
6. useDebugValue              useDebugValue
7. useContext                 useContext
8. useState                   useState
9. useState                   useState
10. useState                  useState
11. useState                  useState
12. useState                  useState
13. useState                  useState
14. useState                  useState
15. useState                  useState
16. useState                  useState
17. useState                  useState
18. useState                  useState
19. useState                  useState
20. useCallback               useCallback
21. useCallback               useCallback
22. useCallback               useCallback
23. useCallback               useCallback
24. useCallback               useCallback
25. useCallback               useCallback
26. useState                  useState
27. useState                  useState
28. useEffect                 useEffect
29. useRef                    useRef
30. useMemo                   useMemo
31. useSyncExternalStore      useSyncExternalStore
32. useEffect                 useEffect
33. useDebugValue             useDebugValue
34. useDebugValue             useDebugValue
35. useEffect                 useEffect
36. undefined                 useEffect
   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^



    at PetaLaporanPage (app/admin/peta-laporan/page.tsx:106:12)

## Code Frame
  104 |
  105 |   // Fetch RT list untuk Admin RW
> 106 |   useEffect(() => {
      |            ^
  107 |     if (!mounted || !isAdminRW) return;
  108 |     
  109 |     const fetchRtList = async () => {

Next.js version: 16.0.3 (Turbopack)
# 📍 Cara Set Lokasi RT/RW dan Validasi Lokasi Laporan

## ✅ Status: Fitur Sudah Aktif!

Field boundary sudah ditambahkan ke database dan validasi sudah diaktifkan.

---

## 🎯 Cara Set Lokasi RT/RW

### **Langkah 1: Login sebagai Admin RW atau Ketua RT**

1. Login dengan akun:
   - **Admin RW**: `adminrw005@example.com` / `demo123`
   - **Ketua RT**: `ketuart001rw005@example.com` / `demo123`

### **Langkah 2: Buka Halaman Peta Monitoring**

1. Klik menu **"Peta Laporan"** di sidebar
2. Atau akses langsung: `/admin/peta-laporan`

### **Langkah 3: Set Lokasi RT/RW**

1. Klik tombol **"Set Lokasi RT/RW"** (tombol biru di kanan atas)
2. Klik di peta pada lokasi center RT/RW Anda
3. Set **Radius** (dalam meter):
   - Default: 500 meter
   - Range: 100-10000 meter
   - Contoh: 500 meter = radius 500m dari center point
4. Klik **"Simpan"**

### **Langkah 4: Verifikasi**

1. Setelah disimpan, akan muncul:
   - **Circle biru** di peta menunjukkan boundary RT/RW
   - **Marker biru** menunjukkan center point RT/RW
2. Refresh halaman untuk melihat boundary di semua laporan

---

## 🔍 Cara Kerja Validasi Lokasi

### **Saat Warga Membuat Laporan:**

1. **Jika warga kirim koordinat GPS** (latitude/longitude):
   - Sistem langsung validasi terhadap RT/RW boundary
   - Jika di luar boundary → `locationMismatch = true`
   - Warning: "Lokasi laporan berada di luar boundary RT/RW Anda (X meter dari pusat)"

2. **Jika warga kirim alamat text**:
   - Sistem forward geocode dulu untuk dapat koordinat
   - Lalu validasi terhadap RT/RW boundary
   - Jika di luar boundary → warning ditampilkan

### **Di Peta Monitoring:**

1. **Marker merah** = Laporan dengan `locationMismatch = true`
2. **Marker warna status** = Laporan dengan lokasi valid
3. **Info window** menampilkan:
   - Jarak dari center RT/RW (jika mismatch)
   - Warning message jika lokasi di luar boundary

---

## 📊 Validasi Boundary

### **Priority 1: Polygon Boundary** (Lebih Akurat)
- Jika RT/RW punya polygon coordinates → validasi menggunakan polygon
- Mendukung boundary tidak bulat (polygon shape)

### **Priority 2: Radius Boundary** (Fallback)
- Jika RT/RW punya radius → validasi menggunakan circular radius
- Mendukung boundary bulat (circular shape)

### **Jika Boundary Belum Di-Set:**
- Validasi di-skip (tidak ada error)
- Semua laporan dianggap valid
- Admin RT/RW perlu set boundary terlebih dahulu

---

## 🛠️ Technical Details

### **Field di Database:**

```prisma
model User {
  rtRwLatitude   Float?   // Latitude center RT/RW
  rtRwLongitude  Float?   // Longitude center RT/RW
  rtRwRadius     Int?     // Radius dalam meter (untuk circular boundary)
  rtRwPolygon    Json?    // Polygon coordinates untuk boundary tidak bulat
}
```

### **Endpoint:**

- **POST `/api/reports/admin/rt-rw/set-location`**
  - Body: `{ latitude, longitude, radius?, polygon? }`
  - Role: `admin_rw`, `ketua_rt`, `sekretaris_rt`
  - Response: `{ success: true, boundary: {...} }`

### **Validasi di Backend:**

- **File**: `backend/routes/reports.routes.js`
- **Service**: `backend/services/locationValidationService.js`
- **Library**: `@turf/turf` untuk geospatial calculations

---

## 📝 Contoh Penggunaan

### **Set Boundary untuk RT001/RW005:**

1. Login sebagai Admin RW005
2. Buka Peta Laporan
3. Klik "Set Lokasi RT/RW"
4. Klik di peta pada koordinat: `-6.2088, 106.8456` (Jakarta Pusat)
5. Set radius: `500` meter
6. Klik "Simpan"

**Hasil:**
- Semua laporan dari RT001/RW005 akan divalidasi
- Laporan di luar radius 500m akan ditandai sebagai mismatch
- Marker merah di peta untuk laporan mismatch

---

## ⚠️ Catatan Penting

1. **Satu RT/RW = Satu Boundary**
   - Jika beberapa user punya RT/RW yang sama, boundary diambil dari user pertama yang set
   - Disarankan: Admin RW yang set boundary untuk semua RT dalam RW mereka

2. **Validasi Hanya untuk Laporan dengan Koordinat**
   - Jika laporan tidak punya koordinat (hanya alamat text), validasi di-skip
   - Forward geocoding dilakukan untuk dapat koordinat dari alamat

3. **Warning Bukan Error**
   - Laporan dengan location mismatch tetap bisa dibuat
   - Warning hanya untuk informasi, tidak block laporan

---

## 🎯 Best Practice

1. **Set Boundary Setelah Setup RT/RW**
   - Set boundary segera setelah membuat RT/RW baru
   - Gunakan Google Maps untuk menentukan center point yang akurat

2. **Radius vs Polygon**
   - **Radius**: Lebih mudah, cocok untuk area bulat
   - **Polygon**: Lebih akurat, cocok untuk area tidak beraturan
   - Mulai dengan radius, upgrade ke polygon jika perlu

3. **Test Validasi**
   - Buat laporan dengan koordinat di dalam boundary → harus valid
   - Buat laporan dengan koordinat di luar boundary → harus mismatch
   - Cek di peta monitoring untuk verifikasi

---

## ✅ Checklist

- [x] Field boundary ditambahkan ke schema
- [x] Migration berhasil
- [x] Endpoint set-location aktif
- [x] Validasi di map endpoint aktif
- [x] Validasi di create report endpoint aktif
- [x] Service locationValidationService siap
- [ ] Test set boundary di peta monitoring
- [ ] Test validasi dengan laporan baru

---

## 🚀 Quick Start

1. **Login sebagai Admin RW**
2. **Buka Peta Laporan**
3. **Klik "Set Lokasi RT/RW"**
4. **Klik di peta → Set radius → Simpan**
5. **Buat laporan baru dengan koordinat GPS**
6. **Cek apakah validasi bekerja**

**Selesai!** 🎉

