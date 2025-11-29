# 💻 Panduan Terminal/Shell Railway

Railway menyediakan terminal/shell untuk menjalankan command langsung di server. Ada 2 cara akses:

---

## 🎯 Cara 1: Via Railway Dashboard (Paling Mudah) ⭐

### Akses Terminal di Browser:

1. **Buka Railway Dashboard:** https://railway.app
2. **Login** ke akun Anda
3. **Pilih Project** → **Pilih Service** (backend)
4. Klik tab **"Shell"** atau **"Terminal"**
5. **Terminal langsung muncul di browser!** 🎉

**Fitur:**
- ✅ Terminal langsung di browser (tidak perlu install apapun)
- ✅ Bisa run command langsung
- ✅ Real-time output
- ✅ Bisa copy-paste command

**Contoh Command:**
```bash
# Lihat file
ls -la

# Cek environment variables
env | grep DATABASE_URL

# Run Prisma
npx prisma db push

# Seed admin kelurahan
npm run seed:admin-kelurahan

# Cek logs
tail -f logs/app.log
```

---

## 🎯 Cara 2: Via Railway CLI (Lebih Powerful)

### Install Railway CLI:

```bash
# macOS
brew install railway

# Atau via npm
npm i -g @railway/cli
```

### Login & Connect:

```bash
# Login ke Railway
railway login

# Link ke project
railway link

# Buka shell/interactive terminal
railway shell
```

**Keuntungan:**
- ✅ Bisa run command dari terminal lokal
- ✅ Lebih cepat untuk command yang sering digunakan
- ✅ Bisa script automation

**Contoh Command:**
```bash
# Run command langsung (tanpa masuk shell)
railway run npm run seed:admin-kelurahan

# Run Prisma
railway run npx prisma db push

# Run custom script
railway run node scripts/your-script.js

# Masuk ke shell interaktif
railway shell
```

---

## 📋 Command yang Sering Digunakan

### Database Management:

```bash
# Setup database schema
railway run npx prisma db push

# Generate Prisma Client
railway run npx prisma generate

# Seed admin kelurahan
railway run npm run seed:admin-kelurahan

# Prisma Studio (buka di browser)
railway run npx prisma studio

# Database shell (PostgreSQL)
railway run psql $DATABASE_URL
```

### Testing & Debugging:

```bash
# Test connection
railway run node -e "console.log('OK')"

# Cek environment variables
railway variables

# View logs
railway logs

# Test email service
railway run node -e "
const { sendVerificationCodeEmail } = require('./services/emailService');
sendVerificationCodeEmail('test@example.com', '123456', 'registration')
  .then(r => console.log('Result:', r))
  .catch(e => console.error('Error:', e));
"
```

### File Management:

```bash
# Via Railway Dashboard Shell:
ls -la                    # List files
cat package.json          # View file
pwd                      # Current directory
cd /app                  # Change directory
```

---

## 🎨 Screenshot Lokasi Terminal di Dashboard

**Langkah-langkah:**
1. Railway Dashboard → **Project** (LaporIn)
2. **Service** (backend)
3. Tab **"Shell"** atau **"Terminal"** (di bagian atas)
4. Terminal muncul di bawah

**Tampilan:**
```
┌─────────────────────────────────────────┐
│  Railway Dashboard                      │
├─────────────────────────────────────────┤
│  [Deployments] [Variables] [Shell] [Logs]│
├─────────────────────────────────────────┤
│  $ npm run seed:admin-kelurahan         │
│  🌱 Membuat Admin Kelurahan...          │
│  ✅ Admin Kelurahan berhasil dibuat!    │
│  $                                      │
└─────────────────────────────────────────┘
```

---

## ⚡ Quick Commands Cheat Sheet

### Via Dashboard Shell:
```bash
# Setup database
npx prisma db push

# Seed admin
npm run seed:admin-kelurahan

# Cek environment
env | grep EMAIL

# Test server
node -e "console.log('OK')"
```

### Via Railway CLI:
```bash
# Run command
railway run <command>

# Masuk shell
railway shell

# View logs
railway logs

# Set variable
railway variables set KEY=value
```

---

## 🔧 Troubleshooting

### Terminal Tidak Muncul di Dashboard:
- ✅ Pastikan service sudah deployed
- ✅ Refresh browser
- ✅ Coba browser lain (Chrome/Firefox)
- ✅ Cek apakah service status "Active"

### Command Tidak Berjalan:
- ✅ Pastikan command valid
- ✅ Cek apakah file/script ada
- ✅ Pastikan environment variables sudah di-set
- ✅ Cek logs untuk error: `railway logs`

### Railway CLI Error:
```bash
# Re-login
railway login

# Re-link project
railway link

# Check status
railway status
```

---

## ✅ Summary

**Railway Terminal:**
- ✅ **Via Dashboard:** Tab "Shell" → Terminal langsung di browser
- ✅ **Via CLI:** `railway shell` atau `railway run <command>`
- ✅ Bisa run semua command Node.js/npm
- ✅ Akses database, run script, debug, dll

**Recommended:**
- 🎯 **Dashboard Shell** untuk quick commands
- 🎯 **Railway CLI** untuk automation & advanced usage

---

**Need Help?** 
- Railway Docs: https://docs.railway.app/develop/cli
- Railway Dashboard: https://railway.app

