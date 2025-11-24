# 🎭 Setup Mock Blockchain untuk Demo Hackathon

## 🎯 Untuk Demo ITFair2025

Gunakan **Mock Blockchain** untuk demo - tidak perlu gas fee, tidak perlu setup apapun!

## ⚡ Quick Setup (30 detik)

### 1. Edit `backend/.env`

Tambahkan atau update baris berikut:

```env
# Mock Blockchain - Perfect untuk Demo!
USE_MOCK_BLOCKCHAIN=true

# Bisa dikosongkan atau dihapus (tidak digunakan saat mock)
# BLOCKCHAIN_RPC_URL=
# PRIVATE_KEY=
# CONTRACT_ADDRESS=
```

### 2. Restart Backend

```bash
cd backend
npm run dev
```

**Selesai!** Mock blockchain langsung aktif.

---

## ✅ Yang Sudah Diperbaiki

1. ✅ **Blockchain info HANYA untuk Admin/Pengurus**
   - Role "warga" tidak melihat blockchain hash
   - Blockchain hanya untuk audit trail admin

2. ✅ **Mock Blockchain untuk Demo**
   - Tidak perlu gas fee
   - Tidak perlu setup RPC/private key
   - Perfect untuk hackathon demo

3. ✅ **UI Update**
   - Kolom blockchain di list laporan hanya untuk admin
   - Blockchain card di detail laporan hanya untuk admin
   - Success message tidak menampilkan blockchain hash ke warga

---

## 🔍 Verifikasi

Setelah restart backend, cek console:

```
🎭 [Blockchain] Using MOCK blockchain service (demo mode)
🎭 [Blockchain] No real blockchain needed - perfect for demo!
```

Jika melihat ini, berarti mock blockchain sudah aktif! ✅

---

## 📝 Catatan untuk Hackathon

**Untuk Demo:**
- ✅ Gunakan `USE_MOCK_BLOCKCHAIN=true`
- ✅ Blockchain info hanya untuk admin (sesuai requirement)
- ✅ Warga tidak perlu tahu detail blockchain

**Untuk Production (setelah hackathon):**
- Gunakan local Hardhat node atau testnet
- Set `USE_MOCK_BLOCKCHAIN=false`
- Setup RPC URL dan private key

---

## 🆘 Troubleshooting

### Masih error "insufficient funds"?

**Solusi:** Pastikan `USE_MOCK_BLOCKCHAIN=true` di `backend/.env` dan restart backend.

### Blockchain info masih muncul untuk warga?

**Solusi:** Clear browser cache atau hard refresh (Ctrl+Shift+R / Cmd+Shift+R).

---

**Status:** ✅ Siap untuk demo hackathon!

