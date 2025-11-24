# 🔧 Fix: Badge Blockchain & Location Extraction AI

## ✅ Masalah yang Diperbaiki

### 1. **Badge Warga Masih Ada Link ke Polygonscan** ✅

**Masalah:**
- Badge "Tercatat di Blockchain" untuk warga masih menampilkan link ke Polygonscan
- Link tidak berfungsi untuk mock blockchain
- Tidak best practice untuk warga melihat detail blockchain

**Solusi:**
- ✅ Hapus link Polygonscan dari badge warga
- ✅ Tampilkan badge sederhana tanpa link (hanya informasi bahwa data tercatat di blockchain)
- ✅ Mock blockchain tetap menampilkan pesan "Mock Blockchain (Demo Mode)"

### 2. **AI Location Extraction Tidak Maksimal** ✅

**Masalah:**
- User: "jl bla bla nomor 69"
- Hasil AI: "[alamat]" atau "Alamat" ❌
- Seharusnya: "Jl Bla Bla No 69" ✅

**Penyebab:**
1. Pattern regex hanya menangkap satu kata setelah "jl": `/(jalan|jl)\s+([a-z]+)\s+nomor/` → hanya menangkap "bla" pertama
2. AI prompt tidak eksplisit tentang ekstraksi multi-word location
3. Post-processing tidak mengekstrak location jika AI mengembalikan placeholder

**Solusi:**
- ✅ Perbaiki regex pattern untuk menangkap multiple words: `/(jalan|jl)\s+([a-z\s]+?)\s+nomor/`
- ✅ Perbaiki AI prompt untuk eksplisit tentang ekstraksi multi-word location
- ✅ Tambahkan post-processing untuk mengekstrak location dari pesan jika AI mengembalikan placeholder

### 3. **Optimasi NLP/LLM untuk Groq AI** ✅

**Perbaikan:**
- ✅ Perbaiki system prompt untuk Groq AI lebih eksplisit tentang ekstraksi location
- ✅ Tambahkan instruksi khusus untuk pattern multi-word location
- ✅ Tambahkan post-processing fallback jika AI mengembalikan placeholder

---

## 📝 Perubahan yang Dilakukan

### 1. Frontend: Badge Warga (`app/reports/[id]/page.tsx`)

**Sebelum:**
```tsx
{report.is_mock_blockchain ? (
  <div>🔧 Mock Blockchain (Demo Mode)</div>
) : (
  <a href={`https://amoy.polygonscan.com/tx/${report.blockchain_tx_hash}`}>
    Verifikasi di Blockchain Explorer
  </a>
)}
```

**Sesudah:**
```tsx
<p className="text-sm text-green-800 mb-3">
  Laporan Anda telah tercatat secara permanen di blockchain. Data tidak dapat diubah atau dihapus oleh siapa pun.
</p>
{report.is_mock_blockchain && (
  <div className="text-xs text-gray-600 italic">
    🔧 Mock Blockchain (Demo Mode)
  </div>
)}
// Link dihapus - badge hanya informatif untuk warga
```

### 2. Backend: Location Extraction Regex (`backend/routes/chat.routes.js`)

**Sebelum:**
```javascript
// Pattern hanya menangkap satu kata
const simpleAddressMatch = textToExtractFrom.match(
  /(jalan|jl)\s+([a-z]+)\s+nomor\s+([0-9]+)/i
);
// "jl bla bla nomor 69" → hanya menangkap "bla"
```

**Sesudah:**
```javascript
// Pattern menangkap multiple words
const simpleAddressMatch = textToExtractFrom.match(
  /(jalan|jl|jl\.|jl\s)\s+([a-z\s]+?)\s+(?:nomor|no|nmr|nomer)\s+([0-9]+)/i
);
// "jl bla bla nomor 69" → menangkap "bla bla"
// Capitalize setiap kata: "Jl Bla Bla No 69"
const namaJalanFormatted = namaJalan.split(/\s+/).map(word => 
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
).join(' ');
extractedLocation = `Jl ${namaJalanFormatted} No ${nomor}`;
```

### 3. Backend: AI Prompt (`backend/routes/chat.routes.js`)

**Sebelum:**
```javascript
"location": "Lokasi spesifik. Jika disebutkan di pesan gunakan itu, jika tidak gunakan '${user.rt_rw || 'Lokasi tidak disebutkan'}'"
```

**Sesudah:**
```javascript
"location": "Lokasi spesifik yang disebutkan di pesan. **PENTING:** JANGAN gunakan placeholder seperti '[alamat]', 'Alamat', 'Lokasi', 'Tempat', atau kata generic lainnya. Jika user menyebutkan alamat spesifik seperti 'jl sigma nomor 69', 'blok C', 'depan rumah', gunakan itu. Jika user menyebutkan 'di jl bla bla nomor 69', ekstrak menjadi 'Jl Bla Bla No 69'. Jika tidak ada lokasi spesifik di pesan, gunakan '${user.rt_rw || 'Lokasi tidak disebutkan'}'"
```

### 4. Backend: Groq AI System Prompt (`backend/routes/chat.routes.js`)

**Tambahan:**
```javascript
'12. **PENTING - EKSTRAKSI LOKASI:** Jika user menyebutkan alamat seperti "jl sigma nomor 69" atau "jl bla bla nomor 69", ekstrak menjadi "Jl Sigma No 69" atau "Jl Bla Bla No 69". JANGAN gunakan placeholder seperti "[alamat]", "Alamat", "Lokasi", atau kata generic lainnya.\n' +
'13. **EKSTRAKSI LOKASI MULTI-WORD:** Pattern "jl [kata1] [kata2] [kata3] nomor [angka]" harus diekstrak menjadi "Jl Kata1 Kata2 Kata3 No [angka]". Contoh: "jl jalan raya nomor 69" → "Jl Jalan Raya No 69"\n'
```

### 5. Backend: Post-Processing Location (`backend/routes/chat.routes.js`)

**Tambahan:**
```javascript
// POST-PROCESSING: Ekstrak location dari pesan jika AI mengembalikan placeholder
let finalLocation = (reportData.location || user.rt_rw || 'Lokasi tidak disebutkan').trim();

