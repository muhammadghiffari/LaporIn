# 🚀 Panduan Deployment Backend LaporIn

Panduan lengkap untuk mendeploy backend LaporIn ke berbagai platform.

---

## 📋 Prerequisites

Sebelum deploy, pastikan Anda sudah memiliki:
- ✅ Database PostgreSQL (bisa dari provider seperti Supabase, Railway, Neon, dll)
- ✅ API Keys untuk AI services (Groq/OpenAI)
- ✅ Blockchain configuration (jika menggunakan blockchain)
- ✅ Email service configuration (untuk notifikasi)

---

## 🐳 Deployment dengan Docker

### 1. Build Docker Image

```bash
cd backend
docker build -t laporin-backend .
```

### 2. Run Container

```bash
docker run -d \
  --name laporin-backend \
  -p 3001:3001 \
  --env-file .env \
  laporin-backend
```

### 3. Run dengan Docker Compose

Buat file `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3001:3001"
    env_file:
      - .env
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
```

Jalankan:
```bash
docker-compose up -d
```

---

## ☁️ Deployment ke Cloud Platforms

### Option 1: Railway 🚂

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Deploy:**
   ```bash
   cd backend
   railway init
   railway up
   ```

3. **Set Environment Variables:**
   - Buka Railway dashboard
   - Pilih project → Variables
   - Tambahkan semua variabel dari `.env.example`

4. **Setup Database:**
   - Railway bisa auto-provision PostgreSQL
   - Atau gunakan external database (Supabase, Neon, dll)

5. **Setup Database Schema:**
   ```bash
   # Jika database baru/kosong, gunakan migrate
   railway run npx prisma migrate deploy
   
   # Jika database sudah ada data, gunakan db push
   railway run npx prisma db push
   ```

### Option 2: Render 🎨

1. **Connect Repository:**
   - Login ke [Render](https://render.com)
   - New → Web Service
   - Connect GitHub repository

2. **Configure:**
   - **Build Command:** `npm ci && npx prisma generate`
   - **Start Command:** `node server.js`
   - **Environment:** Node 20

3. **Set Environment Variables:**
   - Tambahkan semua variabel dari `.env.example`

4. **Setup Database:**
   - Render bisa auto-provision PostgreSQL
   - Atau gunakan external database

5. **Setup Database Schema:**
   - Gunakan Render Shell untuk run:
   ```bash
   npx prisma db push
   # atau
   npx prisma migrate deploy
   ```

### Option 3: Vercel (Serverless) ⚡

**Note:** Vercel lebih cocok untuk Next.js frontend. Untuk backend Express, gunakan Railway/Render.

### Option 4: DigitalOcean App Platform 🌊

1. **Create App:**
   - Login ke DigitalOcean
   - Create → App → GitHub
   - Pilih repository

2. **Configure:**
   - **Type:** Web Service
   - **Build Command:** `cd backend && npm ci && npx prisma generate`
   - **Run Command:** `cd backend && node server.js`
   - **Port:** 3001

3. **Set Environment Variables:**
   - Tambahkan semua variabel dari `.env.example`

4. **Setup Database:**
   - DigitalOcean bisa auto-provision PostgreSQL
   - Atau gunakan managed database

5. **Setup Database Schema:**
   - Gunakan App Platform console untuk run:
   ```bash
   cd backend && npx prisma db push
   ```

### Option 5: VPS (Ubuntu/Debian) 🖥️

1. **Setup Server:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install PostgreSQL
   sudo apt install -y postgresql postgresql-contrib

   # Install PM2 untuk process management
   sudo npm install -g pm2
   ```

2. **Clone & Setup:**
   ```bash
   git clone https://github.com/yourusername/LaporIn.git
   cd LaporIn/backend
   npm install
   cp .env.example .env
   # Edit .env dengan konfigurasi yang benar
   ```

3. **Setup Database:**
   ```bash
   # Buat database
   sudo -u postgres psql
   CREATE DATABASE wargalapor;
   CREATE USER laporin WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE wargalapor TO laporin;
   \q

   # Run Prisma schema sync
   npx prisma db push
   # atau jika ingin menggunakan migration:
   npx prisma migrate dev --name init
   ```

4. **Run dengan PM2:**
   ```bash
   pm2 start server.js --name laporin-backend
   pm2 save
   pm2 startup
   ```

5. **Setup Nginx (Reverse Proxy):**
   ```bash
   sudo apt install -y nginx
   ```

   Buat file `/etc/nginx/sites-available/laporin-backend`:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/laporin-backend /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **Setup SSL dengan Let's Encrypt:**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

---

## 🔧 Setup Database

### Option 1: Supabase (Recommended untuk Development)

1. Buat akun di [Supabase](https://supabase.com)
2. Create new project
3. Copy connection string dari Settings → Database
4. Update `DATABASE_URL` di environment variables

### Option 2: Railway Database

1. Railway bisa auto-provision PostgreSQL
2. Copy connection string dari Railway dashboard
3. Update `DATABASE_URL` di environment variables

### Option 3: Neon (Serverless PostgreSQL)

1. Buat akun di [Neon](https://neon.tech)
2. Create new project
3. Copy connection string
4. Update `DATABASE_URL` di environment variables

### Run Database Schema

**Untuk Database Baru/Kosong:**
```bash
npx prisma migrate deploy
```

**Untuk Database yang Sudah Ada Data:**
```bash
# Gunakan db push untuk sync schema tanpa migration history
npx prisma db push

# Atau baseline migration jika ingin menggunakan migration system
npx prisma migrate resolve --applied 0_init
npx prisma migrate deploy
```

**Note:** `prisma db push` lebih cocok untuk production jika database sudah ada dan tidak ada migration history.

---

## 🔐 Environment Variables

Pastikan semua environment variables sudah di-set dengan benar. Lihat `.env.example` untuk daftar lengkap.

**Minimum Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret untuk JWT (minimal 32 karakter)
- `PORT` - Port server (default: 3001)
- `NODE_ENV` - Environment (production/development)

**Optional tapi Recommended:**
- `GROQ_API_KEY` - Untuk AI chatbot
- `EMAIL_*` - Untuk email notifications
- `BLOCKCHAIN_*` - Untuk blockchain integration

---

## ✅ Post-Deployment Checklist

- [ ] Database schema sudah di-sync (`prisma db push` atau `migrate deploy`)
- [ ] Environment variables sudah di-set dengan benar
- [ ] Health check endpoint (`/api/health`) bisa diakses
- [ ] API endpoints bisa diakses
- [ ] CORS sudah dikonfigurasi dengan benar
- [ ] SSL/HTTPS sudah setup (untuk production)
- [ ] Monitoring/logging sudah setup
- [ ] Backup database sudah dikonfigurasi

---

## 🧪 Testing Deployment

Setelah deploy, test dengan:

```bash
# Health check
curl https://your-api-domain.com/api/health

# Test API endpoint
curl https://your-api-domain.com/api/auth/users
```

---

## 📚 Resources

- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)

---

**Need Help?** Check backend documentation atau buat issue di GitHub repository.
