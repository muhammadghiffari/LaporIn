# 🏆 LaporIn - Platform Laporan Warga RT/RW dengan AI & Blockchain

<div align="center">

**Platform civic tech untuk mengelola laporan warga di level RT/RW dengan integrasi AI untuk klasifikasi otomatis dan Blockchain untuk audit trail yang immutable.**

> **🏅 Hackathon IT Fair XIV 2025**  
> *"Code The Future: Smart Solutions with AI & Blockchain"*

[![Next.js](https://img.shields.io/badge/Next.js-16.0.3-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue)](https://www.postgresql.org/)
[![Blockchain](https://img.shields.io/badge/Blockchain-Polygon%20Mumbai-purple)](https://polygon.technology/)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#️-tech-stack)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Setup Guide](#-setup-guide)
- [Documentation](#-documentation)
- [Architecture](#️-architecture)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Team](#-team)

---

## 🎯 Overview

**LaporIn** adalah platform civic tech yang memungkinkan warga untuk melaporkan masalah infrastruktur, sosial, dan administrasi di level RT/RW dengan cara yang efisien dan transparan. Platform ini menggunakan **AI (Artificial Intelligence)** untuk auto-processing laporan dan **Blockchain** untuk audit trail yang immutable.

### 🎯 Problem Statement

1. **Inefficiency**: Laporan warga sering tersebar (WhatsApp, telepon, lisan) dan sulit ditrack
2. **Lack of Transparency**: Tidak ada audit trail yang jelas untuk proses penanganan
3. **Manual Processing**: Pengurus RT/RW harus manual klasifikasi dan prioritas
4. **No Analytics**: Tidak ada data untuk perencanaan dan evaluasi

### 💡 Solution

**LaporIn** menyediakan:
- ✅ **Centralized Platform**: Semua laporan dalam satu sistem
- ✅ **AI Auto-Processing**: Klasifikasi otomatis, prioritas, dan ringkasan
- ✅ **Blockchain Audit Trail**: Setiap perubahan status dicatat permanen di blockchain
- ✅ **Analytics Dashboard**: Statistik dan insights untuk pengurus RT/RW
- ✅ **Smart Chatbot**: AI assistant untuk membantu warga membuat laporan via chat

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router) dengan React 19
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x, Material-UI 7.x
- **State Management**: Zustand 4.x
- **Charts**: Chart.js 4.x, react-chartjs-2
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 12+
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs, crypto-js (AES encryption)

### AI Services
- **Primary**: Groq API (llama-3.1-8b-instant) - **FREE & FAST** ⚡
- **Fallback**: OpenAI GPT-3.5-turbo
- **NLP**: Custom rule-based intent detection

### Blockchain
- **Network**: Polygon Mumbai Testnet
- **Smart Contract**: Solidity 0.8.19
- **Framework**: Hardhat
- **Library**: Ethers.js v6

**📖 Detail lengkap**: [docs/TECH_STACK.md](./docs/TECH_STACK.md)

---

## ✨ Features

### 👥 Untuk Warga
- ✅ Registrasi & Login dengan validasi
- ✅ **Buat Laporan via Form** atau **via AI Chatbot** (natural language)
- ✅ Track status laporan dengan timeline
- ✅ View detail laporan dengan blockchain verification
- ✅ Cancel laporan (jika pending)
- ✅ Dashboard personal dengan filter & search

### 👔 Untuk Admin & Pengurus RT/RW
- ✅ **Analytics Dashboard** dengan charts interaktif
  - KPI cards (Total, Selesai, Diproses, Menunggu, Dibatalkan)
  - Tren laporan (Hari/Minggu/Bulan)
  - Pertumbuhan warga
  - Distribusi (Status, Kategori, Urgensi, Gender)
- ✅ **Report Management** dengan table MUI
  - Filter & search
  - Quick actions (Mulai Proses, Selesaikan)
  - Pagination
- ✅ **User Management** (Admin Sistem)
  - List, create, delete users
  - Filter by role
  - Search functionality
- ✅ **RT Queue Panel** untuk antrian laporan

### 🤖 AI Features
- ✅ **Smart Chatbot** dengan Groq AI
  - Natural language processing
  - Intent detection
  - **Auto-report generation** dari chat
  - Preview mode sebelum submit
  - Role-based responses
  - Context-aware
- ✅ **Auto-Processing** untuk laporan
  - Auto-categorization
  - Auto-urgency detection
  - Auto-summarization
- ✅ **NLP Processing**
  - Intent classification
  - PII redaction
  - Entity extraction

### ⛓️ Blockchain Features
- ✅ **Smart Contract** (WargaLapor.sol)
- ✅ **Immutable Audit Trail**
  - Setiap laporan → blockchain
  - Setiap perubahan status → blockchain
- ✅ **Transaction Verification**
  - Link ke Polygonscan
  - Public verification
  - Meta hash untuk integrity

**📖 Detail lengkap**: [docs/FEATURES.md](./docs/FEATURES.md)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm atau yarn
- Groq API Key (FREE: [Get here](https://console.groq.com/))

### 1. Clone & Install

```bash
git clone <repository-url>
cd LaporIn

# Install dependencies
npm install
cd backend && npm install && cd ..
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
JWT_SECRET=your_jwt_secret_min_32_characters_long
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

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 6. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

**Login dengan:**
- Email: `warga1@example.com` / Password: `Warga123!`
- Email: `adminsistem@example.com` / Password: `AdminSistem123!`

**📖 Quick Start lengkap**: [docs/QUICK_START.md](./docs/QUICK_START.md)

---

## 📚 Setup Guide

### Setup PostgreSQL

Lihat panduan lengkap: [docs/SETUP_POSTGRESQL.md](./docs/SETUP_POSTGRESQL.md)

**Quick commands:**
```bash
# Install & start PostgreSQL (macOS)
brew install postgresql@16
brew services start postgresql@16

# Buat database
createdb wargalapor

# Apply schema
psql -U postgres -d wargalapor < backend/database/schema.sql
```

### Setup Lengkap

Lihat panduan step-by-step: [docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)

---

## 📖 Documentation

Semua dokumentasi tersedia di folder `docs/`:

- 📘 [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) - Panduan setup lengkap
- 📗 [SETUP_POSTGRESQL.md](./docs/SETUP_POSTGRESQL.md) - Setup database detail
- 📙 [QUICK_START.md](./docs/QUICK_START.md) - Quick start guide
- 📕 [FEATURES.md](./docs/FEATURES.md) - Daftar fitur lengkap
- 📓 [TECH_STACK.md](./docs/TECH_STACK.md) - Teknologi yang digunakan
- 📔 [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) - Troubleshooting guide
- 📋 [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference lengkap
- 📊 [HACKATHON_ANALYSIS.md](./HACKATHON_ANALYSIS.md) - Analisis kesesuaian hackathon

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │ ChatWidget   │  │ Reports List │      │
│  │  Analytics   │  │ (Groq AI)    │  │  (MUI Table) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┼──────────────────┘               │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTP/REST API
┌───────────────────────────┼──────────────────────────────────┐
│                  BACKEND (Express.js)                         │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  API Routes                                          │    │
│  │  /api/auth    - Auth, User Management              │    │
│  │  /api/reports - CRUD, Stats, Status Update         │    │
│  │  /api/chat    - AI Chatbot (Groq)                 │    │
│  │  /api/nlp     - Intent, Classification            │    │
│  └──────────────────────────────────────────────────────┘    │
│                           │                                  │
│         ┌─────────────────┼──────────────────┐               │
│         │                 │                  │               │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐       │
│  │ PostgreSQL  │  │  AI Service  │  │ Blockchain   │       │
│  │  Database   │  │ (Groq/OpenAI)│  │   Service    │       │
│  └─────────────┘  └──────────────┘  └───────┬───────┘       │
└──────────────────────────────────────────────┼───────────────┘
                                               │
                                               │ Smart Contract
                                               │ Transaction
┌──────────────────────────────────────────────▼───────────────┐
│              BLOCKCHAIN (Polygon Mumbai)                      │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  WargaLapor.sol Smart Contract                       │    │
│  │  - logReportEvent()                                  │    │
│  │  - logBantuanEvent()                                 │    │
│  │  - Immutable Audit Trail                             │    │
│  └──────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. User creates report → Frontend → Backend API
2. Backend processes with AI → Auto-categorization, urgency, summary
3. Backend logs to blockchain → Smart contract → Immutable audit trail
4. Data saved to PostgreSQL → Database
5. Frontend displays → Dashboard dengan timeline & analytics

---

## 📡 API Documentation

### Quick Reference

**Authentication:**
- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login user
- `GET /api/auth/users` - List users (Admin only)
- `POST /api/auth/users` - Create user (Admin only)
- `DELETE /api/auth/users/:id` - Delete user
- `GET /api/auth/stats/warga` - Stats warga by gender

**Reports:**
- `POST /api/reports` - Create report (with AI & blockchain)
- `GET /api/reports` - Get reports (with filters & pagination)
- `GET /api/reports/:id` - Get report detail
- `GET /api/reports/stats` - Get analytics stats
- `PATCH /api/reports/:id/status` - Update status
- `POST /api/reports/:id/cancel` - Cancel report

**Chat:**
- `POST /api/chat` - Chat with AI assistant

**NLP:**
- `POST /api/nlp/intent` - Detect intent
- `POST /api/nlp/classify` - Classify report
- `POST /api/nlp/redact` - Redact PII

**📖 Dokumentasi lengkap**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests (jika ada)
npm test
```

### Manual Testing Checklist

- [ ] User registration & login
- [ ] Create report via form
- [ ] Create report via chatbot
- [ ] View reports with filters
- [ ] Update report status (as pengurus/admin)
- [ ] View analytics dashboard
- [ ] Blockchain verification link
- [ ] User management (as admin)
- [ ] AI processing works
- [ ] Chatbot responds correctly

---

## 🚢 Deployment

### Production Environment Variables

Pastikan semua environment variables di-set:
- Database: Production PostgreSQL
- JWT_SECRET: Strong random string (min 32 chars)
- API Keys: Valid Groq/OpenAI keys
- Blockchain: Production network (Polygon Mainnet)

### Build Commands

```bash
# Frontend build
npm run build
npm start

# Backend (use PM2 atau similar)
cd backend
npm start
```

---

## 🎯 Kesesuaian dengan Hackathon

### Tema: "Code The Future: Smart Solutions with AI & Blockchain"

✅ **100% Sesuai**

- ✅ **AI Integration**: Groq AI, OpenAI, Smart Chatbot, Auto-processing
- ✅ **Blockchain Integration**: Smart Contract, Immutable Audit Trail, Public Verification
- ✅ **Modern Tech Stack**: Next.js 16, React 19, TypeScript, PostgreSQL
- ✅ **Professional UI/UX**: Modern design, responsive, accessible

**📖 Analisis lengkap**: [HACKATHON_ANALYSIS.md](./HACKATHON_ANALYSIS.md)

---

## 👥 Team

**Weladalah Team - IT Fair XIV Hackathon 2025**

- **Abhi** - Full Stack Developer
- **Ghiffari** - Backend Developer
- **Dyandra** - Frontend Developer
- **Faris** - Blockchain Developer

---

## 📄 License

This project is created for **IT Fair XIV Hackathon Competition 2025**.

---

## 🆘 Support & Documentation

- 📖 **Setup Guide**: [docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)
- 🗄️ **PostgreSQL Setup**: [docs/SETUP_POSTGRESQL.md](./docs/SETUP_POSTGRESQL.md)
- ⚡ **Quick Start**: [docs/QUICK_START.md](./docs/QUICK_START.md)
- ✨ **Features**: [docs/FEATURES.md](./docs/FEATURES.md)
- 🛠️ **Tech Stack**: [docs/TECH_STACK.md](./docs/TECH_STACK.md)
- 🔧 **Troubleshooting**: [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
- 📡 **API Docs**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

<div align="center">

**Made with ❤️ Weladalah Team - IT Fair XIV Hackathon 2025**

🚀 **Code The Future: Smart Solutions with AI & Blockchain** 🚀

</div>
