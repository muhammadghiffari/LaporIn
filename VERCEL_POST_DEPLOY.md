# ✅ Checklist Setelah Deploy ke Vercel

Panduan untuk memastikan semua sudah benar setelah deploy frontend ke Vercel.

---

## 🔍 Step 1: Verifikasi Environment Variables

**Vercel Dashboard** → **Project** → **Settings** → **Environment Variables**

Pastikan sudah di-set:

### Required:
```
NEXT_PUBLIC_API_URL=https://api-laporin.up.railway.app
```
⚠️ **Ganti dengan URL Railway backend Anda yang sebenarnya!**

### Recommended:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```
⚠️ **Dapatkan API key dari Google Cloud Console!** Jangan commit API key ke repository!

**Catatan:**
- ✅ Set untuk semua environments: **Production, Preview, Development**
- ✅ Pastikan tidak ada typo di variable name
- ✅ Pastikan URL backend benar (tanpa trailing slash `/`)

---

## 🧪 Step 2: Test Deployment

### 1. Test Frontend URL

Buka URL Vercel Anda (contoh: `https://laporin.vercel.app`)

**Cek:**
- ✅ Halaman login muncul
- ✅ Logo LaporIn muncul
- ✅ Tidak ada error di console (F12 → Console)

### 2. Test API Connection

Buka browser console (F12) dan run:

```javascript
// Test API connection
fetch('/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**Expected:** Response dari backend Railway

**Jika error:**
- ✅ Cek `NEXT_PUBLIC_API_URL` sudah benar
- ✅ Cek backend Railway sudah running
- ✅ Cek CORS di backend (harus allow Vercel domain)

### 3. Test Login

1. Buka halaman login
2. Login dengan admin kelurahan:
   - Email: `abhisuryanu9roho@gmail.com`
   - Password: `AdminKelurahan123!`

**Cek:**
- ✅ Login berhasil
- ✅ Redirect ke dashboard
- ✅ Data muncul di dashboard

### 4. Test Google Maps (jika sudah di-set)

1. Login sebagai admin
2. Buka halaman **Peta Laporan** (`/admin/peta-laporan`)

**Cek:**
- ✅ Peta Google Maps muncul
- ✅ Tidak ada error "Google Maps API key not found"
- ✅ Laporan muncul di peta (jika ada data)

---

## 🔧 Step 3: Cek Backend Railway

### Pastikan Backend Sudah Running:

```bash
# Test health check
curl https://api-laporin.up.railway.app/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "message": "LaporIn API is running"
}
```

### Pastikan Environment Variables di Railway:

**Railway Dashboard** → **Service (backend)** → **Variables**

Required:
- ✅ `DATABASE_URL`
- ✅ `JWT_SECRET`
- ✅ `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASSWORD` (untuk OTP)
- ✅ `GOOGLE_MAPS_API_KEY` (untuk geocoding)

---

## 🐛 Troubleshooting

### Frontend Tidak Bisa Connect ke Backend

**Error:** `Network Error` atau `CORS Error`

**Solusi:**
1. ✅ Cek `NEXT_PUBLIC_API_URL` di Vercel sudah benar
2. ✅ Cek backend Railway sudah running
3. ✅ Cek CORS di backend - harus allow Vercel domain

**Cek CORS di backend:**
File: `backend/server.js` atau `backend/app.js`
```javascript
// Pastikan CORS allow Vercel domain
app.use(cors({
  origin: [
    'https://laporin.vercel.app',
    'https://*.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

### Login Error

**Error:** `Invalid credentials` atau `Network Error`

**Solusi:**
1. ✅ Cek backend Railway sudah running
2. ✅ Cek `NEXT_PUBLIC_API_URL` benar
3. ✅ Test backend langsung: `curl https://api-laporin.up.railway.app/api/auth/login`
4. ✅ Cek logs di Railway untuk error detail

### Google Maps Tidak Muncul

**Error:** `Google Maps API key not found`

**Solusi:**
1. ✅ Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` di Vercel
2. ✅ Pastikan prefix `NEXT_PUBLIC_` ada
3. ✅ Redeploy setelah set variable
4. ✅ Cek browser console untuk error detail

**Error:** `RefererNotAllowedMapError`

**Solusi:**
1. ✅ Buka Google Cloud Console
2. ✅ Edit API Key restrictions
3. ✅ Add HTTP referrer: `https://*.vercel.app/*`

---

## ✅ Final Checklist

### Frontend (Vercel):
- [ ] `NEXT_PUBLIC_API_URL` sudah di-set (URL Railway backend)
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` sudah di-set (optional)
- [ ] Frontend bisa diakses via Vercel URL
- [ ] Login berhasil
- [ ] Dashboard muncul
- [ ] Peta muncul (jika Google Maps API key sudah di-set)

### Backend (Railway):
- [ ] Backend sudah deployed dan running
- [ ] Health check endpoint berhasil
- [ ] Database connected
- [ ] Admin kelurahan sudah di-seed
- [ ] Environment variables lengkap
- [ ] CORS allow Vercel domain

### Integration:
- [ ] Frontend bisa call API ke backend
- [ ] Login flow berfungsi
- [ ] Data muncul di dashboard
- [ ] WebSocket connection (jika digunakan)

---

## 🎉 Deployment Complete!

Jika semua checklist sudah ✅, deployment Anda sudah selesai!

**Frontend URL:** `https://laporin.vercel.app` (atau custom domain)
**Backend URL:** `https://api-laporin.up.railway.app`

**Next Steps:**
1. Test semua fitur utama
2. Setup custom domain (optional)
3. Monitor logs dan errors
4. Update mobile app dengan API URL baru

---

**Need Help?**
- Vercel Logs: Vercel Dashboard → Deployments → View Logs
- Railway Logs: Railway Dashboard → Service → Logs
- Browser Console: F12 → Console (untuk frontend errors)

