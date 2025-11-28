# 🚀 Setup Guide - LaporIn

Panduan lengkap untuk setup project LaporIn dari awal.

## Prerequisites

1. **Node.js** 18+ dan npm
2. **PostgreSQL** database
3. **OpenAI API Key** (untuk AI processing)
4. **Blockchain Wallet** (untuk deploy smart contract)

## Step 1: Clone & Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install blockchain dependencies
cd ../blockchain
npm install
```

## Step 2: Setup Database

```bash
# Buat database PostgreSQL
createdb wargalapor

# Atau menggunakan psql
psql -U postgres
CREATE DATABASE wargalapor;

# Jalankan schema
psql wargalapor < backend/database/schema.sql
```

## Step 3: Setup Environment Variables

### Backend (.env)

Buat file `backend/.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wargalapor
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key_here_min_32_chars

# OpenAI
OPENAI_API_KEY=sk-your_openai_api_key

# Blockchain (akan diisi setelah deploy contract)
BLOCKCHAIN_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/your_key
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=your_contract_address
```

### Frontend (.env.local)

Buat file `.env.local` di root:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Blockchain (.env)

Buat file `blockchain/.env`:

```env
BLOCKCHAIN_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/your_key
PRIVATE_KEY=your_wallet_private_key
```

## Step 4: Deploy Smart Contract

```bash
cd blockchain

# Compile contract
npm run compile

# Deploy ke Polygon Mumbai
npm run deploy
```

**PENTING**: Copy contract address yang muncul setelah deploy, lalu update `CONTRACT_ADDRESS` di `backend/.env`.

## Step 5: Run Development Servers

### Terminal 1: Backend
```bash
cd backend
npm run dev
```

Backend akan berjalan di `http://localhost:3001`

### Terminal 2: Frontend
```bash
# Di root directory
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`

## Step 6: Test Setup

1. Buka browser ke `http://localhost:3000`
2. Register user baru (role: `warga` atau `pengurus`)
3. Login
4. Buat laporan test

## Troubleshooting

### Database Connection Error
- Pastikan PostgreSQL running
- Check credentials di `backend/.env`
- Pastikan database `wargalapor` sudah dibuat

### OpenAI API Error
- Check API key di `backend/.env`
- Pastikan ada credit di OpenAI account
- Fallback processing akan digunakan jika API error

### Blockchain Error
- Check RPC URL dan private key
- Pastikan wallet punya testnet MATIC
- Contract harus sudah di-deploy

### Frontend API Error
- Check `NEXT_PUBLIC_API_URL` di `.env.local`
- Pastikan backend running di port 3001
- Check CORS settings di backend

## Next Steps

Setelah setup selesai, ikuti roadmap 19 hari:
- Hari 1-2: ✅ Setup (selesai)
- Hari 3-7: Backend Core
- Hari 8-12: Frontend Core
- Hari 13-15: AI Integration
- Hari 16-17: Blockchain Integration
- Hari 18-19: Testing & Polish

