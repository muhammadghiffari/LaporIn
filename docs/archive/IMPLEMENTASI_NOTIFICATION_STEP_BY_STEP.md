# 📋 Implementasi Notification System - Step by Step

**Status:** 🔄 **IN PROGRESS**

---

## ✅ STEP 1: Email Service - COMPLETED

- [x] Install nodemailer
- [x] Create emailService.js dengan templates
- [ ] Integrate ke report creation
- [ ] Integrate ke status update

---

## 🔄 STEP 2: Integrate Email ke Reports (NEXT)

### Files to Modify:
1. `backend/routes/reports.routes.js`
   - Add email notification saat create report
   - Add email notification saat update status

### Implementation:
```javascript
// Di report creation
const { sendEmailLaporanBaru } = require('../services/emailService');
await sendEmailLaporanBaru(laporan, reporter); // Async, tidak block

// Di status update
const { sendEmailStatusUpdate } = require('../services/emailService');
await sendEmailStatusUpdate(report, reporter, oldStatus, newStatus); // Async
```

---

## 📱 STEP 3: Push Notification (FCM)

### Backend:
1. Install `firebase-admin`
2. Create `fcmService.js`
3. Store FCM tokens di database

### Flutter:
1. Setup Firebase project
2. Get FCM token
3. Send token ke backend
4. Handle notifications

---

## 📲 STEP 4: WhatsApp Integration

### Backend:
1. Setup Baileys
2. Create WhatsApp service
3. QR code generation untuk connect
4. Template message system

### Admin UI:
1. WhatsApp settings page
2. QR code display
3. Template management
4. Test message button

---

## 🎨 STEP 5: Admin UI

### Pages:
1. `/admin/pengaturan/notifikasi` - Notification settings
   - Email config
   - WhatsApp config
   - Push notification status
   - Template management

---

## ⚙️ STEP 6: Environment Variables

Add ke `.env`:
```env
# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL (untuk links)
FRONTEND_URL=http://localhost:3000

# FCM
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

---

**Mari kita lanjutkan step by step! 💪**

