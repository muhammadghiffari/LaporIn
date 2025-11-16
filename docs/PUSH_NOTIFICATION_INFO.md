# Push Notification - Informasi & Implementasi

## Apakah Push Notification Bisa Diimplementasikan?

**Ya, bisa!** Push notification dapat diimplementasikan di aplikasi web LaporIn menggunakan **Web Push API** dan **Service Worker**.

## Konsep Push Notification

Push notification memungkinkan aplikasi web mengirim notifikasi ke pengguna bahkan ketika aplikasi tidak sedang dibuka. Ini sangat berguna untuk:
- Notifikasi status laporan berubah (pending → in_progress → resolved)
- Notifikasi laporan baru untuk admin/pengurus
- Pengingat untuk warga tentang laporan yang belum ditindaklanjuti
- Notifikasi sistem penting

## Teknologi yang Diperlukan

### 1. **Service Worker** (Frontend)
- File JavaScript yang berjalan di background browser
- Menangani push notifications
- File: `public/sw.js` atau `public/service-worker.js`

### 2. **Web Push API** (Browser API)
- Native browser API untuk menerima push notifications
- Mendukung Chrome, Firefox, Edge, Safari (dengan batasan)

### 3. **Push Service** (Backend)
- Mengirim push notifications ke browser
- Opsi:
  - **Firebase Cloud Messaging (FCM)** - Gratis, mudah
  - **OneSignal** - Gratis tier, mudah setup
  - **Web Push Protocol** - Native, lebih kompleks

## Implementasi Dasar (Menggunakan FCM)

### Langkah 1: Setup Firebase

1. Buat project di [Firebase Console](https://console.firebase.google.com/)
2. Enable Cloud Messaging
3. Dapatkan **Server Key** dan **VAPID Key**
4. Tambahkan ke `.env`:
   ```
   FCM_SERVER_KEY=your-server-key
   FCM_VAPID_KEY=your-vapid-key
   ```

### Langkah 2: Install Dependencies

```bash
npm install firebase-admin web-push
```

### Langkah 3: Service Worker (Frontend)

Buat file `public/sw.js`:

```javascript
// sw.js
self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/dashboard'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/dashboard')
  );
});
```

### Langkah 4: Register Service Worker (Frontend)

Di `app/layout.tsx` atau komponen utama:

```typescript
useEffect(() => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
        // Request permission
        return registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      })
      .then((subscription) => {
        // Send subscription to backend
        api.post('/notifications/subscribe', { subscription });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  }
}, []);
```

### Langkah 5: Backend Endpoint (Express)

```javascript
// routes/notifications.routes.js
const admin = require('firebase-admin');
const webpush = require('web-push');

// Initialize FCM
admin.initializeApp({
  credential: admin.credential.cert(require('../firebase-service-account.json'))
});

// Store subscriptions in database
router.post('/subscribe', authenticate, async (req, res) => {
  const { subscription } = req.body;
  const userId = req.user.userId;
  
  await pool.query(
    'INSERT INTO push_subscriptions (user_id, subscription_data) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET subscription_data = $2',
    [userId, JSON.stringify(subscription)]
  );
  
  res.json({ success: true });
});

// Send notification
router.post('/send', authenticate, async (req, res) => {
  const { userId, title, body, url } = req.body;
  
  const result = await pool.query(
    'SELECT subscription_data FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not subscribed' });
  }
  
  const subscription = JSON.parse(result.rows[0].subscription_data);
  
  const payload = JSON.stringify({
    title,
    body,
    url: url || '/dashboard'
  });
  
  webpush.sendNotification(subscription, payload)
    .then(() => res.json({ success: true }))
    .catch((error) => res.status(500).json({ error: error.message }));
});
```

### Langkah 6: Database Schema

```sql
CREATE TABLE push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  subscription_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Integrasi dengan LaporIn

### Notifikasi Otomatis

1. **Status Laporan Berubah** (di `reports.routes.js`):
   ```javascript
   // Setelah update status
   await sendPushNotification(userId, {
     title: 'Status Laporan Diperbarui',
     body: `Laporan "${report.title}" sekarang ${newStatus}`,
     url: `/reports/${reportId}`
   });
   ```

2. **Laporan Baru untuk Admin** (di `reports.routes.js`):
   ```javascript
   // Setelah create report
   const admins = await pool.query('SELECT id FROM users WHERE role IN ($1, $2)', ['admin', 'pengurus']);
   for (const admin of admins.rows) {
     await sendPushNotification(admin.id, {
       title: 'Laporan Baru',
       body: `Laporan baru dari ${user.name}`,
       url: `/reports/${reportId}`
     });
   }
   ```

## Catatan Penting

1. **HTTPS Required**: Push notifications hanya bekerja di HTTPS (atau localhost untuk development)
2. **User Permission**: Browser akan meminta izin pengguna untuk menerima notifikasi
3. **Browser Support**: 
   - ✅ Chrome, Firefox, Edge (full support)
   - ⚠️ Safari (limited support, iOS 16.4+)
4. **Mobile**: Push notifications di mobile web browser memiliki batasan

## Alternatif: Email Notifications

Jika push notification terlalu kompleks, alternatif yang lebih sederhana adalah **email notifications**:

```javascript
// Menggunakan nodemailer
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

await transporter.sendMail({
  from: 'noreply@laporin.com',
  to: user.email,
  subject: 'Status Laporan Diperbarui',
  html: `<h2>Laporan "${report.title}"</h2><p>Status: ${newStatus}</p>`
});
```

## Rekomendasi

Untuk hackathon, saya sarankan:
1. **Implementasi Email Notifications** (lebih mudah, cepat, reliable)
2. **Atau Push Notifications dengan FCM** (lebih modern, tapi butuh setup lebih)

Keduanya bisa diimplementasikan bersamaan untuk memberikan opsi kepada pengguna.

