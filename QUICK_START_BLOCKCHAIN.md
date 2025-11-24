# ⚡ Quick Start: Setup Blockchain untuk Hackathon

## 🎯 TL;DR (5 Menit Setup)

### 1. Dapatkan Token dari Faucet
1. Buka: https://faucet.polygon.technology/
2. Pilih: Polygon Amoy + POL
3. Verifikasi: GitHub atau X
4. Masukkan wallet address dari MetaMask
5. Klik "Claim"

### 2. Setup Environment

**File: `blockchain/.env`**
```env
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key_without_0x
```

**File: `backend/.env`**
```env
USE_MOCK_BLOCKCHAIN=false
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key_without_0x
CONTRACT_ADDRESS=0x...  # Akan diisi setelah deploy
```

### 3. Deploy Contract
```bash
cd blockchain
npm install
npm run compile
npm run deploy
# Copy contract address dari output
```

### 4. Update Backend
```bash
# Edit backend/.env
# Tambahkan CONTRACT_ADDRESS dari step 3
# Restart backend
cd backend
npm run dev
```

### 5. Verify Setup
```bash
cd backend
npm run verify:blockchain
```

**Done! ✅**

---

## 📚 Dokumentasi Lengkap

- **Setup Lengkap**: `SETUP_BLOCKCHAIN_HACKATHON.md`
- **Untuk Presentasi**: `BLOCKCHAIN_FOR_PRESENTATION.md`
- **Troubleshooting**: Lihat bagian Troubleshooting di `SETUP_BLOCKCHAIN_HACKATHON.md`

---

## 🔍 Quick Verification

```bash
cd backend
npm run verify:blockchain
```

Script ini akan mengecek:
- ✅ Environment variables
- ✅ Network connection
- ✅ Wallet balance
- ✅ Contract deployment

---

## 🆘 Masalah Cepat?

### "Contract instance is null"
→ Cek `backend/.env`, pastikan semua variabel sudah di-set

### "INSUFFICIENT_FUNDS"
→ Claim MATIC dari faucet: https://faucet.polygon.technology/

### "Contract not found"
→ Deploy contract dulu: `cd blockchain && npm run deploy`

---

**Selamat! Blockchain siap digunakan! 🚀**

