# 📋 Kapan Deploy Blockchain Diperlukan?

## ⚠️ PENTING: Deploy Hanya Sekali!

**TIDAK perlu deploy setiap kali start project atau mengakumulasi data.**

## 🔄 Workflow Blockchain di LaporIn

### 1️⃣ Deploy Contract (Hanya Sekali)

Contract `WargaLapor.sol` hanya perlu di-deploy **sekali** ke blockchain (Polygon Amoy atau local network). Setelah deploy, contract address akan tetap sama dan tidak berubah.

```bash
cd blockchain
npm run deploy
```

**Output akan memberikan:**
```
📍 Contract Address: 0x660F55a5656123249e3A319C27150F199815c987
```

### 2️⃣ Simpan Contract Address ke Backend

Setelah deploy, copy contract address dan simpan di `backend/.env`:

```env
CONTRACT_ADDRESS=0x660F55a5656123249e3A319C27150F199815c987
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key_here
```

### 3️⃣ Backend Menggunakan Contract yang Sudah Ada

Setiap kali backend start atau ada data baru (laporan, perubahan status, dll), backend akan:

✅ **Memanggil function yang sudah ada** di contract (seperti `logReportEvent`)
❌ **TIDAK deploy contract baru**

Contoh:
- Laporan baru dibuat → Backend memanggil `contract.logReportEvent()`
- Status laporan berubah → Backend memanggil `contract.logReportEvent()` lagi
- Bantuan didistribusikan → Backend memanggil `contract.logBantuanEvent()`

**Contract address tetap sama**, hanya data yang ditambahkan ke blockchain.

## 🔄 Kapan Deploy Ulang Diperlukan?

### ✅ Deploy Sekali Saja Kecuali:

1. **Contract Code Berubah**
   - Jika Anda mengubah kode smart contract (`WargaLapor.sol`)
   - Perlu compile ulang: `npm run compile`
   - Perlu deploy ulang: `npm run deploy`

2. **Pindah Network**
   - Dari local → Polygon Amoy: Deploy ke Polygon Amoy
   - Dari Polygon Amoy → local: Deploy ke local network
   - **Catatan:** Setiap network memiliki contract address berbeda

3. **Contract Error atau Upgrade**
   - Jika ada bug di contract
   - Perlu deploy contract baru (migrate)

## 🚀 Workflow Normal (Setiap Hari)

### Start Project

```bash
# 1. Start backend (contract sudah di-deploy sebelumnya)
cd backend
npm run dev

# Backend akan otomatis:
# - Load CONTRACT_ADDRESS dari .env
# - Connect ke blockchain menggunakan address tersebut
# - Siap menerima request dan log ke blockchain
```

### Menambah Data ke Blockchain

```bash
# Setiap kali ada laporan baru:
# - Backend otomatis memanggil contract.logReportEvent()
# - TIDAK perlu deploy ulang
# - Contract address tetap sama
```

## 📝 Checklist Setup Awal

Setelah deploy pertama kali, pastikan `backend/.env` sudah berisi:

```env
# ✅ Setelah deploy pertama kali, ini cukup:
CONTRACT_ADDRESS=0x660F55a5656123249e3A319C27150F199815c987
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key_here

# ❌ TIDAK perlu deploy lagi setiap kali start project
```

## 💡 Analogi Sederhana

Bayangkan contract seperti **rumah** yang sudah dibangun:
- **Deploy = Membangun rumah** (hanya sekali)
- **Menambah data = Menambahkan perabot ke rumah** (setiap hari)
- **Contract address = Alamat rumah** (tetap sama selamanya)

## 🔍 Verifikasi Contract Sudah Di-Deploy

Jika tidak yakin apakah contract sudah di-deploy, cek di `backend/.env`:

```bash
cd backend
cat .env | grep CONTRACT_ADDRESS
```

Jika ada CONTRACT_ADDRESS yang valid, berarti contract sudah di-deploy dan **TIDAK perlu deploy lagi**.

## ❓ FAQ

### Q: Apakah perlu `npm run deploy` setiap kali start project?
**A: TIDAK!** Deploy hanya sekali di awal.

### Q: Apakah perlu `npm run deploy` setiap ada data baru?
**A: TIDAK!** Backend otomatis memanggil function di contract yang sudah ada.

### Q: Kapan perlu deploy ulang?
**A:**
- Contract code berubah
- Pindah network (local ↔ testnet)
- Contract ada bug dan perlu upgrade

### Q: Bagaimana cara tahu contract sudah di-deploy?
**A:** Cek `backend/.env` ada `CONTRACT_ADDRESS=0x...`. Jika ada, berarti sudah di-deploy.

### Q: Apakah data sebelumnya hilang kalau deploy ulang?
**A: Ya!** Deploy contract baru = membuat contract baru dengan address baru. Data di contract lama tetap ada di address lama.

## 🎯 Kesimpulan

**Deploy = Sekali di awal setup**

**Menambah data ke blockchain = Otomatis oleh backend setiap ada transaksi**

**TIDAK perlu deploy setiap kali start project!**

