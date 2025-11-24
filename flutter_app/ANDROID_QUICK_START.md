# ⚡ Android Quick Start - 3 Menit Setup

## 🎯 Fokus: Android Only

App ini dikembangkan khusus untuk **Android** untuk checkpoint 2.

---

## 📋 Step-by-Step Setup

### Step 1: Install Dependencies (30 detik)

```bash
cd flutter_app
flutter pub get
```

### Step 2: Update API URL (30 detik)

Edit `lib/config/api_config.dart`:

**Untuk Android Emulator:**
```dart
static const String baseUrl = 'http://10.0.2.2:3001/api';
```

**Untuk Device Fisik:**
```dart
static const String baseUrl = 'http://192.168.1.100:3001/api';  // Ganti 100 dengan IP komputer Anda
```

**Cara cek IP komputer:**
- Mac/Linux: `ifconfig | grep "inet "`
- Windows: `ipconfig`

### Step 3: Test Run (1 menit)

```bash
# Pastikan Android emulator running ATAU device connected
flutter run
```

### Step 4: Build APK (1 menit)

```bash
flutter build apk --release
```

**Done!** APK ada di: `build/app/outputs/flutter-apk/app-release.apk`

---

## 📲 Install APK ke Device

### Via USB (Paling Mudah)

```bash
adb install build/app/outputs/flutter-apk/app-release.apk
```

### Via File Transfer

1. Copy APK ke device
2. Buka file manager
3. Tap APK → Install
4. Allow "Install from Unknown Sources"

---

## ✅ Checklist

- [ ] Dependencies installed
- [ ] API URL updated
- [ ] Test run berhasil
- [ ] APK built
- [ ] APK installed di device
- [ ] Camera permission diberikan
- [ ] Test login → Face verification → Dashboard

---

## 🎯 Demo Flow

1. **Login** - Email & password → Face verification
2. **Create Report** - Form → Camera → Submit
3. **View Reports** - List → Detail → Blockchain link

**Total: ~5 menit demo**

---

## 🔧 Quick Fixes

### Camera tidak bekerja
→ Settings → Apps → LaporIn → Permissions → Camera → Enable

### API error
→ Check API URL di `api_config.dart`
→ Check backend running
→ Check network connection

### Build error
```bash
flutter clean
flutter pub get
flutter build apk --release
```

---

**Ready untuk checkpoint 2! 🚀**

