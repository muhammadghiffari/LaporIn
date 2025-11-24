const hre = require("hardhat");

async function main() {
  // Check network
  const network = await hre.ethers.provider.getNetwork();
  const networkName = network.name;
  const chainId = network.chainId.toString();
  const isLocalNetwork = networkName === 'hardhat' || networkName === 'localhost' || chainId === '1337';
  
  console.log("🚀 Deploying WargaLapor contract...");
  console.log("🌐 Network:", networkName, "(Chain ID:", chainId + ")");
  console.log("");
  
  // Untuk local network, tidak perlu environment variables
  if (!isLocalNetwork) {
    // Check environment variables hanya untuk testnet/mainnet
    if (!process.env.BLOCKCHAIN_RPC_URL) {
      console.error("❌ Error: BLOCKCHAIN_RPC_URL not set in blockchain/.env file");
      console.error("");
      console.error("💡 Solusi:");
      console.error("   1. Buat file blockchain/.env");
      console.error("   2. Tambahkan: BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology");
      console.error("   3. Untuk Polygon Amoy, tidak perlu API key (gratis!)");
      console.error("");
      console.error("   ATAU gunakan local network:");
      console.error("   npm run deploy:local");
      process.exit(1);
    }
    
    const pk = process.env.PRIVATE_KEY;
    if (!pk || pk === 'your_private_key_from_metamask' || pk === 'your_private_key_here_without_0x_prefix_min_64_chars') {
      console.error("❌ Error: PRIVATE_KEY not set in blockchain/.env file");
      console.error("");
      console.error("💡 Solusi:");
      console.error("   1. Install MetaMask: https://metamask.io/");
      console.error("   2. Export private key dari MetaMask:");
      console.error("      - Klik icon account → Account Details → Export Private Key");
      console.error("      - Copy private key (akan ada format: 0xabc123...)");
      console.error("   3. Hapus prefix 0x di depan!");
      console.error("   4. Tambahkan ke blockchain/.env: PRIVATE_KEY=abc123... (tanpa 0x)");
      console.error("");
      console.error("   📖 Lihat panduan lengkap: blockchain/GET_PRIVATE_KEY.md");
      console.error("");
      console.error("   ATAU gunakan local network:");
      console.error("   npm run deploy:local");
      process.exit(1);
    }
    
    // Validasi format private key
    if (pk.length < 64) {
      console.error("❌ Error: PRIVATE_KEY terlalu pendek! Harus minimal 64 karakter hex");
      console.error("");
      console.error("💡 Pastikan private key sudah benar (64 karakter, tanpa 0x)");
      process.exit(1);
    }
    
    if (pk.startsWith('0x')) {
      console.error("❌ Error: PRIVATE_KEY masih ada prefix 0x!");
      console.error("");
      console.error("💡 Hapus 0x di depan private key!");
      console.error("   Contoh: Jika dari MetaMask: 0xabc123...");
      console.error("           Maka gunakan: abc123... (tanpa 0x)");
      process.exit(1);
    }
  } else {
    console.log("✅ Using local Hardhat network (no setup required!)");
    console.log("");
  }
  
  // Check balance
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer address:", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), isLocalNetwork ? "ETH" : "MATIC");
  
  if (!isLocalNetwork && balance === 0n) {
    console.error("");
    console.error("❌ Error: Insufficient balance for deployment");
    console.error("");
    console.error("💡 Solusi:");
    console.error("   1. Dapatkan testnet MATIC dari faucet:");
    console.error("      https://faucet.polygon.technology/");
    console.error("   2. Pilih Polygon Amoy Testnet");
    console.error("   3. Masukkan address:", deployer.address);
    process.exit(1);
  }
  
  console.log("");
  console.log("📝 Compiling contract...");
  const WargaLapor = await hre.ethers.getContractFactory("WargaLapor");
  
  console.log("📤 Deploying contract...");
  const wargaLapor = await WargaLapor.deploy();

  console.log("⏳ Waiting for deployment confirmation...");
  await wargaLapor.waitForDeployment();

  const contractAddress = await wargaLapor.getAddress();
  
  console.log("");
  console.log("✅ Contract deployed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📍 Contract Address:", contractAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("📋 NEXT STEPS:");
  console.log("");
  console.log("1. Copy contract address di atas");
  console.log("2. Buka file backend/.env");
  console.log("3. Tambahkan atau update baris berikut:");
  console.log("");
  console.log("   CONTRACT_ADDRESS=" + contractAddress);
  console.log("");
  console.log("4. Pastikan juga sudah set di backend/.env:");
  
  if (isLocalNetwork) {
    console.log("   BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545");
    console.log("   PRIVATE_KEY=<akan di-generate otomatis oleh Hardhat>");
    console.log("");
    console.log("   💡 Untuk local network:");
    console.log("      - Jalankan: npm run node (di terminal terpisah)");
    console.log("      - Hardhat akan generate accounts otomatis");
    console.log("      - Gunakan account pertama untuk PRIVATE_KEY");
  } else {
    console.log("   BLOCKCHAIN_RPC_URL=" + process.env.BLOCKCHAIN_RPC_URL);
    console.log("   PRIVATE_KEY=" + (process.env.PRIVATE_KEY ? "***" + process.env.PRIVATE_KEY.slice(-4) : "NOT SET"));
  }
  
  console.log("   CONTRACT_ADDRESS=" + contractAddress);
  console.log("");
  console.log("5. Restart backend server untuk apply changes");
  console.log("");
  
  if (!isLocalNetwork) {
    const explorerUrl = chainId === '80002' 
      ? `https://amoy.polygonscan.com/address/${contractAddress}`
      : `https://mumbai.polygonscan.com/address/${contractAddress}`;
    console.log("🔗 View contract on explorer:");
    console.log("   " + explorerUrl);
    console.log("");
  } else {
    console.log("💡 Local network tidak memiliki blockchain explorer");
    console.log("   Semua transaksi hanya tersimpan di local Hardhat node");
    console.log("");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("");
    console.error("❌ Deployment failed!");
    console.error("Error:", error.message);
    console.error("");
    console.error("💡 Troubleshooting:");
    console.error("   - Pastikan BLOCKCHAIN_RPC_URL valid");
    console.error("   - Pastikan PRIVATE_KEY benar");
    console.error("   - Pastikan wallet memiliki MATIC untuk gas fee");
    console.error("   - Cek koneksi internet");
    console.error("");
    process.exit(1);
  });

