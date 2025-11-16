# 🔧 Troubleshooting Guide - LaporIn

Panduan mengatasi masalah umum yang mungkin terjadi saat setup atau menggunakan LaporIn.

---

## 🗄️ Database Issues

### Error: "database does not exist"

**Problem:** Database `wargalapor` belum dibuat.

**Solution:**
```bash
createdb wargalapor
# Atau
psql -U postgres
CREATE DATABASE wargalapor;
\q
```

### Error: "connection refused"

**Problem:** PostgreSQL service tidak running.

**Solution (macOS):**
```bash
brew services start postgresql@16
```

**Solution (Linux):**
```bash
sudo systemctl start postgresql
```

**Solution (Docker):**
```bash
docker start laporin-postgres
```

### Error: "password authentication failed"

**Problem:** Password di `.env` tidak sesuai.

**Solution:**
1. Cek password di `backend/.env` (DB_PASSWORD)
2. Test connection:
   ```bash
   psql -U postgres -d wargalapor
   ```
3. Jika perlu reset password:
   ```bash
   psql postgres
   ALTER USER postgres WITH PASSWORD 'new_password';
   ```

### Error: "relation does not exist"

**Problem:** Schema belum di-apply.

**Solution:**
```bash
psql -U postgres -d wargalapor < backend/database/schema.sql
```

---

## 🔌 Backend Issues

### Error: "Cannot find module"

**Problem:** Dependencies belum di-install.

**Solution:**
```bash
cd backend
npm install
```

### Error: "Port 3001 already in use"

**Problem:** Port 3001 sedang digunakan.

**Solution:**
```bash
# Kill process di port 3001
lsof -ti:3001 | xargs kill -9

# Atau gunakan port lain
# Update PORT di backend/.env
```

### Error: "JWT_SECRET is required"

**Problem:** JWT_SECRET tidak di-set.

**Solution:**
1. Buka `backend/.env`
2. Tambahkan:
   ```env
   JWT_SECRET=your_super_secret_key_min_32_characters_long
   ```

### Error: "Invalid credentials" saat login

**Problem:** User belum di-seed atau password salah.

**Solution:**
```bash
# Run seed script
npm run seed

# Login dengan:
# Email: warga1@example.com
# Password: Warga123!
```

### Backend tidak bisa connect ke database

**Problem:** Database credentials salah atau database tidak running.

**Solution:**
1. Cek PostgreSQL running:
   ```bash
   brew services list | grep postgresql
   ```
2. Cek credentials di `backend/.env`
3. Test connection:
   ```bash
   psql -U postgres -d wargalapor
   ```

---

## 🎨 Frontend Issues

### Error: "Cannot connect to API"

**Problem:** Backend tidak running atau URL salah.

**Solution:**
1. Cek backend running:
   ```bash
   curl http://localhost:3001/api/health
   ```
2. Cek `NEXT_PUBLIC_API_URL` di `.env.local`
3. Pastikan URL: `http://localhost:3001`

### Error: "Port 3000 already in use"

**Problem:** Port 3000 sedang digunakan.

**Solution:**
```bash
# Kill process
lsof -ti:3000 | xargs kill -9

# Atau gunakan port lain
npm run dev -- -p 3001
```

### Error: "Module not found"

**Problem:** Dependencies belum di-install.

**Solution:**
```bash
npm install
```

### Redirect loop ke login

**Problem:** Token tidak ter-persist atau invalid.

**Solution:**
1. Clear localStorage:
   ```javascript
   localStorage.clear()
   ```
2. Login ulang
3. Cek `store/authStore.ts` untuk persistence logic

---

## 🤖 AI Issues

### Error: "Groq API error"

**Problem:** API key tidak valid atau quota habis.

**Solution:**
1. Cek `GROQ_API_KEY` di `backend/.env`
2. Dapatkan API key baru: https://console.groq.com/
3. Sistem akan fallback ke keyword matching jika Groq error

### Chatbot tidak responsif

**Problem:** AI service tidak tersedia atau error.

