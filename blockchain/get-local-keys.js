/**
 * Script untuk mendapatkan private keys dari Hardhat local network
 * 
 * Usage:
 *   npx hardhat run get-local-keys.js --network hardhat
 *   atau
 *   npx hardhat run get-local-keys.js --network localhost
 */

const hre = require("hardhat");

async function main() {
  console.log("🔑 Hardhat Local Network Accounts");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  
  const signers = await hre.ethers.getSigners();
  
  console.log(`📋 Found ${signers.length} accounts:`);
  console.log("");
  
  for (let i = 0; i < Math.min(signers.length, 5); i++) {
    const signer = signers[i];
    const address = await signer.address;
    const balance = await hre.ethers.provider.getBalance(address);
    
    console.log(`Account #${i}:`);
    console.log(`  Address: ${address}`);
    console.log(`  Balance: ${hre.ethers.formatEther(balance)} ETH`);
    
    // Untuk Hardhat network, kita bisa mendapatkan private key dari signer
    // Tapi ini hanya bekerja jika menggunakan Hardhat's default accounts
    try {
      // Hardhat menggunakan default accounts dengan known private keys
      // Kita bisa generate atau menggunakan known keys
      if (hre.network.name === 'hardhat' || hre.network.name === 'localhost') {
        // Hardhat default accounts (untuk development)
        const defaultKeys = [
          '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
          '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
          '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
          '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
          '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
        ];
        
        if (i < defaultKeys.length) {
          const privateKey = defaultKeys[i];
          console.log(`  Private Key: ${privateKey}`);
          console.log(`  (Untuk backend/.env, gunakan tanpa 0x: ${privateKey.slice(2)})`);
        }
      }
    } catch (error) {
      console.log(`  Private Key: (tidak tersedia - gunakan output dari 'npm run node')`);
    }
    
    console.log("");
  }
  
  if (signers.length > 5) {
    console.log(`... dan ${signers.length - 5} accounts lainnya`);
    console.log("");
  }
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("💡 TIP:");
  console.log("   Untuk mendapatkan private keys dari Hardhat node yang berjalan:");
  console.log("   1. Jalankan: npm run node (di terminal terpisah)");
  console.log("   2. Hardhat akan menampilkan semua accounts dengan private keys");
  console.log("   3. Gunakan account pertama untuk PRIVATE_KEY di backend/.env");
  console.log("");
  console.log("   Atau gunakan default Hardhat keys di atas untuk development.");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

