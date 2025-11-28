# 🚀 Flutter App Setup Guide - LaporIn

## ⚡ Quick Start (5 Menit)

### 1. Install Dependencies

```bash
cd flutter_app
flutter pub get
```

### 2. Update API URL

Edit `lib/config/api_config.dart`:

```dart
static const String baseUrl = 'http://YOUR_BACKEND_IP:3001/api';
// Contoh: 'http://192.168.1.100:3001/api' (untuk test di device)
```

**PENTING:** 
- Untuk Android emulator: gunakan `http://10.0.2.2:3001/api`
- Untuk iOS simulator: gunakan `http://localhost:3001/api`
- Untuk device fisik: gunakan IP komputer Anda (contoh: `http://192.168.1.100:3001/api`)

### 3. Run App

```bash
flutter run
```

### 4. Build APK untuk Demo

```bash
flutter build apk --release
```

APK akan ada di: `build/app/outputs/flutter-apk/app-release.apk`

---

## 📱 Features yang Sudah Diimplementasi

### ✅ Authentication
- Login dengan email & password
- Face recognition untuk 2FA
- Register user baru

### ✅ Dashboard
- List laporan
- Create report form
- Real-time updates

### ✅ Reports
- View reports list
- Create new report
- Filter & search

---

## 🔧 Troubleshooting

### Camera tidak bekerja
- Pastikan permission camera sudah diberikan
- Check `AndroidManifest.xml` dan `Info.plist` untuk permissions

### API connection error
- Pastikan backend running
- Check API URL di `api_config.dart`
- Pastikan device/emulator bisa akses backend

### Face recognition error
- Pastikan Google ML Kit sudah terinstall
- Check camera permission

---

## 📦 Build untuk Demo

### Android APK

```bash
flutter build apk --release
```

### iOS (perlu Mac)

```bash
flutter build ios --release
```

---

## 🎨 Design System

Mengikuti design web app:
- Primary: Blue (#3B82F6)
- Secondary: Indigo (#6366F1)
- Font: Inter (Google Fonts)
- Border radius: 12px

---

## 📝 File Structure

```
lib/
├── main.dart                    # Entry point
├── config/
│   └── api_config.dart         # API configuration
├── models/                     # Data models
│   ├── user.dart
│   └── report.dart
├── services/                   # Business logic
│   ├── api_service.dart
│   └── face_service.dart
├── providers/                  # State management
│   └── auth_provider.dart
├── screens/                    # UI Screens
│   ├── auth/
│   │   ├── login_screen.dart
│   │   └── register_screen.dart
│   └── dashboard/
│       └── dashboard_screen.dart
└── widgets/                    # Reusable widgets
    └── face_capture_widget.dart
```

---

## ✅ Checklist untuk Demo

- [ ] Backend running di `http://localhost:3001`
- [ ] API URL sudah di-update di `api_config.dart`
- [ ] Dependencies sudah di-install (`flutter pub get`)
- [ ] App sudah di-build (`flutter build apk --release`)
- [ ] APK sudah di-share untuk demo

---

**Good luck dengan checkpoint 2! 🎉**

