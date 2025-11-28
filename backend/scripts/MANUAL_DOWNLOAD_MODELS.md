# 📥 Manual Download Face Recognition Models

Jika script otomatis gagal, ikuti langkah berikut untuk download models secara manual.

## 🎯 Quick Method (Recommended)

### Via GitHub Web Interface

1. **Buka repository:**
   - Visit: https://github.com/justadudewhohacks/face-api.js-models

2. **Download ZIP:**
   - Click tombol hijau "Code"
   - Pilih "Download ZIP"
   - Extract ZIP file

3. **Copy files:**
   ```bash
   cd backend
   # Extract ZIP ke folder temporary
   unzip ~/Downloads/face-api.js-models-master.zip -d /tmp/
   
   # Copy models dari folder-folder terpisah ke models folder
   mkdir -p public/models
   cp /tmp/face-api.js-models-master/tiny_face_detector/* public/models/
   cp /tmp/face-api.js-models-master/face_landmark_68/* public/models/
   cp /tmp/face-api.js-models-master/face_recognition/* public/models/
   
   # Cleanup
   rm -rf /tmp/face-api.js-models-master
   ```

4. **Verifikasi:**
   ```bash
   ls -la public/models/
   # Harus ada 7 files:
   # - tiny_face_detector_model-weights_manifest.json
   # - tiny_face_detector_model-shard1
   # - face_landmark_68_model-weights_manifest.json
   # - face_landmark_68_model-shard1
   # - face_recognition_model-weights_manifest.json
   # - face_recognition_model-shard1
   # - face_recognition_model-shard2
   ```

## 🔧 Alternative: Git Clone

```bash
cd backend
git clone https://github.com/justadudewhohacks/face-api.js-models.git /tmp/face-models
mkdir -p public/models
cp /tmp/face-models/tiny_face_detector/* public/models/
cp /tmp/face-models/face_landmark_68/* public/models/
cp /tmp/face-models/face_recognition/* public/models/
rm -rf /tmp/face-models
```

## 📋 Files Required

Pastikan folder `backend/public/models/` berisi **7 files**:

1. ✅ `tiny_face_detector_model-weights_manifest.json`
2. ✅ `tiny_face_detector_model-shard1`
3. ✅ `face_landmark_68_model-weights_manifest.json`
4. ✅ `face_landmark_68_model-shard1`
5. ✅ `face_recognition_model-weights_manifest.json`
6. ✅ `face_recognition_model-shard1`
7. ✅ `face_recognition_model-shard2`

## ✅ Verification

Setelah download, test dengan:

```bash
cd backend
npm run dev
```

Cek console, harus muncul:
```
[Face Extraction] Loading face-api.js models...
[Face Extraction] Models loaded successfully
```

Jika masih error, pastikan semua 7 files ada di `public/models/`.

