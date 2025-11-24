# 🧪 Testing User Verification Feature

Dokumentasi untuk melakukan testing fitur User Verification.

## 📋 Prerequisites

1. **Backend server harus running**
   ```bash
   cd backend
   npm run dev
   ```

2. **Database sudah ter-setup dan terhubung**
   - Pastikan PostgreSQL running
   - Pastikan `.env` sudah dikonfigurasi dengan benar

3. **Ada user admin untuk testing**
   - Email: `admin@example.com` (atau sesuaikan di test script)
   - Password: `admin123` (atau sesuaikan di test script)
   - Role: `admin` atau `admin_rw`

## 🚀 Cara Menjalankan Test

### Option 1: Menggunakan npm script
```bash
cd backend
npm run test:verification
```

### Option 2: Langsung dengan node
```bash
cd backend
node test-user-verification.js
```

## 📝 Test Cases yang Akan Dijalankan

1. ✅ **Login sebagai Admin RW**
   - Test login dengan credentials admin
   - Verifikasi token diterima

2. ✅ **Registrasi warga baru**
   - Test registrasi warga baru
   - Verifikasi warga baru otomatis `isVerified: false`

3. ✅ **Cek status verifikasi warga baru**
   - Verifikasi bahwa warga baru memiliki `is_verified: false`

4. ✅ **Warga belum diverifikasi tidak bisa membuat laporan**
   - Test bahwa warga yang belum diverifikasi mendapat error 403
   - Verifikasi error message mengandung `requiresVerification: true`

5. ✅ **Admin melihat daftar warga pending verification**
   - Test endpoint `/auth/warga/pending-verification`
   - Verifikasi warga baru muncul di daftar

6. ✅ **Admin memverifikasi warga (approve)**
   - Test endpoint `/auth/warga/:userId/verify` dengan `approved: true`
   - Verifikasi status `isVerified` berubah menjadi `true`

7. ✅ **Cek status verifikasi setelah approve**
   - Verifikasi `is_verified: true` dan `verified_at` terisi

8. ✅ **Warga sudah diverifikasi bisa membuat laporan**
   - Test bahwa warga yang sudah diverifikasi bisa membuat laporan
   - Verifikasi laporan berhasil dibuat

9. ✅ **Admin tidak bisa verifikasi warga yang sudah diverifikasi lagi**
   - Test bahwa verifikasi ulang akan gagal dengan error 400

10. ✅ **Test reject verification**
    - Test verifikasi dengan `approved: false`
    - Verifikasi status tetap `false` dan `verificationNotes` terisi

## 🔧 Konfigurasi Test

Jika credentials admin berbeda, edit file `backend/test-user-verification.js`:

```javascript
// Line ~30-35
const response = await axios.post(`${BASE_URL}/auth/login`, {
  email: 'admin@example.com', // Ganti dengan email admin Anda
  password: 'admin123' // Ganti dengan password admin Anda
});
```

## 📊 Expected Output

Jika semua test berhasil, Anda akan melihat:

```
========================================
🧪 USER VERIFICATION FEATURE TEST
========================================

ℹ️  [TEST] 1. Login sebagai Admin RW
✅ 1. Login sebagai Admin RW - PASSED

ℹ️  [TEST] 2. Registrasi warga baru
✅ 2. Registrasi warga baru - PASSED

...

========================================
📊 TEST SUMMARY
========================================
✅ Passed: 10
ℹ️  Total: 10

🎉 Semua test berhasil!
```

## ⚠️ Troubleshooting

### Error: "Cannot connect to backend"
- Pastikan backend server running di port 5000
- Cek `BACKEND_URL` di test script atau set environment variable

### Error: "Invalid credentials"
- Pastikan ada user admin dengan email/password yang sesuai
- Atau buat user admin baru:
  ```sql
  INSERT INTO users (email, password_hash, name, role, rt_rw) 
  VALUES ('admin@example.com', '$2a$10$...', 'Admin Test', 'admin', 'RT001/RW005');
  ```

### Error: "User not found" atau "Foreign key constraint"
- Pastikan database sudah ter-migrate dengan schema terbaru
- Jalankan: `npx prisma db push` atau `npx prisma migrate dev`

### Error: "Face descriptor required"
- Test script menggunakan mock face descriptor
- Pastikan endpoint `/auth/register` menerima face descriptor (atau modifikasi test script)

## 🎯 Manual Testing Checklist

Selain automated test, lakukan juga manual testing:

### Frontend Testing

1. **Login sebagai Admin RT/RW**
   - ✅ Dashboard menampilkan panel "Verifikasi Warga"
   - ✅ Panel menampilkan daftar warga yang belum diverifikasi

2. **Verifikasi Warga**
   - ✅ Klik tombol "Setujui" pada warga
   - ✅ Dialog konfirmasi muncul
   - ✅ Setelah approve, warga hilang dari daftar pending
   - ✅ Status warga berubah menjadi "Terverifikasi"

3. **Login sebagai Warga Baru**
   - ✅ Halaman Pengaturan menampilkan badge "Belum Diverifikasi"
   - ✅ Alert warning muncul di halaman pengaturan
   - ✅ Tidak bisa membuat laporan (error message muncul)

4. **Setelah Verifikasi**
   - ✅ Badge berubah menjadi "Terverifikasi"
   - ✅ Alert success muncul dengan tanggal verifikasi
   - ✅ Bisa membuat laporan dengan sukses

### Backend Testing (via Postman/Thunder Client)

1. **GET /api/auth/warga/pending-verification**
   - ✅ Return list warga yang `isVerified: false`
   - ✅ Filter berdasarkan RT/RW untuk Admin RW

2. **POST /api/auth/warga/:userId/verify**
   - ✅ Approve: `{ approved: true }` → `isVerified: true`
   - ✅ Reject: `{ approved: false, notes: "..." }` → `isVerified: false`
   - ✅ Error jika warga sudah diverifikasi

3. **POST /api/reports** (sebagai warga)
   - ✅ Error 403 jika `isVerified: false`
   - ✅ Success jika `isVerified: true`

## 📝 Notes

- Test script akan membuat warga baru untuk testing
- Warga yang dibuat untuk testing akan tetap ada di database
- Untuk cleanup, hapus manual atau gunakan script cleanup

## 🔗 Related Files

- `backend/test-user-verification.js` - Test script
- `backend/routes/auth.routes.js` - Endpoint verifikasi
- `backend/routes/reports.routes.js` - Validasi verifikasi di create report
- `components/UserVerificationPanel.tsx` - Frontend component
- `app/pengaturan/page.tsx` - Status verifikasi di profil

