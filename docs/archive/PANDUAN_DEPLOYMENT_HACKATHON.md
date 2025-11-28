# 🚀 Panduan Deployment untuk Hackathon LaporIn

## 📋 Overview

Aplikasi LaporIn terdiri dari 3 komponen utama:
1. **Frontend Web** (Next.js) - Port 3000
2. **Backend API** (Node.js/Express) - Port 3001
3. **Mobile App** (Flutter) - APK untuk Android
4. **Database** (PostgreSQL) - Port 5432
5. **Blockchain** (Polygon Amoy Testnet)

---

## 🎯 Opsi Deployment untuk Hackathon

### ✅ **Opsi 1: Live Deployment (RECOMMENDED untuk Demo)**

#### **A. Frontend Web (Vercel/Railway/Netlify)**

**Vercel (Gratis, Paling Mudah):**
```bash
# 1. Push code ke GitHub
git add .
git commit -m "Final submission for hackathon"
git push origin main

# 2. Import project ke Vercel
# - Login ke vercel.com
# - Click "New Project"
# - Import dari GitHub repository
# - Set environment variables:
#   - NEXT_PUBLIC_API_URL=https://your-backend-url.com
#   - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key
#   - NEXT_PUBLIC_BLOCKCHAIN_CONTRACT_ADDRESS=your-address
# - Deploy!
```

**Environment Variables untuk Frontend:**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
NEXT_PUBLIC_BLOCKCHAIN_CONTRACT_ADDRESS=your-contract-address
```

#### **B. Backend API (Railway/Render/Heroku)**

**Railway (Gratis, Simple):**
```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login & Deploy
railway login
cd backend
railway init
railway up

# 3. Set Environment Variables di Railway Dashboard:
# - DATABASE_URL (Railway auto-create PostgreSQL)
# - JWT_SECRET
# - EMAIL_HOST, EMAIL_USER, EMAIL_PASS
# - BLOCKCHAIN_RPC_URL
# - PRIVATE_KEY (untuk blockchain)
# - CONTRACT_ADDRESS
# - FRONTEND_URL
```

**Environment Variables untuk Backend:**
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your-private-key
CONTRACT_ADDRESS=0x...
FRONTEND_URL=https://your-frontend-url.vercel.app
NODE_ENV=production
```

#### **C. Database (Railway PostgreSQL - Auto-provisioned)**

Railway otomatis create PostgreSQL database. Cukup copy `DATABASE_URL` ke backend env vars.

#### **D. Mobile App (APK untuk Demo)**

```bash
# Build APK
cd flutter_app
flutter build apk --release

# APK akan ada di: flutter_app/build/app/outputs/flutter-apk/app-release.apk
# Upload ke Google Drive / GitHub Releases untuk download
```

---

### ✅ **Opsi 2: GitHub Repository + Dokumentasi (Fallback)**

Jika deployment terlalu kompleks atau waktu terbatas:

**1. Push ke GitHub:**
```bash
# Buat repository baru
git init
git add .
git commit -m "LaporIn - Hackathon Submission"
git remote add origin https://github.com/yourusername/laporin.git
git push -u origin main
```

**2. Buat Dokumentasi Lengkap:**
- `README.md` - Overview, setup, screenshots
- `DEPLOYMENT.md` - Step-by-step deployment guide
- `FEATURES.md` - Daftar fitur lengkap
- Screenshots/Videos untuk demo

**3. Link untuk Submit:**
- GitHub Repository: `https://github.com/yourusername/laporin`
- Demo Video (YouTube/Vimeo): Link video demo aplikasi

---

## 🎬 **Opsi 3: Demo Video + GitHub (Hybrid)**

**Rekomendasikan ini untuk hackathon:**

1. **Buat Demo Video (5-10 menit):**
   - Screencast aplikasi running
   - Tunjukkan semua fitur utama
   - Upload ke YouTube (unlisted/private)

2. **Push ke GitHub:**
   - Full source code
   - README dengan setup instructions

3. **Submit:**
   - GitHub Link: `https://github.com/yourusername/laporin`
   - Demo Video: `https://youtube.com/watch?v=...`
   - Dokumentasi: Include di README.md

---

## 📝 Format Link untuk Google Form

**Untuk "Link Proyek", bisa isi salah satu:**

### Format 1: Live Deployment
```
Frontend: https://laporin.vercel.app
Backend: https://laporin-backend.railway.app
Mobile APK: https://github.com/yourusername/laporin/releases
GitHub: https://github.com/yourusername/laporin
```

### Format 2: GitHub + Video
```
GitHub Repository: https://github.com/yourusername/laporin
Demo Video: https://youtube.com/watch?v=...
Documentation: https://github.com/yourusername/laporin/blob/main/README.md
```

### Format 3: All-in-One
```
🔗 Links:
- GitHub: https://github.com/yourusername/laporin
- Live Demo: https://laporin.vercel.app
- Demo Video: https://youtube.com/watch?v=...
- Mobile APK: https://drive.google.com/file/d/.../view
```

---

## 🛠️ Quick Setup untuk Live Deployment

### Step 1: Deploy Backend (Railway)

```bash
cd backend

# Install Railway CLI
npm i -g @railway/cli

# Login & Deploy
railway login
railway init
railway up

# Set environment variables di Railway dashboard
# Run migrations
railway run npx prisma migrate deploy
railway run npm run seed  # Optional: seed sample data
```

### Step 2: Deploy Frontend (Vercel)

```bash
# Push ke GitHub dulu
git push origin main

# Di Vercel:
# 1. Import project
# 2. Set environment variables
# 3. Deploy!
```

### Step 3: Update Frontend ENV

Set `NEXT_PUBLIC_API_URL` di Vercel ke backend URL dari Railway.

---

## 📦 Checklist Sebelum Submit

- [ ] Code pushed ke GitHub (public repository)
- [ ] Environment variables documented
- [ ] README.md dengan setup instructions
- [ ] Screenshots fitur utama
- [ ] Demo video (optional tapi recommended)
- [ ] Mobile APK ready untuk download
- [ ] Database migration tested
- [ ] API endpoints working
- [ ] Frontend accessible
- [ ] Blockchain integration tested

---

## 💡 Tips untuk Hackathon

1. **Prioritaskan Demo yang Berfungsi:**
   - Better punya demo video yang bagus daripada live deployment yang buggy
   - Pastikan lokal development sudah 100% working

2. **Dokumentasi Lengkap:**
   - README dengan screenshots
   - Setup guide step-by-step
   - Video demo aplikasi

3. **GitHub Repository:**
   - Structure yang rapi
   - Clear commit messages
   - Documentation di root

4. **Jika Waktu Terbatas:**
   - Fokus ke GitHub + Demo Video
   - Live deployment bisa jadi bonus

---

## 🚨 Troubleshooting

### Database Connection Error
```bash
# Pastikan DATABASE_URL correct
# Test connection:
railway run npx prisma db pull
```

### Frontend Can't Connect to Backend
```bash
# Pastikan NEXT_PUBLIC_API_URL correct
# Check CORS settings di backend
```

### Mobile App Build Failed
```bash
# Clean build:
cd flutter_app
flutter clean
flutter pub get
flutter build apk --release
```

---

## 📞 Support

Jika ada masalah deployment, pastikan:
1. Environment variables sudah benar
2. Database migration sudah run
3. CORS sudah dikonfigurasi
4. Port sudah benar

---

**Recommended Approach untuk Hackathon:**
✅ GitHub Repository (public) + Demo Video + Dokumentasi Lengkap

Ini paling aman dan mudah untuk dinilai panitia! 🎯

