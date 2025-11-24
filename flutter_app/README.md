# 📱 LaporIn Flutter App

Aplikasi mobile LaporIn untuk platform laporan warga RT/RW dengan AI & Blockchain.

## 🚀 Quick Start (Android Only)

### Prerequisites
- Flutter SDK 3.0.0 atau lebih tinggi
- Dart SDK 3.0.0 atau lebih tinggi
- Android Studio (untuk Android build)
- Android SDK (min SDK 21)

### Installation

```bash
# Install dependencies
flutter pub get

# Generate code (untuk Hive)
flutter pub run build_runner build

# Run app
flutter run
```

### Build Android APK

```bash
# Build release APK untuk Android
flutter build apk --release

# APK akan ada di: build/app/outputs/flutter-apk/app-release.apk
```

**Note:** App ini fokus untuk **Android only** untuk checkpoint 2.

## 📁 Project Structure

```
lib/
├── main.dart                 # Entry point
├── config/
│   └── api_config.dart      # API configuration
├── models/                  # Data models
│   ├── user.dart
│   ├── report.dart
│   └── ...
├── services/               # Business logic
│   ├── api_service.dart
│   ├── auth_service.dart
│   ├── face_service.dart
│   └── ...
├── providers/              # State management (Riverpod)
│   ├── auth_provider.dart
│   ├── report_provider.dart
│   └── ...
├── screens/               # UI Screens
│   ├── auth/
│   │   ├── login_screen.dart
│   │   └── register_screen.dart
│   ├── dashboard/
│   │   └── dashboard_screen.dart
│   └── ...
├── widgets/               # Reusable widgets
│   ├── face_capture_widget.dart
│   ├── report_card.dart
│   └── ...
└── utils/                 # Utilities
    ├── constants.dart
    └── helpers.dart
```

## 🔑 Environment Variables

Buat file `.env` di root project:

```env
API_BASE_URL=http://localhost:3001/api
# atau
API_BASE_URL=https://your-backend-url.com/api
```

## 📱 Features

- ✅ Authentication dengan Face Recognition
- ✅ Dashboard dengan Analytics
- ✅ Create Report
- ✅ Reports List
- ✅ Real-time Updates
- ✅ Offline Support (coming soon)

## 🎨 Design System

Mengikuti design web app:
- Primary Color: Blue (#3B82F6)
- Secondary Color: Indigo
- Font: Inter
- Rounded corners: 12px (rounded-xl)

## 🔐 Face Recognition

Menggunakan Google ML Kit untuk face detection dan recognition.
Face descriptor disimpan dan dikirim ke backend untuk verification.

## 📡 API Integration

Semua API calls menggunakan Dio dengan interceptors untuk:
- Auto token injection
- Error handling
- Token refresh (jika diperlukan)

## 🚀 Build untuk Demo

```bash
# Android APK
flutter build apk --release

# iOS (perlu Mac + Xcode)
flutter build ios --release
```

APK akan ada di: `build/app/outputs/flutter-apk/app-release.apk`

