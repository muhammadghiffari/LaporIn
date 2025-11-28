# 📱 Setup Icon APK LaporIn

## Cara Generate Icon APK dari Logo Splash Screen

Logo LaporIn menggunakan custom painter dengan design cyan/blue. Untuk membuat icon APK:

### Opsi 1: Menggunakan Flutter Launcher Icons (Recommended)

1. Install package:
```bash
flutter pub add dev:flutter_launcher_icons
```

2. Update `pubspec.yaml`:
```yaml
dev_dependencies:
  flutter_launcher_icons: ^0.13.1

flutter_launcher_icons:
  android: true
  ios: false
  image_path: "assets/icons/app_icon.png"
  adaptive_icon_background: "#00D4FF"
  adaptive_icon_foreground: "assets/icons/app_icon_foreground.png"
```

3. Buat gambar `assets/icons/app_icon.png` (1024x1024px) dengan logo LaporIn
4. Buat gambar `assets/icons/app_icon_foreground.png` (432x432px) dengan logo tanpa background
5. Run:
```bash
flutter pub get
flutter pub run flutter_launcher_icons
```

### Opsi 2: Manual (Menggunakan Android Asset Studio)

1. Buka https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. Upload logo LaporIn (PNG 432x432px atau lebih besar)
3. Set background color: `#00D4FF`
4. Download dan replace file di:
   - `android/app/src/main/res/mipmap-*/ic_launcher.png`
   - `android/app/src/main/res/mipmap-*/ic_launcher_round.png`

### Opsi 3: Screenshot dari App

1. Run app di emulator/device
2. Navigate ke splash screen
3. Screenshot logo (pastikan background transparan atau sesuai)
4. Crop dan resize ke 1024x1024px
5. Gunakan sebagai icon

## Ukuran Icon yang Diperlukan

- **mdpi**: 48x48px
- **hdpi**: 72x72px
- **xhdpi**: 96x96px
- **xxhdpi**: 144x144px
- **xxxhdpi**: 192x192px
- **Adaptive Icon**: 432x432px (foreground), 1024x1024px (background)

## Catatan

Logo LaporIn menggunakan:
- Background color: `#00D4FF` (Light cyan/blue)
- Border color: `#0099CC` (Darker blue)
- Design: Rounded square dengan curved lines extending from center

