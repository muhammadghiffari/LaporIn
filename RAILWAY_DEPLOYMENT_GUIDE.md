# 🚂 Panduan Deployment Railway - LaporIn

Panduan lengkap untuk mendeploy LaporIn ke Railway dengan konfigurasi yang benar.

---

## 📋 Struktur Deployment

- **Frontend (Next.js)**: Deploy ke **Vercel** ✅
- **Backend (Express)**: Deploy ke **Railway** ✅

---

## ⚠️ Penting: Jangan Deploy Frontend ke Railway!

Frontend Next.js **HARUS** di-deploy ke Vercel, bukan Railway. Railway hanya untuk backend.

Jika Anda melihat `railway.json` di root project, **HAPUS** file tersebut karena itu akan membuat Railway deploy frontend.

---

## 🚀 Deployment Backend ke Railway

### 1. Setup Service di Railway Dashboard

1. Buka [Railway Dashboard](https://railway.app)
2. Klik **New Project** → **Deploy from GitHub repo**
3. Pilih repository **LaporIn**
4. **PENTING**: Pilih folder **`backend`** sebagai **Root Directory**
   - Di Railway, saat connect GitHub repo, ada opsi "Root Directory"
   - Set ke: `backend`
5. Railway akan otomatis detect `backend/Dockerfile` dan `backend/railway.json`

### 2. Verifikasi Konfigurasi

Pastikan di Railway dashboard:
- **Service Name**: `backend` atau `api-laporin`
- **Root Directory**: `backend`
- **Builder**: `DOCKERFILE`
- **Dockerfile Path**: `Dockerfile` (relative ke root directory, jadi `backend/Dockerfile`)

### 3. Set Environment Variables

Di Railway dashboard → Service → Variables, tambahkan:

```env
# Database
DATABASE_URL=postgresql://... (Railway auto-set jika pakai Railway PostgreSQL)

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long

# Server
PORT=3001
NODE_ENV=production

# Email (untuk OTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=abhisuryanu9roho@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@laporin.com

# AI (Groq)
GROQ_API_KEY=your_groq_api_key

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Blockchain (optional)
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key
CONTRACT_ADDRESS=0xYourContractAddress
```

### 4. Setup Database

1. Di Railway dashboard, tambahkan **PostgreSQL** service
2. Railway akan auto-generate `DATABASE_URL`
3. Set `DATABASE_URL` di backend service variables

### 5. Run Database Migration

Setelah deploy pertama, jalankan:

```bash
# Via Railway CLI
railway run --service backend npx prisma db push

# Atau via Railway Terminal (di dashboard)
npx prisma db push
```

### 6. Seed Admin Kelurahan

```bash
# Via Railway CLI
railway run --service backend npm run seed:admin-kelurahan

# Atau via Railway Terminal
npm run seed:admin-kelurahan
```

---

## 🔍 Troubleshooting

### Problem: Railway Deploy Frontend Instead of Backend

**Gejala:**
- URL mengembalikan 404 dengan `X-Powered-By: Next.js`
- Request ke `/api/auth/login` tidak ditemukan

**Solusi:**
1. Hapus `railway.json` di root project (jika ada)
2. Pastikan Railway service menggunakan **Root Directory: `backend`**
3. Verifikasi `backend/railway.json` ada dan benar

### Problem: Build Failed

**Gejala:**
- Error: `sh: next: not found`
- Error: `/app/.next/standalone` not found

**Solusi:**
- Pastikan deploy dari folder `backend/`, bukan root
- Pastikan `backend/Dockerfile` digunakan, bukan root `Dockerfile`

### Problem: API Not Responding

**Gejala:**
- 502 Bad Gateway
- Connection refused

**Solusi:**
1. Cek Railway logs untuk error
2. Pastikan environment variables sudah di-set
3. Pastikan database sudah connected
4. Cek `PORT` environment variable (Railway auto-set, jangan ubah)

---

## ✅ Checklist Deployment

- [ ] Hapus `railway.json` di root (jika ada)
- [ ] Railway service menggunakan Root Directory: `backend`
- [ ] `DATABASE_URL` sudah di-set
- [ ] `JWT_SECRET` sudah di-set
- [ ] Database migration sudah dijalankan (`npx prisma db push`)
- [ ] Admin kelurahan sudah di-seed
- [ ] Test API: `curl https://your-backend-url.up.railway.app/api/health`
- [ ] Frontend di Vercel sudah set `NEXT_PUBLIC_API_URL` ke backend URL

---

## 📝 Catatan

- **Backend URL**: `https://api-weladalah-laporin.up.railway.app` (contoh)
- **Frontend URL**: `https://laporin.vercel.app` (contoh)
- Frontend harus set `NEXT_PUBLIC_API_URL` di Vercel environment variables
- Mobile app harus set `API_BASE_URL` ke backend URL

---

## 🔗 Referensi

- [Backend Railway Setup](./backend/RAILWAY_SETUP.md)
- [Backend Railway Control Guide](./backend/RAILWAY_CONTROL_GUIDE.md)
- [Frontend Vercel Deployment](./VERCEL_DEPLOY_GUIDE.md)

