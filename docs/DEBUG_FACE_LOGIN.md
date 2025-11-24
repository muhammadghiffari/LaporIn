# 🐛 Debug Face Verification Login Flow

## Problem
Login langsung ke dashboard padahal user sudah punya face registered, seharusnya lanjut ke Step 2 (Face Verification).

## Root Cause
Mungkin ada beberapa penyebab:
1. User belum punya `faceDescriptor` di database (belum register face)
2. Backend tidak return `hasFaceRegistered: true` dengan benar
3. Frontend tidak check dengan benar

## Debug Steps

### 1. Cek apakah user punya face descriptor di database

```sql
SELECT id, email, face_verified, 
       CASE WHEN face_descriptor IS NULL THEN 'NULL' 
            WHEN face_descriptor = '' THEN 'EMPTY' 
            ELSE 'HAS_VALUE' END as descriptor_status,
       LENGTH(face_descriptor) as descriptor_length
FROM users 
WHERE email = 'user@example.com';
```

### 2. Check Backend Logs

Setelah login, cek console backend:
```
[Login] User user@example.com: { hasFaceDescriptor: true/false, ... }
```

### 3. Check Frontend Console

Setelah login, cek browser console:
```
[Login Debug] Response data: { ... }
[Login Debug] Face check: { hasFaceRegistered: true/false, ... }
[Login] ✅ User has face registered - MOVING TO FACE VERIFICATION STEP
```

### 4. Verify Response

Pastikan response dari `/api/auth/login` include:
```json
{
  "token": "...",
  "user": {...},
  "hasFaceRegistered": true,  // <-- Harus true
  "requiresFaceVerification": true  // <-- Harus true
}
```

## Fix yang sudah dilakukan

1. ✅ Early return di frontend jika `hasFace === true`
2. ✅ Tidak save token ke localStorage jika butuh face verification
3. ✅ Logging di backend dan frontend
4. ✅ Strict check dengan `Boolean(...) === true`

## Testing

1. **Registrasi dengan face:**
   - Buka `/register`
   - Isi form + capture wajah
   - Submit
   - Harus redirect ke `/login` (bukan dashboard)

2. **Login dengan face registered:**
   - Buka `/login`
   - Masukkan email + password
   - Submit
   - Harus muncul **Step 2: Face Verification** (tidak langsung ke dashboard)
   - Capture wajah
   - Klik "Verifikasi"
   - Jika match → ke dashboard
   - Jika tidak match → error, bisa coba lagi atau skip

3. **Login tanpa face registered:**
   - Buka `/login`
   - Masukkan email + password user yang belum register face
   - Submit
   - Harus langsung ke dashboard (tidak ada Step 2)

## Troubleshooting

### Masih langsung ke dashboard padahal sudah register face?

**Cek:**
1. Browser console → cari `[Login Debug]` log
2. Backend console → cari `[Login] User ...` log
3. Pastikan `hasFaceRegistered: true` di response

**Jika `hasFaceRegistered: false` padahal sudah register:**
- Cek database: `SELECT face_descriptor FROM users WHERE email = '...'`
- Pastikan `face_descriptor` tidak NULL dan tidak empty
- Pastikan `face_verified = true`

### Face verification selalu gagal?

**Cek:**
1. Distance value di error message
2. Threshold saat ini: 0.7 (bisa dinaikkan ke 0.8 jika terlalu strict)
3. Pastikan lighting dan posisi wajah sama saat registrasi dan login

### Ingin disable face verification untuk testing?

**Temporary fix:**
- Comment out step 2 di `app/login/page.tsx`
- Atau set `requiresFaceVerification: false` di backend response

