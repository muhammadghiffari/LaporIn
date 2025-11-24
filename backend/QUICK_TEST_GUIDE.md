# ⚡ Quick Test Guide - User Verification

## 🚀 Quick Start

### 1. Pastikan Backend Running
```bash
cd backend
npm run dev
```

### 2. Jalankan Test Script
```bash
cd backend
npm run test:verification
```

## ✅ Manual Test Checklist (5 Menit)

### Test 1: Verifikasi Warga (2 menit)
1. Login sebagai **Admin RT/RW** (atau Super Admin)
2. Buka **Dashboard**
3. Scroll ke bawah, cari panel **"Verifikasi Warga"**
4. Klik **"Setujui"** pada salah satu warga yang belum diverifikasi
5. ✅ **Expected**: Dialog konfirmasi muncul, setelah approve warga hilang dari daftar

### Test 2: Warga Belum Diverifikasi (1 menit)
1. Login sebagai **Warga** yang belum diverifikasi
2. Buka halaman **Pengaturan** (`/pengaturan`)
3. ✅ **Expected**: 
   - Badge "Belum Diverifikasi" muncul
   - Alert warning muncul
4. Coba buat laporan (via form atau chatbot)
5. ✅ **Expected**: Error message muncul, laporan tidak bisa dibuat

### Test 3: Warga Setelah Diverifikasi (2 menit)
1. Login sebagai **Admin RT/RW**
2. Verifikasi warga dari Test 2
3. Logout dan login kembali sebagai **Warga** tersebut
4. Buka halaman **Pengaturan**
5. ✅ **Expected**: 
   - Badge "Terverifikasi" muncul
   - Alert success dengan tanggal verifikasi
6. Coba buat laporan
7. ✅ **Expected**: Laporan berhasil dibuat

## 🔍 Verifikasi di Database

```sql
-- Cek warga yang belum diverifikasi
SELECT id, email, name, is_verified, verified_at, verified_by 
FROM users 
WHERE role = 'warga' AND is_verified = false;

-- Cek warga yang sudah diverifikasi
SELECT id, email, name, is_verified, verified_at, verified_by 
FROM users 
WHERE role = 'warga' AND is_verified = true;
```

## 🐛 Common Issues

### Issue: Panel "Verifikasi Warga" tidak muncul
**Solution**: Pastikan login sebagai Admin RT/RW, Ketua RT, atau Sekretaris RT

### Issue: Warga bisa membuat laporan meski belum diverifikasi
**Solution**: 
1. Cek di database: `SELECT is_verified FROM users WHERE id = <warga_id>`
2. Pastikan backend sudah restart setelah update code
3. Cek console browser untuk error message

### Issue: Error "User tidak ditemukan" saat verifikasi
**Solution**: Pastikan `wargaId` benar dan warga ada di database

## 📞 Next Steps

Setelah testing selesai:
1. ✅ Semua test passed → Fitur siap digunakan
2. ❌ Ada test failed → Cek error log dan perbaiki
3. 📝 Dokumentasikan hasil testing untuk hackathon

