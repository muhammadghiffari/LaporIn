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

### Frontend Web
- **Framework**: Next.js 16 (App Router) dengan React 19
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x, Material-UI 7.x
- **State Management**: Zustand 4.x
- **Charts**: Chart.js 4.x, react-chartjs-2
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client

### Frontend Mobile
- **Framework**: Flutter 3.x (Dart)
- **State Management**: Riverpod 2.x
- **UI**: Material Design 3, Google Fonts (Inter)
- **Face Recognition**: Google ML Kit
- **Location**: Geolocator, Permission Handler
- **HTTP Client**: Dio
- **Local Storage**: SharedPreferences, Hive
- **Real-time**: Socket.IO Client (ready)

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 12+
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs, crypto-js (AES encryption)
- **Real-time**: Socket.IO
- **Location**: Reverse Geocoding, Location Validation

### AI Services
- **AI Processing**: Auto-categorization, urgency detection, summarization
- **NLP (Natural Language Processing)**: 
  - **AI-Powered Intent Detection** - Semantic understanding dengan AI
  - **Hybrid Approach** - Kombinasi AI + keyword-based untuk akurasi tinggi
  - **Entity Extraction** - Extract problem, location, urgency dari teks natural
  - **PII Redaction** - Redaksi data sensitif
  - **Context-Aware** - Memahami konteks percakapan sebelumnya
- **Smart Chatbot**: Natural language processing dengan intent detection
- **AI Fraud Detection**: Duplicate detection, spam filtering, anomaly detection

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
- ✅ **Face Recognition 2FA** untuk keamanan tambahan
  - **Biometric Blockchain Integration** - Hash biometric tersimpan di blockchain untuk audit trail
  - **AES Encryption** - Data biometric di-encrypt sebelum disimpan ke database
  - **Privacy-First** - Hanya hash yang disimpan di blockchain, bukan data asli
- ✅ **Buat Laporan via Form** atau **via AI Chatbot** (natural language)
- ✅ **GPS Location Picker** dengan validasi RT/RW
- ✅ **Camera Integration** untuk foto laporan
- ✅ Track status laporan dengan timeline
- ✅ View detail laporan dengan blockchain verification
- ✅ Cancel laporan (jika pending)
- ✅ Dashboard personal dengan filter & search
- ✅ **Mobile App Native** (Flutter - Android) dengan fitur lengkap

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
- ✅ **Smart Chatbot dengan NLP (Natural Language Processing)** 🤖
  - **AI-Powered Intent Detection** - Memahami maksud user dari bahasa natural menggunakan AI
  - **Semantic Understanding** - Bisa menangani variasi bahasa, konteks, dan bahasa santai
  - **Entity Extraction** - Otomatis ekstrak problem, location, urgency dari chat conversation
  - **Context-Aware** - Memahami konteks percakapan multi-turn (percakapan berkelanjutan)
  - **Auto-Report Generation** - Buat laporan langsung dari chat conversation tanpa perlu isi form
  - **Hybrid NLP Approach** - Kombinasi AI semantic understanding + keyword fallback untuk akurasi tinggi (~90-95%)
  - **9 Intent Types** - CREATE_REPORT, CHECK_STATUS, ASK_STATS, ASK_CAPABILITY, ASK_HELP, dll
  - **Preview Mode** - User bisa review draft laporan sebelum submit
  - **Role-based Responses** - Respon berbeda untuk warga vs admin
  
- ✅ **AI Fraud Detection** untuk keamanan:
  - Duplicate report detection (semantic similarity + location + time)
  - Spam/fake content detection dengan AI content analysis
  - Data quality validation
  - Anomaly pattern detection
  
- ✅ **Auto-Processing** untuk laporan:
  - Auto-categorization (infrastruktur, sosial, administrasi, bantuan)
  - Auto-urgency detection (high, medium, low)
  - Auto-summarization

### ⛓️ Blockchain Features
- ✅ **Smart Contract** (WargaLapor.sol)
- ✅ **Immutable Audit Trail**
  - Setiap laporan → blockchain
  - Setiap perubahan status → blockchain
  - **Biometric Registration** → blockchain (hash only, privacy-first)
- ✅ **Transaction Verification**
  - Link ke Polygonscan
  - Public verification
  - Meta hash untuk integrity
- ✅ **Biometric Blockchain Integration**
  - Hash biometric tersimpan di blockchain untuk audit trail
  - Data asli tetap di database (encrypted)
  - Privacy-compliant (GDPR-ready)

**📖 Detail lengkap**: [docs/FEATURES.md](./docs/FEATURES.md)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm atau yarn
- AI Service API Keys (Optional - untuk enhanced features)
- Flutter SDK 3.x (untuk mobile app - optional)

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
# AI Service API Keys (Optional)
# AI_API_KEY=your_ai_api_key
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

- **Frontend Web**: http://localhost:3000
- **Backend API**: http://localhost:3001

**Login dengan:**
- Email: `warga1@example.com` / Password: `Warga123!`
- Email: `adminsistem@example.com` / Password: `AdminSistem123!`

