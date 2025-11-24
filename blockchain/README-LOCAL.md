# 🏠 Blockchain Local Development Guide

Panduan untuk menggunakan blockchain **secara lokal** tanpa perlu deploy ke testnet/mainnet.

## ✅ Keuntungan Local Network

- ✅ **Tidak perlu setup RPC URL** (Alchemy, Infura, dll)
- ✅ **Tidak perlu private key wallet** (Hardhat generate otomatis)
- ✅ **Tidak perlu gas fee** (gratis!)
- ✅ **Lebih cepat** untuk development & testing
- ✅ **Isolated environment** (tidak mengganggu testnet)

## 🚀 Quick Start (Local Network)

### Opsi 1: Deploy ke Hardhat Network (Recommended)

Hardhat Network adalah built-in network yang otomatis tersedia:

```bash
cd blockchain

# 1. Compile contract
npm run compile

# 2. Deploy ke local Hardhat network
npm run deploy:local
```

**Output akan menampilkan:**
- Contract address
- Deployer address
- Balance (otomatis 10000 ETH untuk testing)

### Opsi 2: Deploy ke Hardhat Node (Untuk Testing Interaktif)

Jika ingin blockchain node berjalan terus (seperti testnet):

```bash
# Terminal 1: Start Hardhat node
cd blockchain
npm run node
```

Hardhat node akan:
- Berjalan di `http://127.0.0.1:8545`
- Generate 20 accounts otomatis dengan balance 10000 ETH
- Menampilkan private keys untuk semua accounts

**Kemudian di Terminal 2:**

```bash
cd blockchain

# Deploy ke localhost node
npx hardhat run scripts/deploy.js --network localhost
```

## 📝 Setup Backend untuk Local Network

Setelah deploy, update `backend/.env`:

```env
# Local Hardhat Network
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=<contract_address_dari_deploy>
PRIVATE_KEY=<private_key_dari_hardhat_node>
```

### Cara Mendapatkan Private Key

1. Jalankan `npm run node` di terminal terpisah
2. Hardhat akan menampilkan output seperti:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

3. Copy private key (tanpa `0x` prefix) ke `backend/.env`:
   ```
   PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```

## 🔄 Workflow Development

### Development dengan Local Network

```bash
# Terminal 1: Start Hardhat node (jika pakai localhost)
cd blockchain
npm run node

# Terminal 2: Deploy contract (hanya sekali)
cd blockchain
npm run deploy:local

# Terminal 3: Start backend
cd backend
npm run dev

# Terminal 4: Start frontend
npm run dev
```

### Testing dengan Hardhat Network (Built-in)

```bash
# Deploy langsung (tidak perlu node terpisah)
cd blockchain
npm run deploy:local

# Start backend (akan connect ke Hardhat network)
cd backend
npm run dev
```

## ⚠️ Catatan Penting

1. **Data tidak persisten**: Setiap kali restart Hardhat node, semua data hilang
2. **Contract address berubah**: Setiap deploy akan menghasilkan address baru
3. **Untuk production**: Gunakan testnet/mainnet dengan `npm run deploy`

## 🔀 Switch ke Testnet

Jika sudah siap untuk testing di testnet:

```bash
# 1. Setup blockchain/.env
BLOCKCHAIN_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_wallet_private_key

# 2. Deploy ke Mumbai
npm run deploy

# 3. Update backend/.env dengan contract address baru
```

## 🆘 Troubleshooting

### Error: "Cannot connect to localhost:8545"

**Solusi**: Jalankan `npm run node` di terminal terpisah terlebih dahulu.

### Error: "Contract not deployed"

**Solusi**: 
1. Pastikan sudah deploy dengan `npm run deploy:local`
2. Copy contract address yang benar ke `backend/.env`
3. Restart backend server

### Error: "Insufficient balance"

**Solusi**: 
- Untuk local network, Hardhat otomatis memberikan 10000 ETH
- Jika masih error, coba deploy ulang dengan `npm run deploy:local`

## 📚 Referensi

- [Hardhat Network Documentation](https://hardhat.org/hardhat-network/docs)
- [Hardhat Localhost Network](https://hardhat.org/hardhat-network/docs/overview#localhost-network)

