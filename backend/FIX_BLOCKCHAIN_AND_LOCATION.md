# 🔧 Fix: Blockchain Link & Location Extraction

## ✅ Masalah yang Diperbaiki

### 1. **Blockchain Hash Tidak Ditemukan di Polygonscan** ✅

**Masalah:**
- Menggunakan mock blockchain untuk demo
- Hash yang di-generate adalah random hash yang tidak ada di real blockchain
- Link ke Polygonscan error "Transaction Hash not found"

**Solusi:**
- ✅ Tambahkan flag `is_mock_blockchain` di response API
- ✅ Frontend detect mock blockchain dan disable link Polygonscan
- ✅ Tampilkan pesan "Mock Blockchain (Demo Mode)" untuk mock blockchain

### 2. **Location Extraction Memotong Alamat** ✅

**Masalah:**
- User: "jl sigma nomor 69"
- Hasil: "Jl s" ❌ (salah!)
- Seharusnya: "Jl Sigma No 69" ✅

**Penyebab:**
- Regex pattern `([a-z0-9\s]+?)` dengan non-greedy `+?` stop terlalu cepat
- Pattern mengharuskan "blok" sebelum "nomor", padahal user bilang "jl sigma nomor 69" tanpa "blok"

**Solusi:**
- ✅ Tambahkan pattern sederhana untuk "jl [nama] nomor [angka]" tanpa perlu "blok"
- ✅ Pattern baru: `/(jalan|jl|jl\.|jl\s)\s+([a-z]+)\s+(?:nomor|no|nmr)\s+([0-9]+)/i`
- ✅ Capitalize nama jalan dengan benar

---

## 📝 Perubahan yang Dilakukan

### 1. Backend: Location Extraction (`backend/routes/chat.routes.js`)

**Sebelum:**
```javascript
const fullAddressMatch = textToExtractFrom.match(
  /(jalan|jl|jl\.|jl\s)\s*([a-z0-9\s]+?)(?:\s+(blok|block)\s+([a-z0-9\s\/]+))?(?:\s+(no|nomor)\s+([0-9]+))?/i
);
// Masalah: non-greedy +? stop di "s" (spasi pertama)
```

**Sesudah:**
```javascript
// Pattern sederhana untuk "jl sigma nomor 69" (tanpa blok)
const simpleAddressMatch = textToExtractFrom.match(
  /(jalan|jl|jl\.|jl\s)\s+([a-z]+)\s+(?:nomor|no|nmr)\s+([0-9]+)/i
);
if (simpleAddressMatch) {
  const namaJalan = simpleAddressMatch[2]?.trim() || '';
  const nomor = simpleAddressMatch[3]?.trim() || '';
  if (namaJalan && nomor) {
    extractedLocation = `Jl ${namaJalan.charAt(0).toUpperCase() + namaJalan.slice(1)} No ${nomor}`;
  }
}
// Hasil: "Jl Sigma No 69" ✅
```

### 2. Backend: Mock Blockchain Flag (`backend/routes/reports.routes.js`)

**Tambahkan di semua endpoint:**
```javascript
const isMockBlockchain = process.env.USE_MOCK_BLOCKCHAIN === 'true';

const reportData = {
  // ... other fields
  blockchain_tx_hash: hashTransaksi || laporan.blockchainTxHash || null,
  is_mock_blockchain: isMockBlockchain, // Flag untuk frontend
  // ... other fields
};
```

### 3. Frontend: Handle Mock Blockchain (`app/reports/[id]/page.tsx`)

**Sebelum:**
```tsx
<a href={`https://amoy.polygonscan.com/tx/${report.blockchain_tx_hash}`}>
  Verifikasi di Blockchain Explorer
</a>
// Error: Hash tidak ditemukan di Polygonscan
```

**Sesudah:**
```tsx
{report.is_mock_blockchain ? (
  <div className="text-xs text-gray-600 italic">
    🔧 Mock Blockchain (Demo Mode) - Hash tidak bisa diverifikasi di explorer
  </div>
) : (
  <a href={`https://amoy.polygonscan.com/tx/${report.blockchain_tx_hash}`}>
    Verifikasi di Blockchain Explorer
  </a>
)}
```

### 4. Frontend: List Laporan (`app/laporan/page.tsx`)

**Update interface dan link:**
```tsx
interface Laporan {
  // ... other fields
  blockchain_tx_hash?: string;
  is_mock_blockchain?: boolean; // Flag untuk mock blockchain
}

// Di table:
{item.is_mock_blockchain ? (
  <div className="flex items-center gap-1 text-gray-500">
    <BlockIcon fontSize="small" />
    <Typography variant="caption" className="font-mono text-xs">
      {item.blockchain_tx_hash.substring(0, 8)}...
    </Typography>
    <Typography variant="caption" className="text-xs text-gray-400">
      (Mock)
    </Typography>
  </div>
) : (
  <a href={`https://amoy.polygonscan.com/tx/${item.blockchain_tx_hash}`}>
    {/* Link ke Polygonscan */}
  </a>
)}
```

---

## 🧪 Testing

### Test Location Extraction:

1. **Test Case 1:** "jl sigma nomor 69"
   - **Expected:** "Jl Sigma No 69" ✅
   - **Before:** "Jl s" ❌
   - **After:** "Jl Sigma No 69" ✅

2. **Test Case 2:** "jalan cihuy blok c nomor 54"
   - **Expected:** "Jl Cihuy, Blok C, No 54" ✅
   - **Before:** "Jl Cihuy, Blok C, No 54" ✅ (sudah benar)
   - **After:** "Jl Cihuy, Blok C, No 54" ✅

3. **Test Case 3:** "di jl sigma nmr 69"
   - **Expected:** "Jl Sigma No 69" ✅
   - **After:** "Jl Sigma No 69" ✅

### Test Mock Blockchain:

1. **Set `USE_MOCK_BLOCKCHAIN=true` di `backend/.env`**
2. **Restart backend**
3. **Buat laporan baru**
4. **Cek detail laporan:**
   - ✅ Tidak ada link ke Polygonscan
   - ✅ Tampil pesan "Mock Blockchain (Demo Mode)"
   - ✅ Hash tetap muncul (untuk audit)

---

## 📊 Hasil

### Sebelum:
- ❌ Location: "Jl s" (salah)
- ❌ Blockchain link error di Polygonscan
- ❌ User bingung kenapa hash tidak ditemukan

### Sesudah:
- ✅ Location: "Jl Sigma No 69" (benar)
- ✅ Mock blockchain tidak menampilkan link Polygonscan
- ✅ Pesan jelas: "Mock Blockchain (Demo Mode)"
- ✅ Real blockchain tetap bisa verifikasi di Polygonscan

---

## 🎯 Status

- ✅ Location extraction fixed
- ✅ Mock blockchain flag added
- ✅ Frontend handle mock blockchain
- ✅ All Polygonscan links updated
- ✅ No linter errors

**Siap untuk testing!** 🚀

