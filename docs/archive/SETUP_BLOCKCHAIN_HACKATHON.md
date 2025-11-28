# 🚀 Setup Blockchain untuk Hackathon IT Fair XIV

## 📋 Overview

Guide lengkap untuk integrasi blockchain menggunakan **Polygon Amoy Testnet** dengan **Polygon Faucet** untuk mendapatkan token gratis.

**Tema Lomba:** "Code The Future: Smart Solutions with AI & Blockchain"

---

## ✅ Prerequisites

- [x] Node.js dan npm terinstall
- [x] MetaMask extension di browser
- [x] Akun GitHub atau X (Twitter) untuk verifikasi faucet
- [x] Koneksi internet

---

## 🎯 Step-by-Step Setup

### Step 1: Install MetaMask & Setup Wallet

1. **Install MetaMask** (jika belum)
   - Download: https://metamask.io/
   - Install extension untuk browser
   - Buat wallet baru atau import existing wallet

2. **Tambahkan Polygon Amoy Testnet ke MetaMask**
   - Buka MetaMask
   - Klik network dropdown (biasanya "Ethereum Mainnet")
   - Klik "Add Network" atau "Add a network manually"
   - Isi dengan data berikut:
     ```
     Network Name: Polygon Amoy
     RPC URL: https://rpc-amoy.polygon.technology
     Chain ID: 80002
     Currency Symbol: MATIC
     Block Explorer URL: https://amoy.polygonscan.com
     ```
   - Klik "Save"

---

### Step 2: Dapatkan Testnet MATIC dari Faucet

1. **Buka Polygon Faucet**
   - URL: https://faucet.polygon.technology/

2. **Pilih Network & Token**
   - **Select Chain**: Polygon Amoy ✅
   - **Select Token**: POL ✅

3. **Verifikasi Identitas** (Pilih salah satu)
   - **Opsi A: GitHub** (Recommended)
     - Klik field "GitHub" (icon octocat)
     - Login dengan akun GitHub
     - Authorize aplikasi
   - **Opsi B: X (Twitter)**
     - Klik field "X.COM" (icon X)
     - Login dengan akun X/Twitter
     - Authorize aplikasi

4. **Masukkan Wallet Address**
   - Buka MetaMask
   - Pastikan network: **Polygon Amoy**
   - Copy wallet address:
     - Klik icon account (kanan atas)
     - Klik pada address (akan ter-copy otomatis)
   - Paste ke field "Enter Wallet Address" di faucet

5. **Klik "Claim"**
   - Tunggu beberapa detik
   - Token akan masuk ke wallet Anda

6. **Verifikasi Balance**
   - Buka MetaMask
   - Pastikan network: Polygon Amoy
   - Cek balance - harusnya sudah ada POL/MATIC

**💡 Tips:**
- Faucet limit: 1 request per 24 jam per address
- Jika butuh lebih banyak, gunakan faucet alternatif:
  - Alchemy: https://www.alchemy.com/faucets/polygon-amoy
  - QuickNode: https://faucet.quicknode.com/polygon/amoy

---

### Step 3: Export Private Key dari MetaMask

**⚠️ PENTING: Keamanan**
- Jangan share private key ke publik!
- Jangan commit private key ke git!
- Gunakan wallet terpisah untuk testnet (jangan gunakan wallet mainnet!)

**Langkah-langkah:**

1. Buka MetaMask
2. Klik icon account (lingkaran dengan icon di kanan atas)
3. Klik "Account Details"
4. Klik "Export Private Key"
5. Masukkan password MetaMask
6. **Copy private key** yang muncul (format: `0xabc123...`)

**Format untuk Hardhat:**
- Private key dari MetaMask: `0xabc123...` (dengan 0x)
- Untuk Hardhat: `abc123...` (HAPUS 0x di depan!)

---

### Step 4: Setup Blockchain Project

1. **Buat file `blockchain/.env`**

```bash
cd blockchain
```

Buat file `.env` dengan isi:

```env
# RPC URL untuk Polygon Amoy Testnet (gratis, tidak perlu API key)
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology

# Private key dari MetaMask (TANPA 0x prefix!)
PRIVATE_KEY=your_private_key_here_without_0x
```

**Contoh:**
```env
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**PENTING:**
- Private key harus **minimal 64 karakter** (tanpa 0x)
- **JANGAN** ada prefix `0x` di depan
- Pastikan wallet memiliki MATIC untuk gas fee

2. **Install Dependencies** (jika belum)

```bash
cd blockchain
npm install
```

---

### Step 5: Deploy Smart Contract

1. **Compile Contract**

```bash
cd blockchain
npm run compile
```

2. **Deploy ke Polygon Amoy**

```bash
npm run deploy
```

**Output yang diharapkan:**
```
🚀 Deploying WargaLapor contract...
🌐 Network: amoy (Chain ID: 80002)

💰 Deployer address: 0x...
💰 Balance: 0.115 MATIC

