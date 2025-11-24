# 🔍 Debug Blockchain - Laporan Tidak Tertulis ke Blockchain

## ⚠️ Masalah

Ketika mengirim laporan (baik dari form maupun chatbot), laporan tidak tertulis ke blockchain.

## 🔍 Langkah Debugging

### 1. Cek Environment Variables

Pastikan file `backend/.env` memiliki konfigurasi blockchain:

```bash
# Blockchain Configuration
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
# atau untuk local: http://localhost:8545

PRIVATE_KEY=your_wallet_private_key_here
# Private key wallet yang akan digunakan untuk sign transaction

CONTRACT_ADDRESS=0xYourContractAddressHere
# Address smart contract yang sudah di-deploy
```

### 2. Cek Log Backend

Setelah membuat laporan, cek log backend untuk melihat error:

```bash
# Di terminal backend, cari log dengan keyword:
[Blockchain]
```

**Log yang harus muncul jika blockchain berfungsi:**
```
[Blockchain] logReportToBlockchain called: { reportId: 1, status: 'pending', ... }
[Blockchain] Contract initialized successfully at: 0x...
[Blockchain] Encrypted metadata hash generated
[Blockchain] Calling logReportEvent on contract...
[Blockchain] Transaction sent, waiting for confirmation... 0x...
[Blockchain] Transaction confirmed: 0x...
✅ Blockchain transaction successful: 0x...
```

**Log error yang mungkin muncul:**

#### Error: Missing Configuration
```
[Blockchain] Cannot use blockchain - missing environment variables
[Blockchain] Missing config: { hasRpc: false, hasPrivateKey: false, hasContract: false }
```
**Solusi:** Set semua environment variables di `backend/.env`

#### Error: Contract Not Deployed
```
[Blockchain] Contract not deployed at address: 0x...
```
**Solusi:** 
1. Deploy contract ke blockchain network
2. Update `CONTRACT_ADDRESS` di `.env`

#### Error: Insufficient Funds
```
[Blockchain] INSUFFICIENT_FUNDS: Wallet tidak memiliki cukup balance untuk gas fee
```
**Solusi:** 
1. Top up wallet dengan testnet tokens (untuk testnet)
2. Atau gunakan wallet dengan balance yang cukup

#### Error: Network Error
```
[Blockchain] NETWORK_ERROR: Tidak bisa connect ke blockchain network
```
**Solusi:**
1. Cek koneksi internet
2. Cek `BLOCKCHAIN_RPC_URL` apakah benar
3. Untuk testnet, pastikan RPC endpoint aktif

#### Error: Call Exception
```
[Blockchain] CALL_EXCEPTION: Contract call failed
```
**Solusi:**
1. Cek `CONTRACT_ADDRESS` apakah benar
2. Pastikan contract sudah di-deploy
3. Pastikan contract memiliki function `logReportEvent`

### 3. Test Blockchain Configuration

Buat file test script untuk cek konfigurasi:

```javascript
// test-blockchain.js
require('dotenv').config();
const { canUseBlockchain, initContract } = require('./services/blockchainService');

async function test() {
  console.log('Testing blockchain configuration...');
  console.log('canUseBlockchain:', canUseBlockchain());
  
  const contract = await initContract();
  if (contract) {
    console.log('✅ Contract initialized successfully');
  } else {
    console.log('❌ Contract initialization failed');
  }
}

test();
```

Jalankan:
```bash
cd backend
node test-blockchain.js
```

### 4. Cek Database

Cek apakah `blockchainTxHash` tersimpan di database:

```sql
SELECT id, title, "blockchainTxHash" 
FROM "Report" 
WHERE "blockchainTxHash" IS NULL 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

Jika banyak laporan dengan `blockchainTxHash` = NULL, berarti blockchain tidak berfungsi.

### 5. Manual Test Blockchain Service

Test langsung fungsi blockchain:

```javascript
// test-log.js
require('dotenv').config();
const { logReportToBlockchain } = require('./services/blockchainService');

async function test() {
  const result = await logReportToBlockchain(
    999, // test report ID
    'pending',
    '0x1234567890',
    {
      title: 'Test Report',
      description: 'Test description',
      location: 'Test location'
    }
  );
  
  console.log('Result:', result);
}

test();
```

## ✅ Checklist Troubleshooting

- [ ] Environment variables sudah di-set di `backend/.env`
- [ ] `BLOCKCHAIN_RPC_URL` benar dan accessible
- [ ] `PRIVATE_KEY` adalah private key yang valid
- [ ] `CONTRACT_ADDRESS` adalah address contract yang sudah di-deploy
- [ ] Wallet memiliki balance yang cukup untuk gas fee
- [ ] Contract sudah di-deploy dan memiliki function `logReportEvent`
- [ ] Network connection stabil
- [ ] Backend log menunjukkan error yang jelas

## 🔧 Solusi Cepat

### Untuk Development (Skip Blockchain)

Jika blockchain tidak diperlukan untuk development, sistem tetap berfungsi tanpa blockchain. Laporan akan dibuat tapi tanpa `blockchainTxHash`.

### Untuk Production

1. **Setup Blockchain Network:**
   ```bash
   # Deploy contract
   cd blockchain
   npm run deploy
   
   # Copy contract address ke backend/.env
   CONTRACT_ADDRESS=0x...
   ```

2. **Setup Wallet:**
   ```bash
   # Generate atau gunakan wallet yang sudah ada
   # Pastikan wallet memiliki balance untuk gas fee
   PRIVATE_KEY=0x...
   ```

3. **Setup RPC:**
   ```bash
   # Untuk Polygon Amoy Testnet
   BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
   
   # Atau untuk local Hardhat
   BLOCKCHAIN_RPC_URL=http://localhost:8545
   ```

## 📝 Catatan

- Blockchain logging adalah **optional**. Jika blockchain tidak configured, laporan tetap dibuat dengan sukses.
- Error blockchain tidak akan menghentikan proses pembuatan laporan.
- `blockchainTxHash` akan NULL jika blockchain logging gagal.
- Semua error blockchain di-log ke console untuk debugging.

## 🆘 Masih Bermasalah?

Jika masih bermasalah setelah mengikuti langkah di atas:

1. Cek log backend lengkap saat membuat laporan
2. Copy error message yang muncul
3. Cek apakah contract address benar dan contract sudah deployed
4. Test dengan network yang berbeda (local vs testnet)
5. Pastikan wallet memiliki balance yang cukup

