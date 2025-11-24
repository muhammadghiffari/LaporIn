# 🔐 Setup Blockchain untuk LaporIn

## Masalah: "Transaksi Blockchain Belum Tersedia"

Jika Anda melihat pesan ini, berarti laporan berhasil dibuat di database, namun belum tercatat di blockchain. Berikut cara memperbaikinya:

## ✅ Konfigurasi yang Diperlukan

Edit file `backend/.env` dan pastikan variabel berikut sudah di-set dengan benar:

### 1. BLOCKCHAIN_RPC_URL
**PENTING:** Jangan gunakan `localhost` atau `127.0.0.1` untuk production/testnet.

Untuk **Polygon Amoy Testnet**, gunakan salah satu RPC URL berikut:

```env
# Opsi 1: Polygon Official RPC (Gratis)
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology

# Opsi 2: Alchemy (Perlu API Key - Gratis)
BLOCKCHAIN_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY

# Opsi 3: Infura (Perlu API Key - Gratis)
BLOCKCHAIN_RPC_URL=https://polygon-amoy.infura.io/v3/YOUR_PROJECT_ID
```

**❌ SALAH:**
```env
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545  # Localhost hanya untuk development dengan local node
```

### 2. PRIVATE_KEY
Private key dari wallet yang akan digunakan untuk menandatangani transaksi blockchain.

```env
PRIVATE_KEY=your_private_key_here_without_0x_prefix
```

**PENTING:**
- Wallet harus memiliki **MATIC token** (untuk gas fee) di Polygon Amoy Testnet
- Dapatkan testnet MATIC dari faucet: https://faucet.polygon.technology/
- Jangan share private key ini ke publik!

### 3. CONTRACT_ADDRESS
Address dari smart contract yang sudah di-deploy di Polygon Amoy Testnet.

```env
CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

**Cara Deploy Contract:**
1. Compile contract `WargaLapor.sol`
2. Deploy ke Polygon Amoy Testnet menggunakan Hardhat/Truffle/Remix
3. Copy contract address yang dihasilkan

## 🔍 Troubleshooting

### Cek Konfigurasi
Jalankan di terminal backend:
```bash
cd backend
node -e "require('dotenv').config(); console.log('RPC:', process.env.BLOCKCHAIN_RPC_URL ? 'SET' : 'MISSING'); console.log('PRIVATE_KEY:', process.env.PRIVATE_KEY ? 'SET' : 'MISSING'); console.log('CONTRACT:', process.env.CONTRACT_ADDRESS ? 'SET' : 'MISSING');"
```

### Cek Log Backend
Saat membuat laporan, cek console backend untuk melihat error detail:
- `[Blockchain] Contract instance is null` → Konfigurasi salah
- `[Blockchain] INSUFFICIENT_FUNDS` → Wallet tidak punya MATIC
- `[Blockchain] CALL_EXCEPTION` → Contract address salah atau tidak deployed
- `[Blockchain] NETWORK_ERROR` → RPC URL tidak bisa diakses

### Test Koneksi Blockchain
```bash
cd backend
node -e "
const { ethers } = require('ethers');
require('dotenv').config();
const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
provider.getBlockNumber().then(block => {
  console.log('✅ Connected! Current block:', block);
}).catch(err => {
  console.error('❌ Connection failed:', err.message);
});
"
```

## 📝 Checklist

- [ ] `BLOCKCHAIN_RPC_URL` menggunakan Polygon Amoy RPC (bukan localhost)
- [ ] `PRIVATE_KEY` sudah di-set dengan benar
- [ ] `CONTRACT_ADDRESS` sudah di-set dengan address contract yang deployed
- [ ] Wallet memiliki MATIC token di Polygon Amoy Testnet
- [ ] Contract sudah di-deploy dan verified di Polygon Amoy
- [ ] Backend server sudah di-restart setelah mengubah `.env`

## 🚀 Setelah Konfigurasi

1. Restart backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Buat laporan baru dan cek apakah blockchain hash muncul

3. Jika masih error, cek console backend untuk detail error

## 💡 Catatan

- Laporan tetap tersimpan di database meskipun blockchain gagal
- Blockchain hanya untuk audit trail dan transparansi
- Untuk development/testing, bisa skip blockchain jika tidak diperlukan
- Pastikan menggunakan testnet (Amoy) untuk development, bukan mainnet

