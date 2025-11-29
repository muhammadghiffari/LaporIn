# 📋 Daftar User untuk Testing/Demo

## 🔐 Password Default
**Semua user menggunakan password: `demo123`**

---

## 👤 User dengan Email Asli (Real Emails)

### 1. Superadmin (Admin Kelurahan)
- **Email:** `abhisuryanu9roho@gmail.com`
- **Nama:** Abhi Surya Nugroho
- **Role:** `admin` (Superadmin)
- **RT/RW:** Tidak ada (admin kelurahan)
- **Jenis Kelamin:** Laki-laki
- **Status:** Verified ✅

### 2. Admin RW001
- **Email:** `kepodehlol54@gmail.com`
- **Nama:** Admin RW 001
- **Role:** `admin_rw`
- **RT/RW:** Tidak ada (admin RW)
- **Jenis Kelamin:** Laki-laki
- **Status:** Verified ✅

### 3. Ketua RT001/RW001
- **Email:** `gaminggampang20@gmail.com`
- **Nama:** Dyandra
- **Role:** `ketua_rt`
- **RT/RW:** RT001/RW001
- **Jenis Kelamin:** Laki-laki
- **Status:** Verified ✅

### 4. Pengurus RT001/RW001
- **Email:** `syncrazelled@gmail.com`
- **Nama:** Muhammad Alfarisi Setiyono
- **Role:** `pengurus`
- **RT/RW:** RT001/RW001
- **Jenis Kelamin:** Laki-laki
- **Status:** Verified ✅

### 5. Warga RT001/RW001
- **Email:** `wadidawcihuy@gmail.com`
- **Nama:** Muhammad Ghiffari (RT001/RW001)
- **Role:** `warga`
- **RT/RW:** RT001/RW001
- **Jenis Kelamin:** Laki-laki
- **Status:** Verified ✅

---

## 🔄 User Generate (Dummy Emails)

### Admin RW002
- **Email:** `adminrw002@example.com`
- **Nama:** Admin RW002
- **Role:** `admin_rw`
- **RT/RW:** Tidak ada
- **Status:** Verified ✅

### RT002/RW001
- **Ketua RT:** `ketuart002rw001@example.com`
- **Sekretaris:** `sekretarisrt002rw001@example.com`
- **Pengurus:** `pengurusrt002rw001@example.com`
- **Warga:** `warga1@example.com`, `warga2@example.com`, dst. (10-15 warga per RT)

### RT003/RW001
- **Ketua RT:** `ketuart003rw001@example.com`
- **Sekretaris:** `sekretarisrt003rw001@example.com`
- **Pengurus:** `pengurusrt003rw001@example.com`
- **Warga:** `wargaX@example.com` (10-15 warga per RT)

### RW002 (Full Generate)
- **Admin RW:** `adminrw002@example.com`
- **RT001/RW002:** Ketua, Sekretaris, Pengurus, Warga (generate)
- **RT002/RW002:** Ketua, Sekretaris, Pengurus, Warga (generate)
- **RT003/RW002:** Ketua, Sekretaris, Pengurus, Warga (generate)

---

## 📝 Catatan Penting

1. **Password:** Semua user menggunakan password `demo123`
2. **Email Asli:** Hanya 5 user yang menggunakan email asli (untuk notifikasi/testing)
3. **Email Generate:** User lainnya menggunakan email pattern `*@example.com` (tidak bisa menerima email)
4. **Face Recognition:** User dengan email asli mungkin sudah terdaftar face recognition
5. **Status:** Semua user sudah verified (tidak perlu verifikasi email)

---

## 🎯 Rekomendasi User untuk Testing

### Untuk Testing Admin:
- **Superadmin:** `abhisuryanu9roho@gmail.com` / `demo123`
- **Admin RW001:** `kepodehlol54@gmail.com` / `demo123`

### Untuk Testing Ketua RT/Pengurus:
- **Ketua RT001/RW001:** `gaminggampang20@gmail.com` / `demo123`
- **Pengurus RT001/RW001:** `syncrazelled@gmail.com` / `demo123`

### Untuk Testing Warga:
- **Warga RT001/RW001:** `wadidawcihuy@gmail.com` / `demo123`
- **Warga Generate:** `warga1@example.com` / `demo123` (atau warga lainnya)

---

## 🔄 Cara Reset Data

Jika ingin reset semua data dan seed ulang:

```bash
# Di Railway SSH atau local
cd backend
npm run clear-all-data
npm run seed:real
```

---

## 📱 Mobile App & Web App

- **Web App:** https://laporin.vercel.app (atau URL Vercel Anda)
- **Mobile App:** Build APK dari `laporin_app/`
- **Backend API:** https://api-weladalah-laporin.up.railway.app

---

## ⚠️ Peringatan

- Jangan gunakan password `demo123` di production!
- Email asli hanya untuk testing/demo
- Pastikan untuk mengganti password setelah testing selesai

