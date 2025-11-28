# 📱 LaporIn Mobile App - Dokumentasi Lengkap

## Overview

LaporIn Mobile App adalah aplikasi native Android yang dibangun dengan Flutter, menyediakan akses penuh ke platform LaporIn langsung dari smartphone. Aplikasi ini dirancang khusus untuk warga yang lebih nyaman menggunakan mobile device daripada web browser.

## 🎯 Fitur Utama

### ✅ Authentication & Security
- **Login dengan Email & Password**
- **Face Recognition 2FA** menggunakan Google ML Kit
- **Register User Baru** dengan validasi lengkap
- **Session Management** dengan auto-logout on token expired

### ✅ Dashboard & Navigation
- **Home Screen** dengan welcome card dan quick actions
- **Recent Reports List** (5 terbaru)
- **Bottom Navigation Bar** (Dashboard, Laporan, Analytics)
- **Navigation Drawer** dengan user profile
- **Role-based Menu** (admin vs warga)

### ✅ Reports Management
- **Create Report** dengan:
  - Form lengkap (Judul, Deskripsi, Lokasi)
  - **GPS Location Picker** dengan validasi RT/RW
  - **Camera Integration** untuk foto laporan
  - **Location Mismatch Warning** dialog
  - Kategori & Urgensi ditangani otomatis oleh AI
- **Reports List** dengan:
  - Card design dengan status badges (color-coded)
  - Filter by status, kategori, urgensi
  - Search functionality
  - Pull to refresh
  - Auto-refresh setiap 10 detik
- **Report Detail** dengan:
  - Informasi lengkap laporan
  - Blockchain transaction hash display
  - Link ke Polygonscan (dapat dibuka)
  - Cancel report untuk pending reports

### ✅ AI Chatbot
- **Chat Screen** dengan UI modern
- **Quick Suggestions** untuk memudahkan interaksi
- **Image Upload** dari gallery
- **Draft Report Preview Card**
- **"Create Report" Button** langsung dari chat
- Auto-navigation ke create report form dengan data dari chat

### ✅ Location Services
- **GPS Integration** dengan Geolocator
- **Permission Handling** untuk location access
- **Reverse Geocoding** untuk mendapatkan alamat dari koordinat
- **Location Validation** untuk memastikan laporan dalam RT/RW yang benar
- **"Use Current Location" Button** di create report form

### ✅ Settings
- **Settings Screen** dengan:
  - Profile section (nama, email, role)
  - Account settings (Profil Saya, Ubah Password - placeholder)
  - App settings
  - About section
  - Logout button

### ✅ UI/UX
- **Material Design 3** dengan konsistensi web app
- **Google Fonts (Inter)** - sama dengan web
- **Color Scheme** konsisten (Blue primary, Indigo secondary)
- **Status Badges** dengan color coding
- **Loading States** dan error handling
- **Empty States**
- **Splash Screen** dengan logo LaporIn

## 🛠️ Tech Stack

- **Framework**: Flutter 3.x (Dart)
- **State Management**: Riverpod 2.x
- **UI**: Material Design 3, Google Fonts (Inter)
- **Face Recognition**: Google ML Kit
- **Location**: Geolocator, Permission Handler
- **HTTP Client**: Dio
- **Local Storage**: SharedPreferences, Hive
- **Real-time**: Socket.IO Client (ready)
- **Camera**: Camera package, Image Picker
- **Charts**: FL Chart, Syncfusion Charts (ready)

## 📋 Prerequisites

- Flutter SDK 3.x atau lebih tinggi
- Android Studio atau VS Code dengan Flutter extension
- Android device atau emulator (min SDK 24)
- Backend API running di `http://192.168.20.39:3001/api` (untuk physical device) atau `http://10.0.2.2:3001/api` (untuk emulator)

## 🚀 Setup & Installation

### 1. Install Flutter

```bash
# Download Flutter SDK dari https://flutter.dev/docs/get-started/install
# Extract dan tambahkan ke PATH

# Verify installation
flutter doctor
```

### 2. Clone Repository

