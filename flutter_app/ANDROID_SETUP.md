# 🤖 Android Setup - LaporIn Flutter App

## 🎯 Fokus: Android Only

App ini dikembangkan khusus untuk **Android** untuk checkpoint 2.

---

## ⚡ Quick Start (3 Menit)

### 1. Install Dependencies

```bash
cd flutter_app
flutter pub get
```

### 2. Update API URL untuk Android

Edit `lib/config/api_config.dart`:

```dart
static const String baseUrl = 'http://10.0.2.2:3001/api';  // Android Emulator
// ATAU
static const String baseUrl = 'http://192.168.1.XXX:3001/api';  // Device Fisik (ganti XXX)
```

**PENTING:**
- **Android Emulator**: Gunakan `http://10.0.2.2:3001/api` (localhost mapping)
- **Device Fisik**: Gunakan IP komputer Anda (contoh: `http://192.168.1.100:3001/api`)

### 3. Run di Android Emulator

```bash
# Pastikan emulator sudah running
flutter run
```

### 4. Build APK untuk Demo

```bash
flutter build apk --release
```

**APK Location:** `build/app/outputs/flutter-apk/app-release.apk`

---

## 📱 Android Permissions

### Sudah di-set di `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

**Tidak perlu setup tambahan!**

---

## 🔧 Android-Specific Configuration

### Min SDK Version

Edit `android/app/build.gradle` (jika belum ada):

```gradle
android {
    defaultConfig {
        minSdkVersion 21  // Android 5.0+
        targetSdkVersion 33
    }
}
```

### App Name & Icon

- App Name: **LaporIn** (sudah di-set di AndroidManifest.xml)
- Icon: Default Flutter icon (bisa diubah nanti)

---

## 🚀 Build APK untuk Demo

### Release APK (Recommended)

```bash
flutter build apk --release
```

**Output:** `build/app/outputs/flutter-apk/app-release.apk`

### Split APK (untuk size lebih kecil)

```bash
flutter build apk --split-per-abi
```

**Output:** 
- `build/app/outputs/flutter-apk/app-armeabi-v7a-release.apk` (32-bit)
- `build/app/outputs/flutter-apk/app-arm64-v8a-release.apk` (64-bit)
- `build/app/outputs/flutter-apk/app-x86_64-release.apk` (x86_64)

**Untuk demo, gunakan `app-arm64-v8a-release.apk` (kebanyakan device modern)**

---

## 📲 Install APK ke Device

### Via USB (ADB)

```bash
# Connect device via USB
adb devices  # Check device connected

# Install APK
adb install build/app/outputs/flutter-apk/app-release.apk
```

### Via File Transfer

1. Copy APK ke device (via USB, email, atau cloud)
2. Buka file manager di device
3. Tap APK file
4. Allow "Install from Unknown Sources" jika diminta
5. Install

---

## 🧪 Testing di Android

### Android Emulator

```bash
# Start emulator dari Android Studio
# Atau via command line:
emulator -avd Pixel_5_API_33  # Ganti dengan nama AVD Anda

# Run app
flutter run
```

### Device Fisik

1. Enable Developer Options:
   - Settings → About Phone → Tap "Build Number" 7x
2. Enable USB Debugging:
   - Settings → Developer Options → USB Debugging
3. Connect via USB
4. Run: `flutter run`

---

## 🔍 Troubleshooting Android

### Camera tidak bekerja

**Problem:** Camera permission tidak diberikan

**Solution:**
1. Settings → Apps → LaporIn → Permissions
2. Enable Camera permission
3. Restart app

### API connection error di Emulator

**Problem:** `http://localhost:3001` tidak bisa diakses

**Solution:**
- Gunakan `http://10.0.2.2:3001/api` (localhost mapping untuk Android emulator)
- Atau gunakan IP komputer: `http://192.168.1.XXX:3001/api`

### API connection error di Device Fisik

**Problem:** Device tidak bisa connect ke backend

**Solution:**
1. Pastikan device dan komputer dalam **network yang sama** (WiFi)
2. Check IP komputer: `ipconfig` (Windows) atau `ifconfig` (Mac/Linux)
3. Update API URL dengan IP komputer
4. Check firewall (allow port 3001)
5. Test dengan browser di device: `http://YOUR_IP:3001/api/reports`

### Build error

**Problem:** Gradle build failed

**Solution:**
```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
flutter build apk --release
```

### APK tidak bisa di-install

**Problem:** "App not installed" atau "Unknown source"

**Solution:**
1. Settings → Security → Allow "Install from Unknown Sources"
2. Atau Settings → Apps → Special Access → Install Unknown Apps
3. Enable untuk file manager yang digunakan

---

## 📋 Android-Specific Checklist

- [ ] Android SDK installed (via Android Studio)
- [ ] Android Emulator setup (atau device fisik)
- [ ] API URL sudah di-update untuk Android
- [ ] Camera permission sudah diberikan
- [ ] APK sudah di-build
- [ ] APK sudah di-test di device

---

## 🎯 Demo Flow untuk Android

### **1. Install APK**
- Share APK ke device
- Install APK
- Open app

### **2. Login dengan Face Recognition**
- Input email & password
- Face verification muncul
- Capture wajah dengan camera
- Verifikasi → Dashboard

### **3. Create Report**
- Klik "Buat Laporan"
- Isi form
- Ambil foto dengan camera Android
- Submit → Success

### **4. View Reports**
- Lihat list
- Klik detail
- Show blockchain link

---

## 💡 Tips untuk Android Demo

1. **Siapkan 2 Device** (jika mungkin):
   - Device 1: Untuk demo
   - Device 2: Backup jika ada masalah

2. **Test Camera Sebelum Demo**:
   - Pastikan camera permission sudah diberikan
   - Test capture wajah
   - Pastikan lighting cukup

3. **Backup Plan**:
   - Jika app error, bisa demo via web app
   - Pastikan web app juga ready

4. **Network Setup**:
   - Pastikan device dan komputer dalam WiFi yang sama
   - Test connection sebelum demo

---

## ✅ Final Checklist untuk Android Demo

- [ ] Backend running di `http://localhost:3001`
- [ ] API URL di `api_config.dart` sudah benar
- [ ] APK sudah di-build (`flutter build apk --release`)
- [ ] APK sudah di-install di device
- [ ] Camera permission sudah diberikan
- [ ] Test login → Face verification → Dashboard
- [ ] Test create report dengan foto
- [ ] Test view reports
- [ ] Backup plan ready (web app)

---

**Status: ✅ Android App Ready!**

**APK:** `build/app/outputs/flutter-apk/app-release.apk`

**Good luck dengan checkpoint 2! 🚀**