### 7. Run Mobile App (Optional)

```bash
cd flutter_app

# Install dependencies
flutter pub get

# Run on Android device/emulator
flutter run

# Build APK
flutter build apk --release
```

**📖 Quick Start lengkap**: [docs/QUICK_START.md](./docs/QUICK_START.md)  
**📱 Mobile App Setup**: [flutter_app/README.md](./flutter_app/README.md)

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

Dokumentasi kini terstruktur per modul. Mulai dari sini:

- 📚 [docs/README.md](./docs/README.md) – index umum & panduan proyek.
- 🔐 [docs/BIOMETRIC_BLOCKCHAIN.md](./docs/BIOMETRIC_BLOCKCHAIN.md) – dokumentasi biometric blockchain integration.
- 🧱 [app/docs/README.md](./app/docs/README.md) – frontend Next.js.
- 🔧 [backend/docs/README.md](./backend/docs/README.md) – API & service backend.
- ⛓️ [blockchain/docs/README.md](./blockchain/docs/README.md) – smart contract & Hardhat.
- 📱 [flutter_app/docs/README.md](./flutter_app/docs/README.md) – mobile warga (Flutter).

Dokumen historis/duplikat sudah dipindahkan ke [`docs/archive/`](./docs/archive) supaya repo utama lebih rapi. Jika butuh referensi lama (proposal, analisis hackathon, dsb.), cek folder arsip tersebut.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND WEB (Next.js 16)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │ ChatWidget   │  │ Reports List │      │
│  │  Analytics   │  │ (AI Service) │  │  (MUI Table) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┼──────────────────┘               │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│              FRONTEND MOBILE (Flutter)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │ Chat Screen  │  │ Reports List │      │
│  │  Face Auth   │  │ (AI Service) │  │  GPS Location │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┼──────────────────┘               │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTP/REST API + Socket.IO
┌───────────────────────────┼──────────────────────────────────┐
│                  BACKEND (Express.js)                         │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  API Routes                                          │    │
│  │  /api/auth    - Auth, User Management              │    │
│  │  /api/reports - CRUD, Stats, Status Update         │    │
│  │  /api/chat    - AI Chatbot                        │    │
│  │  /api/nlp     - Intent, Classification            │    │
│  └──────────────────────────────────────────────────────┘    │
│                           │                                  │
│         ┌─────────────────┼──────────────────┐               │
│         │                 │                  │               │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐       │
│  │ PostgreSQL  │  │  AI Service  │  │ Blockchain   │       │
│  │  Database   │  │ (AI Service) │  │   Service    │       │
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
1. User creates report → Web/Mobile Frontend → Backend API
2. Backend processes with AI → Auto-categorization, urgency, summary
3. Backend validates location → RT/RW boundary check
4. Backend logs to blockchain → Smart contract → Immutable audit trail
5. Data saved to PostgreSQL → Database
6. Real-time update via Socket.IO → All connected clients
7. Frontend displays → Dashboard dengan timeline & analytics

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

**NLP (Natural Language Processing):**
- `POST /api/nlp/intent` - AI-powered intent detection (semantic understanding + keyword fallback)
- `POST /api/nlp/classify` - Auto-classify report category & urgency
- `POST /api/nlp/redact` - Redact PII (email, phone, address) dari teks

**NLP Features:**
- ✅ **AI-Powered Semantic Understanding** - Memahami variasi bahasa natural
- ✅ **Context-Aware** - Memahami konteks percakapan multi-turn
- ✅ **Entity Extraction** - Otomatis extract problem, location, urgency
- ✅ **Hybrid Approach** - Kombinasi AI + keyword untuk akurasi tinggi (~90-95%)
- ✅ **9 Intents Supported** - CREATE_REPORT, CHECK_STATUS, ASK_STATS, dll

**📖 Dokumentasi lengkap**: [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)

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
- API Keys: Valid API keys (optional untuk enhanced features)
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

- ✅ **AI Integration**: Smart Chatbot, Auto-processing, Fraud Detection
- ✅ **Blockchain Integration**: Smart Contract, Immutable Audit Trail, Public Verification
- ✅ **Modern Tech Stack**: Next.js 16, React 19, TypeScript, PostgreSQL
- ✅ **Professional UI/UX**: Modern design, responsive, accessible

**📖 Analisis lengkap**: [docs/HACKATHON_ANALYSIS.md](./docs/HACKATHON_ANALYSIS.md)

---

## 👥 Team

**Weladalah Team - IT Fair XIV Hackathon 2025**

- **Abhi** - Full Stack Developer
- **Ghiffari** - Blockchain & AI Developer
- **Dyandra** - Frontend Developer and UI/UX Design
- **Faris** - Problem Solver & Solution

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
- 📡 **API Docs**: [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)

---

<div align="center">

**Made with ❤️ Weladalah Team - IT Fair XIV Hackathon 2025**

🚀 **Code The Future: Smart Solutions with AI & Blockchain** 🚀

</div>
