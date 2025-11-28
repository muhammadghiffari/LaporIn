# 🔌 Konfigurasi IP Address - LaporIn

Dokumen ini menjelaskan konfigurasi IP address untuk mengakses backend API dari berbagai platform.

**Last Updated:** $(date +"%Y-%m-%d")

---

## 📊 Status IP Address Saat Ini

### ✅ IP Address dari ifconfig
```
inet 192.168.20.39
```

### ✅ Konfigurasi yang Sudah Benar

1. **Flutter Mobile App** ✅
   - File: `flutter_app/lib/config/api_config.dart`
   - IP: `192.168.20.39:3001/api`
   - Status: **SUDAH SESUAI**

2. **Backend Server** ✅
   - File: `backend/server.js`
   - HOST: `0.0.0.0` (listen di semua interface)
   - Console log menampilkan: `http://192.168.20.39:${PORT}/api`
   - Status: **SUDAH SESUAI**

3. **Frontend Web (Next.js)** ⚠️
   - File: `lib/api.ts`
   - Konfigurasi: Menggunakan `process.env.NEXT_PUBLIC_API_URL` atau default `localhost:3001`
   - Status: **PERLU DICEK**

---

## 🔧 Cara Update IP Address

### 1. Cek IP Address Anda

**Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```

**Output contoh:**
```
inet 192.168.20.39 netmask 0xffffff00 broadcast 192.168.20.255
```

### 2. Update Flutter Mobile App

Edit file: `flutter_app/lib/config/api_config.dart`

```dart
class ApiConfig {
  // Untuk Android Emulator:
  // static const String baseUrl = 'http://10.0.2.2:3001/api';
  
  // Untuk Device Fisik (update dengan IP komputer Anda):
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.20.39:3001/api', // ← Update IP ini
  );
}
```

**Atau via environment variable saat build:**
```bash
flutter run --dart-define=API_BASE_URL=http://192.168.20.39:3001/api
```

### 3. Update Frontend Web (Next.js)

**Option A: Via Environment Variable (Recommended)**

Buat file `.env.local` di root project:

```env
# .env.local
NEXT_PUBLIC_API_URL=http://192.168.20.39:3001
```

**Option B: Update Default di Code**

Edit file: `lib/api.ts`

```typescript
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL 
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : 'http://192.168.20.39:3001/api', // ← Update IP ini jika tidak pakai env
  // ...
});
```

### 4. Update Backend Server (Otomatis Detect IP)

**Current:** Backend sudah hardcode IP di console log (tidak ideal)

**Recommended:** Update untuk auto-detect IP

Edit file: `backend/server.js`:

```javascript
const os = require('os');

// Function untuk get IP address otomatis
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const LOCAL_IP = process.env.LOCAL_IP || getLocalIPAddress();

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📡 Socket.io ready for real-time updates`);
  console.log(`📱 Mobile app dapat mengakses: http://${LOCAL_IP}:${PORT}/api`);
  console.log(`🌐 Web frontend dapat mengakses: http://${LOCAL_IP}:3000`);
});
```

---

## 🌐 Konfigurasi untuk Berbagai Skenario

### Skenario 1: Development Lokal (Hanya di Laptop)

**Backend:**
```env
HOST=127.0.0.1
PORT=3001
```

**Frontend Web:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Flutter (Emulator):**
```dart
static const String baseUrl = 'http://10.0.2.2:3001/api'; // Android emulator
// atau
static const String baseUrl = 'http://localhost:3001/api'; // iOS simulator
```

### Skenario 2: Testing dari Device Fisik (Network yang Sama)

**Backend:**
```env
HOST=0.0.0.0  # Listen di semua interface
PORT=3001
```

**Frontend Web:**
```env
NEXT_PUBLIC_API_URL=http://192.168.20.39:3001  # IP laptop
```

**Flutter (Device Fisik):**
```dart
static const String baseUrl = 'http://192.168.20.39:3001/api';
```

### Skenario 3: Production Deployment

**Backend:**
```env
HOST=0.0.0.0
PORT=3001
# Gunakan domain atau IP server production
```

**Frontend Web:**
```env
NEXT_PUBLIC_API_URL=https://api.laporin.com
```

**Flutter:**
```dart
static const String baseUrl = 'https://api.laporin.com/api';
```

---

## ✅ Checklist Konfigurasi IP

### Untuk Development Lokal
- [ ] Backend running di `localhost:3001`
- [ ] Frontend web menggunakan `http://localhost:3001`
- [ ] Flutter emulator menggunakan `http://10.0.2.2:3001/api`

