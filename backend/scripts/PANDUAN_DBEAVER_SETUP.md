# 🚀 Panduan Setup DBeaver untuk PostgreSQL LaporIn

## ✅ DBeaver Sudah Terinstall!

DBeaver Community Edition versi 25.2.5 sudah berhasil diinstall di Mac Anda.

---

## 📝 Langkah-Langkah Setup Connection

### 1. Buka DBeaver

- Buka **Applications** folder
- Double-click **DBeaver.app**
- Atau ketik di terminal: `open -a DBeaver`

### 2. Buat Connection Baru

1. Klik ikon **"New Database Connection"** (kabel database dengan tanda +)
   - Atau: **File** → **New** → **Database Connection**
   - Atau tekan: `Cmd + Shift + N`

2. Pilih **PostgreSQL** dari list database
   - Ketik "postgresql" di search box untuk mencari lebih cepat
   - Klik **Next**

### 3. Isi Connection Settings

Di tab **Main**, isi:

```
Host:     127.0.0.1
Port:     5432
Database: wargalapor
Username: postgres
Password: postgres
```

**Detail:**
- ✅ **Save password** - centang kotak ini agar password tersimpan
- **Show all databases** - biarkan tidak dicentang (optional)

### 4. Test Connection

1. Klik tombol **"Test Connection"** di bagian bawah
2. Jika driver belum ada, DBeaver akan **otomatis download PostgreSQL driver**
   - Klik **Download** jika muncul popup
   - Tunggu sampai download selesai
3. Jika berhasil, akan muncul: **"Connected"** ✅
4. Klik **OK** untuk menyimpan connection

### 5. Connect ke Database

1. Connection baru akan muncul di sidebar kiri dengan nama **"PostgreSQL - wargalapor"**
2. **Double-click** connection tersebut untuk connect
3. Atau **right-click** → **Connect**

---

## 📊 Explore Database

Setelah connect, di sidebar kiri:

1. **Expand** connection `PostgreSQL - wargalapor`
2. **Expand** `Databases` → `wargalapor`
3. **Expand** `Schemas` → `public`
4. **Expand** `Tables`

Anda akan lihat tabel-tabel:
- ✅ `User` - Data user/warga
- ✅ `Report` - Data laporan
- ✅ `ReportStatusHistory` - History status laporan
- ✅ `Bantuan` - Data bantuan
- ✅ Dan tabel lainnya

---

## 🔍 View Data di Tabel

Untuk melihat data di tabel:

1. **Right-click** pada tabel (contoh: `User`)
2. Pilih **"View Data"** → **"View All Rows"**
3. Data akan muncul di panel kanan

---

## 📝 Jalankan Query SQL

1. Klik ikon **"SQL Editor"** (ikon kertas dengan pensil)
   - Atau: **SQL Editor** → **New SQL Script**
   - Atau tekan: `Cmd + Shift + Enter`

2. Copy query dari file `backend/scripts/view-users.sql`

3. Paste ke SQL Editor

4. Klik **Execute SQL Script** (ikon play) atau tekan `Cmd + Enter`

5. Hasil query akan muncul di tab **Data** di bawah

---

## 🎯 Quick Query untuk Test

Coba query ini untuk test:

```sql
-- Lihat semua user
SELECT id, name, email, role, "rtRw", "isVerified"
FROM "User"
ORDER BY role, name
LIMIT 10;
```

**Tips:** 
- Di PostgreSQL, nama tabel dan kolom **case-sensitive**
- Gunakan quote untuk camelCase: `"User"`, `"rtRw"`
- Tanpa quote akan dianggap lowercase

---

## 🔧 Troubleshooting

### Error: "Connection refused"

PostgreSQL belum berjalan. Start PostgreSQL:

```bash
# Cek status
pg_isready -h 127.0.0.1 -p 5432

# Start PostgreSQL
brew services start postgresql@16
```

### Error: "Database does not exist"

Buat database:

```bash
createdb wargalapor
```

### Error: "Password authentication failed"

- Password default: `postgres`
- Atau cek di file `.env`: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wargalapor?schema=public"`

### Driver belum terdownload

DBeaver akan otomatis download driver saat pertama kali test connection. Pastikan koneksi internet aktif.

---

## 📄 File Query yang Tersedia

Setelah connect, Anda bisa jalankan query dari file:

- **`backend/scripts/view-users.sql`** - Query untuk melihat data user dengan berbagai filter

---

## ✨ Tips & Tricks

1. **Rename Connection:**
   - Right-click connection → **Edit Connection**
   - Tab **General** → ubah **Connection name**

2. **Export Data:**
   - Right-click tabel → **Export Data**
   - Pilih format: Excel, CSV, JSON, dll

3. **View Table Structure:**
   - Right-click tabel → **View Table** → **Properties**

4. **SQL History:**
   - **Window** → **Show View** → **SQL History**
   - Lihat semua query yang pernah dijalankan

---

## ✅ Checklist Setup

- [ ] DBeaver terinstall ✅
- [ ] PostgreSQL berjalan (`pg_isready`)
- [ ] Connection dibuat di DBeaver
- [ ] Test connection berhasil
- [ ] Berhasil connect ke database
- [ ] Bisa lihat tabel di sidebar
- [ ] Bisa jalankan query SQL

---

## 🎉 Selamat!

DBeaver sudah siap digunakan untuk explore database PostgreSQL LaporIn!

**Next Steps:**
1. Connect ke database
2. Explore tabel-tabel yang ada
3. Jalankan query dari `view-users.sql`
4. Mulai explore data user dan laporan!

---

**File terkait:**
- `backend/scripts/view-users.sql` - Query SQL untuk melihat data user
- `backend/scripts/PANDUAN_DBEAVER_SETUP.md` - File ini

