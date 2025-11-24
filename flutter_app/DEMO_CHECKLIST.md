# ✅ Demo Checklist - Flutter App LaporIn

## 📋 Pre-Demo Setup

### 1. Backend Setup
- [ ] Backend running di `http://localhost:3001`
- [ ] Database sudah seeded dengan data
- [ ] Blockchain sudah di-setup (Polygon Amoy)
- [ ] API endpoints bisa diakses

### 2. Flutter App Setup
- [ ] Dependencies installed: `flutter pub get`
- [ ] API URL sudah di-update di `lib/config/api_config.dart`
- [ ] App sudah di-test di emulator/device
- [ ] Camera permission sudah diberikan

### 3. Build APK
- [ ] APK sudah di-build: `flutter build apk --release`
- [ ] APK sudah di-transfer ke device (jika perlu)
- [ ] APK sudah di-install di device

---

## 🎬 Demo Flow

### **Scenario 1: Login dengan Face Recognition**

1. **Buka App**
   - [ ] App launch tanpa error
   - [ ] Login screen muncul

2. **Login dengan Email & Password**
   - [ ] Input email: `warga1@example.com`
   - [ ] Input password: `Warga123!`
   - [ ] Klik "Masuk"
   - [ ] Loading indicator muncul
   - [ ] Face verification screen muncul

3. **Face Verification**
   - [ ] Camera otomatis start
   - [ ] Face detected indicator muncul
   - [ ] Klik "Capture Wajah"
   - [ ] Face berhasil di-capture
   - [ ] Klik "Verifikasi"
   - [ ] Berhasil login → Dashboard muncul

### **Scenario 2: Create Report**

1. **Buka Create Report**
   - [ ] Klik "Buat Laporan" di dashboard
   - [ ] Create report screen muncul

2. **Isi Form**
   - [ ] Judul: "Jalan Rusak di RT 05"
   - [ ] Deskripsi: "Jalan berlubang besar..."
   - [ ] Lokasi: "Jl. Merdeka No. 15, RT 05/RW 02"
   - [ ] Kategori: Pilih "Infrastruktur"
   - [ ] Urgensi: Pilih "Tinggi"

3. **Ambil Foto**
   - [ ] Klik "Ambil Foto"
   - [ ] Camera terbuka
   - [ ] Ambil foto
   - [ ] Foto muncul di preview

4. **Submit**
   - [ ] Klik "Kirim Laporan"
   - [ ] Loading indicator muncul
   - [ ] Success message muncul
   - [ ] Kembali ke dashboard
   - [ ] Laporan baru muncul di list

### **Scenario 3: View Reports**

1. **Lihat List Reports**
   - [ ] Klik tab "Laporan"
   - [ ] List reports muncul
   - [ ] Status badges terlihat
   - [ ] Pull to refresh bekerja

2. **View Detail**
   - [ ] Klik salah satu report
   - [ ] Detail screen muncul
   - [ ] Semua info terlihat
   - [ ] Blockchain hash terlihat (jika ada)
   - [ ] Klik blockchain link → Polygonscan terbuka

---

## 🎯 Key Points untuk Presentasi

### **1. Face Recognition (2FA)**
- ✅ Highlight: Security dengan biometric
- ✅ Demo: Login → Face verification → Dashboard
- ✅ Point: Same security level dengan web app

### **2. Create Report dengan Foto**
- ✅ Highlight: Mobile-first experience
- ✅ Demo: Form → Camera → Submit
- ✅ Point: Lebih mudah dari web (camera langsung)

### **3. Blockchain Integration**
- ✅ Highlight: Same blockchain dengan web
- ✅ Demo: View detail → Blockchain link → Polygonscan
- ✅ Point: Transparansi tetap terjaga di mobile

### **4. UI Consistency**
- ✅ Highlight: Same design dengan web app
- ✅ Demo: Show screens side by side
- ✅ Point: Consistent user experience

---

## ⚠️ Troubleshooting Quick Fix

### Camera tidak bekerja
- **Fix**: Check permissions di device settings
- **Fix**: Restart app setelah grant permission

### API connection error
- **Fix**: Check backend running
- **Fix**: Check API URL di `api_config.dart`
- **Fix**: Check network connection

### Face recognition error
- **Fix**: Pastikan lighting cukup
- **Fix**: Pastikan hanya satu wajah terlihat
- **Fix**: Pastikan wajah sudah terdaftar di backend

---

## 📱 Device Setup untuk Demo

### Android
1. Enable Developer Options
2. Enable USB Debugging
3. Install APK via USB atau share file
4. Grant camera permission saat pertama kali

### iOS (jika ada)
1. Build dengan Xcode
2. Install via TestFlight atau direct install
3. Grant camera permission

---

## ✅ Final Checklist

- [ ] Backend running ✅
- [ ] API URL configured ✅
- [ ] App tested ✅
- [ ] APK ready ✅
- [ ] Demo flow practiced ✅
- [ ] Backup plan ready (web app) ✅

---

**Good luck dengan demo! 🚀**

