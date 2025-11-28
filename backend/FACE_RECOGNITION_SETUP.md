# 🔐 Setup Face Recognition Models

Dokumentasi untuk setup model pengenalan wajah (face-api.js) di backend.

## 📋 Prerequisites

- Node.js 18+ terinstall
- Internet connection untuk download models
- `face-api.js` sudah terinstall (sudah ada di `package.json`)

## 🚀 Quick Setup

### 1. Download Models (Otomatis)

**Method 1: Node.js Script (Recommended)**
```bash
cd backend
npm run download:face-models
```

**Method 2: Bash Script (Alternative)**
```bash
cd backend
npm run setup:face-models
# atau
bash scripts/setup-face-models.sh
```

**Method 3: Manual Download (Jika script gagal)**

Jika kedua script di atas gagal, download manual:

1. **Via Browser:**
   - Visit: https://github.com/justadudewhohacks/face-api.js-models
   - Click "Code" → "Download ZIP"
   - Extract ZIP file
   - Copy semua file dari folder `weights/` ke `backend/public/models/`

2. **Via Git Clone:**
   ```bash
   cd backend
   git clone https://github.com/justadudewhohacks/face-api.js-models.git /tmp/face-models
   cp -r /tmp/face-models/weights/* public/models/
   rm -rf /tmp/face-models
   ```

Script akan otomatis:
- Membuat folder `public/models/` jika belum ada
- Download semua model weights dari GitHub
- Menyimpan ke `backend/public/models/`

### 2. Verifikasi Models

Setelah download selesai, pastikan folder `backend/public/models/` berisi:

```
public/models/
├── tiny_face_detector_model-weights_manifest.json
├── tiny_face_detector_model-shard1
├── face_landmark_68_model-weights_manifest.json
├── face_landmark_68_model-shard1
├── face_recognition_model-weights_manifest.json
├── face_recognition_model-shard1
└── face_recognition_model-shard2
```

### 3. Test Setup

Jalankan server:

```bash
npm run dev
```

Cek console, seharusnya muncul:

```
[Face Extraction] Loading face-api.js models...
[Face Extraction] Models loaded successfully
```

Jika muncul error, pastikan semua file models sudah terdownload.

## 📁 Manual Download (Jika Script Gagal)

Jika script otomatis gagal, download manual dari:

**Base URL:** https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights

**Files yang diperlukan:**
1. `tiny_face_detector_model-weights_manifest.json`
2. `tiny_face_detector_model-shard1`
3. `face_landmark_68_model-weights_manifest.json`
4. `face_landmark_68_model-shard1`
5. `face_recognition_model-weights_manifest.json`
6. `face_recognition_model-shard1`
7. `face_recognition_model-shard2`

Simpan semua file ke `backend/public/models/`

## 🔧 Troubleshooting

### Error: "Models folder not found"

**Solusi:**
```bash
mkdir -p backend/public/models
npm run download:face-models
```

### Error: "Failed to load face recognition models"

**Penyebab:** Models belum terdownload atau file corrupt

**Solusi:**
1. Hapus folder `backend/public/models/`
2. Jalankan ulang: `npm run download:face-models`
3. Verifikasi semua 7 file sudah ada

### Error: "No face detected"

**Penyebab:** Foto tidak jelas atau tidak ada wajah

**Solusi:**
- Pastikan wajah terlihat jelas
- Gunakan pencahayaan yang cukup
- Pastikan hanya satu wajah yang terlihat

### Error: "Multiple faces detected"

**Penyebab:** Ada lebih dari satu wajah di foto

**Solusi:**
- Pastikan hanya wajah Anda yang terlihat
- Jauhkan orang lain dari frame kamera

## 📊 Model Information

| Model | Size | Fungsi |
|-------|------|--------|
| `tiny_face_detector` | ~190 KB | Deteksi wajah |
| `face_landmark_68` | ~350 KB | Deteksi landmark (mata, hidung, mulut) |
| `face_recognition` | ~5.4 MB | Ekstraksi embedding (128 dimensi) |

**Total Size:** ~6 MB

## 🔒 Security Notes

- Models disimpan di `backend/public/models/` (bisa di-commit ke git, tidak sensitif)
- Foto wajah disimpan di `backend/uploads/faces/{userId}/` (tidak di-commit, di `.gitignore`)
- Face descriptor di-encrypt sebelum disimpan ke database

## ✅ Checklist Setup

- [ ] Models terdownload (7 files)
- [ ] Server start tanpa error
- [ ] Console log "Models loaded successfully"
- [ ] Test endpoint `/api/auth/face/register` berhasil
- [ ] Test endpoint `/api/auth/face/verify` berhasil

## 📚 References

- [face-api.js Models](https://github.com/justadudewhohacks/face-api.js-models)
- [face-api.js Documentation](https://github.com/justadudewhohacks/face-api.js)

---

**Note:** Models hanya perlu didownload sekali. Setelah itu, server akan otomatis load models saat startup.

