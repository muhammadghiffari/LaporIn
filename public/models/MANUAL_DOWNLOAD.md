# 📥 Manual Download Face-API.js Models

Model weights untuk face-api.js perlu di-download secara manual karena GitHub raw URL tidak selalu stabil.

## 🎯 Cara Download Manual

### Option 1: Download dari GitHub Web UI (Recommended)

1. **Buka repository**: https://github.com/justadudewhohacks/face-api.js-models

2. **Navigate ke folder weights**: 
   - Klik folder `weights` di repository
   - Atau langsung: https://github.com/justadudewhohacks/face-api.js-models/tree/master/weights

3. **Download files berikut** (klik file, lalu klik "Download" atau "Raw"):
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1` (file binary, ~190KB)
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1` (file binary, ~1.1MB)
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1` (file binary, ~5.4MB)

4. **Place semua files di**: `public/models/`

### Option 2: Clone Repository

```bash
cd /tmp
git clone https://github.com/justadudewhohacks/face-api.js-models.git
cp face-api.js-models/weights/* /Users/tpmgroup/Abhi/projects/LaporIn/public/models/
rm -rf face-api.js-models
```

### Option 3: Download via npm (Alternative)

Jika download manual tidak berhasil, bisa gunakan model dari npm:

```bash
npm install @vladmandic/face-api
```

Lalu update `components/FaceCapture.tsx` untuk load models dari node_modules.

## ✅ Verifikasi

Setelah download, pastikan semua files ada:

```bash
cd public/models
ls -lh *.json *.shard1
```

**Expected output:**
```
face_landmark_68_model-shard1          (~1.1MB)
face_landmark_68_model-weights_manifest.json  (~1KB)
face_recognition_model-shard1          (~5.4MB)
face_recognition_model-weights_manifest.json   (~1KB)
tiny_face_detector_model-shard1        (~190KB)
tiny_face_detector_model-weights_manifest.json (~1KB)
```

**Total size**: ~6.7MB

## ⚠️ Troubleshooting

### Files terlalu kecil (< 1KB)?
- File tidak terdownload dengan benar
- Coba download ulang secara manual dari GitHub

### Models tidak load di browser?
- Pastikan semua 6 files ada
- Check browser console untuk error
- Pastikan path `/models` benar (relative dari `public/`)

### 404 Error saat load models?
- Pastikan files ada di `public/models/`
- Check Next.js public folder configuration
- Restart dev server setelah menambahkan files

## 📚 Alternative: Use CDN

Jika download manual tidak memungkinkan, bisa gunakan CDN:

Update `components/FaceCapture.tsx`:
```typescript
// Ganti MODEL_URL dari '/models' ke CDN URL
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
```

Namun, ini akan load models dari internet setiap kali, jadi lebih lambat.

