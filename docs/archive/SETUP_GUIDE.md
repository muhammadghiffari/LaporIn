# 🚀 Setup Guide Lengkap - LaporIn

Panduan step-by-step untuk setup project LaporIn dari awal hingga siap digunakan.

## 📋 Prerequisites

Sebelum memulai, pastikan Anda memiliki:

- ✅ **Node.js** 18+ ([Download](https://nodejs.org/))
- ✅ **PostgreSQL** 12+ ([Download](https://www.postgresql.org/download/))
- ✅ **npm** atau **yarn**
- ✅ **Git** (untuk clone repository)
- ✅ **Groq API Key** (FREE: [Dapatkan di sini](https://console.groq.com/))
- ✅ **Polygon Mumbai RPC** (FREE: [Dapatkan di sini](https://alchemy.com/) atau [Infura](https://infura.io/))

---

## 📦 Step 1: Clone & Install Dependencies

### 1.1 Clone Repository

```bash
git clone <repository-url>
cd LaporIn
```

### 1.2 Install Frontend Dependencies

```bash
# Dari root directory
npm install
```

### 1.3 Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 1.4 Install Blockchain Dependencies

```bash
cd blockchain
npm install
cd ..
```

---

## 🗄️ Step 2: Setup PostgreSQL Database

### 2.1 Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
- Download installer dari https://www.postgresql.org/download/windows/
- Install dan setup password untuk user `postgres`

**Docker:**
```bash
docker run --name laporin-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=wargalapor \
  -p 5432:5432 \
  -d postgres:16
```

### 2.2 Buat Database

```bash
# Metode 1: Menggunakan createdb
createdb wargalapor

# Metode 2: Menggunakan psql
psql -U postgres
CREATE DATABASE wargalapor;
\q
```

### 2.3 Apply Database Schema

```bash
# Dari root directory
psql -U postgres -d wargalapor < backend/database/schema.sql

# Atau jika menggunakan user lain
psql -U your_user -d wargalapor < backend/database/schema.sql
```

### 2.4 Verifikasi Schema

```bash
psql -U postgres -d wargalapor

# List tables
\dt

# Cek struktur table
\d users
\d reports

\q
```

**Lihat dokumentasi lengkap**: [SETUP_POSTGRESQL.md](./SETUP_POSTGRESQL.md)

---

## 🔐 Step 3: Setup Environment Variables

### 3.1 Backend Environment (`backend/.env`)

Buat file `backend/.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wargalapor
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Secret (minimal 32 karakter)
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long_change_this_in_production

# AI Services
# Groq API (FREE & RECOMMENDED)
GROQ_API_KEY=gsk_your_groq_api_key_here

# OpenAI API (Optional, untuk report processing)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Blockchain Configuration (Optional)
BLOCKCHAIN_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/your_alchemy_key
PRIVATE_KEY=your_wallet_private_key_without_0x_prefix
CONTRACT_ADDRESS=0x_your_deployed_contract_address
BLOCKCHAIN_ENCRYPTION_KEY=your_encryption_key_for_sensitive_data_min_32_chars
```

### 3.2 Frontend Environment (`.env.local`)

Buat file `.env.local` di root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3.3 Blockchain Environment (`blockchain/.env`)

Buat file `blockchain/.env`:

```env
BLOCKCHAIN_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/your_alchemy_key
PRIVATE_KEY=your_wallet_private_key_without_0x_prefix
```

---

## ⛓️ Step 4: Deploy Smart Contract (Optional)

### 4.1 Compile Smart Contract

```bash
cd blockchain
npm run compile
```

### 4.2 Deploy ke Polygon Mumbai

```bash
npm run deploy
```

**Output akan menampilkan contract address**, contoh:
```
Contract deployed to: 0x1234567890abcdef1234567890abcdef12345678
```

### 4.3 Update Backend Environment

Copy contract address ke `backend/.env`:
```env
CONTRACT_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
```

**Catatan**: Jika tidak ingin menggunakan blockchain, biarkan `CONTRACT_ADDRESS` kosong. Sistem akan tetap berjalan dengan graceful fallback.

---

## 🌱 Step 5: Seed Initial Data

### 5.1 Run Seed Script

```bash
# Dari root directory
npm run seed

# Atau dari backend directory
cd backend
npm run seed
cd ..
```

### 5.2 Verifikasi Seed Data

```bash
psql -U postgres -d wargalapor

# Cek jumlah users
SELECT COUNT(*) FROM users;

# Cek users by role
SELECT role, COUNT(*) FROM users GROUP BY role;

# Cek jumlah reports
SELECT COUNT(*) FROM reports;

\q
```

**Seed akan membuat:**
- ✅ 1 Admin Sistem
- ✅ 1 Admin RW
- ✅ 1 Ketua RT
- ✅ 1 Sekretaris RT
- ✅ 1 Pengurus
- ✅ 100 Warga (dengan variasi RT/RW dan gender)
- ✅ ~60 Laporan (dengan berbagai status, kategori, dan urgensi)

---

## 🚀 Step 6: Run Development Servers

### 6.1 Terminal 1: Backend Server

```bash
cd backend
npm run dev
```

Backend akan berjalan di `http://localhost:3001`

**Verifikasi backend running:**
```bash
curl http://localhost:3001/api/health
```

### 6.2 Terminal 2: Frontend Server

```bash
# Dari root directory
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`

---

## ✅ Step 7: Verifikasi Setup

### 7.1 Test Backend API

```bash
# Health check
curl http://localhost:3001/api/health

# Test login (gunakan credential dari seed)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"warga1@example.com","password":"Warga123!"}'
```

### 7.2 Test Frontend

1. Buka browser: http://localhost:3000
2. Login dengan salah satu akun seed:
   - **Warga**: `warga1@example.com` / `Warga123!`
   - **Admin Sistem**: `adminsistem@example.com` / `AdminSistem123!`
   - **Pengurus**: `pengurus@example.com` / `Pengurus123!`

### 7.3 Test Features

- [ ] Login berhasil
- [ ] Dashboard menampilkan data
- [ ] Bisa membuat laporan baru
- [ ] Chatbot berfungsi
- [ ] Analytics menampilkan chart
- [ ] Blockchain link muncul (jika blockchain dikonfigurasi)

---

## 🔧 Troubleshooting

### Backend tidak bisa connect ke database

```bash
# Cek PostgreSQL running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql     # Linux

# Cek credentials di backend/.env
# Test connection manual
psql -U postgres -d wargalapor
```

### Frontend tidak bisa connect ke backend

```bash
# Cek backend running
curl http://localhost:3001/api/health

# Cek NEXT_PUBLIC_API_URL di .env.local
# Pastikan URL benar: http://localhost:3001
```

### Port sudah digunakan

```bash
# Kill process di port 3001 (backend)
lsof -ti:3001 | xargs kill -9

# Kill process di port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

### Blockchain error

- Pastikan `BLOCKCHAIN_RPC_URL` valid
- Pastikan `PRIVATE_KEY` benar (tanpa 0x prefix)
- Pastikan wallet memiliki MATIC untuk gas fee
- Jika error, sistem akan tetap berjalan tanpa blockchain (graceful fallback)

---

## 📚 Next Steps

Setelah setup berhasil:

1. ✅ Baca [FEATURES.md](./FEATURES.md) untuk memahami fitur lengkap
2. ✅ Baca [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) untuk API reference
3. ✅ Baca [TECH_STACK.md](./TECH_STACK.md) untuk detail teknologi
4. ✅ Explore dashboard dan fitur-fitur aplikasi

---

## 🆘 Butuh Bantuan?

- 📖 Lihat [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- 📧 Hubungi tim development
- 🐛 Report issue di repository

---

**Selamat! 🎉 LaporIn sudah siap digunakan!**

