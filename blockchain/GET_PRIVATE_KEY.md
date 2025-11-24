# 🔑 Cara Mendapatkan Private Key dari MetaMask

## ⚠️ PENTING: Keamanan

- **JANGAN share private key ke publik!**
- **JANGAN commit private key ke git!**
- Private key ini memberikan akses penuh ke wallet Anda
- Gunakan wallet terpisah untuk testnet (jangan gunakan wallet mainnet!)

## 📝 Langkah-langkah

### 1. Install MetaMask (jika belum)

- Download: https://metamask.io/
- Install extension untuk browser Anda
- Buat wallet baru atau import wallet existing

### 2. Tambahkan Polygon Amoy Testnet ke MetaMask

1. Buka MetaMask
2. Klik network dropdown (di atas, biasanya "Ethereum Mainnet")
3. Klik "Add Network" atau "Add a network manually"
4. Isi dengan data berikut:
   - **Network Name**: Polygon Amoy
   - **RPC URL**: `https://rpc-amoy.polygon.technology`
   - **Chain ID**: `80002`
   - **Currency Symbol**: `MATIC`
   - **Block Explorer URL**: `https://amoy.polygonscan.com`
5. Klik "Save"

### 3. Export Private Key dari MetaMask

1. Buka MetaMask
2. Klik icon account (lingkaran dengan icon di kanan atas)
3. Klik "Account Details"
4. Klik "Export Private Key"
5. Masukkan password MetaMask Anda
6. **Copy private key yang muncul** (akan terlihat seperti: `0x1234567890abcdef...`)

### 4. Format Private Key untuk Hardhat

**PENTING:** Hardhat membutuhkan private key **TANPA** prefix `0x`

- ❌ **SALAH**: `0x1234567890abcdef...` (dengan 0x)
- ✅ **BENAR**: `1234567890abcdef...` (tanpa 0x)

Jika private key dari MetaMask adalah: `0xabc123...`
Maka untuk Hardhat gunakan: `abc123...` (hapus `0x` di depan)

### 5. Update blockchain/.env

Edit file `blockchain/.env`:

```env
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=abc123def456...  # Private key TANPA 0x prefix, minimal 64 karakter
```

**Contoh:**
```env
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 6. Dapatkan Testnet MATIC (untuk Gas Fee)

1. Kunjungi: https://faucet.polygon.technology/
2. Pilih "Polygon Amoy"
3. Masukkan wallet address Anda (dari MetaMask)
4. Klik "Submit"
5. Tunggu beberapa detik, Anda akan menerima testnet MATIC (gratis)

### 7. Test Konfigurasi

```bash
cd blockchain

# Cek apakah private key valid
node -e "
require('dotenv').config();
const pk = process.env.PRIVATE_KEY;
if (!pk || pk === 'your_private_key_from_metamask') {
  console.log('❌ PRIVATE_KEY belum di-set!');
  process.exit(1);
}
if (pk.length < 64) {
  console.log('❌ PRIVATE_KEY terlalu pendek! Harus 64 karakter hex');
  process.exit(1);
}
if (pk.startsWith('0x')) {
  console.log('⚠️  PRIVATE_KEY masih ada prefix 0x, hapus 0x di depan!');
  process.exit(1);
}
console.log('✅ PRIVATE_KEY valid!');
"

# Compile contract
npm run compile

# Deploy ke Polygon Amoy
npm run deploy
```

## 🔍 Troubleshooting

### Error: "private key too short"
- Pastikan private key minimal 64 karakter hex
- Pastikan sudah hapus prefix `0x` jika ada
- Pastikan tidak ada spasi atau karakter lain

### Error: "Invalid account"
- Pastikan format private key benar (64 karakter hex, tanpa 0x)
- Cek apakah ada typo di `.env` file

### Error: "Insufficient balance"
- Wallet tidak memiliki MATIC untuk gas fee
- Dapatkan MATIC dari faucet: https://faucet.polygon.technology/

## 💡 Tips

1. **Gunakan Wallet Terpisah untuk Testnet**
   - Jangan gunakan wallet mainnet untuk testnet
   - Buat wallet baru khusus untuk development/testing

2. **Backup Private Key dengan Aman**
   - Simpan di tempat yang aman
   - Jangan commit ke git
   - Jangan share ke siapa pun

3. **Validasi Private Key**
   - Private key harus 64 karakter hex (0-9, a-f)
   - Tidak boleh ada prefix `0x`
   - Tidak boleh ada spasi

## ✅ Checklist

- [ ] MetaMask sudah terinstall
- [ ] Polygon Amoy Testnet sudah ditambahkan ke MetaMask
- [ ] Private key sudah di-export dari MetaMask
- [ ] Prefix `0x` sudah dihapus dari private key
- [ ] Private key sudah di-set di `blockchain/.env`
- [ ] Wallet sudah memiliki MATIC di Polygon Amoy Testnet
- [ ] `blockchain/.env` tidak di-commit ke git

---

**Setelah setup selesai, jalankan `npm run deploy` di folder `blockchain/`** 🚀

