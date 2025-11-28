# ⚠️ Masalah: MySQL Workbench Tidak Bisa Connect ke PostgreSQL

## 🔴 Error yang Terjadi

```
Failed to Connect to MySQL at 127.0.0.1:5432 with user postgres
Lost connection to MySQL server at 'waiting for initial communication packet'
```

## 🔍 Root Cause

**MySQL Workbench TIDAK BISA connect ke PostgreSQL!**

Kenapa?
- MySQL dan PostgreSQL menggunakan **protokol komunikasi yang berbeda**
- MySQL Workbench hanya support MySQL/MariaDB
- Port 5432 adalah port PostgreSQL, bukan MySQL (MySQL pakai port 3306)

---

## ✅ Solusi (2 Opsi)

### Opsi 1: Install DBeaver (⭐ Recommended - Gratis & Universal)

DBeaver support PostgreSQL, MySQL, dan banyak database lainnya.

#### Install via Homebrew:
```bash
brew install --cask dbeaver-community
```

#### Setup Connection di DBeaver:
1. Buka DBeaver
2. Klik ikon **"New Database Connection"**
3. Pilih **PostgreSQL**
4. Isi:
   ```
   Host: 127.0.0.1
   Port: 5432
   Database: wargalapor
   Username: postgres
   Password: postgres
   ```
5. Klik **Test Connection** → **OK**

**Keuntungan:**
- ✅ Gratis
- ✅ Auto-download drivers
- ✅ Support banyak database
- ✅ User-friendly

📄 **Panduan lengkap:** `INSTALASI_DBEAVER.md`

---

### Opsi 2: Install pgAdmin (Official PostgreSQL Tool)

pgAdmin adalah official PostgreSQL administration tool.

#### Install via Homebrew:
```bash
brew install --cask pgadmin4
```

#### Setup Connection:
1. Buka pgAdmin 4
2. Klik **Add New Server**
3. Tab **General:**
   - Name: `laporin`
4. Tab **Connection:**
   - Host: `127.0.0.1`
   - Port: `5432`
   - Database: `wargalapor`
   - Username: `postgres`
   - Password: `postgres`
5. Klik **Save**

---

## 📊 Quick Comparison

| Tool | Type | PostgreSQL Support | MySQL Support | Gratis |
|------|------|-------------------|---------------|--------|
| **DBeaver** | Universal | ✅ | ✅ | ✅ |
| **pgAdmin** | PostgreSQL Only | ✅ | ❌ | ✅ |
| **MySQL Workbench** | MySQL Only | ❌ | ✅ | ✅ |

**Rekomendasi:** Install **DBeaver** karena bisa handle PostgreSQL dan MySQL di satu tool!

---

## 🚀 Quick Start (DBeaver)

```bash
# 1. Install DBeaver
brew install --cask dbeaver-community

# 2. Pastikan PostgreSQL berjalan
pg_isready -h 127.0.0.1 -p 5432

# 3. Jika tidak, start PostgreSQL
brew services start postgresql@16

# 4. Buka DBeaver dan setup connection
```

---

## ❌ Tidak Bisa Pakai MySQL Workbench untuk PostgreSQL

**JANGAN** mencoba memaksa MySQL Workbench untuk connect ke PostgreSQL karena:
- ❌ Protokol berbeda (MySQL vs PostgreSQL)
- ❌ Driver tidak compatible
- ❌ Akan selalu error

**Solusi:** Install tool yang support PostgreSQL (DBeaver atau pgAdmin)

---

## 🎯 Setelah Install Tool Baru

1. **Connect ke database** dengan tool baru
2. **Buka file SQL:** `backend/scripts/view-users.sql`
3. **Copy-paste query** ke SQL editor
4. **Jalankan query** untuk melihat data user!

---

**TL;DR:**
1. ❌ MySQL Workbench tidak bisa connect ke PostgreSQL
2. ✅ Install DBeaver: `brew install --cask dbeaver-community`
3. ✅ Setup connection PostgreSQL di DBeaver
4. ✅ Connect dan explore database!

