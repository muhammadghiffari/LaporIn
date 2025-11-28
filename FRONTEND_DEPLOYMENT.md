# 🚀 Panduan Deployment Frontend LaporIn

Panduan lengkap untuk mendeploy frontend Next.js LaporIn ke berbagai platform.

---

## 📋 Prerequisites

Sebelum deploy, pastikan:
- ✅ Backend sudah di-deploy (Railway: `https://api-laporin.up.railway.app`)
- ✅ Environment variables sudah disiapkan
- ✅ Google Maps API Key sudah didapatkan (untuk fitur peta)

---

## ☁️ Deployment Options

### Option 1: Vercel (Recommended untuk Next.js) ⚡

Vercel adalah platform yang dibuat khusus untuk Next.js, sangat mudah dan cepat.

#### 1. Install Vercel CLI (Optional)

```bash
npm i -g vercel
```

#### 2. Deploy via CLI

```bash
# Login
vercel login

# Deploy
vercel

# Deploy ke production
vercel --prod
```

#### 3. Deploy via GitHub (Recommended)

1. **Connect Repository:**
   - Login ke [Vercel](https://vercel.com)
   - New Project → Import Git Repository
   - Pilih repository LaporIn

2. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detect)
   - **Root Directory:** `/` (root project)
   - **Build Command:** `npm run build` (auto)
   - **Output Directory:** `.next` (auto)
   - **Install Command:** `npm install` (auto)

3. **Set Environment Variables:**
   - Di Vercel dashboard → Project → Settings → Environment Variables
   - Tambahkan:
     ```env
     NEXT_PUBLIC_API_URL=https://api-laporin.up.railway.app
     NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
     ```

4. **Deploy:**
   - Klik **Deploy**
   - Vercel akan otomatis build dan deploy

5. **Custom Domain (Optional):**
   - Settings → Domains
   - Add domain: `laporin.com` atau `www.laporin.com`
   - Update DNS di DomaiNesia sesuai instruksi Vercel

#### Keuntungan Vercel:
- ✅ Auto-deploy dari GitHub
- ✅ SSL/HTTPS otomatis
- ✅ CDN global
- ✅ Preview deployments untuk setiap PR
- ✅ Analytics built-in

---

### Option 2: Railway 🚂

#### 1. Install Railway CLI

```bash
npm i -g @railway/cli
railway login
```

#### 2. Deploy

```bash
# Di root project (bukan di backend/)
railway init
railway up
```

#### 3. Set Environment Variables

Di Railway dashboard:
- Project → Service → Variables
- Tambahkan:
  ```env
  NEXT_PUBLIC_API_URL=https://api-laporin.up.railway.app
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
  NODE_ENV=production
  ```

#### 4. Configure Build

Railway akan auto-detect Next.js, tapi pastikan:
- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Port:** 3000 (Railway auto-assign)

---

### Option 3: Render 🎨

#### 1. Connect Repository

