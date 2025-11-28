# 📊 Panduan Melihat Data User di PostgreSQL Workbench

## 🔧 Info Koneksi Database

Untuk connect ke database menggunakan Workbench (pgAdmin, DBeaver, DataGrip, dll):

```
Host: 127.0.0.1 (atau localhost)
Port: 5432
Database: wargalapor
Username: postgres
Password: postgres
```

**Connection String:**
```
postgresql://postgres:postgres@localhost:5432/wargalapor?schema=public
```

---

## 📋 Cara Menggunakan

### Opsi 1: Menggunakan File SQL (Recommended)

1. **Buka file SQL di Workbench:**
   - File: `backend/scripts/view-users.sql`
   - Copy-paste query yang diinginkan ke Workbench
   - Execute query

2. **Query yang tersedia:**
   - **Query 1:** Lihat semua user dengan detail lengkap
   - **Query 2:** Breakdown user per role
   - **Query 3:** User per RT/RW
   - **Query 4:** User dengan email real (bukan @example)
   - **Query 5:** User dengan detail RT/RW dan jumlah laporan
   - **Query 6:** User untuk RT001/RW001 khusus

### Opsi 2: Menggunakan Script Node.js

```bash
cd backend
node scripts/view-users.js
```

Script ini akan menampilkan:
- Total user
- Breakdown per role
- Breakdown per RT/RW
- User dengan email real
- Detail semua user
- User untuk RT001/RW001

---

## 📊 Data User Saat Ini

Berdasarkan hasil script terakhir:

- **Total User:** 147 user
- **Breakdown per Role:**
  - Warga: 116 user
  - Ketua RT: 9 user
  - Pengurus: 9 user
  - Sekretaris RT: 9 user
  - Admin RW: 3 user
  - Admin: 1 user

- **Breakdown per RT/RW:**
  - RT001/RW001: 16 user
  - RT001/RW002: 16 user
  - RT001/RW003: 14 user
  - RT002/RW001: 13 user
  - RT002/RW002: 18 user
  - RT002/RW003: 18 user
  - RT003/RW001: 14 user
  - RT003/RW002: 16 user
  - RT003/RW003: 18 user

- **Email Real (untuk notifikasi):**
  1. Admin Sistem: `kepodehlol54@gmail.com`
  2. Admin RW001: `wadidawcihuy@gmail.com`
  3. Ketua RT001/RW001: `arythegodhand@gmail.com`
  4. Sekretaris RT001/RW001: `syncrazelled@gmail.com`
  5. Pengurus RT001/RW001: `gampanggaming20@gmail.com`
  6. Warga RT001/RW001: `suroprikitiw@gmail.com`

---

## 🔍 Query Tambahan (Bisa ditambahkan ke Workbench)

### Lihat User dengan Laporan Paling Banyak

```sql
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u."rtRw" as rt_rw,
    COUNT(r.id) as jumlah_laporan
FROM 
    "User" u
LEFT JOIN 
    "Report" r ON r."userId" = u.id
GROUP BY 
    u.id, u.name, u.email, u.role, u."rtRw"
HAVING 
    COUNT(r.id) > 0
ORDER BY 
    jumlah_laporan DESC
LIMIT 10;
```

### Lihat User yang Belum Verified

```sql
SELECT 
    id,
    name,
    email,
    role,
    "rtRw" as rt_rw,
    "createdAt"
FROM 
    "User"
WHERE 
    "isVerified" = false
ORDER BY 
    "createdAt" DESC;
```

### Lihat User dengan Detail Lengkap + Jumlah Laporan per Status

```sql
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u."rtRw" as rt_rw,
    COUNT(r.id) as total_laporan,
    COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN r.status = 'in_progress' THEN 1 END) as in_progress,
    COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved
FROM 
    "User" u
LEFT JOIN 
    "Report" r ON r."userId" = u.id
GROUP BY 
    u.id, u.name, u.email, u.role, u."rtRw"
ORDER BY 
    total_laporan DESC;
```

---

## 🛠️ Troubleshooting

### Error: "Connection refused"
- Pastikan PostgreSQL berjalan: `pg_isready -h 127.0.0.1 -p 5432`
- Start PostgreSQL: `brew services start postgresql@16`

### Error: "Database does not exist"
- Buat database: `createdb wargalapor`
- Atau menggunakan psql:
  ```sql
  CREATE DATABASE wargalapor;
  ```

### Error: "Password authentication failed"
- Cek password di `.env` file: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wargalapor"`
- Atau reset password PostgreSQL user

---

## 📝 Catatan

- Semua query menggunakan schema `public` (default)
- Nama tabel menggunakan camelCase dengan quote, contoh: `"User"`, `"Report"`
- Field menggunakan camelCase dengan quote, contoh: `"rtRw"`, `"isVerified"`
- Untuk query tanpa quote, gunakan snake_case dari database: `rt_rw`, `is_verified`

---

**File terkait:**
- `backend/scripts/view-users.sql` - File SQL dengan semua query
- `backend/scripts/view-users.js` - Script Node.js untuk melihat data
- `backend/.env` - File konfigurasi database connection

