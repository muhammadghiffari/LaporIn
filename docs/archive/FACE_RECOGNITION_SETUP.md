# 🚀 Face Recognition Setup - Quick Start

Panduan cepat untuk setup Face Recognition Authentication.

## ⚡ Quick Setup (3 Langkah)

### 1. Database Migration

```bash
cd backend
npx prisma migrate dev --name add_face_recognition
```

Ini akan menambahkan fields berikut ke table `users`:
- `face_descriptor` (Text, encrypted): Encrypted face descriptor
- `face_verified` (Boolean): Status verifikasi biometrik
- `face_verified_at` (DateTime): Timestamp saat face verified

### 2. Environment Variable

Update `backend/.env`:
```env
# Face Recognition Encryption Key (minimal 32 karakter)
FACE_ENCRYPTION_KEY=your-super-secret-face-encryption-key-min-32-characters-long-change-this
```

### 3. Download Model Weights

**Option A: Manual Download**

1. Kunjungi: https://github.com/justadudewhohacks/face-api.js-models/tree/master/weights

2. Download 6 files berikut ke folder `public/models/`:
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`

**Option B: Using wget/curl**

```bash
cd public/models

# Tiny Face Detector
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights/tiny_face_detector_model-weights_manifest.json
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights/tiny_face_detector_model-shard1

# Face Landmark 68
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights/face_landmark_68_model-weights_manifest.json
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights/face_landmark_68_model-shard1

# Face Recognition
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights/face_recognition_model-weights_manifest.json
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights/face_recognition_model-shard1
```

**Verifikasi:**
```bash
ls -lh public/models/*.json public/models/*.shard1
# Harus ada 6 files
```

## ✅ Verify Setup

Setelah setup, restart backend:

```bash
cd backend
npm run dev
```

Dan frontend:
```bash
npm run dev
```

## 📖 Dokumentasi Lengkap

Lihat `docs/FACE_RECOGNITION.md` untuk:
- Detail API endpoints
- Contoh penggunaan frontend
- Troubleshooting
- Security considerations

## 🔐 Keamanan

- Face descriptors di-encrypt dengan AES sebelum disimpan
- Data biometrik hanya disimpan sebagai vector (128 numbers), bukan gambar
- Default threshold: 0.6 (dapat disesuaikan)

## 🎯 Fitur yang Tersedia

1. ✅ **Registrasi dengan Face Capture** (Optional)
2. ✅ **Login dengan Face Verification** (Alternatif password)
3. ✅ **Save Face setelah Registrasi** (Via `/api/auth/register-face`)
4. ✅ **Verify Face untuk User yang sudah Login**

## 📝 Next Steps

1. Update halaman register untuk include FaceCapture component
2. Update halaman login untuk include Face Verification option
3. Test face registration dan verification

## ⚠️ Catatan Penting

- **Camera Access**: Browser memerlukan izin camera (harus HTTPS atau localhost)
- **Model Size**: Model weights ~10MB total
- **Performance**: Face detection menggunakan TinyFaceDetector (lightweight, fast)
- **Accuracy**: Threshold 0.6 memberikan balance antara security dan usability

## 🐛 Troubleshooting

### Models tidak load?
- Pastikan semua files ada di `public/models/`
- Check browser console untuk errors
- Pastikan path benar (`/models`)

### Camera tidak bisa diakses?
- Allow camera permission di browser
- Pastikan HTTPS atau localhost
- Check browser console untuk permission errors

### Face verification gagal?
- Rekam ulang face descriptor
- Pastikan lighting cukup
- Position face di tengah camera
- Adjust threshold jika terlalu strict

