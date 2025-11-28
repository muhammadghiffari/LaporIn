# 🔧 Instalasi DBeaver untuk PostgreSQL (Solusi Terbaik)

## ❌ Masalah
MySQL Workbench **TIDAK BISA** connect ke PostgreSQL karena protokol berbeda!

## ✅ Solusi: Install DBeaver

DBeaver adalah **universal database tool** yang support PostgreSQL, MySQL, dan banyak database lainnya.

---

## 📥 Cara Install DBeaver

### Opsi 1: Install via Homebrew (macOS - Recommended)

```bash
# Install DBeaver Community Edition (gratis)
brew install --cask dbeaver-community
```

### Opsi 2: Download Manual

1. Buka website: https://dbeaver.io/download/
2. Download **DBeaver Community Edition** untuk macOS
3. Install dengan drag & drop ke Applications folder

---

## 🔌 Setup Connection di DBeaver

Setelah DBeaver terinstall:

### 1. Buat Connection Baru

1. Buka DBeaver
2. Klik ikon **"New Database Connection"** (kabel database dengan tanda +)
3. Pilih **PostgreSQL** dari list
4. Klik **Next**

### 2. Isi Connection Settings

```
Connection Name: laporin
Host: 127.0.0.1
Port: 5432
Database: wargalapor
Username: postgres
Password: postgres
```

**Langkah detail:**
- **Main Tab:**
  - Host: `127.0.0.1`
  - Port: `5432`
  - Database: `wargalapor`
  - Username: `postgres`
  - Password: `postgres` ✅ (centang "Save password")

### 3. Test Connection

1. Klik **"Test Connection"**
2. Jika driver belum ada, DBeaver akan download PostgreSQL driver otomatis
3. Klik **"OK"** untuk menyimpan connection

### 4. Connect ke Database

1. Double-click connection `laporin` di sidebar
2. Database akan terbuka dan Anda bisa lihat semua tabel!

---

## 🎯 Keuntungan DBeaver

- ✅ **Gratis** (Community Edition)
- ✅ **Universal** - support PostgreSQL, MySQL, MongoDB, dll
- ✅ **Auto-download drivers** - tidak perlu setup manual
- ✅ **User-friendly** interface
- ✅ **Syntax highlighting** untuk SQL
- ✅ **Export data** ke Excel, CSV, JSON, dll

---

## 📊 Setelah Connect

Setelah berhasil connect:

1. **Expand database `wargalapor`** di sidebar kiri
2. **Expand "Schemas" > "public" > "Tables"**
3. Anda akan lihat tabel: `User`, `Report`, `ReportStatusHistory`, dll
4. **Right-click tabel** untuk melihat data atau structure

---

## 🔍 Jalankan Query

1. Klik **"SQL Editor"** (ikon kertas dengan pensil) atau tekan `Ctrl+Shift+Enter`
2. Copy query dari file `backend/scripts/view-users.sql`
3. Paste dan jalankan query
4. Hasil akan muncul di bawah!

---

## 🆘 Troubleshooting

### Error: "Connection refused"
```bash
# Cek PostgreSQL berjalan
pg_isready -h 127.0.0.1 -p 5432

# Jika tidak, start PostgreSQL
brew services start postgresql@16
```

### Error: "Database does not exist"
```bash
createdb wargalapor
```

### Error: "Password authentication failed"
- Password default: `postgres`
- Cek di `.env`: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wargalapor?schema=public"`

---

## 📝 Quick Start Commands

```bash
# 1. Install DBeaver
brew install --cask dbeaver-community

# 2. Cek PostgreSQL berjalan
pg_isready -h 127.0.0.1 -p 5432

# 3. Jika tidak berjalan, start PostgreSQL
brew services start postgresql@16

# 4. Buka DBeaver dan buat connection seperti di atas!
```

---

**Setelah install DBeaver, setup connection akan jauh lebih mudah dan Anda bisa langsung explore database PostgreSQL!** 🎉