**Solution:**
1. Cek console backend untuk error logs
2. Pastikan `GROQ_API_KEY` valid
3. Sistem akan menggunakan fallback responses

### AI tidak auto-categorize

**Problem:** OpenAI API key tidak di-set atau error.

**Solution:**
1. Cek `OPENAI_API_KEY` di `backend/.env`
2. Sistem akan menggunakan keyword-based fallback
3. Tidak akan crash, hanya tidak ada AI processing

---

## ⛓️ Blockchain Issues

### Error: "Invalid private key"

**Problem:** Private key format salah.

**Solution:**
1. Pastikan private key tanpa `0x` prefix
2. Cek `PRIVATE_KEY` di `backend/.env`
3. Jika error, sistem akan graceful fallback (tidak crash)

### Error: "Contract not deployed"

**Problem:** Contract address tidak valid.

**Solution:**
1. Deploy contract:
   ```bash
   cd blockchain
   npm run deploy
   ```
2. Copy contract address ke `backend/.env`
3. Atau biarkan kosong untuk disable blockchain

### Transaction failed

**Problem:** Wallet tidak punya MATIC untuk gas.

**Solution:**
1. Dapatkan test MATIC: https://faucet.polygon.technology/
   - Pilih Mumbai Testnet
   - Request test tokens
2. Pastikan wallet address sesuai dengan PRIVATE_KEY

### Blockchain tidak berfungsi tapi aplikasi jalan

**Problem:** Blockchain opsional, aplikasi tetap berjalan.

**Solution:**
- Ini normal! Blockchain adalah optional feature
- Aplikasi akan graceful fallback jika blockchain tidak dikonfigurasi
- Untuk enable blockchain, setup environment variables dengan benar

---

## 🐛 Common Bugs

### Laporan tidak muncul

**Problem:** Filter terlalu ketat atau data parsing error.

**Solution:**
1. Cek console browser untuk error
2. Cek console backend untuk query logs
3. Cek role user (warga hanya lihat laporan sendiri)
4. Cek filter yang aktif

### Chart tidak muncul data

**Problem:** API stats error atau data kosong.

**Solution:**
1. Cek `/api/reports/stats` endpoint
2. Pastikan ada data di database
3. Run seed script jika perlu
4. Cek console untuk error logs

### Sidebar tidak muncul di mobile

**Problem:** Hamburger button tidak terlihat.

**Solution:**
1. Pastikan screen width < 1024px
2. Cek z-index hamburger button
3. Cek apakah sidebar state benar

### Form tidak submit

**Problem:** Validation error atau API error.

**Solution:**
1. Cek console browser untuk error
2. Cek network tab untuk API response
3. Pastikan semua required fields terisi
4. Cek backend logs

---

## 🔍 Debugging Tips

### Enable Debug Logging

**Backend:**
- Check console output
- Logs sudah include: `[Reports API]`, `[RTQueuePanel]`, dll

**Frontend:**
- Open browser DevTools (F12)
- Check Console tab
- Check Network tab untuk API calls

### Check Database

```bash
# Login ke database
psql -U postgres -d wargalapor

# Cek data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM reports;
SELECT * FROM users LIMIT 5;
SELECT * FROM reports LIMIT 5;

\q
```

### Check API Endpoints

```bash
# Health check
curl http://localhost:3001/api/health

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"warga1@example.com","password":"Warga123!"}'
```

### Check Environment Variables

```bash
# Backend
cat backend/.env

# Frontend
cat .env.local
```

---

## 📞 Still Having Issues?

1. ✅ Check semua prerequisites terinstall
2. ✅ Check environment variables lengkap
3. ✅ Check database running dan schema applied
4. ✅ Check backend & frontend running
5. ✅ Check console logs (browser & backend)
6. ✅ Check network requests di browser DevTools

---

## 🆘 Need Help?

- 📖 Baca dokumentasi lengkap di folder `docs/`
- 🐛 Report issue dengan detail error message
- 📧 Hubungi tim development

---

**Happy Coding! 🚀**

