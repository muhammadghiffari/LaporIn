# ⚡ Quick Setup Blockchain (5 Menit)

## 🎯 Langkah Cepat

### 1️⃣ Dapatkan Alchemy API Key (2 menit)

1. Buka: https://www.alchemy.com/
2. Sign up (gratis)
3. Create App → Pilih **Polygon Mumbai**
4. Copy **HTTP URL** (contoh: `https://polygon-mumbai.g.alchemy.com/v2/abc123...`)

### 2️⃣ Buat Wallet & Dapatkan MATIC (2 menit)

1. Install MetaMask: https://metamask.io/
2. Buat wallet baru
3. Export private key (Settings > Security > Export Private Key)
4. Dapatkan testnet MATIC: https://faucet.polygon.technology/
   - Pilih **Polygon Mumbai**
   - Masukkan wallet address
   - Request MATIC (gratis)

### 3️⃣ Setup Environment (1 menit)

**Buat file `blockchain/.env`:**
```env
BLOCKCHAIN_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_private_key_without_0x
```

**Update file `backend/.env` (tambahkan):**
```env
BLOCKCHAIN_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_private_key_without_0x
CONTRACT_ADDRESS=0x_will_be_filled_after_deploy
```

### 4️⃣ Deploy Contract (1 menit)

```bash
cd blockchain
npm install
npm run compile
npm run deploy
```

**Copy contract address yang muncul**, lalu update `backend/.env`:
```env
CONTRACT_ADDRESS=0x1234567890abcdef...
```

### 5️⃣ Restart Backend

```bash
cd backend
# Stop server (Ctrl+C)
npm run dev
```

## ✅ Selesai!

Sekarang blockchain logs akan muncul di halaman detail laporan!

## 📖 Dokumentasi Lengkap

Lihat `SETUP_BLOCKCHAIN.md` untuk panduan detail.