📝 Compiling contract...
📤 Deploying contract...
⏳ Waiting for deployment confirmation...

✅ Contract deployed successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Contract Address: 0x1234567890abcdef...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

3. **Copy Contract Address**
   - Copy address dari output di atas
   - Contoh: `0x1234567890abcdef...`

---

### Step 6: Setup Backend

1. **Buat/Update file `backend/.env`**

```bash
cd backend
```

Tambahkan atau update konfigurasi berikut:

```env
# Gunakan real blockchain (bukan mock)
USE_MOCK_BLOCKCHAIN=false

# RPC URL untuk Polygon Amoy Testnet
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology

# Private key dari MetaMask (TANPA 0x prefix!)
# SAMA dengan yang di blockchain/.env
PRIVATE_KEY=your_private_key_here_without_0x

# Contract address dari Step 5
CONTRACT_ADDRESS=0x1234567890abcdef...

# Encryption key untuk data sensitif (opsional, bisa generate random)
BLOCKCHAIN_ENCRYPTION_KEY=your-random-encryption-key-here
```

**Contoh lengkap:**
```env
USE_MOCK_BLOCKCHAIN=false
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONTRACT_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
BLOCKCHAIN_ENCRYPTION_KEY=my-secret-encryption-key-2024
```

2. **Restart Backend Server**

```bash
cd backend
npm run dev
```

**Cek console untuk konfirmasi:**
```
[Blockchain] Contract initialized successfully at: 0x1234567890abcdef...
```

Jika melihat error, lihat bagian Troubleshooting di bawah.

---

### Step 7: Test Blockchain Integration

1. **Buat Laporan Baru**
   - Login ke aplikasi
   - Buat laporan baru
   - Submit laporan

2. **Cek Blockchain Hash**
   - Buka detail laporan
   - Blockchain hash harus muncul!
   - Klik "Verifikasi" untuk melihat di Polygonscan

3. **Verifikasi di Polygonscan**
   - Buka: https://amoy.polygonscan.com
   - Search transaction hash
   - Lihat detail transaksi

---

## ✅ Checklist Setup

- [ ] MetaMask sudah terinstall
- [ ] Polygon Amoy Testnet sudah ditambahkan ke MetaMask
- [ ] Sudah claim MATIC dari Polygon Faucet
- [ ] Balance wallet > 0 MATIC
- [ ] Private key sudah di-export dari MetaMask
- [ ] File `blockchain/.env` sudah dibuat dengan benar
- [ ] Contract sudah di-deploy ke Polygon Amoy
- [ ] Contract address sudah di-copy
- [ ] File `backend/.env` sudah di-update dengan benar
- [ ] Backend server sudah di-restart
- [ ] Test membuat laporan - blockchain hash muncul!

---

## 🔍 Troubleshooting

### Error: "Contract instance is null"

**Penyebab:**
- Konfigurasi `.env` tidak lengkap atau salah
- RPC URL tidak bisa diakses
- Contract address salah

**Solusi:**
1. Cek `backend/.env`:
   ```bash
   cd backend
   cat .env | grep BLOCKCHAIN
   ```
2. Pastikan semua variabel sudah di-set:
   - `USE_MOCK_BLOCKCHAIN=false`
   - `BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology`
   - `PRIVATE_KEY=...` (tanpa 0x, minimal 64 karakter)
   - `CONTRACT_ADDRESS=0x...`
3. Restart backend server

---

### Error: "INSUFFICIENT_FUNDS"

**Penyebab:**
- Wallet tidak memiliki MATIC untuk gas fee

**Solusi:**
1. Cek balance di MetaMask (network: Polygon Amoy)
2. Jika balance = 0, claim dari faucet:
   - https://faucet.polygon.technology/
   - Pilih Polygon Amoy
   - Masukkan wallet address
   - Claim MATIC

---

### Error: "CALL_EXCEPTION"

**Penyebab:**
- Contract address salah
- Contract belum di-deploy
- Network tidak match

**Solusi:**
1. Pastikan contract sudah di-deploy:
   ```bash
   cd blockchain
   npm run deploy
   ```
2. Copy contract address yang benar
3. Update `backend/.env` dengan address yang benar
4. Pastikan menggunakan Polygon Amoy (bukan Mumbai)

---

### Error: "NETWORK_ERROR"

**Penyebab:**
- RPC URL tidak bisa diakses
- Koneksi internet bermasalah