```bash
git clone https://github.com/abhisn15/LaporIn.git
cd LaporIn/flutter_app
```

### 3. Install Dependencies

```bash
flutter pub get
```

### 4. Configure API URL

Edit `lib/config/api_config.dart`:

```dart
// Untuk physical device (ganti dengan IP laptop Anda)
static const String baseUrl = 'http://192.168.20.39:3001/api';

// Untuk Android Emulator
// static const String baseUrl = 'http://10.0.2.2:3001/api';
```

### 5. Run App

```bash
# List available devices
flutter devices

# Run on connected device/emulator
flutter run

# Build APK
flutter build apk --release
```

## 📱 Screenshots & Features

### Splash Screen
- Logo LaporIn dengan animasi fade-in dan scale
- Tagline aplikasi
- Auto-navigation setelah 3 detik

### Login Screen
- Email & password form
- Face verification untuk 2FA
- Register link

### Dashboard
- Welcome card dengan nama user
- Quick actions (Buat Laporan, Lihat Semua)
- Recent reports list
- Floating chatbot button (untuk warga)
- Floating "Create Report" button (di reports tab)

### Create Report
- Form dengan validasi
- Camera integration
- GPS location picker
- Location validation warning

### Reports List
- Card design dengan status badges
- Filter & search
- Pull to refresh

### Report Detail
- Informasi lengkap
- Blockchain verification link
- Cancel button

### AI Chatbot
- Modern chat UI
- Quick suggestions
- Image upload
- Draft report preview

### Settings
- Profile section
- Account settings
- App settings
- Logout

## 🔧 Configuration

### Android Permissions

File: `android/app/src/main/AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
```

### API Configuration

File: `lib/config/api_config.dart`

```dart
class ApiConfig {
  // Ganti dengan IP laptop Anda untuk physical device
  static const String baseUrl = 'http://192.168.20.39:3001/api';
  
  // Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  // ... dll
}
```

## 🐛 Troubleshooting

### Error: "No space left on device"
```bash
# Clear Gradle cache
rm -rf ~/.gradle/caches

# Clear Flutter build cache
flutter clean
flutter pub get
```

### Error: "Namespace not specified"
- Pastikan versi `google_mlkit_commons` dan `google_mlkit_face_detection` sesuai di `pubspec.yaml`

### Error: Connection refused
- Pastikan backend API running
- Cek IP address di `api_config.dart`
- Untuk emulator, gunakan `10.0.2.2` bukan `localhost`

### Face Recognition tidak bekerja
- Pastikan camera permission sudah diberikan
- Pastikan Google ML Kit dependencies terinstall
- Cek log untuk error details

## 📚 Dokumentasi Tambahan

- [README.md](./README.md) - Setup dasar mobile app
- [FEATURES_MOBILE_APP.md](./FEATURES_MOBILE_APP.md) - Daftar fitur lengkap
- [ANDROID_SETUP.md](./ANDROID_SETUP.md) - Setup Android khusus
- [BUILD_ANDROID.md](./BUILD_ANDROID.md) - Panduan build APK

## 🎯 Roadmap

### ✅ Completed
- [x] Authentication dengan Face Recognition
- [x] Dashboard & Navigation
- [x] Create Report dengan GPS
- [x] Reports List dengan Filter
- [x] Report Detail dengan Blockchain Link
- [x] AI Chatbot
- [x] Settings Screen
- [x] Splash Screen

### 🚧 In Progress
- [ ] Real-time Updates dengan Socket.IO
- [ ] Profile Edit Screen

### 📋 Planned
- [ ] Push Notifications
- [ ] Offline Mode dengan Sync
- [ ] Analytics Dashboard untuk Admin
- [ ] Image Gallery untuk Multiple Photos

## 👥 Team

**Weladalah Team - IT Fair XIV Hackathon 2025**

- **Abhi** - Full Stack Developer & Mobile Developer
- **Ghiffari** - Blockchain & AI Developer
- **Dyandra** - Frontend Developer and UI/UX Design
- **Faris** - Problem Solver & Solution

---

**Made with ❤️ Weladalah Team - IT Fair XIV Hackathon 2025**

