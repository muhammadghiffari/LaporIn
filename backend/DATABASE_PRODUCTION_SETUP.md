# 🗄️ Setup Database PostgreSQL untuk Production

Panduan lengkap setup database PostgreSQL untuk production di Railway.

---

## ⚠️ Penting: File `.env` Hanya untuk Development Lokal!

File `backend/.env` **HANYA** untuk development di laptop Anda. Untuk production di Railway, **JANGAN** gunakan file `.env`!

**Untuk Production:**
- ✅ Set environment variables di **Railway Dashboard** → Service → Variables
- ❌ Jangan commit file `.env` ke GitHub (sudah di `.gitignore`)

---

## 🚀 Setup PostgreSQL di Railway

### Option 1: Railway PostgreSQL (Recommended) ⭐

Railway bisa auto-provision PostgreSQL untuk Anda:

1. **Di Railway Dashboard:**
   - Klik **+ New** → **Database** → **PostgreSQL**
   - Railway akan otomatis create PostgreSQL service
   - Railway akan **otomatis generate** `DATABASE_URL` dan set ke backend service

2. **Verifikasi:**
   - Buka backend service → **Variables**
   - Pastikan `DATABASE_URL` sudah ada dengan format:
     ```
     postgresql://postgres:password@hostname:port/database
     ```

3. **Selesai!** Railway sudah handle semuanya.

**Keuntungan:**
- ✅ Auto-setup `DATABASE_URL`
- ✅ Auto-backup
- ✅ Managed service (tidak perlu maintenance)
- ✅ Free tier tersedia

---

### Option 2: External PostgreSQL (Supabase, Neon, dll)

Jika menggunakan external PostgreSQL:

1. **Dapatkan Connection String:**
   - **Supabase**: Project Settings → Database → Connection String
   - **Neon**: Dashboard → Connection String
   - **Lainnya**: Cek dokumentasi provider

2. **Format Connection String:**
   ```
   postgresql://user:password@host:port/database?sslmode=require
   ```

3. **Set di Railway:**
   - Railway Dashboard → Backend Service → Variables
   - Add variable: `DATABASE_URL`
   - Paste connection string

**Catatan:**
- Pastikan database allow connection dari Railway IP
- Gunakan SSL mode (`?sslmode=require`) untuk security

---

## ✅ Verifikasi Database Connection

### 1. Test Connection via Railway Terminal

```bash
# Via Railway CLI
railway run --service backend npx prisma db push

# Atau via Railway Dashboard Terminal
npx prisma db push
```

Jika berhasil, akan muncul:
```
✔ Generated Prisma Client
✔ Database schema is up to date
```

### 2. Test via Health Check

```bash
curl https://your-backend-url.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "LaporIn API is running",
  "database": "connected"
}
```

---

## 🔍 Troubleshooting

### Problem: `DATABASE_URL` tidak ada di Railway

**Solusi:**
1. Pastikan PostgreSQL service sudah dibuat di Railway
2. Pastikan PostgreSQL service sudah di-link ke backend service
3. Atau manual add `DATABASE_URL` di backend service variables

### Problem: Connection refused / Timeout

**Kemungkinan:**
- Database belum allow connection dari Railway
- `DATABASE_URL` format salah
- Database service belum running

**Solusi:**
1. Cek format `DATABASE_URL`:
   ```
   postgresql://user:password@host:port/database
   ```
2. Untuk external database, pastikan allow connection dari Railway IP
3. Untuk Railway PostgreSQL, pastikan service sudah running

### Problem: Schema tidak sync

**Solusi:**
```bash
# Via Railway Terminal
railway run --service backend npx prisma db push

# Atau dengan migration
railway run --service backend npx prisma migrate deploy
```

---

## 📋 Checklist Database Production

- [ ] PostgreSQL service sudah dibuat di Railway (atau external database sudah siap)
- [ ] `DATABASE_URL` sudah di-set di Railway backend service variables
- [ ] Database schema sudah di-sync (`npx prisma db push`)
- [ ] Test connection berhasil
- [ ] Health check endpoint mengembalikan `"database": "connected"`
- [ ] Admin kelurahan sudah di-seed (`npm run seed:admin-kelurahan`)

---

## 🔐 Security Best Practices

1. **Jangan commit `.env` file** ke GitHub (sudah di `.gitignore`)
2. **Gunakan Railway Variables** untuk production secrets
3. **Gunakan SSL** untuk database connection (`?sslmode=require`)
4. **Rotate database password** secara berkala
5. **Enable database backups** (Railway auto-backup untuk managed PostgreSQL)

---

## 📝 Format `DATABASE_URL` yang Benar

### Railway PostgreSQL (Auto-generated):
```
postgresql://postgres:random_password@containers-us-west-xxx.railway.app:5432/railway
```

### Supabase:
```
postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```

### Neon:
```
postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Custom PostgreSQL:
```
postgresql://user:password@hostname:5432/database?sslmode=require
```

---

## 🎯 Quick Start

1. **Buat PostgreSQL di Railway:**
   - Railway Dashboard → + New → Database → PostgreSQL

2. **Link ke Backend Service:**
   - Railway otomatis link dan set `DATABASE_URL`

3. **Sync Schema:**
   ```bash
   railway run --service backend npx prisma db push
   ```

4. **Seed Admin:**
   ```bash
   railway run --service backend npm run seed:admin-kelurahan
   ```

5. **Test:**
   ```bash
   curl https://your-backend-url.up.railway.app/api/health
   ```

**Selesai!** 🎉