### Untuk Testing dari Device
- [ ] Cek IP komputer: `ifconfig` atau `ipconfig`
- [ ] Backend running dengan `HOST=0.0.0.0`
- [ ] Frontend web menggunakan IP komputer (bukan localhost)
- [ ] Flutter app menggunakan IP komputer
- [ ] Device dan komputer dalam network WiFi yang sama
- [ ] Firewall tidak block port 3001

---

## 🔍 Troubleshooting

### Problem: Device tidak bisa connect ke backend

**Checklist:**
1. ✅ Backend running? → `curl http://192.168.20.39:3001/api/health`
2. ✅ IP benar? → `ifconfig` di komputer
3. ✅ Network sama? → Device dan komputer harus di WiFi yang sama
4. ✅ Firewall? → Allow port 3001
5. ✅ HOST binding? → Backend harus listen di `0.0.0.0` bukan `127.0.0.1`

### Problem: Flutter app error "Connection refused"

**Solusi:**
1. Pastikan backend running
2. Cek IP di `api_config.dart` sudah benar
3. Test dengan browser: `http://192.168.20.39:3001/api/health`
4. Jika browser bisa akses tapi Flutter tidak, cek AndroidManifest.xml untuk internet permission

### Problem: Frontend web tidak bisa connect

**Solusi:**
1. Cek `.env.local` file ada dan berisi `NEXT_PUBLIC_API_URL`
2. Restart Next.js dev server setelah update `.env.local`
3. Cek browser console untuk error details

---

## 📝 Quick Reference

### IP Address Saat Ini
- **IP Komputer:** `192.168.20.39`
- **Backend Port:** `3001`
- **Frontend Port:** `3000`

### URLs
- **Backend API:** `http://192.168.20.39:3001/api`
- **Frontend Web:** `http://192.168.20.39:3000`
- **Health Check:** `http://192.168.20.39:3001/api/health`

### Files yang Perlu Diupdate saat IP Berubah
1. `flutter_app/lib/config/api_config.dart`
2. `.env.local` (frontend web)
3. `backend/server.js` (jika hardcode IP)

---

## 🔄 Auto-Detect IP Script

Buat script untuk auto-update IP:

```bash
#!/bin/bash
# scripts/update-ip.sh

# Get local IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}')

echo "🔍 Detected IP: $LOCAL_IP"
echo ""

# Update Flutter config
echo "📱 Updating Flutter config..."
sed -i '' "s|http://[0-9.]*:3001/api|http://$LOCAL_IP:3001/api|g" flutter_app/lib/config/api_config.dart

# Update .env.local if exists
if [ -f .env.local ]; then
  echo "🌐 Updating .env.local..."
  sed -i '' "s|NEXT_PUBLIC_API_URL=http://[0-9.]*:3001|NEXT_PUBLIC_API_URL=http://$LOCAL_IP:3001|g" .env.local
fi

echo "✅ IP updated to: $LOCAL_IP"
```

**Usage:**
```bash
chmod +x scripts/update-ip.sh
./scripts/update-ip.sh
```

---

**Note:** IP address bisa berubah setiap kali connect ke WiFi baru. Update konfigurasi sesuai kebutuhan!

