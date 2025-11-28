# 🚀 Cara Menjalankan Aplikasi LaporIn

## 📋 Prerequisites

Pastikan sudah terinstall:
- ✅ Node.js 18+ 
- ✅ PostgreSQL 12+
- ✅ npm atau yarn

## 🔧 Langkah-langkah Setup

### 1. Install Dependencies

```bash
# Install dependencies frontend
npm install

# Install dependencies backend
cd backend
npm install
cd ..
```

### 2. Generate Prisma Client

**PENTING:** Setelah setup Prisma ORM, kita perlu generate Prisma Client terlebih dahulu.

```bash
cd backend
npx prisma generate
cd ..
```

Ini akan membuat folder `backend/generated/prisma` yang berisi Prisma Client.

### 3. Setup Database

#### A. Buat Database PostgreSQL

```bash
# Buat database
createdb wargalapor

# Atau jika menggunakan psql
psql -U postgres
CREATE DATABASE wargalapor;
\q
```

#### B. Setup Environment Variables

Buat file `backend/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wargalapor?schema=public"
# Atau format lengkap:
# DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# Server
PORT=3001

# JWT Secret (minimal 32 karakter)
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long_please_change_this

# AI Services
GROQ_API_KEY=your_groq_api_key_here
# Dapatkan gratis di: https://console.groq.com/

# Optional: OpenAI (jika ingin pakai OpenAI juga)
# OPENAI_API_KEY=your_openai_api_key

# Optional: Google Gemini (jika ingin pakai Gemini juga)
# GEMINI_API_KEY=your_gemini_api_key
```

Buat file `.env.local` di root project untuk frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### C. Setup Database Schema

**Opsi 1: Menggunakan Prisma Migrate (Recommended)**

```bash
cd backend
npx prisma migrate dev --name init
cd ..
```

**Opsi 2: Menggunakan Prisma DB Push (jika database sudah ada)**

```bash
cd backend
npx prisma db push
cd ..
```

**Opsi 3: Menggunakan SQL Schema (jika ingin pakai schema.sql yang lama)**

```bash
psql -U postgres -d wargalapor < backend/database/schema.sql
```

### 4. Seed Data (Opsional)

Untuk mengisi data awal (users dan reports):

```bash
npm run seed
# atau
cd backend
npm run seed
cd ..
```

Ini akan membuat:
- 5 user admin/pengurus
- 100 user warga
- 60 laporan contoh

### 5. Menjalankan Aplikasi

#### Terminal 1 - Backend Server

```bash
cd backend
npm run dev
```

Backend akan berjalan di: **http://localhost:3001**

#### Terminal 2 - Frontend (Next.js)

```bash
npm run dev
```

Frontend akan berjalan di: **http://localhost:3000**

## ✅ Verifikasi

### Cek Backend
- Buka: http://localhost:3001/api/health
- Harus return: `{"status":"ok","message":"LaporIn API is running"}`

### Cek Frontend
- Buka: http://localhost:3000
- Harus muncul halaman login

## 🔑 Login Credentials (setelah seed)

Setelah menjalankan `npm run seed`, gunakan credentials berikut:

**Admin Sistem:**
- Email: `adminsistem@example.com`
- Password: `AdminSistem123!`

**Admin RW:**
- Email: `adminrw@example.com`
- Password: `AdminRw123!`

**Ketua RT:**
- Email: `ketuart@example.com`
- Password: `KetuaRt123!`

**Sekretaris RT:**
- Email: `sekretarisrt@example.com`
- Password: `Sekretaris123!`

**Pengurus:**
- Email: `pengurus@example.com`
- Password: `Pengurus123!`

**Warga (contoh):**
- Email: `warga1@example.com`
- Password: `Warga123!`
- Email: `warga2@example.com`
- Password: `Warga123!`
- ... (warga1 sampai warga100)

## 🐛 Troubleshooting

### Error: Prisma Client belum di-generate
```bash
cd backend
npx prisma generate
```

### Error: DATABASE_URL tidak ditemukan
- Pastikan file `backend/.env` sudah dibuat
- Pastikan `DATABASE_URL` sudah di-set dengan benar

### Error: Database connection failed
- Pastikan PostgreSQL sudah running
- Cek username, password, host, dan port di `DATABASE_URL`
- Test koneksi: `psql -U postgres -d wargalapor`

### Error: Cannot find module '../generated/prisma'
```bash
cd backend
npx prisma generate
```

### Error: Table does not exist
Jalankan migration atau push schema:
```bash
cd backend
npx prisma migrate dev --name init
# atau
npx prisma db push
```

## 📝 Catatan Penting

1. **Prisma Client harus di-generate** sebelum menjalankan aplikasi
2. **DATABASE_URL** harus di-set di `backend/.env`
3. **GROQ_API_KEY** diperlukan untuk fitur chatbot (gratis di https://console.groq.com/)
4. Database harus sudah dibuat sebelum menjalankan migration

## 🎯 Quick Commands Summary

```bash
# 1. Install dependencies
npm install && cd backend && npm install && cd ..

# 2. Generate Prisma Client
cd backend && npx prisma generate && cd ..

# 3. Setup database (pilih salah satu)
cd backend
npx prisma migrate dev --name init
# atau
npx prisma db push
cd ..

# 4. Seed data (opsional)
npm run seed

# 5. Jalankan aplikasi
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
npm run dev
```

## 📚 Dokumentasi Lengkap

- Setup Guide: [docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)
- PostgreSQL Setup: [docs/SETUP_POSTGRESQL.md](./docs/SETUP_POSTGRESQL.md)
- Troubleshooting: [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

