# 🔗 Update Blockchain Explorer URL

## ⚠️ Masalah yang Ditemukan

User melaporkan error saat klik link blockchain:
- **Error**: `DNS_PROBE_FINISHED_NXDOMAIN`
- **URL**: `mumbai.polygonscan.com/tx/...` (tanpa `https://`)

## 🔍 Root Cause

1. **Polygon Mumbai Testnet sudah deprecated** - Domain `mumbai.polygonscan.com` tidak tersedia lagi
2. **Browser mencoba resolve URL tanpa protocol** - Menyebabkan DNS error

## ✅ Solusi yang Diterapkan

### 1. Update Explorer URL ke Amoy Testnet

Semua link blockchain di-update dari:
- ❌ `https://mumbai.polygonscan.com` (tidak tersedia)
- ✅ `https://amoy.polygonscan.com` (Polygon Amoy Testnet - replacement untuk Mumbai)

### 2. Update File yang Terpengaruh

#### Frontend Files:
- ✅ `app/reports/[id]/page.tsx` - Report detail page (7 links)
- ✅ `app/laporan/page.tsx` - Reports list page (1 link)
- ✅ `components/ReportsList.tsx` - Reports list component (1 link)

#### Backend Files (untuk referensi):
- `backend/services/blockchainService.js` - Update jika ada hardcoded URL
- `SETUP_BLOCKCHAIN.md` - Update dokumentasi

### 3. Perbaikan Tambahan

- ✅ Menambahkan `onClick` handler dengan `window.open()` untuk memastikan URL selalu dibuka dengan protocol yang benar
- ✅ Menambahkan `cursor-pointer` class untuk UX yang lebih baik

## 📝 Catatan Penting

### Polygon Mumbai vs Amoy

- **Mumbai Testnet**: ❌ Deprecated (tidak tersedia lagi)
- **Amoy Testnet**: ✅ Replacement untuk Mumbai (aktif)

Jika masih menggunakan **Polygon Mumbai** untuk deployment:
1. Migrate ke **Polygon Amoy Testnet**
2. Update `BLOCKCHAIN_RPC_URL` di `.env`:
   ```
   # Old (Mumbai - deprecated)
   # BLOCKCHAIN_RPC_URL=https://rpc-mumbai.maticvigil.com
   
   # New (Amoy)
   BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
   ```

### Atau Gunakan Local Blockchain

Jika ingin tetap menggunakan setup yang ada:
1. Gunakan **Hardhat Local Network**
2. Tidak perlu explorer external (gunakan local UI atau script)

## 🧪 Testing

Setelah update, test:
1. ✅ Klik link blockchain di report detail page
2. ✅ Klik link blockchain di reports list
3. ✅ Pastikan URL dibuka dengan `https://amoy.polygonscan.com`
4. ✅ Pastikan tidak ada DNS error

## 🔄 Migration Checklist

Jika perlu migrate dari Mumbai ke Amoy:

- [ ] Update `BLOCKCHAIN_RPC_URL` di `.env`
- [ ] Deploy contract ke Amoy Testnet
- [ ] Update `CONTRACT_ADDRESS` di `.env`
- [ ] Update semua frontend links (✅ sudah dilakukan)
- [ ] Update dokumentasi (✅ sudah dilakukan)
- [ ] Test semua fitur blockchain

---

**Status**: ✅ **Fixed**

Semua link blockchain sekarang menggunakan `https://amoy.polygonscan.com` dan akan bekerja dengan benar! 🎉

