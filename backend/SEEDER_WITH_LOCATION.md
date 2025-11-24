# 🌱 Seeder dengan Struktur Hierarki RT/RW & Lokasi

Seeder lengkap dengan struktur hierarki RT/RW, lokasi (latitude/longitude), dan assignment pengurus.

## 📋 Struktur yang Dibuat

### **4 RW dengan Beberapa RT:**

```
RW005 (Jakarta Pusat)
  ├── RT001
  ├── RT002
  └── RT003

RW006 (Jakarta Selatan)
  ├── RT001
  ├── RT002
  └── RT003

RW007 (Jakarta Barat)
  ├── RT001
  ├── RT002
  └── RT003

RW009 (Jakarta Timur)
  ├── RT001
  ├── RT002
  └── RT003
```

### **User yang Dibuat:**

1. **Super Admin** (1 user)
   - `adminsistem@example.com` / `AdminSistem123!`
   - Tidak punya RT/RW (bisa akses semua)

2. **Admin RW** (4 user - 1 per RW)
   - `adminrw005@example.com` / `AdminRw005123!`
   - `adminrw006@example.com` / `AdminRw006123!`
   - `adminrw007@example.com` / `AdminRw007123!`
   - `adminrw009@example.com` / `AdminRw009123!`

3. **Ketua RT** (12 user - 1 per RT)
   - `ketuart001rw005@example.com` / `KetuaRt001Rw005123!`
   - `ketuart002rw005@example.com` / `KetuaRt002Rw005123!`
   - ... (dan seterusnya untuk semua RT)

4. **Sekretaris RT** (12 user - 1 per RT)
   - `sekretaris001rw005@example.com` / `Sekretaris001Rw005123!`
   - ... (dan seterusnya)

5. **Pengurus** (15 user - 1-2 per RT)
   - RT001 punya 2 pengurus
   - RT lainnya punya 1 pengurus
   - **Pengurus di-assign ke RT/RW tertentu** (tidak bisa ngurus RT/RW lain)

6. **Warga** (96 user - 8 per RT)
   - `warga1@example.com` - `warga96@example.com` / `Warga123!`
   - Sebagian sudah diverifikasi (10 warga pertama)
   - Sebagian belum diverifikasi (perlu verifikasi oleh Admin RT/RW)

## 📍 Data Lokasi

Setiap RT/RW memiliki data lokasi sebagai referensi:

```javascript
{
  'RT001/RW005': { lat: -6.2088, lng: 106.8456, radius: 500 },
  'RT002/RW005': { lat: -6.2090, lng: 106.8458, radius: 500 },
  // ... dan seterusnya
}
```

**Catatan:** Data lokasi disimpan sebagai referensi di script. Untuk implementasi penuh, tambahkan field ke schema:
- `rtRwLatitude` (Decimal)
- `rtRwLongitude` (Decimal)
- `rtRwRadius` (Integer) - dalam meter
- `rtRwPolygon` (JSON) - untuk boundary polygon

## 🚀 Cara Menjalankan

```bash
cd backend
npm run seed:location
```

Atau langsung:

```bash
cd backend
node scripts/seed-with-location.js
```

## ✅ Fitur Seeder

1. **Struktur Hierarki Lengkap**
   - 4 RW dengan 3 RT masing-masing
   - Total 12 RT

2. **Assignment Pengurus**
   - Pengurus di-assign ke RT/RW tertentu
   - Contoh: Pengurus di RW009 RT002 hanya bisa ngurus RW009 RT002
   - Tidak bisa ngurus RT/RW lain

3. **Auto-Verification**
   - Admin, Admin RW, Ketua RT, Sekretaris RT, Pengurus: `isVerified: true`
   - Warga: `isVerified: false` (perlu verifikasi manual)
   - 20 warga pertama otomatis diverifikasi sebagai contoh

### 5. Variasi Tanggal untuk Statistik
   - **User Creation**: Distribusi bertahap dari 6 bulan lalu sampai sekarang
   - **Reports**: Distribusi natural dalam 3 bulan terakhir (lebih banyak di akhir periode)
   - **Status History**: Delay realistis untuk in_progress (6-54 jam) dan resolved (1-6 hari)
   - **Verification**: Delay 1-7 hari setelah registrasi

4. **Lokasi Reference**
   - Setiap RT/RW punya koordinat (lat/lng) dan radius
   - Bisa digunakan untuk validasi lokasi laporan

## 🔑 Credentials untuk Testing (DEMO MODE)

⚠️ **PENTING: SEMUA USER MENGGUNAKAN PASSWORD YANG SAMA UNTUK DEMO**

### Password untuk Semua User
**Password: `demo123`**

### Super Admin
- Email: `adminsistem@example.com`
- Password: `demo123`

### Admin RW
- RW005: `adminrw005@example.com` / `demo123`
- RW006: `adminrw006@example.com` / `demo123`
- RW007: `adminrw007@example.com` / `demo123`
- RW009: `adminrw009@example.com` / `demo123`

### Ketua RT
- RT001/RW005: `ketuart001rw005@example.com` / `demo123`
- RT002/RW005: `ketuart002rw005@example.com` / `demo123`
- ... (dan seterusnya)

### Sekretaris RT
- RT001/RW005: `sekretaris001rw005@example.com` / `demo123`
- ... (dan seterusnya)

### Pengurus
- RT001/RW005 (Pengurus 1): `pengurus001rw0051@example.com` / `demo123`
- RT001/RW005 (Pengurus 2): `pengurus001rw0052@example.com` / `demo123`
- RT002/RW005: `pengurus002rw0051@example.com` / `demo123`
- ... (dan seterusnya)

### Warga
- `warga1@example.com` - `warga96@example.com`
- Password: `demo123`
- **20 warga pertama sudah diverifikasi**
- **Warga lainnya belum diverifikasi** (perlu verifikasi oleh Admin RT/RW)

## 📊 Statistik

Setelah seeding:
- **1** Super Admin
- **4** Admin RW
- **12** Ketua RT
- **12** Sekretaris RT
- **15** Pengurus
- **96** Warga
- **Total: 140 user**

## 🎯 Contoh Penggunaan

### Test Hierarchical User Creation:
1. Login sebagai Admin RW005
2. Buka halaman "Kelola Pengguna"
3. Buat Ketua RT baru untuk RT004/RW005
4. Buat Pengurus baru untuk RT004/RW005
5. Buat Warga baru untuk RT004/RW005

### Test Pengurus Assignment:
1. Login sebagai Pengurus RW009 RT002
2. Hanya bisa lihat dan manage laporan di RW009 RT002
3. Tidak bisa akses laporan dari RT/RW lain

### Test Verifikasi Warga:
1. Login sebagai Admin RW005 atau Ketua RT001/RW005
2. Buka Dashboard → Panel "Verifikasi Warga"
3. Verifikasi warga yang belum diverifikasi

## 📝 Catatan

- **Lokasi**: Data lokasi disimpan sebagai referensi. Untuk implementasi penuh, perlu tambahkan field ke schema.
- **Pengurus**: Setiap pengurus di-assign ke RT/RW tertentu dan hanya bisa manage RT/RW tersebut.
- **Warga**: Sebagian warga sudah diverifikasi sebagai contoh, sebagian belum (untuk testing verifikasi).

