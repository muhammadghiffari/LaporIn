# 🔐 Biometric Data Storage & Blockchain Integration

## 📍 Di Mana Data Biometric Disimpan?

### 1. **Database (PostgreSQL) - Data Utama**
- **Lokasi:** Field `face_descriptor` di tabel `users`
- **Format:** Encrypted (AES encryption) menggunakan `FACE_ENCRYPTION_KEY`
- **Isi:** Face descriptor (128-dimensional vector) dari face-api.js yang sudah di-encrypt
- **Akses:** Hanya bisa di-decrypt dengan encryption key yang sama
- **Tujuan:** Untuk face verification/matching saat login

### 2. **Blockchain - Audit Trail**
- **Lokasi:** Smart contract di blockchain (Polygon Amoy Testnet atau Mock)
- **Format:** Hash dari face descriptor (bukan data asli)
- **Isi:** Hash 20 karakter yang di-generate dari face descriptor
- **Tujuan:** Audit trail, verifikasi bahwa biometric sudah terdaftar, immutability
- **Transaction Hash:** Disimpan di field `face_blockchain_tx_hash` di database

## 🔒 Keamanan Data

### Mengapa Hanya Hash yang Disimpan di Blockchain?
1. **Privacy:** Data biometric sangat sensitif, tidak boleh disimpan di public blockchain
2. **Security:** Hash tidak bisa di-reverse ke data asli (one-way function)
3. **Audit Trail:** Hash cukup untuk membuktikan bahwa biometric sudah terdaftar
4. **Compliance:** Memenuhi standar privasi data (GDPR, dll)

### Alur Penyimpanan:
```
1. User upload foto wajah
   ↓
2. Extract face descriptor (128D vector)
   ↓
3. Encrypt descriptor → Simpan ke database (encrypted)
   ↓
4. Generate hash dari descriptor → Simpan ke blockchain (hash only)
   ↓
5. Simpan blockchain transaction hash ke database
```

## 📊 Struktur Data

### Database Schema:
```prisma
model User {
  faceDescriptor        String?  // Encrypted face descriptor (database)
  faceVerified          Boolean  // Status verifikasi
  faceVerifiedAt        DateTime? // Timestamp verifikasi
  faceBlockchainTxHash  String?  // Blockchain transaction hash
}
```

### Blockchain Event:
```solidity
event BiometricEventCreated(
  uint256 indexed userId,
  string biometricHash,  // Hash dari face descriptor (bukan data asli)
  string action,         // 'register' atau 'update'
  address actor,
  uint256 timestamp
);
```

## 🚀 Cara Kerja

### 1. Face Registration (`POST /api/auth/face/register`)
```javascript
// 1. Extract face descriptor dari foto
const faceDescriptor = await extractFaceDescriptor(photo);

// 2. Encrypt dan simpan ke database
const encrypted = encryptFaceDescriptor(faceDescriptor);
await prisma.user.update({
  data: { faceDescriptor: encrypted }
});

// 3. Generate hash untuk blockchain
const biometricHash = ethers.id(faceDescriptor).substring(0, 20);

// 4. Log ke blockchain
const txHash = await logBiometricToBlockchain(userId, biometricHash, 'register');

// 5. Simpan transaction hash ke database
await prisma.user.update({
  data: { faceBlockchainTxHash: txHash }
});
```

### 2. Face Verification (`POST /api/auth/face/verify`)
```javascript
// 1. Ambil encrypted descriptor dari database
const user = await prisma.user.findUnique({ where: { id: userId } });

// 2. Decrypt descriptor
const storedDescriptor = decryptFaceDescriptor(user.faceDescriptor);

// 3. Extract descriptor dari foto baru
const newDescriptor = await extractFaceDescriptor(photo);

// 4. Compare descriptors (tidak perlu blockchain)
const match = compareFaceDescriptors(storedDescriptor, newDescriptor);
```

## 🔍 Verifikasi Blockchain

### Cara Cek Biometric di Blockchain:
1. **Via Transaction Hash:**
   ```javascript
   const user = await prisma.user.findUnique({ where: { id: userId } });
   const txHash = user.faceBlockchainTxHash;
   // Cek di blockchain explorer: https://amoy.polygonscan.com/tx/{txHash}
   ```

2. **Via Smart Contract Event:**
   ```javascript
   // Query event BiometricEventCreated dari contract
   const events = await contract.queryFilter(
     contract.filters.BiometricEventCreated(userId)
   );
   ```

## ⚠️ Catatan Penting

1. **Data Asli TIDAK Disimpan di Blockchain:**
   - Hanya hash yang disimpan untuk audit trail
   - Data asli tetap di database (encrypted)

2. **Blockchain adalah Optional:**
   - Jika blockchain tidak tersedia, registration tetap berhasil
   - Blockchain hanya untuk audit trail, bukan requirement

3. **Mock Blockchain untuk Development:**
   - Gunakan `USE_MOCK_BLOCKCHAIN=true` untuk development
   - Tidak perlu deploy contract atau setup RPC

4. **Privacy First:**
   - Data biometric sangat sensitif
   - Selalu encrypt sebelum simpan ke database
   - Jangan pernah simpan data asli ke blockchain

## 📝 Summary

| Lokasi | Data | Format | Tujuan |
|--------|------|--------|--------|
| **Database** | Face Descriptor | Encrypted (AES) | Face verification/matching |
| **Blockchain** | Hash dari Descriptor | Hash (20 chars) | Audit trail, immutability |
| **Database** | Transaction Hash | String (0x...) | Link ke blockchain transaction |

**Kesimpulan:** Data biometric disimpan di **database (encrypted)** untuk operasional, dan **hash-nya** disimpan di **blockchain** untuk audit trail dan verifikasi.

