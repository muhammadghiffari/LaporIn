# 🎮 Panduan Kontrol Railway dari Laptop

Panduan lengkap untuk mengontrol dan mengelola backend LaporIn di Railway **langsung dari laptop Anda** tanpa perlu install Docker atau tools tambahan.

---

## ❓ FAQ: Apakah Perlu Download Docker?

**Jawaban: TIDAK PERLU!** 🎉

Railway bisa deploy langsung dari:
- ✅ **GitHub** (recommended) - Railway otomatis deploy saat push ke GitHub
- ✅ **Railway CLI** (optional) - Untuk kontrol lebih lanjut
- ✅ **Railway Dashboard** (web) - Kontrol via browser

Docker hanya digunakan **di server Railway**, bukan di laptop Anda.

---

## 🚀 Cara Deploy ke Railway (3 Metode)

### Metode 1: Deploy via GitHub (Paling Mudah) ⭐

1. **Push code ke GitHub**
   ```bash
   git add .
   git commit -m "Deploy to Railway"
   git push origin main
   ```

2. **Connect Railway ke GitHub**
   - Buka [Railway Dashboard](https://railway.app)
   - Klik **New Project** → **Deploy from GitHub repo**
   - Pilih repository **LaporIn**
   - Pilih folder **backend** sebagai root directory
   - Railway otomatis detect `Dockerfile` dan deploy

3. **Selesai!** Railway akan otomatis:
   - Build Docker image
   - Deploy ke server
   - Generate URL (contoh: `https://api-laporin.up.railway.app`)

**Keuntungan:**
- ✅ Setiap push ke GitHub = auto deploy
- ✅ Tidak perlu install apapun di laptop
- ✅ History deployment otomatis

---

### Metode 2: Deploy via Railway CLI (Kontrol Lebih Lanjut)

**Install Railway CLI** (hanya sekali):
```bash
# macOS
brew install railway

# Atau via npm
npm i -g @railway/cli
```

**Login & Deploy:**
```bash
# Login ke Railway
railway login

# Link ke project Railway
railway link

# Deploy
railway up
```

**Keuntungan:**
- ✅ Kontrol penuh dari terminal
- ✅ Bisa run command langsung di server
- ✅ Bisa akses database dari laptop

---

### Metode 3: Deploy via Railway Dashboard (Manual)

1. Buka [Railway Dashboard](https://railway.app)
2. Klik **New Project** → **Empty Project**
3. Klik **+ New** → **GitHub Repo**
4. Pilih repository dan folder **backend**
5. Railway otomatis deploy

---

## 🎛️ Kontrol dari Laptop

### 1. Kontrol Database dari Laptop

#### Via Railway Dashboard:
1. Buka Railway Dashboard → Project → **PostgreSQL** service
2. Klik tab **Data** → Buka **Railway Data**
3. Bisa query, edit, delete data langsung dari browser

#### Via Prisma Studio (Dari Laptop):
```bash
# Install Railway CLI dulu (jika belum)
npm i -g @railway/cli

# Login
railway login

# Link ke project
railway link

# Run Prisma Studio dengan DATABASE_URL dari Railway
railway run npx prisma studio
```

Prisma Studio akan buka di browser: `http://localhost:5555`

#### Via psql (Command Line):
```bash
# Dapatkan DATABASE_URL dari Railway
railway variables

# Connect ke database
railway run psql $DATABASE_URL

# Atau langsung query
railway run psql $DATABASE_URL -c "SELECT * FROM users LIMIT 10;"
```

---

### 2. Kontrol Backend/API dari Laptop

#### Lihat Logs Real-time:
```bash
# Via Railway CLI
railway logs

# Atau via dashboard
# Railway Dashboard → Service → Deployments → View Logs
```

#### Restart Server:
```bash
# Via Railway CLI
railway restart

# Atau via dashboard
# Railway Dashboard → Service → Settings → Restart
```

#### Update Environment Variables:
```bash
# Via Railway CLI
railway variables set JWT_SECRET=your_new_secret

# Atau via dashboard
# Railway Dashboard → Service → Variables → Add/Edit
```

#### Run Command di Server:
```bash
# Run npm script
railway run npm run seed

# Run Prisma migration
railway run npx prisma db push

# Run custom command
railway run node scripts/your-script.js
```

---

### 3. Kontrol WebSocket dari Laptop

WebSocket otomatis bekerja jika backend sudah running. Test dari laptop:

```bash
# Test WebSocket connection
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://api-laporin.up.railway.app

# Atau test via browser console
# Buka browser → Console → Run:
const socket = io('https://api-laporin.up.railway.app');
socket.on('connect', () => console.log('Connected!'));
```

---

### 4. Kontrol API dari Laptop

#### Test API Endpoints:
```bash
# Health check
curl https://api-laporin.up.railway.app/api/health

# Test login
curl -X POST https://api-laporin.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test dengan authentication
curl https://api-laporin.up.railway.app/api/reports \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Monitor API:
- Railway Dashboard → Service → **Metrics** (lihat CPU, Memory, Requests)
- Railway Dashboard → Service → **Logs** (lihat request logs)

---

## 📊 Database Management dari Laptop

### Setup Database Schema:
```bash
# Push schema ke database
railway run npx prisma db push

# Atau migrate (jika pakai migrations)
railway run npx prisma migrate deploy
```

### Seed Database:
```bash
# Seed data awal
railway run npm run seed

# Seed dengan lokasi Jakarta
railway run npm run seed:location
```

### Backup Database:
```bash
# Export database
railway run pg_dump $DATABASE_URL > backup.sql

# Import database
railway run psql $DATABASE_URL < backup.sql
```

### Access Database via GUI:
1. **Railway Data** (Built-in):
   - Railway Dashboard → PostgreSQL → **Data** tab
   - Bisa query, edit, export langsung

2. **Prisma Studio** (Recommended):
   ```bash
   railway run npx prisma studio
   ```
   Buka `http://localhost:5555` di browser

3. **DBeaver / TablePlus** (External):
   - Dapatkan `DATABASE_URL` dari Railway
   - Connect menggunakan connection string tersebut

---

## 🔧 Environment Variables Management

### Lihat Semua Variables:
```bash
# Via CLI
railway variables

# Via Dashboard
# Railway Dashboard → Service → Variables
```

### Set Variable:
```bash
# Via CLI
railway variables set JWT_SECRET=your_secret_key
railway variables set GROQ_API_KEY=your_groq_key

# Via Dashboard
# Railway Dashboard → Service → Variables → Add Variable
```

### Delete Variable:
```bash
# Via CLI
railway variables unset VARIABLE_NAME

# Via Dashboard
# Railway Dashboard → Service → Variables → Delete
```

---

## 🚨 Troubleshooting dari Laptop

### Server Tidak Start:
```bash
# Cek logs
railway logs

# Cek environment variables
railway variables

# Test connection
railway run node -e "console.log('OK')"
```

### Database Connection Error:
```bash
# Test database connection
railway run npx prisma db push

# Cek DATABASE_URL
railway variables | grep DATABASE_URL
```

### API Tidak Accessible:
```bash
# Test health endpoint
curl https://api-laporin.up.railway.app/api/health

# Cek service status
railway status

# View deployment logs
railway logs --deployment latest
```

---

## 📱 Update Frontend/Mobile App

Setelah backend deployed, update API URL:

### Web App (Next.js):
File: `.env.local` atau `.env.production`
```env
NEXT_PUBLIC_API_URL=https://api-laporin.up.railway.app
```

### Mobile App (Flutter):
File: `laporin_app/lib/config/api_config.dart`
```dart
static const String baseUrl = 'https://api-laporin.up.railway.app/api';
```

---

## 🎯 Quick Commands Cheat Sheet

```bash
# Login
railway login

# Link project
railway link

# Deploy
railway up

# View logs
railway logs

# Run command
railway run <command>

# Set variable
railway variables set KEY=value

# View variables
railway variables

# Restart service
railway restart

# Open dashboard
railway open

# Prisma Studio
railway run npx prisma studio

# Database shell
railway run psql $DATABASE_URL
```

---

## ✅ Checklist Setup

- [ ] Push code ke GitHub
- [ ] Connect Railway ke GitHub repo
- [ ] Set environment variables (JWT_SECRET, DATABASE_URL, dll)
- [ ] Deploy backend
- [ ] Test health endpoint
- [ ] Setup database schema (`railway run npx prisma db push`)
- [ ] Seed database (optional)
- [ ] Update frontend/mobile app dengan API URL baru
- [ ] Test API endpoints
- [ ] Monitor logs dan metrics

---

## 🎉 Selesai!

Sekarang Anda bisa kontrol semua dari laptop:
- ✅ Database (via Prisma Studio, Railway Data, atau psql)
- ✅ Backend/API (via Railway CLI atau Dashboard)
- ✅ WebSocket (otomatis, test via browser)
- ✅ Environment Variables (via CLI atau Dashboard)
- ✅ Logs & Monitoring (via Dashboard atau CLI)

**Tidak perlu install Docker di laptop!** Railway handle semua di cloud. 🚀

---

**Need Help?** 
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

