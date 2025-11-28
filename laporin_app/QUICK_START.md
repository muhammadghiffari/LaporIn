# ⚡ Quick Start - Flutter App LaporIn

## 🚀 Setup Cepat (5 Menit)

### 1. Install Dependencies

```bash
cd flutter_app
flutter pub get
```

### 2. Update API URL

Edit `lib/config/api_config.dart`:

```dart
static const String baseUrl = 'http://YOUR_BACKEND_IP:3001/api';
```

**Untuk Testing:**
- Android Emulator: `http://10.0.2.2:3001/api`
- iOS Simulator: `http://localhost:3001/api`
- Device Fisik: `http://192.168.1.XXX:3001/api` (ganti XXX dengan IP komputer Anda)

### 3. Run App

```bash
flutter run
```

### 4. Build APK untuk Demo

```bash
flutter build apk --release
```

APK ada di: `build/app/outputs/flutter-apk/app-release.apk`

---

## ✅ Features yang Sudah Ada

- ✅ Login dengan email & password
- ✅ Face recognition untuk 2FA
- ✅ Register user baru
- ✅ Dashboard dengan list laporan
- ✅ Create report dengan foto
- ✅ View report detail
- ✅ Blockchain verification link

---

## 🔧 Troubleshooting

### Camera tidak bekerja
- Pastikan permission sudah diberikan
- Check `AndroidManifest.xml` untuk camera permission

### API connection error
- Pastikan backend running
- Check API URL di `api_config.dart`
- Pastikan device bisa akses backend (check firewall)

### Build error
- Run `flutter clean`
- Run `flutter pub get`
- Run `flutter build apk --release`

---

## 📱 Testing di Device

1. Build APK: `flutter build apk --release`
2. Transfer APK ke device (via USB atau share)
3. Install APK di device
4. Pastikan device dan komputer dalam network yang sama
5. Update API URL dengan IP komputer

---

**Good luck! 🎉**