**Solusi:**
1. Cek koneksi internet
2. Coba RPC URL alternatif:
   ```env
   BLOCKCHAIN_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
   ```
   (Perlu buat akun Alchemy gratis: https://www.alchemy.com/)

---

### Error: "PRIVATE_KEY masih ada prefix 0x"

**Penyebab:**
- Private key masih ada `0x` di depan

**Solusi:**
- Hapus `0x` di depan private key
- Contoh: `0xabc123...` → `abc123...`

---

### Error: "PRIVATE_KEY terlalu pendek"

**Penyebab:**
- Private key kurang dari 64 karakter

**Solusi:**
- Pastikan private key lengkap (64 karakter hex, tanpa 0x)
- Copy ulang dari MetaMask

---

## 🧪 Test Script

Jalankan script berikut untuk test konfigurasi:

```bash
cd backend
node -e "
require('dotenv').config();
const { ethers } = require('ethers');

console.log('🔍 Testing Blockchain Configuration...\n');

// Check env vars
console.log('1. Environment Variables:');
console.log('   BLOCKCHAIN_RPC_URL:', process.env.BLOCKCHAIN_RPC_URL ? '✅ SET' : '❌ MISSING');
console.log('   PRIVATE_KEY:', process.env.PRIVATE_KEY ? '✅ SET (' + process.env.PRIVATE_KEY.length + ' chars)' : '❌ MISSING');
console.log('   CONTRACT_ADDRESS:', process.env.CONTRACT_ADDRESS ? '✅ SET' : '❌ MISSING');
console.log('   USE_MOCK_BLOCKCHAIN:', process.env.USE_MOCK_BLOCKCHAIN || 'false');
console.log('');

// Test connection
if (process.env.BLOCKCHAIN_RPC_URL && process.env.PRIVATE_KEY) {
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  provider.getBlockNumber().then(block => {
    console.log('2. Network Connection:');
    console.log('   ✅ Connected! Current block:', block);
    console.log('');
    
    return wallet.getAddress();
  }).then(address => {
    console.log('3. Wallet Info:');
    console.log('   Address:', address);
    return provider.getBalance(address);
  }).then(balance => {
    console.log('   Balance:', ethers.formatEther(balance), 'MATIC');
    console.log('');
    
    if (process.env.CONTRACT_ADDRESS) {
      return provider.getCode(process.env.CONTRACT_ADDRESS);
    }
    return Promise.resolve('0x');
  }).then(code => {
    console.log('4. Contract Verification:');
    if (code && code !== '0x') {
      console.log('   ✅ Contract deployed and verified!');
    } else {
      console.log('   ❌ Contract not found at address');
      console.log('   💡 Deploy contract first: cd blockchain && npm run deploy');
    }
    console.log('');
    console.log('✅ All checks completed!');
  }).catch(err => {
    console.error('❌ Error:', err.message);
  });
} else {
  console.log('❌ Missing required environment variables');
}
"
```

---

## 📊 Untuk Presentasi Lomba

### Poin-poin Penting:

1. **Blockchain Integration**
   - ✅ Menggunakan Polygon Amoy Testnet (real blockchain, bukan mock)
   - ✅ Smart contract untuk audit trail laporan
   - ✅ Transparansi dan immutability data

2. **Token Management**
   - ✅ Menggunakan Polygon Faucet untuk mendapatkan testnet MATIC gratis
   - ✅ Gas fee sangat kecil (~0.004-0.01 MATIC per transaksi)
   - ✅ Testnet = gratis, tidak ada biaya real

3. **Security**
   - ✅ Data sensitif di-encrypt sebelum di-log ke blockchain
   - ✅ Private key tidak di-commit ke git
   - ✅ Menggunakan testnet untuk development

4. **Transparency**
   - ✅ Semua transaksi bisa di-verifikasi di Polygonscan
   - ✅ Blockchain hash untuk setiap laporan
   - ✅ Immutable audit trail

---

## 🔗 Links Penting

- **Polygon Faucet**: https://faucet.polygon.technology/
- **Polygon Amoy Explorer**: https://amoy.polygonscan.com
- **Polygon Amoy RPC**: https://rpc-amoy.polygon.technology
- **MetaMask**: https://metamask.io/
- **Alchemy Faucet** (alternatif): https://www.alchemy.com/faucets/polygon-amoy
- **QuickNode Faucet** (alternatif): https://faucet.quicknode.com/polygon/amoy

---

## 💡 Tips untuk Demo

1. **Siapkan Wallet dengan Balance**
   - Pastikan wallet memiliki cukup MATIC sebelum demo
   - Claim dari faucet sehari sebelum demo

2. **Test Semua Fitur**
   - Buat laporan baru
   - Cek blockchain hash muncul
   - Verifikasi di Polygonscan

3. **Backup Plan**
   - Jika ada masalah dengan blockchain, bisa switch ke mock:
     ```env
     USE_MOCK_BLOCKCHAIN=true
     ```
   - Mock blockchain tidak perlu setup apapun

4. **Screenshot untuk PPT**
   - Screenshot Polygonscan dengan transaction hash
   - Screenshot MetaMask dengan balance
   - Screenshot aplikasi dengan blockchain hash

---

## ✅ Status: Siap untuk Hackathon!

Setelah semua langkah di atas selesai, blockchain integration sudah siap digunakan untuk lomba!

**Selamat! 🎉**

