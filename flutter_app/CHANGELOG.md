# Changelog - Flutter App LaporIn

## Version 1.0.0 - Checkpoint 2

### ✅ Features Implemented

#### Authentication
- ✅ Login dengan email & password
- ✅ Face recognition untuk 2FA (Google ML Kit)
- ✅ Register user baru
- ✅ Session management dengan SharedPreferences

#### Dashboard
- ✅ Home screen dengan welcome card
- ✅ Quick actions (Buat Laporan, Lihat Semua)
- ✅ Recent reports list
- ✅ Bottom navigation bar
- ✅ Drawer dengan user info

#### Reports
- ✅ Create report form
- ✅ Image capture dengan camera
- ✅ Reports list dengan filter
- ✅ Report detail screen
- ✅ Blockchain verification link
- ✅ Status badges dengan color coding

#### UI/UX
- ✅ Material Design 3
- ✅ Google Fonts (Inter)
- ✅ Color scheme sesuai web app
- ✅ Responsive layout
- ✅ Loading states
- ✅ Error handling

### 📦 Dependencies

- Flutter SDK 3.0.0+
- Riverpod untuk state management
- Dio untuk HTTP requests
- Google ML Kit untuk face recognition
- Camera untuk image capture
- SharedPreferences untuk local storage

### 🔧 Configuration

- API URL: `lib/config/api_config.dart`
- Update dengan backend URL sebelum run

### 📱 Build

```bash
flutter build apk --release
```

APK: `build/app/outputs/flutter-apk/app-release.apk`

---

## Next Steps (Future)

- [ ] Offline mode dengan Hive
- [ ] Push notifications
- [ ] Analytics dashboard untuk admin
- [ ] Chat widget dengan AI
- [ ] Real-time updates dengan Socket.IO
- [ ] Image caching
- [ ] Better error handling

