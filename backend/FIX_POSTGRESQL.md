# 🔧 Fix PostgreSQL Connection Error

## ❌ Error yang Terjadi
```
Can't reach database server at `127.0.0.1:5432`
Please make sure your database server is running at `127.0.0.1:5432`.
```

## 🔍 Diagnosa

PostgreSQL service terdeteksi tapi tidak bisa di-start. Mari kita fix step by step.

## ✅ Solusi

### Opsi 1: Start PostgreSQL Manual (Coba ini dulu!)

```bash
# Cek lokasi PostgreSQL
which postgres

# Start PostgreSQL secara manual
postgres -D /opt/homebrew/var/postgresql@16 &

# Atau jika lokasi berbeda:
postgres -D /usr/local/var/postgresql@16 &
```

### Opsi 2: Reinstall PostgreSQL Service

```bash
# Stop service yang error
brew services stop postgresql@16

# Unload launch agent
launchctl unload ~/Library/LaunchAgents/homebrew.mxcl.postgresql@16.plist 2>/dev/null

# Hapus file plist yang corrupt
rm -f ~/Library/LaunchAgents/homebrew.mxcl.postgresql@16.plist

# Restart service
brew services start postgresql@16
```

### Opsi 3: Fix Launch Agent

```bash
# Hapus file plist yang corrupt
rm -f ~/Library/LaunchAgents/homebrew.mxcl.postgresql@16.plist

# Reinstall service
brew services restart postgresql@16
```

### Opsi 4: Start dengan pg_ctl (Jika Opsi 1-3 Gagal)

```bash
# Cari lokasi data directory
ls -la /opt/homebrew/var/postgresql@16
ls -la /usr/local/var/postgresql@16

# Start dengan pg_ctl (ganti path sesuai yang ada)
/opt/homebrew/opt/postgresql@16/bin/pg_ctl -D /opt/homebrew/var/postgresql@16 -l /opt/homebrew/var/postgresql@16/server.log start
```

### Opsi 5: Reinstall PostgreSQL (Last Resort)

```bash
# Uninstall
brew services stop postgresql@16
brew uninstall postgresql@16

# Install ulang
brew install postgresql@16

# Start service
brew services start postgresql@16

# Init database (jika perlu)
initdb /opt/homebrew/var/postgresql@16
```

## 🧪 Test Koneksi

Setelah PostgreSQL berjalan, test koneksi:

```bash
# Test koneksi
psql -h 127.0.0.1 -p 5432 -U postgres -d postgres

# Atau test dengan pg_isready
pg_isready -h 127.0.0.1 -p 5432
```

## 📝 Setup Database (Jika Belum Ada)

Setelah PostgreSQL berjalan:

```bash
# Masuk ke PostgreSQL
psql postgres

# Buat database
CREATE DATABASE wargalapor;

# Buat user (jika perlu)
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE wargalapor TO postgres;

# Keluar
\q
```

## 🔄 Setup Prisma (Setelah Database Ready)

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Push schema ke database
npx prisma db push

# Atau migrate (jika sudah ada migration)
npx prisma migrate dev
```

## ✅ Verifikasi

1. **Cek PostgreSQL berjalan:**
   ```bash
   pg_isready -h 127.0.0.1 -p 5432
   ```
   Harus return: `127.0.0.1:5432 - accepting connections`

2. **Cek DATABASE_URL di `.env`:**
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wargalapor?schema=public"
   ```

3. **Restart backend:**
   ```bash
   cd backend
   npm run dev
   ```

## 🆘 Jika Masih Error

### Error: "database does not exist"
```bash
createdb wargalapor
```

### Error: "password authentication failed"
Cek password di `.env` sesuai dengan user PostgreSQL.

### Error: "connection refused"
- Pastikan PostgreSQL berjalan: `pg_isready`
- Cek port 5432 tidak digunakan aplikasi lain
- Cek firewall settings

### Error: "permission denied"
```bash
# Fix permission
sudo chown -R $(whoami) /opt/homebrew/var/postgresql@16
```

## 💡 Tips

1. **Gunakan `brew services list`** untuk cek status semua services
2. **Cek logs** jika ada error: `/opt/homebrew/var/postgresql@16/server.log`
3. **Restart Mac** kadang bisa fix launch agent issues

---

**TL;DR:**
1. Coba: `brew services restart postgresql@16`
2. Jika gagal: Hapus plist, restart service
3. Test: `pg_isready -h 127.0.0.1 -p 5432`
4. Setup database: `createdb wargalapor`
5. Restart backend: `npm run dev`

