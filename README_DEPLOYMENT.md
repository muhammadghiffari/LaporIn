# 🚀 LaporIn - Quick Deployment Guide

## 📍 Link Proyek

**Untuk submit ke Google Form, gunakan format ini:**

```
🔗 GitHub Repository: https://github.com/yourusername/laporin
🎥 Demo Video: https://youtube.com/watch?v=... (optional)
📱 Mobile APK: https://github.com/.../releases (optional)
🌐 Live Demo: https://laporin.vercel.app (optional)
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Flutter 3.0+ (untuk mobile)
- npm/yarn

### Installation

```bash
# 1. Clone repository
git clone https://github.com/yourusername/laporin.git
cd laporin

# 2. Setup Backend
cd backend
npm install
cp .env.example .env
# Edit .env dengan credentials Anda
npx prisma migrate dev
npm run seed  # Optional: seed sample data
npm run dev   # Runs on port 3001

# 3. Setup Frontend
cd ../  # Back to root
npm install
cp .env.example .env.local
# Edit .env.local dengan API URL
npm run dev   # Runs on port 3000

# 4. Setup Mobile (Optional)
cd flutter_app
flutter pub get
flutter run
```

---

## 🎯 Fitur Utama

- ✅ **Sistem Pelaporan Warga** dengan GPS tracking
- ✅ **AI Chatbot** untuk bantuan otomatis
- ✅ **Blockchain Integration** untuk transparansi
- ✅ **Face Recognition** untuk keamanan
- ✅ **Real-time Monitoring** dengan peta interaktif
- ✅ **Admin Dashboard** dengan analytics
- ✅ **Mobile App** (Flutter) untuk Android

---

## 📖 Dokumentasi Lengkap

Lihat file:
- `README.md` - Dokumentasi lengkap
- `PANDUAN_DEPLOYMENT_HACKATHON.md` - Panduan deployment
- `docs/` - Dokumentasi teknis

---

## 🎬 Demo

Demo video tersedia di: [Link YouTube]

Screenshots fitur utama ada di folder `docs/screenshots/`

---

**Tim Weladalah** 🏆

