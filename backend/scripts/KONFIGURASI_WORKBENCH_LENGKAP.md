# ✅ Konfigurasi Workbench untuk PostgreSQL LaporIn

## 🔧 Settings yang Perlu Diisi

Berdasarkan screenshot Anda, konfigurasi sudah **95% benar**! Berikut yang perlu dilengkapi:

### ✅ Sudah Benar:
- **Connection Name:** `laporin` ✅
- **Connection Method:** Standard (TCP/IP) ✅
- **Hostname:** `127.0.0.1` ✅
- **Port:** `5432` ✅
- **Username:** `postgres` ✅
- **Password:** Sudah disimpan di Keychain ✅

### ⚠️ Perlu Diisi:
- **Default Schema:** Isi dengan `public` atau `wargalapor`

---

## 📝 Langkah-Langkah Lengkap

### 1. Isi Default Schema

Di field **Default Schema**, isi dengan salah satu:
- `public` (recommended - ini default schema PostgreSQL)
- `wargalapor` (nama database)

**Rekomendasi:** Gunakan `public` karena semua tabel berada di schema `public`.

### 2. Test Connection

Setelah mengisi Default Schema:
1. Klik tombol **"Test Connection"** di bagian bawah
2. Jika berhasil, akan muncul pesan sukses
3. Jika gagal, cek:
   - PostgreSQL sudah berjalan? (`pg_isready -h 127.0.0.1 -p 5432`)
   - Password sudah benar? (cek di `.env` file)
   - Database `wargalapor` sudah ada?

### 3. Simpan & Connect

1. Klik **"Close"** untuk menyimpan konfigurasi
2. Double-click connection `laporin` di sidebar untuk connect
3. Jika diminta password, gunakan: `postgres`

---

## 🧪 Verifikasi Koneksi

Setelah connect, coba jalankan query test:

```sql
-- Test query: Cek database dan schema
SELECT current_database(), current_schema();

-- Test query: Lihat semua tabel
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Hasil yang diharapkan:**
- `current_database()` = `wargalapor`
- `current_schema()` = `public`
- Tabel yang muncul: `User`, `Report`, `ReportStatusHistory`, dll.

---

## 🔍 Jika Menggunakan MySQL Workbench untuk PostgreSQL

**Catatan:** Saya melihat di sidebar ada tulisan "MySQL Connections". Jika Anda menggunakan **MySQL Workbench** untuk PostgreSQL, ada beberapa hal:

### Opsi 1: Gunakan Tool yang Support PostgreSQL (Recommended)
- **pgAdmin** (Official PostgreSQL tool)
- **DBeaver** (Universal database tool - support PostgreSQL)
- **DataGrip** (JetBrains - universal database tool)

### Opsi 2: Tetap Pakai MySQL Workbench
- MySQL Workbench **tidak sepenuhnya support** PostgreSQL
- Beberapa fitur mungkin tidak berfungsi
- Query syntax mungkin berbeda

**Rekomendasi:** Gunakan **DBeaver** atau **pgAdmin** untuk pengalaman terbaik dengan PostgreSQL.

---

## 📊 Setelah Connect, Coba Query Ini

Setelah berhasil connect, buka file `backend/scripts/view-users.sql` dan jalankan query pertama:

```sql
-- Query 1: Lihat semua user dengan detail lengkap
SELECT 
    id,
    name,
    email,
    role,
    "rtRw" as rt_rw,
    "isVerified",
    "phoneNumber",
    "createdAt",
    "updatedAt"
FROM 
    "User"
ORDER BY 
    role, "rtRw", name;
```

**Tips:** 
- Di PostgreSQL, nama tabel dan kolom case-sensitive
- Gunakan quote untuk nama yang menggunakan camelCase: `"User"`, `"rtRw"`
- Tanpa quote akan dianggap lowercase: `user`, `rtrw` (tidak akan match)

---

## 🆘 Troubleshooting

### Error: "Connection refused"
```bash
# Cek PostgreSQL berjalan
pg_isready -h 127.0.0.1 -p 5432

# Jika tidak berjalan, start PostgreSQL
brew services start postgresql@16
```

### Error: "Password authentication failed"
- Password default: `postgres`
- Cek di `.env` file: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wargalapor?schema=public"`

### Error: "Database does not exist"
```bash
# Buat database
createdb wargalapor

# Atau via psql
psql postgres
CREATE DATABASE wargalapor;
\q
```

### Error: "Schema does not exist"
- Default schema PostgreSQL adalah `public`
- Atau biarkan Default Schema kosong, lalu pilih schema setelah connect

---

## ✅ Checklist Konfigurasi

- [ ] Connection Name: `laporin`
- [ ] Hostname: `127.0.0.1`
- [ ] Port: `5432`
- [ ] Username: `postgres`
- [ ] Password: `postgres` (disimpan di Keychain)
- [ ] Default Schema: `public` atau `wargalapor`
- [ ] Test Connection: ✅ Sukses
- [ ] Berhasil connect ke database

---

## 📄 File Query yang Tersedia

Setelah connect, buka file berikut untuk query SQL:
- `backend/scripts/view-users.sql` - Query untuk melihat data user

---

**Setelah semua ini, Anda siap untuk explore data user di Workbench!** 🎉

