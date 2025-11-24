# ⚡ Quick Guide: Export Private Key dari MetaMask

## 📱 Langkah-langkah (Dari Screenshot yang Anda Lihat)

### 1. Klik pada Account (Bukan Network!)

Dari screenshot yang Anda lihat, **JANGAN klik pada network** (Ethereum, Polygon, dll).

Yang perlu diklik adalah:
- **Icon account** di kanan atas (biasanya lingkaran dengan icon)
- Atau **nama account** Anda

### 2. Export Private Key

Setelah klik account, akan muncul menu:
1. Klik **"Account Details"** atau **"Detail Akun"**
2. Klik **"Export Private Key"** atau **"Ekspor Kunci Pribadi"**
3. Masukkan **password MetaMask** Anda
4. **Copy private key** yang muncul

### 3. Format Private Key untuk Hardhat

**PENTING:** Private key dari MetaMask biasanya ada format `0xabc123...`

Untuk Hardhat, **HAPUS `0x` di depan!**

- ❌ **SALAH**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- ✅ **BENAR**: `ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

### 4. Update blockchain/.env

Edit file `blockchain/.env`:

```env
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

(Paste private key TANPA 0x)

## 🌐 Untuk Deploy ke Polygon Amoy

### Tambahkan Polygon Amoy Network (Jika Belum Ada)

1. Klik network dropdown (di atas, biasanya "Ethereum Mainnet" atau network lain)
2. Klik **"Add Network"** atau **"Add a network manually"**
3. Isi dengan data berikut:
   - **Network Name**: `Polygon Amoy`
   - **RPC URL**: `https://rpc-amoy.polygon.technology`
   - **Chain ID**: `80002`
   - **Currency Symbol**: `MATIC`
   - **Block Explorer URL**: `https://amoy.polygonscan.com`
4. Klik **"Save"**

### Dapatkan Testnet MATIC

1. Kunjungi: https://faucet.polygon.technology/
2. Pilih **"Polygon Amoy"** (sudah terpilih di form)
3. Pilih **"POL"** sebagai token (sudah terpilih di form)
4. **Verifikasi identitas**: Pilih salah satu:
   - Klik **"GitHub"** → Login dengan GitHub
   - Klik **"X.COM"** → Login dengan X/Twitter
5. Masukkan wallet address Anda (0x8a527...027d4 dari screenshot)
6. Klik tombol **"Claim"** (tombol ungu besar)
7. Tunggu beberapa detik - token akan masuk ke wallet Anda

**📖 Lihat panduan lengkap: `blockchain/GET_TESTNET_MATIC.md`**

## ✅ Checklist

- [ ] Private key sudah di-export dari MetaMask
- [ ] Prefix `0x` sudah dihapus
- [ ] Private key sudah di-set di `blockchain/.env`
- [ ] Polygon Amoy network sudah ditambahkan ke MetaMask
- [ ] Wallet sudah memiliki MATIC di Polygon Amoy
- [ ] Siap untuk deploy!

## 🚀 Deploy Contract

```bash
cd blockchain
npm run deploy
```

---

**Catatan:** Private key sama untuk semua network (Ethereum, Polygon, Base, dll) karena menggunakan account yang sama. Yang berbeda hanya network untuk deploy contract.