- Login ke [Render](https://render.com)
- New → Static Site (atau Web Service untuk SSR)
- Connect GitHub repository

#### 2. Configure

**Untuk Static Export (jika menggunakan static):**
- **Build Command:** `npm run build`
- **Publish Directory:** `out`

**Untuk Web Service (SSR):**
- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Environment:** Node 20

#### 3. Set Environment Variables

- Tambahkan di Render dashboard:
  ```env
  NEXT_PUBLIC_API_URL=https://api-laporin.up.railway.app
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
  ```

---

### Option 4: Docker + VPS 🐳

#### 1. Build Docker Image

```bash
docker build -t laporin-frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://api-laporin.up.railway.app \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key \
  .
```

#### 2. Run Container

```bash
docker run -d \
  --name laporin-frontend \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api-laporin.up.railway.app \
  -e NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key \
  laporin-frontend
```

#### 3. Setup Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name laporin.com www.laporin.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔧 Environment Variables

### Required Variables

```env
# Backend API URL (dari Railway deployment)
NEXT_PUBLIC_API_URL=https://api-laporin.up.railway.app
```

### Optional but Recommended

```env
# Google Maps API Key (untuk fitur peta)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Cara Mendapatkan Google Maps API Key

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Create project atau pilih existing
3. Enable APIs:
   - Maps JavaScript API
   - Geocoding API
   - Places API (optional)
4. Create API Key
5. Restrict API Key (recommended untuk production):
   - Application restrictions: HTTP referrers
   - API restrictions: Pilih APIs yang di-enable

---

## 🔄 Update API URL

Setelah backend deployed, update API URL di:

### 1. Environment Variables (Production)

**Vercel:**
- Dashboard → Project → Settings → Environment Variables
- Update `NEXT_PUBLIC_API_URL`

**Railway:**
- Dashboard → Service → Variables
- Update `NEXT_PUBLIC_API_URL`

**Local Development:**
- Buat file `.env.local`:
  ```env
  NEXT_PUBLIC_API_URL=https://api-laporin.up.railway.app
  ```

### 2. Code (jika perlu)

File: `lib/api.ts` dan `lib/socket.ts` sudah menggunakan `process.env.NEXT_PUBLIC_API_URL`, jadi tidak perlu diubah.

---

## 🌐 Custom Domain Setup

### Untuk Vercel

1. **Add Domain:**
   - Vercel Dashboard → Project → Settings → Domains
   - Add domain: `laporin.com`

2. **Update DNS di DomaiNesia:**
   - Type: `A` atau `CNAME`
   - Name: `@` (atau `www`)
   - Value: Sesuai instruksi Vercel (biasanya IP atau CNAME)

3. **SSL:**
   - Vercel otomatis setup SSL dengan Let's Encrypt

### Untuk Railway

1. **Add Custom Domain:**
   - Railway Dashboard → Service → Settings → Custom Domain
   - Add domain: `laporin.com`

2. **Update DNS:**
   - Type: `CNAME`
   - Name: `@` atau `www`
   - Value: Sesuai yang Railway berikan

---

## ✅ Post-Deployment Checklist

- [ ] Environment variables sudah di-set dengan benar
- [ ] API URL mengarah ke backend yang sudah deployed
- [ ] Frontend bisa mengakses backend API
- [ ] Login/Register berfungsi
- [ ] Dashboard bisa diakses
- [ ] Peta laporan berfungsi (jika Google Maps API Key sudah di-set)
- [ ] Custom domain sudah setup (jika menggunakan)
- [ ] SSL/HTTPS aktif

---

## 🧪 Testing Deployment

### 1. Test Homepage

```bash
curl https://your-frontend-domain.com
```

### 2. Test API Connection

Buka browser console di frontend dan cek:
- Tidak ada CORS error
- API calls berhasil
- Socket.io connection berhasil

### 3. Test Features

- ✅ Login/Register
- ✅ Dashboard
- ✅ Create Report
- ✅ View Reports
- ✅ Chatbot (jika backend sudah set GROQ_API_KEY)

---

## 🔍 Troubleshooting

### Build Error

**Error: Module not found**
```bash
# Pastikan dependencies terinstall
npm install
```

**Error: Environment variable not found**
- Pastikan environment variables sudah di-set di platform
- Pastikan menggunakan prefix `NEXT_PUBLIC_` untuk client-side variables

### API Connection Error

**CORS Error:**
- Pastikan backend CORS sudah allow frontend domain
- Cek `backend/server.js` → CORS configuration

**404 Not Found:**
- Pastikan `NEXT_PUBLIC_API_URL` sudah benar
- Pastikan backend sudah running

### Socket.io Connection Error

- Pastikan `NEXT_PUBLIC_API_URL` sudah benar (tanpa `/api`)
- Cek backend Socket.io configuration

---

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

## 🎉 Deployment Complete!

Frontend LaporIn sudah berhasil di-deploy!

**Frontend URL:** `https://your-frontend-domain.com`

**Backend API:** `https://api-laporin.up.railway.app`

---

**Need Help?** Check documentation atau buat issue di GitHub repository.

