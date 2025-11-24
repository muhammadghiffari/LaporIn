# 🔗 Setup Blockchain untuk LaporIn

Panduan lengkap untuk setup blockchain service agar fitur blockchain logs bisa berfungsi.

## ⚡ Quick Setup (5 Menit)

### 1. Dapatkan Alchemy API Key (GRATIS)

1. Kunjungi [Alchemy](https://www.alchemy.com/)
2. Buat akun (gratis, tidak perlu kartu kredit)
3. Klik "Create App"
4. Pilih:
   - **Name**: LaporIn (atau nama lain)
   - **Chain**: Polygon
   - **Network**: Mumbai (Testnet)
5. Klik "Create App"
6. Klik pada app yang baru dibuat
7. Klik "View Key" di bagian HTTP
8. **Copy HTTP URL** (contoh: `https://polygon-mumbai.g.alchemy.com/v2/abc123...`)

### 2. Buat/Import Wallet

**Opsi A: Buat Wallet Baru (Recommended untuk testnet)**
1. Install [MetaMask](https://metamask.io/)
2. Buat wallet baru
3. Export private key:
   - Klik icon account (kanan atas)
   - Settings > Security & Privacy > Export Private Key
   - Masukkan password
   - **Copy private key** (tanpa `0x` di depan)

**Opsi B: Gunakan Wallet Existing**
- Export private key dari wallet yang sudah ada
- Pastikan wallet ini hanya untuk testnet (jangan gunakan wallet mainnet!)

### 3. Dapatkan Testnet MATIC (untuk Gas Fee)

1. Kunjungi [Polygon Faucet](https://faucet.polygon.technology/)
2. Pilih **Polygon Mumbai**
3. Masukkan wallet address Anda
4. Klik "Submit"
5. Tunggu beberapa detik, Anda akan menerima testnet MATIC (gratis)

### 4. Setup Environment Variables

#### A. Blockchain Folder (`blockchain/.env`)

Buat file `blockchain/.env`:

```env
BLOCKCHAIN_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
PRIVATE_KEY=your_wallet_private_key_without_0x_prefix
```

**PENTING**: 
- Ganti `YOUR_ALCHEMY_KEY` dengan Alchemy API key Anda
- Ganti `your_wallet_private_key_without_0x_prefix` dengan private key (tanpa `0x` di depan)
- Jangan commit file `.env` ke git!

#### B. Backend Folder (`backend/.env`)

Tambahkan ke file `backend/.env`:

```env
BLOCKCHAIN_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
PRIVATE_KEY=your_wallet_private_key_without_0x_prefix
CONTRACT_ADDRESS=0x_your_contract_address_will_be_here_after_deploy
BLOCKCHAIN_ENCRYPTION_KEY=your_encryption_key_min_32_chars_long
```

**Catatan**: `CONTRACT_ADDRESS` akan diisi setelah deploy contract.

### 5. Install Dependencies

```bash
cd blockchain
npm install
```

### 6. Compile Contract

```bash
npm run compile
```

### 7. Deploy Contract

```bash
npm run deploy
```

**Output akan menampilkan:**
```
✅ Contract deployed successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Contract Address: 0x1234567890abcdef...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 8. Update Backend Environment

Copy contract address dari output deploy, lalu update `backend/.env`:

```env
CONTRACT_ADDRESS=0x1234567890abcdef...
```

### 9. Restart Backend Server

```bash
cd backend
# Stop server (Ctrl+C)
npm run dev
```

### 10. Test Blockchain Logs

1. Buka aplikasi
2. Buat laporan baru
3. Buka detail laporan
4. Klik "Lihat Logs" di section Blockchain Logs
5. Logs blockchain akan muncul!

## 🔍 Troubleshooting

### Error: "Blockchain service not configured"

**Solusi:**
1. Pastikan `backend/.env` memiliki:
   - `BLOCKCHAIN_RPC_URL`
   - `PRIVATE_KEY`
   - `CONTRACT_ADDRESS`

2. Restart backend server setelah update `.env`

3. Cek console backend untuk error details

### Error: "Contract not deployed"

**Solusi:**
1. Pastikan contract sudah di-deploy dengan benar
2. Pastikan `CONTRACT_ADDRESS` di `backend/.env` sesuai dengan address yang di-deploy
3. Cek contract di explorer: `https://mumbai.polygonscan.com/address/YOUR_CONTRACT_ADDRESS`

### Error: "Insufficient funds"

**Solusi:**
1. Pastikan wallet memiliki testnet MATIC
2. Dapatkan dari faucet: https://faucet.polygon.technology/
3. Pilih Polygon Mumbai

### Error: "Invalid RPC URL"

**Solusi:**
1. Pastikan Alchemy API key benar
2. Pastikan menggunakan URL untuk Polygon Mumbai (bukan mainnet)
3. Cek apakah app di Alchemy sudah aktif

## 📚 Resources

- [Alchemy Dashboard](https://dashboard.alchemy.com/)
- [Polygon Mumbai Faucet](https://faucet.polygon.technology/)
- [Polygon Mumbai Explorer](https://mumbai.polygonscan.com/)
- [MetaMask](https://metamask.io/)

## ⚠️ Security Notes

1. **JANGAN** commit file `.env` ke git
2. **JANGAN** share private key ke siapa pun
3. Gunakan wallet terpisah untuk testnet dan mainnet
4. Untuk production, gunakan environment variables yang aman (bukan hardcode)

## ✅ Checklist

- [ ] Alchemy API key sudah didapat
- [ ] Wallet sudah dibuat/import
- [ ] Testnet MATIC sudah didapat dari faucet
- [ ] `blockchain/.env` sudah diisi
- [ ] Contract sudah di-compile
- [ ] Contract sudah di-deploy
- [ ] `backend/.env` sudah diisi dengan contract address
- [ ] Backend server sudah di-restart
- [ ] Blockchain logs sudah bisa dilihat

## 🎉 Selesai!

Setelah semua langkah di atas, blockchain service akan berfungsi dan Anda bisa melihat blockchain logs untuk setiap laporan!

