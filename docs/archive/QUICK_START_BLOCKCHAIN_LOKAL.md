# ⚡ Quick Start: Blockchain Lokal Tanpa API

## 🎯 TL;DR

**YA, Anda bisa membuat blockchain sendiri untuk LaporIn tanpa API eksternal!**

Ada 2 cara mudah:

### 🎭 Opsi 1: Mock Blockchain (PALING MUDAH - 30 detik)

```bash
# 1. Edit backend/.env
USE_MOCK_BLOCKCHAIN=true

# 2. Restart backend
cd backend
npm run dev
```

**Selesai!** Mock blockchain langsung aktif. Perfect untuk demo/hackathon.

---

### 🏠 Opsi 2: Local Hardhat Node (REAL BLOCKCHAIN - 2 menit)

```bash
# Terminal 1: Start blockchain node
cd blockchain
npm run node

# Terminal 2: Deploy contract
cd blockchain
npm run deploy:local

# Terminal 3: Update backend/.env
# Copy CONTRACT_ADDRESS dari output deploy
# Set BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
# Set PRIVATE_KEY dari Account #0 (tanpa 0x)

# Terminal 4: Start backend
cd backend
npm run dev
```

**Selesai!** Real blockchain berjalan di komputer Anda.

---

## 📊 Perbandingan Cepat

| | Mock Blockchain | Local Hardhat |
|---|---|---|
| **Setup Time** | 30 detik | 2 menit |
| **Real Blockchain** | ❌ | ✅ |
| **Cocok Demo** | ✅✅✅ | ✅✅ |
| **Cocok Development** | ✅ | ✅✅✅ |

---

## 🎯 Rekomendasi

- **Hackathon/Demo** → Mock Blockchain
- **Development/Testing** → Local Hardhat

---

**Detail lengkap:** Lihat `backend/BLOCKCHAIN_LOKAL_TANPA_API.md`

