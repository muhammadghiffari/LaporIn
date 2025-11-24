# 🤖 Build Android APK - LaporIn

## ⚡ Quick Build (2 Menit)

### 1. Update API URL

Edit `lib/config/api_config.dart`:

```dart
// Untuk Android Emulator
static const String baseUrl = 'http://10.0.2.2:3001/api';

// ATAU untuk Device Fisik
static const String baseUrl = 'http://192.168.1.100:3001/api';  // Ganti dengan IP komputer Anda
```

### 2. Build APK

```bash
cd flutter_app
flutter build apk --release
```

### 3. APK Ready!

**Location:** `build/app/outputs/flutter-apk/app-release.apk`

**Size:** ~30-50 MB (dengan semua dependencies)

---

## 📲 Install ke Device

### Option 1: Via USB (ADB)

```bash
# Connect device via USB
adb devices

# Install
adb install build/app/outputs/flutter-apk/app-release.apk
```

### Option 2: Via File Transfer

1. Copy APK ke device (USB, email, cloud)
2. Buka file manager
3. Tap APK → Install
4. Allow "Install from Unknown Sources" jika diminta

---

## 🔧 Troubleshooting Build

### Error: Gradle build failed

```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
flutter build apk --release
```

### Error: SDK not found

- Install Android SDK via Android Studio
- Set ANDROID_HOME environment variable

### Error: Min SDK version

- Edit `android/app/build.gradle`
- Set `minSdkVersion 21` (sudah di-set)

---

## ✅ Pre-Build Checklist

- [ ] Backend running
- [ ] API URL sudah di-update
- [ ] Dependencies installed (`flutter pub get`)
- [ ] Android SDK installed
- [ ] Test run berhasil (`flutter run`)

---

**APK siap untuk demo checkpoint 2! 🚀**

