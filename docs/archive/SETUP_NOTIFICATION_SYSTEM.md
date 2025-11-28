# 🔔 Setup Notification System - Panduan Lengkap

**Status:** ✅ **Email Notification Selesai!**  
**Next:** Push Notification & WhatsApp

---

## ✅ YANG SUDAH SELESAI

### 1. Email Notification ✅
- ✅ Email service dibuat (`backend/services/emailService.js`)
- ✅ Templates untuk laporan baru, status update, laporan selesai
- ✅ Integrate ke report creation (email ke admin saat ada laporan baru)
- ✅ Integrate ke status update (email ke warga saat status berubah)

**File yang sudah diupdate:**
- `backend/services/emailService.js` - Service email lengkap
- `backend/routes/reports.routes.js` - Integrate email notifications

---

## ⚙️ SETUP EMAIL (Wajib untuk testing)

### 1. Buat Gmail App Password

1. Buka: https://myaccount.google.com/apppasswords
2. Pilih "Mail" dan device
3. Generate password (16 karakter)
4. **Simpan password ini!**

### 2. Update `backend/.env`

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password

# Frontend URL (untuk links di email)
FRONTEND_URL=http://localhost:3000
```

### 3. Test Email

1. Restart backend server
2. Buat laporan baru → Admin harus terima email
3. Update status laporan → Warga harus terima email

---

## 📱 YANG PERLU DILANJUTKAN

### 1. Push Notification (FCM) - NEXT

#### Backend Setup:
```bash
cd backend
npm install firebase-admin --save
```

#### Flutter Setup:
1. Buat Firebase project di https://console.firebase.google.com
2. Add Android app ke Firebase
3. Download `google-services.json`
4. Place di `flutter_app/android/app/`

#### Implementation Files Needed:
- `backend/services/fcmService.js` - FCM service
- Update `backend/routes/reports.routes.js` - Send push notifications
- Flutter: FCM token registration
- Flutter: Notification handler

---

### 2. WhatsApp Integration - AFTER FCM

#### Backend Setup:
```bash
cd backend
npm install qrcode --save  # Untuk QR code generation
```

#### Implementation Files Needed:
- `backend/services/whatsappService.js` - WhatsApp service dengan Baileys
- `app/admin/pengaturan/notifikasi/page.tsx` - Admin UI untuk WhatsApp settings
- Routes untuk WhatsApp config

---

### 3. Admin Settings Page

#### Create New Page:
`app/admin/pengaturan/notifikasi/page.tsx`

**Features:**
- Email settings (show status, test button)
- WhatsApp settings (number, QR code, connection status)
- Template management (WhatsApp & Email templates)
- Push notification status

---

## 📊 PROGRESS SUMMARY

| Feature | Status | Progress |
|---------|--------|----------|
| **Email Notification** | ✅ Done | 100% |
| **Push Notification** | 🔄 Pending | 0% |
| **WhatsApp** | 🔄 Pending | 0% |
| **Admin UI** | 🔄 Pending | 0% |

**Overall: 25% Complete**

---

## 🚀 NEXT STEPS

### Priority 1: Test Email (Sekarang!)
1. Setup Gmail app password
2. Update `.env`
3. Test buat laporan → cek email admin
4. Test update status → cek email warga

### Priority 2: Push Notification (2-3 jam)
1. Setup Firebase project
2. Create FCM service
3. Integrate ke Flutter
4. Test notifications

### Priority 3: WhatsApp (3-4 jam)
1. Create WhatsApp service
2. Create admin UI
3. Test WhatsApp messages

---

## 💡 QUICK REFERENCE

### Email Service Functions:

```javascript
const { 
  sendEmailLaporanBaru,      // Saat ada laporan baru
  sendEmailStatusUpdate,      // Saat status berubah
  broadcastEmailKeWarga       // Broadcast ke semua warga
} = require('../services/emailService');
```

### Current Integration:

1. **Report Creation** (`backend/routes/reports.routes.js:160`):
   - Automatically sends email to admins saat laporan baru dibuat

2. **Status Update** (`backend/routes/reports.routes.js:1252`):
   - Automatically sends email to warga saat status berubah

---

## ⚠️ IMPORTANT NOTES

1. **Email errors tidak block** - Jika email gagal, laporan tetap tersimpan
2. **Async processing** - Email dikirim secara async agar tidak memperlambat response
3. **Error logging** - Semua error email di-log tapi tidak throw exception

---

## 🎯 TESTING CHECKLIST

- [ ] Setup Gmail app password
- [ ] Update `.env` dengan email credentials
- [ ] Restart backend server
- [ ] Buat laporan baru → cek email admin
- [ ] Update status laporan → cek email warga
- [ ] Test dengan email yang tidak valid → harus tidak error
- [ ] Test dengan email service disabled → harus tidak error

---

## 📝 FILES CREATED/MODIFIED

### Created:
- ✅ `backend/services/emailService.js` - Email service
- ✅ `PROPOSAL_NOTIFICATION_SYSTEM.md` - Proposal lengkap
- ✅ `SETUP_NOTIFICATION_SYSTEM.md` - This file

### Modified:
- ✅ `backend/routes/reports.routes.js` - Added email notifications

### Dependencies Added:
- ✅ `nodemailer` (backend)
- ✅ `firebase_messaging` & `firebase_core` (Flutter)
- ✅ `@whiskeysockets/baileys` (backend)

---

**Email notification sudah siap! Mari test dulu sebelum lanjut ke Push Notification & WhatsApp! 💪**

