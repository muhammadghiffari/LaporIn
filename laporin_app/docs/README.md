## Mobile (Flutter) Docs

### Rangkuman
- Flutter app khusus warga (role `warga`), terhubung ke backend REST + face recognition + chatbot.
- Folder utama `lib/` memakai Riverpod, Dio, Google Fonts, camera/face services.
- Konfigurasi API di `lib/config/api_config.dart` (gunakan IP laptop saat dev).

### Setup
```bash
cd flutter_app
flutter clean
flutter pub get
# Pastikan file android/ios sudah punya izin kamera & internet
flutter run -d <device>
```

### Environment
`lib/config/api_config.dart` membaca `String.fromEnvironment('API_BASE_URL')`.
Saat build release:
```
flutter run --dart-define=API_BASE_URL=http://192.168.x.x:3001/api
```
Pastikan device & backend berada pada jaringan sama.

### Fitur Kunci
- **Auth** – `providers/auth_provider.dart` (token + shared_preferences). Role non-warga otomatis ditolak.
- **Chatbot** – `screens/chat/chat_screen.dart`, mengirim riwayat chat + gambar ke backend.
- **Face Enrollment** – `screens/security/face_enrollment_screen.dart` + `widgets/face_capture_widget.dart`.
- **Reports** – `screens/reports/*` & `services/api_service.dart`.

### Good Practices
- Jangan commit `android/ios/build`, `.dart_tool`, dll (sudah di `.gitignore`).
- Bila ingin “lock session”, panggil `authProvider.logout()` saat user memilih keluar, bukan saat app background kecuali requirement jelas.
- Simpan perubahan UI besar di sini agar dokumentasi tidak tercecer di root.

### Testing
- Unit/widget test dapat ditempatkan di `test/` (belum banyak). Minimal lakukan manual test:
  - Login warga terverifikasi.
  - Create report (teks + foto).
  - Chatbot flow.
  - Face register/verify.

Tambahkan catatan build (Android/iOS) di folder ini bila perlu (mis. panduan signing, versi SDK). 

