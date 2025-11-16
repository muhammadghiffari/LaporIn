# 📁 Struktur Project LaporIn

## Overview

Project ini menggunakan monorepo structure dengan 3 bagian utama:
- **Frontend**: Next.js 16 dengan App Router
- **Backend**: Express.js API server
- **Blockchain**: Hardhat smart contracts

## Directory Structure

```
laporin/
├── app/                          # Next.js App Router
│   ├── dashboard/                # Dashboard page
│   │   └── page.tsx
│   ├── login/                    # Login page
│   │   └── page.tsx
│   ├── reports/                  # Report detail pages
│   │   └── [id]/
│   │       └── page.tsx
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home (redirects to login)
│   └── globals.css               # Global styles
│
├── components/                   # React components
│   ├── CreateReportForm.tsx     # Form untuk buat laporan
│   └── ReportsList.tsx          # List laporan
│
├── lib/                          # Utilities
│   └── api.ts                    # Axios API client
│
├── store/                        # State management (Zustand)
│   └── authStore.ts             # Auth state & actions
│
├── backend/                      # Express.js Backend
│   ├── database/
│   │   ├── db.js                # PostgreSQL connection
│   │   └── schema.sql           # Database schema
│   ├── middleware/
│   │   └── auth.js              # JWT authentication
│   ├── routes/
│   │   ├── auth.routes.js       # Auth endpoints
│   │   └── reports.routes.js    # Reports endpoints
│   ├── services/
│   │   ├── aiService.js         # OpenAI integration
│   │   └── blockchainService.js # Blockchain integration
│   ├── server.js                # Express server
│   └── package.json
│
├── blockchain/                  # Hardhat Project
│   ├── contracts/
│   │   └── WargaLapor.sol      # Smart contract
│   ├── scripts/
│   │   └── deploy.js           # Deployment script
│   ├── hardhat.config.js       # Hardhat config
│   └── package.json
│
├── public/                      # Static assets
├── package.json                 # Frontend dependencies
├── tsconfig.json                # TypeScript config
├── README.md                    # Main README
├── SETUP.md                     # Setup guide
└── .gitignore
```

## Key Files

### Frontend

- **`app/login/page.tsx`**: Login page dengan form
- **`app/dashboard/page.tsx`**: Dashboard utama (beda untuk warga vs pengurus)
- **`app/reports/[id]/page.tsx`**: Detail laporan dengan timeline
- **`components/CreateReportForm.tsx`**: Form untuk membuat laporan baru
- **`components/ReportsList.tsx`**: List semua laporan dengan filter
- **`store/authStore.ts`**: Zustand store untuk authentication
- **`lib/api.ts`**: Axios client dengan token interceptor

### Backend

- **`server.js`**: Main Express server
- **`routes/auth.routes.js`**: Register & login endpoints
- **`routes/reports.routes.js`**: CRUD endpoints untuk laporan
- **`services/aiService.js`**: AI processing dengan OpenAI (dengan fallback)
- **`services/blockchainService.js`**: Blockchain logging service
- **`middleware/auth.js`**: JWT authentication middleware
- **`database/schema.sql`**: PostgreSQL schema

### Blockchain

- **`contracts/WargaLapor.sol`**: Smart contract untuk audit trail
- **`scripts/deploy.js`**: Script untuk deploy contract
- **`hardhat.config.js`**: Hardhat configuration

## Data Flow

1. **User membuat laporan** → Frontend → Backend API
2. **Backend memproses dengan AI** → OpenAI API → Klasifikasi & Prioritas
3. **Backend log ke blockchain** → Smart Contract → Audit Trail
4. **Data disimpan ke database** → PostgreSQL
5. **Frontend menampilkan** → Dashboard dengan timeline

## Technology Stack

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Axios (HTTP client)

### Backend
- Express.js
- PostgreSQL
- JWT (authentication)
- OpenAI API (AI processing)
- Ethers.js (blockchain)

### Blockchain
- Hardhat
- Solidity 0.8.19
- Polygon Mumbai (testnet)

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (backend/.env)
```
PORT=3001
DB_HOST=localhost
DB_NAME=wargalapor
JWT_SECRET=...
OPENAI_API_KEY=...
BLOCKCHAIN_RPC_URL=...
CONTRACT_ADDRESS=...
```

### Blockchain (blockchain/.env)
```
BLOCKCHAIN_RPC_URL=...
PRIVATE_KEY=...
```

## Next Steps

1. ✅ Project structure setup (DONE)
2. ⏳ Install dependencies (`npm install` di setiap folder)
3. ⏳ Setup database (PostgreSQL)
4. ⏳ Configure environment variables
5. ⏳ Deploy smart contract
6. ⏳ Run development servers
7. ⏳ Test basic flow

Lihat `SETUP.md` untuk panduan lengkap.

