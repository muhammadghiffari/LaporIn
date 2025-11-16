# 🗄️ Setup PostgreSQL untuk LaporIn

Panduan lengkap untuk setup dan konfigurasi PostgreSQL database untuk project LaporIn.

## 📋 Prerequisites

- **PostgreSQL** 12+ terinstall di sistem Anda
- Akses sebagai superuser (postgres) atau user dengan privilege CREATE DATABASE

---

## 🚀 Metode 1: Setup dengan Homebrew (macOS)

### 1. Install PostgreSQL

```bash
# Install PostgreSQL via Homebrew
brew install postgresql@16

# Atau jika sudah terinstall, start service
brew services start postgresql@16
```

### 2. Verifikasi Installation

```bash
# Cek versi PostgreSQL
psql --version

# Cek status service
brew services list | grep postgresql
```

### 3. Buat Database

```bash
# Login sebagai user postgres
psql postgres

# Atau langsung create database
createdb wargalapor

# Verifikasi database dibuat
psql -l | grep wargalapor
```

### 4. Setup User & Password (Opsional)

```bash
# Login ke PostgreSQL
psql postgres

# Buat user baru (opsional, bisa pakai postgres default)
CREATE USER laporin_user WITH PASSWORD 'your_secure_password';

# Berikan privilege
GRANT ALL PRIVILEGES ON DATABASE wargalapor TO laporin_user;

# Exit
\q
```

---

## 🐳 Metode 2: Setup dengan Docker (Cross-platform)

### 1. Pull PostgreSQL Image

```bash
docker pull postgres:16
```

### 2. Run PostgreSQL Container

```bash
docker run --name laporin-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=wargalapor \
  -p 5432:5432 \
  -d postgres:16
```

### 3. Verifikasi Container Running

```bash
docker ps | grep laporin-postgres
```

### 4. Connect ke Database

```bash
# Via docker exec
docker exec -it laporin-postgres psql -U postgres -d wargalapor

# Atau via psql lokal (jika port 5432 exposed)
psql -h localhost -U postgres -d wargalapor
```

---

## 📝 Setup Database Schema

### 1. Apply Schema

```bash
# Dari root project directory
psql -U postgres -d wargalapor < backend/database/schema.sql

# Atau jika menggunakan user lain
psql -U laporin_user -d wargalapor < backend/database/schema.sql
```

### 2. Verifikasi Tables

```bash
# Login ke database
psql -U postgres -d wargalapor

# List semua tables
\dt

# Cek struktur table users
\d users

# Cek struktur table reports
\d reports

# Exit
\q
```

---

## 🔧 Konfigurasi Backend

### 1. Update `backend/.env`

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wargalapor
DB_USER=postgres
DB_PASSWORD=postgres

# Atau jika menggunakan user custom
# DB_USER=laporin_user
# DB_PASSWORD=your_secure_password
```

### 2. Test Connection

```bash
cd backend
node -e "const pool = require('./database/db'); pool.query('SELECT NOW()', (err, res) => { if(err) console.error(err); else console.log('✅ Database connected:', res.rows[0]); process.exit(); });"
```

---

## 🌱 Seed Database (Initial Data)

### 1. Run Seed Script

```bash
# Dari root project
npm run seed

# Atau dari backend directory
cd backend
npm run seed
```

### 2. Verifikasi Data

```bash
# Login ke database
psql -U postgres -d wargalapor

# Cek jumlah users
SELECT COUNT(*) FROM users;

# Cek jumlah reports
SELECT COUNT(*) FROM reports;

# Cek users by role
SELECT role, COUNT(*) FROM users GROUP BY role;

# Exit
\q
```

---

## 🗑️ Reset Database (Hapus Semua Data)

### Opsi 1: Drop & Recreate Database

```bash
# Hapus database
dropdb wargalapor

# Buat ulang
createdb wargalapor

# Apply schema
psql wargalapor < backend/database/schema.sql

# Seed data
npm run seed
```

### Opsi 2: Truncate Tables (Keep Structure)

```bash
psql -U postgres -d wargalapor << EOF
TRUNCATE TABLE reports CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE ai_processing_log CASCADE;
TRUNCATE TABLE report_status_history CASCADE;
TRUNCATE TABLE chatbot_conversations CASCADE;
TRUNCATE TABLE chatbot_training_data CASCADE;
EOF

# Seed ulang
npm run seed
```

---

## 🔍 Troubleshooting

### Error: "database does not exist"

```bash
# Buat database
createdb wargalapor
```

### Error: "connection refused"

```bash
# Cek apakah PostgreSQL service running
brew services list | grep postgresql

# Start service jika belum running
brew services start postgresql@16

# Atau untuk Docker
docker start laporin-postgres
```

### Error: "password authentication failed"

```bash
# Cek password di backend/.env sesuai dengan PostgreSQL user
# Atau reset password PostgreSQL user
psql postgres
ALTER USER postgres WITH PASSWORD 'new_password';
```

### Error: "permission denied"

```bash
# Pastikan user memiliki privilege
psql postgres
GRANT ALL PRIVILEGES ON DATABASE wargalapor TO postgres;
```

### Error: "port 5432 already in use"

```bash
# Cek process yang menggunakan port 5432
lsof -i :5432

# Kill process atau gunakan port lain
# Update DB_PORT di backend/.env
```

---

## 📊 Database Management Tools

### 1. pgAdmin 4 (GUI)

- Download: https://www.pgadmin.org/download/
- Setup connection:
  - Host: localhost
  - Port: 5432
  - Database: wargalapor
  - Username: postgres
  - Password: (sesuai konfigurasi)

### 2. DBeaver (Cross-platform GUI)

- Download: https://dbeaver.io/download/
- Setup connection dengan PostgreSQL driver

### 3. psql (Command Line)

```bash
# Connect
psql -U postgres -d wargalapor

# Useful commands:
\dt          # List tables
\d table_name  # Describe table
\q          # Quit
\l          # List databases
\du         # List users
```

---

## ✅ Checklist Setup

- [ ] PostgreSQL terinstall dan running
- [ ] Database `wargalapor` dibuat
- [ ] Schema applied (`backend/database/schema.sql`)
- [ ] `backend/.env` dikonfigurasi dengan benar
- [ ] Test connection berhasil
- [ ] Seed data berhasil dijalankan
- [ ] Data terverifikasi di database

---

## 📚 Referensi

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Homebrew PostgreSQL](https://formulae.brew.sh/formula/postgresql@16)
- [Docker PostgreSQL](https://hub.docker.com/_/postgres)

---

**Selanjutnya**: Lihat [SETUP_GUIDE.md](./SETUP_GUIDE.md) untuk setup lengkap project.

