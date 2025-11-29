# ✅ Checklist Deployment Railway - LaporIn Backend

Panduan step-by-step untuk deploy backend LaporIn ke Railway dengan setup lengkap.

---

## 📋 Pre-Deployment Checklist

### 1. ✅ Setup Database & Admin Kelurahan

**Jalankan seed untuk membuat admin kelurahan:**

```bash
# Dari laptop (setelah connect ke Railway)
railway run npm run seed:admin-kelurahan
```

**Atau via Railway Dashboard:**
1. Railway Dashboard → Service → **Shell**
2. Run: `npm run seed:admin-kelurahan`

**Hasil:**
- ✅ Admin Kelurahan dibuat dengan email: `abhisuryanu9roho@gmail.com`
- ✅ Password default: `AdminKelurahan123!`
- ⚠️ **PENTING:** Ganti password setelah login pertama!

---

### 2. ✅ Verifikasi OTP Email Sudah Terintegrasi

**Status:** ✅ **SUDAH TERUPDATE!**

Registrasi sekarang **WAJIB** menggunakan OTP email:
- ✅ Endpoint `/api/auth/send-verification-code` - Kirim OTP
- ✅ Endpoint `/api/auth/verify-code` - Verifikasi OTP
- ✅ Endpoint `/api/auth/register` - Registrasi dengan OTP

**Flow Registrasi:**
1. User minta OTP → `POST /api/auth/send-verification-code`
2. User terima OTP via email
3. User verifikasi OTP → `POST /api/auth/verify-code`
4. User registrasi dengan OTP → `POST /api/auth/register` (include `verificationCode`)

---

## 🚀 Deployment Steps

### Step 1: Push Code ke GitHub

```bash
git add .
git commit -m "Setup admin kelurahan & OTP registration"
git push origin main
```

---

### Step 2: Setup Railway Project

1. **Buka Railway Dashboard:** https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. Pilih repository **LaporIn**
4. Pilih folder **backend** sebagai root directory
5. Railway otomatis detect `Dockerfile` dan deploy

---

### Step 3: Setup Database

1. **Add PostgreSQL Service:**
   - Railway Dashboard → Project → **+ New** → **Database** → **PostgreSQL**
   - Railway otomatis set `DATABASE_URL` environment variable

2. **Setup Database Schema:**
   ```bash
   railway run npx prisma db push
   ```

3. **Seed Admin Kelurahan:**
   ```bash
   railway run npm run seed:admin-kelurahan
   ```

---

### Step 4: Setup Environment Variables

**Railway Dashboard → Service → Variables → Add:**

#### Required Variables:
```env
DATABASE_URL=postgresql://... (Auto-set oleh Railway PostgreSQL)
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
NODE_ENV=production
PORT=8080 (Auto-set oleh Railway, jangan ubah)
```

#### Email Configuration (untuk OTP):
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=abhisuryanu9roho@gmail.com
EMAIL_PASSWORD=your_app_password (16-digit App Password dari Gmail)
EMAIL_FROM=abhisuryanu9roho@gmail.com
```

**Catatan:**
- ✅ Bisa pakai email yang sama dengan admin kelurahan (`abhisuryanu9roho@gmail.com`)
- ✅ Tidak ada masalah sama sekali!
- ⚠️ Pastikan sudah setup **Gmail App Password** (bukan password biasa)
- 📖 Lihat `EMAIL_CONFIG_GUIDE.md` untuk panduan lengkap

**Cara dapatkan Gmail App Password:**
1. Enable 2-Step Verification di Google Account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Copy App Password (bukan password biasa)
4. Set sebagai `EMAIL_PASSWORD`

#### Optional (untuk fitur lengkap):
```env
GROQ_API_KEY=your_groq_api_key (untuk AI chatbot)
GOOGLE_MAPS_API_KEY=your_google_maps_key (untuk geocoding)
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key
CONTRACT_ADDRESS=0xYourContractAddress
```

---

### Step 5: Deploy & Test

1. **Railway otomatis deploy** setelah set environment variables
2. **Atau manual deploy:**
   ```bash
   railway up
   ```

3. **Test Health Check:**
   ```bash
   curl https://api-laporin.up.railway.app/api/health
   ```

4. **Test OTP Email:**
   ```bash
   # Request OTP
   curl -X POST https://api-laporin.up.railway.app/api/auth/send-verification-code \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","type":"registration"}'
   
   # Cek email untuk OTP code
   # Verify OTP (ganti CODE dengan 6 digit dari email)
   curl -X POST https://api-laporin.up.railway.app/api/auth/verify-code \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","code":"123456","type":"registration"}'
   ```

---

## 🧪 Testing Checklist

- [ ] Health check endpoint berhasil
- [ ] Database connection berhasil
- [ ] Admin kelurahan bisa login
- [ ] OTP email terkirim dengan benar
- [ ] Registrasi dengan OTP berhasil
- [ ] Login berhasil
- [ ] API endpoints accessible

---

## 📱 Update Frontend/Mobile App

Setelah backend deployed, update API URL:

### Web App:
File: `.env.local` atau `.env.production`
```env
NEXT_PUBLIC_API_URL=https://api-laporin.up.railway.app
```

### Mobile App:
File: `laporin_app/lib/config/api_config.dart`
```dart
static const String baseUrl = 'https://api-laporin.up.railway.app/api';
```

---

## 🔧 Troubleshooting

### OTP Email Tidak Terkirim
- ✅ Cek `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` sudah benar
- ✅ Pastikan menggunakan Gmail App Password (bukan password biasa)
- ✅ Cek logs: `railway logs` untuk error email

### Admin Kelurahan Tidak Bisa Login
- ✅ Pastikan seed sudah dijalankan: `railway run npm run seed:admin-kelurahan`
- ✅ Cek email: `admin.kelurahan@laporin.com`
- ✅ Password default: `AdminKelurahan123!`

### Database Connection Error
- ✅ Pastikan `DATABASE_URL` sudah di-set
- ✅ Test connection: `railway run npx prisma db push`

---

## ✅ Deployment Complete!

Setelah semua checklist selesai:
- ✅ Backend running di Railway
- ✅ Database setup & seeded
- ✅ Admin kelurahan siap digunakan
- ✅ OTP email verification aktif
- ✅ Ready for production!

**API URL:** `https://api-laporin.up.railway.app`

**Admin Login:**
- Email: `abhisuryanu9roho@gmail.com`
- Password: `AdminKelurahan123!` (⚠️ Ganti setelah login pertama!)

**Email Configuration:**
- EMAIL_USER: `abhisuryanu9roho@gmail.com` (sama dengan admin email - ✅ tidak masalah!)
- EMAIL_PASSWORD: Gmail App Password (16 digit)
- 📖 Lihat `EMAIL_CONFIG_GUIDE.md` untuk detail lengkap

---

**Need Help?** Check `RAILWAY_CONTROL_GUIDE.md` untuk panduan kontrol dari laptop.

