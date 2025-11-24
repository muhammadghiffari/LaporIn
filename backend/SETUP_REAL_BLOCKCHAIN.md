# 🔗 Setup Real Blockchain - Polygon Amoy Testnet

## Langkah-langkah Setup

### 1. Update backend/.env

Edit file `backend/.env` dan pastikan konfigurasi berikut:

```env
# Hapus atau set ke false untuk menggunakan real blockchain
USE_MOCK_BLOCKCHAIN=false

# RPC URL untuk Polygon Amoy Testnet (gratis, tidak perlu API key)
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology

# Private key wallet (dari MetaMask atau wallet lain)
# PENTING: Wallet harus memiliki MATIC di Polygon Amoy Testnet untuk gas fee
PRIVATE_KEY=your_private_key_here

# Contract address (akan diisi setelah deploy contract)
CONTRACT_ADDRESS=0x...
```

### 2. Deploy Smart Contract ke Polygon Amoy

#### A. Siapkan Wallet dengan MATIC

1. Install MetaMask: https://metamask.io/
2. Tambahkan Polygon Amoy Testnet ke MetaMask:
   - Network Name: Polygon Amoy
   - RPC URL: https://rpc-amoy.polygon.technology
   - Chain ID: 80002
   - Currency Symbol: MATIC
   - Block Explorer: https://amoy.polygonscan.com

3. Dapatkan testnet MATIC dari faucet:
   - https://faucet.polygon.technology/
   - Pilih "Polygon Amoy"
   - Masukkan wallet address Anda
   - Request MATIC (gratis)

#### B. Setup Blockchain Project

```bash
cd blockchain

# Install dependencies (jika belum)
npm install

# Buat file blockchain/.env
cat > .env << EOF
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key_from_metamask
EOF
```

**PENTING:** 
- Export private key dari MetaMask (Account Details → Export Private Key)
- Jangan share private key ke publik!
- Pastikan wallet memiliki MATIC untuk gas fee

#### C. Deploy Contract

```bash
cd blockchain

# Compile contract
npm run compile

# Deploy ke Polygon Amoy Testnet
npm run deploy
```

Setelah deploy berhasil, Anda akan mendapat output seperti:

```
✅ Contract deployed successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Contract Address: 0x1234567890abcdef...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3. Update backend/.env dengan Contract Address

Copy contract address dari output deploy, lalu update `backend/.env`:

```env
CONTRACT_ADDRESS=0x1234567890abcdef...  # Paste address dari deploy
```

### 4. Restart Backend Server

```bash
cd backend
npm run dev
```

### 5. Test Blockchain

1. Buat laporan baru melalui aplikasi
2. Cek detail laporan - blockchain hash harus muncul!
3. Klik "Verifikasi" untuk melihat di blockchain explorer

## ✅ Checklist

- [ ] `USE_MOCK_BLOCKCHAIN=false` di `backend/.env`
- [ ] `BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology`
- [ ] `PRIVATE_KEY` sudah di-set (dari MetaMask)
- [ ] Wallet memiliki MATIC di Polygon Amoy Testnet
- [ ] Contract sudah di-deploy ke Polygon Amoy
- [ ] `CONTRACT_ADDRESS` sudah di-set di `backend/.env`
- [ ] Backend server sudah di-restart

## 🔍 Troubleshooting

### Error: "Contract instance is null"
- Pastikan `BLOCKCHAIN_RPC_URL` benar (bukan localhost)
- Pastikan `CONTRACT_ADDRESS` benar
- Pastikan contract sudah di-deploy

### Error: "INSUFFICIENT_FUNDS"
- Wallet tidak memiliki MATIC
- Dapatkan MATIC dari faucet: https://faucet.polygon.technology/

### Error: "CALL_EXCEPTION"
- Contract address salah
- Contract belum di-deploy
- Network tidak match (pastikan menggunakan Amoy, bukan Mumbai)

### Error: "NETWORK_ERROR"
- RPC URL tidak bisa diakses
- Cek koneksi internet
- Coba RPC URL lain: `https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY`

## 🔗 Links Penting

- Polygon Amoy Faucet: https://faucet.polygon.technology/
- Polygon Amoy Explorer: https://amoy.polygonscan.com
- Polygon Amoy RPC: https://rpc-amoy.polygon.technology
- MetaMask: https://metamask.io/

## 💡 Tips

1. **Gunakan Testnet untuk Development** - Polygon Amoy adalah testnet, MATIC gratis
2. **Backup Private Key** - Simpan private key dengan aman, jangan share ke publik
3. **Monitor Gas Fee** - Testnet biasanya gratis, tapi tetap monitor
4. **Verify Contract** (Opsional) - Bisa verify contract di Polygonscan untuk transparansi

---

**Selamat! Blockchain sudah siap digunakan! 🎉**

