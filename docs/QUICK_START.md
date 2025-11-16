# ⚡ Quick Start - LaporIn

Panduan cepat untuk menjalankan LaporIn dalam 5 menit.

---

## 🚀 Quick Setup (5 Menit)

### 1. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd backend && npm install && cd ..

# Blockchain (optional)
cd blockchain && npm install && cd ..
```

### 2. Setup Database

```bash
# Buat database
createdb wargalapor

# Apply schema
psql -U postgres -d wargalapor < backend/database/schema.sql
```

### 3. Setup Environment

**Backend** (`backend/.env`):
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wargalapor
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your_jwt_secret_min_32_chars
GROQ_API_KEY=your_groq_api_key
```

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Seed Data

```bash
npm run seed
```

### 5. Run Servers

**Terminal 1:**
```bash
cd backend
npm run dev
```

**Terminal 2:**
```bash
npm run dev
```

### 6. Access

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

**Login dengan:**
- Email: `warga1@example.com`
- Password: `Warga123!`

---

## 📚 Dokumentasi Lengkap

- [Setup Guide](./SETUP_GUIDE.md) - Panduan setup lengkap
- [PostgreSQL Setup](./SETUP_POSTGRESQL.md) - Setup database detail
- [Features](./FEATURES.md) - Daftar fitur lengkap
- [Tech Stack](./TECH_STACK.md) - Teknologi yang digunakan

---

**Selamat! LaporIn sudah berjalan! 🎉**

