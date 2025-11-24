# 📥 Face-API.js Models - Download Instructions

Model weights untuk face-api.js perlu di-download secara manual.

## ✅ Status

Manifest files sudah tersedia:
- ✅ `tiny_face_detector_model-weights_manifest.json`
- ✅ `face_landmark_68_model-weights_manifest.json`
- ✅ `face_recognition_model-weights_manifest.json`

**⚠️ Masih perlu download file `.shard1` (binary weights)**

## 🎯 Cara Download Model Weights

### Step 1: Clone Repository

```bash
cd /tmp
git clone https://github.com/justadudewhohacks/face-api.js-models.git
```

### Step 2: Copy Model Files

```bash
# Copy tiny_face_detector
cp /tmp/face-api.js-models/tiny_face_detector/* /Users/tpmgroup/Abhi/projects/LaporIn/public/models/

# Copy face_landmark_68
cp /tmp/face-api.js-models/face_landmark_68/* /Users/tpmgroup/Abhi/projects/LaporIn/public/models/

# Copy face_recognition
cp /tmp/face-api.js-models/face_recognition/* /Users/tpmgroup/Abhi/projects/LaporIn/public/models/

# Cleanup
rm -rf /tmp/face-api.js-models
```

### Step 3: Verify Files

```bash
cd /Users/tpmgroup/Abhi/projects/LaporIn/public/models
ls -lh *.json *.shard1
```

**Expected files (6 total):**
- `tiny_face_detector_model-weights_manifest.json` (~3KB)
- `tiny_face_detector_model-shard1` (~190KB)
- `face_landmark_68_model-weights_manifest.json` (~8KB)
- `face_landmark_68_model-shard1` (~1.1MB)
- `face_recognition_model-weights_manifest.json` (~18KB)
- `face_recognition_model-shard1` (~5.4MB)

**Total size**: ~6.7MB

## 🔄 Alternative: Download via Browser

Jika Git tidak tersedia:

1. Buka: https://github.com/justadudewhohacks/face-api.js-models
2. Klik folder `tiny_face_detector`
3. Download file `tiny_face_detector_model-shard1` (klik file, lalu "Download")
4. Ulangi untuk `face_landmark_68` dan `face_recognition`
5. Place semua `.shard1` files di `public/models/`

## ⚠️ Catatan Penting

- File `.shard1` adalah binary weights (ukuran besar)
- File `.json` adalah manifest (sudah ada)
- Tanpa file `.shard1`, face recognition tidak akan berfungsi
- Models akan di-load saat pertama kali `FaceCapture` component digunakan

## 🐛 Troubleshooting

### Models tidak load?
- Pastikan semua 6 files ada (3 JSON + 3 shard1)
- Check browser console untuk error
- Restart dev server setelah menambahkan files

### File tidak ditemukan?
- Pastikan path `public/models/` benar
- Check Next.js public folder configuration
- File harus accessible via `/models/` URL
