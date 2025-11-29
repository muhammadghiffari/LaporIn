# 📧 Panduan Konfigurasi Email - LaporIn

Panduan lengkap untuk setup email di LaporIn, termasuk penggunaan email yang sama untuk admin dan pengiriman email.

---

## ❓ FAQ: Bisa Pakai Email yang Sama?

**Jawaban: ✅ BISA! Tidak masalah sama sekali.**

Anda bisa menggunakan email yang sama untuk:
- ✅ **Admin Kelurahan** (untuk login)
- ✅ **EMAIL_USER** (untuk kirim email OTP, notifikasi, dll)

**Contoh:**
- Admin email: `abhisuryanu9roho@gmail.com`
- EMAIL_USER: `abhisuryanu9roho@gmail.com` (sama)

**Keuntungan:**
- ✅ Lebih sederhana (hanya perlu setup 1 email)
- ✅ Semua email masuk ke 1 inbox
- ✅ Mudah di-manage

**Catatan:**
- ⚠️ Pastikan email tersebut sudah setup **Gmail App Password**
- ⚠️ Email ini akan menerima semua notifikasi sistem
- ⚠️ Email ini juga akan digunakan sebagai sender untuk OTP dan notifikasi

---

## 🔧 Setup Email di Railway

### Step 1: Setup Gmail App Password

1. **Enable 2-Step Verification:**
   - Buka: https://myaccount.google.com/security
   - Aktifkan **2-Step Verification**

2. **Generate App Password:**
   - Buka: https://myaccount.google.com/apppasswords
   - Pilih **Mail** dan **Other (Custom name)**
   - Masukkan nama: `LaporIn Backend`
   - Copy **16-digit App Password** (bukan password biasa!)

### Step 2: Set Environment Variables di Railway

**Railway Dashboard → Service → Variables → Add:**

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=abhisuryanu9roho@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  (16-digit App Password dari Gmail)
EMAIL_FROM=noreply@laporin.com
```

**Catatan:**
- `EMAIL_USER`: Email Gmail Anda (bisa sama dengan admin kelurahan)
- `EMAIL_PASSWORD`: **App Password** (16 digit, bukan password biasa!)
- `EMAIL_FROM`: Nama yang muncul di "From" (bisa email yang sama atau berbeda)

---

## 📋 Konfigurasi Lengkap

### Option 1: Email Sama untuk Semua (Recommended untuk Development)

```env
# Admin Kelurahan
Email: abhisuryanu9roho@gmail.com
Password: AdminKelurahan123! (atau password yang Anda set)

# Email Configuration
EMAIL_USER=abhisuryanu9roho@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx (App Password)
EMAIL_FROM=abhisuryanu9roho@gmail.com
```

**Keuntungan:**
- ✅ Sederhana, hanya 1 email
- ✅ Semua email masuk ke 1 inbox
- ✅ Mudah di-manage

### Option 2: Email Terpisah (Recommended untuk Production)

```env
# Admin Kelurahan
Email: abhisuryanu9roho@gmail.com
Password: AdminKelurahan123!

# Email Configuration (email khusus untuk sistem)
EMAIL_USER=noreply.laporin@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx (App Password dari noreply email)
EMAIL_FROM=noreply@laporin.com
```

**Keuntungan:**
- ✅ Pemisahan antara email admin dan email sistem
- ✅ Lebih profesional (noreply@laporin.com)
- ✅ Email admin tidak penuh dengan notifikasi sistem

---

## 🧪 Test Email Configuration

### Test dari Laptop (setelah deploy):

```bash
# Test kirim OTP
curl -X POST https://api-laporin.up.railway.app/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"registration"}'

# Cek email test@example.com untuk OTP code
```

### Test via Railway CLI:

```bash
# Cek environment variables
railway variables | grep EMAIL

# Test email service (jika ada test script)
railway run node -e "
const { sendVerificationCodeEmail } = require('./services/emailService');
sendVerificationCodeEmail('test@example.com', '123456', 'registration')
  .then(r => console.log('Result:', r))
  .catch(e => console.error('Error:', e));
"
```

---

## ⚠️ Troubleshooting

### Email Tidak Terkirim

**Cek:**
1. ✅ `EMAIL_USER` sudah benar
2. ✅ `EMAIL_PASSWORD` adalah **App Password** (bukan password biasa)
3. ✅ 2-Step Verification sudah aktif
4. ✅ App Password sudah di-generate dengan benar

**Error umum:**
- `Invalid login`: Password salah atau bukan App Password
- `Authentication failed`: Belum enable 2-Step Verification
- `Connection timeout`: Cek firewall atau network

### Email Masuk ke Spam

**Solusi:**
1. ✅ Set `EMAIL_FROM` dengan nama yang jelas
2. ✅ Gunakan email domain sendiri (jika ada)
3. ✅ Tambahkan SPF/DKIM records (untuk domain sendiri)

---

## 📝 Checklist Setup Email

- [ ] Enable 2-Step Verification di Gmail
- [ ] Generate App Password untuk LaporIn
- [ ] Set `EMAIL_USER` di Railway (bisa sama dengan admin email)
- [ ] Set `EMAIL_PASSWORD` di Railway (App Password, bukan password biasa)
- [ ] Set `EMAIL_FROM` di Railway
- [ ] Test kirim OTP email
- [ ] Cek email masuk (termasuk spam folder)

---

## 🎯 Rekomendasi

**Untuk Development/Testing:**
- ✅ Pakai email yang sama untuk admin dan EMAIL_USER
- ✅ Lebih sederhana dan mudah di-manage

**Untuk Production:**
- ✅ Pertimbangkan email terpisah (noreply@laporin.com)
- ✅ Lebih profesional dan terorganisir
- ✅ Email admin tidak penuh dengan notifikasi sistem

---

## ✅ Summary

**Jawaban singkat:**
- ✅ **BISA** pakai email yang sama (`abhisuryanu9roho@gmail.com`)
- ✅ Tidak ada masalah sama sekali
- ✅ Pastikan sudah setup **Gmail App Password**
- ✅ Set `EMAIL_USER=abhisuryanu9roho@gmail.com` di Railway

**Admin Kelurahan:**
- Email: `abhisuryanu9roho@gmail.com`
- Password: `AdminKelurahan123!` (atau yang Anda set)

**Email Configuration:**
- EMAIL_USER: `abhisuryanu9roho@gmail.com` (sama)
- EMAIL_PASSWORD: App Password dari Gmail
- EMAIL_FROM: `abhisuryanu9roho@gmail.com` atau `noreply@laporin.com`

---

**Need Help?** Check logs: `railway logs` untuk melihat error email jika ada.

