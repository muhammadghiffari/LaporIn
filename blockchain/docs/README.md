## Blockchain Module Docs

### Purpose
Audit trail untuk laporan penting menggunakan smart contract (Polygon/Hardhat). Script di folder ini membantu:
- Deploy contract (lokal & testnet).
- Menulis/ membaca hash laporan.
- Menyiapkan demo transparency.

### Struktur
- `contracts/` – solidity source (cek readme di folder ini).
- `scripts/` – deploy, verify, log, helper CLI.
- `hardhat.config.js` / `package.json` – toolchain Hardhat.
- `*.md` – panduan (quick start, results, proposal, dll).

### Quick Start (Lokal)
```bash
cd blockchain
npm install
cp .env.example .env      # simpan PRIVATE_KEY, RPC_URL dsb
npx hardhat compile
npx hardhat node          # dev chain
npx hardhat run scripts/deploy.js --network localhost
```

### Integrasi Backend
- Backend memakai `services/blockchainService.js` (ethers) & environment `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`.
- Pastikan kontrak terbaru & ABI disalin ke backend (lihat catatan di `BLOCKCHAIN_SETUP.md`).

### Pengelolaan Dokumen
Banyak file *.md lama untuk laporan hackathon. Pindahkan yang masih relevan ke folder `docs` ini, arsipkan sisanya jika tidak diperlukan.

### Checklist Kebersihan
- Pastikan `artifacts/` & `cache/` tetap di `.gitignore`.
- Jangan commit `.env`.
- Jika ada output JSON (hasil deploy), pindahkan ke `docs/deployments/` dengan info tanggal+network.

