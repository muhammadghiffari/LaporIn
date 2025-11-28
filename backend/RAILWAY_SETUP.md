# 🚂 Railway Deployment Setup - LaporIn Backend

Panduan lengkap setup backend LaporIn di Railway setelah deployment pertama.

---

## ✅ Status Deployment

Dari log deployment, backend sudah berhasil di-deploy:
- ✅ Server running di port 8080 (Railway auto-assign)
- ✅ Database sudah sync dengan schema
- ⚠️ Beberapa environment variables perlu di-set

---

## 🔧 Setup Environment Variables

### 1. Buka Railway Dashboard

1. Login ke [Railway](https://railway.app)
2. Pilih project **LaporIn**
3. Pilih service **backend**
4. Klik tab **Variables**

### 2. Set Required Variables

Tambahkan environment variables berikut:

#### Minimum Required:
```env
DATABASE_URL=postgresql://... (Railway auto-set jika menggunakan Railway PostgreSQL)
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
PORT=8080 (Railway auto-set, jangan ubah)
NODE_ENV=production
```

#### Recommended (untuk fitur lengkap):
```env
GROQ_API_KEY=your_groq_api_key_here
# Dapatkan gratis di: https://console.groq.com

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@laporin.com

GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Blockchain (optional)
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key_without_0x_prefix
CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

### 3. Cara Mendapatkan API Keys

#### GROQ_API_KEY (Gratis):
1. Buka https://console.groq.com
2. Sign up / Login
3. Create API Key
4. Copy dan paste ke Railway Variables

#### EMAIL (Gmail):
1. Enable 2-Step Verification di Google Account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Copy App Password (bukan password biasa)
4. Set sebagai `EMAIL_PASSWORD`

#### GOOGLE_MAPS_API_KEY:
1. Buka https://console.cloud.google.com
2. Create project atau pilih existing
3. Enable "Maps JavaScript API" dan "Geocoding API"
4. Create API Key
5. Copy dan paste ke Railway Variables

---

## 🔄 Redeploy Setelah Set Variables

Setelah set environment variables, Railway akan otomatis redeploy. Atau manual:

1. Di Railway dashboard → Service → Settings
2. Klik **Redeploy**

---

## 🧪 Test Deployment

### 1. Dapatkan URL Backend

Di Railway dashboard → Service → Settings → **Generate Domain**

Atau cek di **Deployments** → Copy URL (format: `https://your-service-name.up.railway.app`)

### 2. Test Health Check

```bash
curl https://your-service-name.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "LaporIn API is running"
}
```

### 3. Test API Endpoint

```bash
# Test dengan API key jika diperlukan
curl https://your-service-name.up.railway.app/api/auth/users
```

---

## 📱 Update Frontend/Mobile App

Setelah backend deployed, update API URL di:

### Web App (Next.js):
File: `.env.local` atau `.env.production`
```env
NEXT_PUBLIC_API_URL=https://your-service-name.up.railway.app
```

### Mobile App (Flutter):
File: `lib/config/api_config.dart`
```dart
static const String baseUrl = 'https://your-service-name.up.railway.app';
```

---

## ⚠️ Optional: Setup Face Recognition Models

Face recognition models tidak otomatis ter-download. Jika perlu fitur face recognition:

### Option 1: Download Models di Build Time

Update `Dockerfile` untuk download models saat build:

```dockerfile
# Setelah COPY . .
RUN npm run download:face-models || echo "Models download failed, will use fallback"
```

### Option 2: Download Models di Runtime

Jalankan di Railway shell:
```bash
railway run npm run download:face-models
```

**Note:** Face recognition adalah optional feature. Backend tetap berfungsi tanpa models (hanya fitur face recognition yang tidak akan bekerja).

---

## 🔍 Troubleshooting

### Server tidak start
- Cek logs di Railway dashboard → Deployments → View Logs
- Pastikan semua required environment variables sudah di-set
- Pastikan `DATABASE_URL` valid

### Database connection error
- Pastikan `DATABASE_URL` sudah di-set dengan benar
- Pastikan database sudah provisioned (Railway PostgreSQL atau external)
- Test connection dengan: `railway run npx prisma db push`

### API tidak accessible
- Cek apakah service sudah deployed (status: Active)
- Cek domain/URL di Railway dashboard
- Test health check endpoint

### GROQ_API_KEY warning
- Ini hanya warning, backend tetap berjalan
- AI chatbot akan menggunakan keyword-based fallback
- Untuk fitur AI penuh, set `GROQ_API_KEY`

---

## 📚 Next Steps

1. ✅ Set environment variables di Railway
2. ✅ Test API endpoints
3. ✅ Update frontend/mobile app dengan API URL baru
4. ✅ (Optional) Download face recognition models
5. ✅ Setup monitoring/logging (Railway built-in)

---

## 🎉 Deployment Complete!

Backend LaporIn sudah berhasil di-deploy di Railway! 

**API URL:** `https://your-service-name.up.railway.app`

**Health Check:** `https://your-service-name.up.railway.app/api/health`

---

**Need Help?** Check `DEPLOYMENT.md` atau buat issue di GitHub repository.

