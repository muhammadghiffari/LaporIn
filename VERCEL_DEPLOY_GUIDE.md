# 🚀 Panduan Deploy Frontend ke Vercel

Panduan lengkap untuk deploy frontend LaporIn ke Vercel dan connect ke backend Railway.

---

## ✅ Apakah Vercel Bisa Connect ke Railway?

**Jawaban: ✅ BISA!** 

Frontend di Vercel bisa connect ke backend di Railway via API URL:
- ✅ Frontend (Vercel) → Backend (Railway) via HTTPS
- ✅ Tidak ada masalah CORS (jika backend sudah dikonfigurasi)
- ✅ Real-time WebSocket juga bisa connect

---

## 🚀 Step-by-Step Deploy ke Vercel

### Step 1: Push Code ke GitHub

```bash
# Pastikan semua perubahan sudah di-commit
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

---

### Step 2: Deploy via Vercel Dashboard

1. **Buka Vercel:** https://vercel.com
2. **Sign up / Login** (bisa pakai GitHub account)
3. **New Project** → **Import Git Repository**
4. **Pilih repository:** LaporIn
5. **Configure Project:**
   - **Framework Preset:** Next.js (otomatis terdeteksi)
   - **Root Directory:** `.` (root project)
   - **Build Command:** `npm run build` (otomatis)
   - **Output Directory:** `.next` (otomatis)

6. **Environment Variables:**
   - Klik **Environment Variables**
   - Tambahkan:
     ```
     NEXT_PUBLIC_API_URL=https://api-laporin.up.railway.app
     ```
   - ⚠️ **PENTING:** Ganti dengan URL Railway backend Anda!

7. **Deploy!**
   - Klik **Deploy**
   - Vercel otomatis build dan deploy
   - Tunggu sampai selesai (2-5 menit)

---

### Step 3: Set Environment Variables

**Setelah deploy pertama, update environment variables:**

1. **Vercel Dashboard** → **Project** → **Settings** → **Environment Variables**

2. **Add Variable:**
   ```
   Name: NEXT_PUBLIC_API_URL
   Value: https://api-laporin.up.railway.app
   Environment: Production, Preview, Development
   ```

3. **Redeploy:**
   - Vercel Dashboard → **Deployments** → **Redeploy**

---

## 🔧 Setup Environment Variables

### Required Variables:

```env
NEXT_PUBLIC_API_URL=https://api-laporin.up.railway.app
```

**Catatan:**
- Ganti `https://api-laporin.up.railway.app` dengan URL Railway backend Anda
- Format: `https://your-service-name.up.railway.app`
- Tanpa trailing slash (`/`)

### Optional Variables (jika diperlukan):

```env
NEXT_PUBLIC_WS_URL=wss://api-laporin.up.railway.app
NEXT_PUBLIC_ENV=production
```

---

## 🔗 Connect Frontend (Vercel) ke Backend (Railway)

### 1. Pastikan Backend Railway Sudah Running

```bash
# Test backend
curl https://api-laporin.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "LaporIn API is running"
}
```

### 2. Set API URL di Vercel

**Vercel Dashboard** → **Settings** → **Environment Variables**:
```
NEXT_PUBLIC_API_URL=https://api-laporin.up.railway.app
```

### 3. Frontend Otomatis Connect

Frontend sudah dikonfigurasi untuk menggunakan `NEXT_PUBLIC_API_URL`:
- File: `lib/api.ts` - API client
- File: `lib/socket.ts` - WebSocket client

---

## 🧪 Test Deployment

### 1. Test Frontend URL

Setelah deploy, Vercel akan generate URL:
- Production: `https://laporin.vercel.app` (atau custom domain)
- Preview: `https://laporin-git-main.vercel.app`

### 2. Test API Connection

Buka browser console di frontend:
```javascript
// Test API connection
fetch('/api/health')
  .then(r => r.json())
  .then(console.log)
```

### 3. Test Login

1. Buka frontend URL
2. Coba login dengan admin kelurahan:
   - Email: `abhisuryanu9roho@gmail.com`
   - Password: `AdminKelurahan123!`

---

## 🔄 Auto Deploy dari GitHub

**Vercel otomatis deploy setiap push ke GitHub:**

1. **Push ke GitHub:**
   ```bash
   git push origin main
   ```

2. **Vercel otomatis:**
   - Detect perubahan
   - Build project
   - Deploy ke production

3. **Preview Deployments:**
   - Setiap pull request = preview deployment
   - URL preview otomatis di-generate

---

## 🛠️ Troubleshooting

### Frontend Tidak Bisa Connect ke Backend

**Cek:**
1. ✅ `NEXT_PUBLIC_API_URL` sudah di-set di Vercel
2. ✅ URL backend Railway benar
3. ✅ Backend Railway sudah running
4. ✅ CORS sudah dikonfigurasi di backend

**Test:**
```bash
# Test dari browser console
fetch('https://api-laporin.up.railway.app/api/health')
  .then(r => r.json())
  .then(console.log)
```

### Build Error di Vercel

**Cek:**
1. ✅ `package.json` sudah benar
2. ✅ Dependencies lengkap
3. ✅ Build command: `npm run build`
4. ✅ Node.js version compatible

**View Logs:**
- Vercel Dashboard → **Deployments** → **View Logs**

### Environment Variables Tidak Terdeteksi

**Solusi:**
1. ✅ Pastikan variable name: `NEXT_PUBLIC_API_URL` (harus `NEXT_PUBLIC_` prefix)
2. ✅ Set untuk semua environments (Production, Preview, Development)
3. ✅ Redeploy setelah set variables

---

## 📱 Update Mobile App

Setelah backend dan frontend deployed, update mobile app:

**File:** `laporin_app/lib/config/api_config.dart`

```dart
static const String baseUrl = 'https://api-laporin.up.railway.app/api';
```

---

## 🎯 Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │  ────>  │    Backend      │
│   (Vercel)      │  HTTPS  │   (Railway)     │
│                 │         │                 │
│ Next.js App     │  <────  │  Node.js API    │
│                 │  WebSocket│                │
└─────────────────┘         └─────────────────┘
     │                              │
     │                              │
     └──────────> Database (Railway PostgreSQL)
```

**Flow:**
1. User akses frontend (Vercel)
2. Frontend call API ke backend (Railway)
3. Backend query database (Railway PostgreSQL)
4. Response kembali ke frontend

---

## ✅ Checklist Deployment

- [ ] Push code ke GitHub
- [ ] Deploy backend ke Railway
- [ ] Dapatkan Railway backend URL
- [ ] Deploy frontend ke Vercel
- [ ] Set `NEXT_PUBLIC_API_URL` di Vercel
- [ ] Test API connection dari frontend
- [ ] Test login dengan admin kelurahan
- [ ] Update mobile app dengan API URL
- [ ] Test end-to-end flow

---

## 🎉 Deployment Complete!

Setelah semua selesai:
- ✅ Frontend: `https://laporin.vercel.app` (atau custom domain)
- ✅ Backend: `https://api-laporin.up.railway.app`
- ✅ Database: Railway PostgreSQL
- ✅ Semua terhubung dan berfungsi!

---

## 📚 Quick Commands

### Deploy Manual (jika perlu):

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Update Environment Variables:

```bash
# Via Vercel CLI
vercel env add NEXT_PUBLIC_API_URL production
# Masukkan: https://api-laporin.up.railway.app
```

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app