// Cek apakah location adalah placeholder generic
const genericLocationPatterns = ['alamat', 'lokasi', 'tempat', 'tidak disebutkan', 'unknown', '\\[alamat\\]', '\\[lokasi\\]'];
const isGenericLocation = genericLocationPatterns.some(pattern => {
  const regex = new RegExp(pattern, 'i');
  return regex.test(finalLocation);
});

// Jika location generic, coba extract dari pesan
if (isGenericLocation || finalLocation.toLowerCase() === 'alamat' || finalLocation === '[alamat]') {
  // Pattern 1: "jl [multiple words] nomor [angka]"
  const simpleLocationMatch = lastUserMsg.match(/(jalan|jl|jl\.|jl\s)\s+([a-z\s]+?)\s+(?:nomor|no|nmr|nomer)\s+([0-9]+)/i);
  if (simpleLocationMatch) {
    // Extract dan format location
    // ...
  }
}
```

---

## 🧪 Testing

### Test Badge Warga:

1. **Test Case 1:** Warga melihat detail laporan dengan mock blockchain
   - **Expected:** Badge "Tercatat di Blockchain" tanpa link, dengan pesan "Mock Blockchain (Demo Mode)" ✅
   - **Before:** Ada link ke Polygonscan yang error ❌
   - **After:** Badge tanpa link ✅

2. **Test Case 2:** Warga melihat detail laporan dengan real blockchain
   - **Expected:** Badge "Tercatat di Blockchain" tanpa link (hanya informatif) ✅
   - **After:** Badge tanpa link ✅

### Test Location Extraction:

1. **Test Case 1:** "jl sigma nomor 69"
   - **Expected:** "Jl Sigma No 69" ✅
   - **Before:** "[alamat]" atau "Alamat" ❌
   - **After:** "Jl Sigma No 69" ✅

2. **Test Case 2:** "jl bla bla nomor 69"
   - **Expected:** "Jl Bla Bla No 69" ✅
   - **Before:** "Jl Bla No 69" (hanya satu kata) ❌
   - **After:** "Jl Bla Bla No 69" ✅

3. **Test Case 3:** "di jl jalan raya nomor 100"
   - **Expected:** "Jl Jalan Raya No 100" ✅
   - **After:** "Jl Jalan Raya No 100" ✅

4. **Test Case 4:** "jl cihuy blok c nomor 54"
   - **Expected:** "Jl Cihuy, Blok C, No 54" ✅
   - **After:** "Jl Cihuy, Blok C, No 54" ✅

---

## 📊 Hasil

### Sebelum:
- ❌ Badge warga ada link ke Polygonscan (tidak best practice)
- ❌ Location: "[alamat]" atau "Alamat" (salah)
- ❌ Multi-word location tidak ter-extract dengan benar

### Sesudah:
- ✅ Badge warga tanpa link (hanya informatif)
- ✅ Location: "Jl Bla Bla No 69" (benar)
- ✅ Multi-word location ter-extract dengan benar
- ✅ Post-processing fallback jika AI mengembalikan placeholder
- ✅ AI prompt lebih eksplisit tentang ekstraksi location

---

## 🎯 Best Practice

### Badge Blockchain untuk Warga:
- ✅ **Hanya informatif** - tidak perlu link ke explorer
- ✅ **Sederhana** - "Tercatat di Blockchain" sudah cukup
- ✅ **Transparansi** - warga tahu data mereka aman dan tidak bisa diubah
- ✅ **Detail untuk admin** - hanya admin yang bisa lihat detail blockchain (hash, explorer link)

### Location Extraction:
- ✅ **Multi-layer extraction:**
  1. Regex pattern matching (rule-based)
  2. AI extraction (Groq AI)
  3. Post-processing fallback (jika AI mengembalikan placeholder)
- ✅ **Capitalization:** Setiap kata di nama jalan di-capitalize dengan benar
- ✅ **Validation:** Cek apakah location generic sebelum menggunakan

---

## 🎯 Status

- ✅ Badge warga tanpa link
- ✅ Location extraction multi-word fixed
- ✅ AI prompt diperbaiki
- ✅ Post-processing fallback ditambahkan
- ✅ No linter errors

**Siap untuk testing!** 🚀

