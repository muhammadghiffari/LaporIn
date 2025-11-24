# 🤖 LaporIn Flutter App - Android Only

## ✅ Status: READY FOR ANDROID DEMO

Flutter app khusus untuk **Android** dengan fitur lengkap sama dengan web app.

---

## ⚡ Quick Start (3 Menit)

### 1. Install Dependencies

```bash
cd flutter_app
flutter pub get
```

### 2. Update API URL

Edit `lib/config/api_config.dart`:

**Untuk Android Emulator:**
```dart
static const String baseUrl = 'http://10.0.2.2:3001/api';
```

**Untuk Device Fisik:**
```dart
static const String baseUrl = 'http://192.168.1.100:3001/api';  // Ganti 100 dengan IP komputer
```

**Cara cek IP komputer:**
- Mac/Linux: `ifconfig | grep "inet "`
- Windows: `ipconfig`

### 3. Run App

```bash
flutter run
```

### 4. Build APK

```bash
flutter build apk --release
```

**APK:** `build/app/outputs/flutter-apk/app-release.apk`

---

## 📱 Features untuk Android

### ✅ Authentication
- Login dengan email & password
- **Face Recognition 2FA** (Google ML Kit)
- Register user baru

### ✅ Reports
- Create report dengan foto (camera)
- View reports list
- View report detail
- Blockchain verification link

### ✅ Dashboard
- Home screen
- Quick actions
- Recent reports
- Navigation drawer

---

## 🔧 Android Configuration

### Permissions (Sudah di-set)

File: `android/app/src/main/AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

### Min SDK

- **Min SDK:** 21 (Android 5.0+)
- **Target SDK:** 34
- **Compile SDK:** 34

---

## 📲 Install APK

### Via USB (ADB)

```bash
adb install build/app/outputs/flutter-apk/app-release.apk
```

### Via File Transfer

1. Copy APK ke device
2. Buka file manager
3. Tap APK → Install
4. Allow "Install from Unknown Sources"

---

## 🎯 Demo Flow

1. **Login** - Email & password → Face verification → Dashboard
2. **Create Report** - Form → Camera → Submit
3. **View Reports** - List → Detail → Blockchain link

---

## 📚 Documentation

- `ANDROID_SETUP.md` - Setup lengkap untuk Android
- `ANDROID_QUICK_START.md` - Quick start guide
- `BUILD_ANDROID.md` - Build APK guide
- `DEMO_CHECKLIST.md` - Checklist untuk demo

---

## ✅ Checklist

- [ ] Dependencies installed
- [ ] API URL updated untuk Android
- [ ] Test run berhasil
- [ ] APK built
- [ ] APK installed di device
- [ ] Camera permission diberikan
- [ ] Test semua fitur

---

**Ready untuk checkpoint 2! 🚀**

