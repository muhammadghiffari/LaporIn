# 🔐 Face Recognition Authentication Guide

Panduan implementasi Face Recognition (Biometric Authentication) untuk LaporIn.

## 📋 Overview

Fitur face recognition digunakan untuk:
1. **Registrasi**: Capture face descriptor saat registrasi untuk verifikasi identitas
2. **Login**: Verify face untuk login (sebagai alternatif atau tambahan password)
3. **Prevent Bot**: Mencegah penyalahgunaan data dan memastikan pelapor adalah warga unik yang terverifikasi

## 🏗️ Architecture

### Backend
- **Service**: `backend/services/faceRecognitionService.js`
  - Encrypt/decrypt face descriptors
  - Compare face descriptors (Euclidean distance)
  - Validate face descriptor format

- **Database**: 
  - `faceDescriptor` (Text, encrypted): Encrypted face descriptor
  - `faceVerified` (Boolean): Status verifikasi biometrik
  - `faceVerifiedAt` (DateTime): Timestamp saat face verified

### Frontend
- **Component**: `components/FaceCapture.tsx`
  - Capture face dari camera
  - Extract face descriptor menggunakan face-api.js
  - Display video stream dengan face detection overlay

## 📦 Setup

### 1. Download Model Weights

Face-api.js memerlukan model weights yang harus di-download terlebih dahulu.

**Manual Download:**
1. Kunjungi: https://github.com/justadudewhohacks/face-api.js-models
2. Download models berikut:
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`

3. Place semua files di: `public/models/`

**Atau menggunakan wget/curl:**
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

### 2. Environment Variables

Update `backend/.env`:
```env
# Face Recognition Encryption Key (minimal 32 karakter)
FACE_ENCRYPTION_KEY=your-super-secret-face-encryption-key-min-32-characters-long
```

### 3. Database Migration

Jalankan Prisma migration untuk update schema:
```bash
cd backend
npx prisma migrate dev --name add_face_recognition
```

## 🔌 API Endpoints

### POST `/api/auth/register`
Registrasi user baru dengan atau tanpa face descriptor.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "warga",
  "rt_rw": "RT001/RW005",
  "jenis_kelamin": "laki_laki",
  "faceDescriptor": "[0.123, 0.456, ...]" // Optional: Array of 128 numbers
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "warga",
    "face_verified": true
  },
  "faceRegistered": true
}
```

### POST `/api/auth/register-face`
Save face descriptor untuk user yang sudah terdaftar.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "faceDescriptor": "[0.123, 0.456, ...]" // Array of 128 numbers
}
```

### POST `/api/auth/login`
Login dengan password atau face verification.

**Login dengan Password:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Login dengan Face:**
```json
{
  "email": "user@example.com",
  "faceDescriptor": "[0.123, 0.456, ...]"
}
```

**Response (Face Login):**
```json
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  },
  "loginMethod": "face",
  "faceMatch": {
    "distance": "0.4523",
    "confidence": "24.62"
  }
}
```

### POST `/api/auth/verify-face`
Verify face untuk user yang sudah login.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "faceDescriptor": "[0.123, 0.456, ...]"
}
```

**Response:**
```json
{
  "verified": true,
  "distance": "0.4523",
  "threshold": 0.6,
  "confidence": "24.62"
}
```

## 💻 Frontend Usage

### Registration dengan Face Capture

```tsx
import FaceCapture from '@/components/FaceCapture';
import { useState } from 'react';

function RegisterPage() {
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);

  const handleFaceCaptured = (descriptor: number[]) => {
    setFaceDescriptor(descriptor);
  };

  const handleRegister = async () => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name,
        role: 'warga',
        faceDescriptor: faceDescriptor ? JSON.stringify(faceDescriptor) : undefined
      })
    });
    // ...
  };

  return (
    <div>
      {/* Form registrasi */}
      
      {/* Face Capture (Optional) */}
      <div>
        <h3>Face Recognition (Optional)</h3>
        <FaceCapture onFaceCaptured={handleFaceCaptured} />
      </div>
    </div>
  );
}
```

### Login dengan Face Verification

```tsx
import FaceCapture from '@/components/FaceCapture';
import { useState } from 'react';

function LoginPage() {
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [loginMethod, setLoginMethod] = useState<'password' | 'face'>('password');

  const handleFaceCaptured = (descriptor: number[]) => {
    setFaceDescriptor(descriptor);
  };

  const handleFaceLogin = async () => {
    if (!faceDescriptor) return;

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        faceDescriptor: JSON.stringify(faceDescriptor)
      })
    });
    // ...
  };

  return (
    <div>
      {/* Toggle between password and face login */}
      <button onClick={() => setLoginMethod('password')}>Login with Password</button>
      <button onClick={() => setLoginMethod('face')}>Login with Face</button>

      {loginMethod === 'face' ? (
        <div>
          <FaceCapture 
            onFaceCaptured={handleFaceCaptured}
            autoStart={true}
          />
          <button onClick={handleFaceLogin}>Login</button>
        </div>
      ) : (
        /* Password form */
      )}
    </div>
  );
}
```

## 🔒 Security Considerations

1. **Encryption**: Face descriptors di-encrypt sebelum disimpan ke database menggunakan AES encryption
2. **Privacy**: Face data tidak pernah disimpan dalam format gambar, hanya descriptor (128-dimensional vector)
3. **Threshold**: Default threshold 0.6 untuk face matching (dapat disesuaikan)
4. **Distance**: Euclidean distance digunakan untuk compare face descriptors

## ⚙️ Configuration

### Face Matching Threshold

Default threshold: **0.6**
- Semakin kecil = semakin strict (lebih sulit match)
- Semakin besar = semakin loose (lebih mudah match)

Update di `backend/services/faceRecognitionService.js`:
```javascript
const THRESHOLD = 0.5; // More strict
// atau
const THRESHOLD = 0.7; // More loose
```

## 🐛 Troubleshooting

### Models tidak load
- Pastikan semua model files ada di `public/models/`
- Check browser console untuk error messages
- Pastikan path ke models benar (`/models`)

### Camera access denied
- User harus allow camera access di browser
- Pastikan HTTPS atau localhost (required untuk camera API)

### Face tidak terdeteksi
- Pastikan lighting cukup
- Position face di tengah camera
- Pastikan hanya satu face yang visible

### Face verification failed
- Face mungkin berubah (makeup, glasses, beard, dll)
- Coba rekam ulang face descriptor
- Adjust threshold jika terlalu strict

## 📚 References

- [face-api.js Documentation](https://github.com/justadudewhohacks/face-api.js)
- [face-api.js Models](https://github.com/justadudewhohacks/face-api.js-models)

