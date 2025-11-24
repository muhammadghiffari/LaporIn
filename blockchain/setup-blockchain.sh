#!/bin/bash

echo "🚀 Setup Blockchain untuk LaporIn"
echo "=================================="
echo ""
echo "Pilih mode setup:"
echo "1. Local Network (Recommended untuk development - tidak perlu setup apapun)"
echo "2. Polygon Mumbai Testnet (untuk testing dengan blockchain real)"
echo ""
read -p "Pilih [1/2]: " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "🏠 Setup Local Network..."
    echo ""
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    # Compile
    echo ""
    echo "📝 Compiling contracts..."
    npm run compile
    
    if [ $? -ne 0 ]; then
        echo "❌ Compilation failed!"
        exit 1
    fi
    
    # Deploy to local
    echo ""
    echo "📤 Deploying to local Hardhat network..."
    npm run deploy:local
    
    if [ $? -ne 0 ]; then
        echo "❌ Deployment failed!"
        exit 1
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Local Network Setup Complete!"
    echo ""
    echo "📋 NEXT STEPS:"
    echo ""
    echo "1. Copy CONTRACT_ADDRESS dari output di atas"
    echo ""
    echo "2. Update backend/.env:"
    echo "   BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545"
    echo "   CONTRACT_ADDRESS=<paste_contract_address>"
    echo ""
    echo "3. Untuk mendapatkan PRIVATE_KEY:"
    echo "   - Jalankan: npm run node (di terminal terpisah)"
    echo "   - Copy private key dari account pertama"
    echo "   - Tambahkan ke backend/.env: PRIVATE_KEY=<private_key>"
    echo ""
    echo "4. Restart backend server"
    echo ""
    echo "💡 TIP: Untuk development, jalankan 'npm run node' di terminal terpisah"
    echo "   sebelum menjalankan backend server."
    echo ""
    
else
    echo ""
    echo "🌐 Setup Polygon Mumbai Testnet..."
    echo ""
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo "📝 Membuat file .env..."
        cat > .env << EOF
# Polygon Mumbai Testnet RPC URL
# Dapatkan dari: https://www.alchemy.com/ (gratis)
BLOCKCHAIN_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Private Key wallet (tanpa 0x prefix)
# JANGAN share private key ini ke siapa pun!
PRIVATE_KEY=your_wallet_private_key_here
EOF
        echo "✅ File .env dibuat. Silakan edit dengan informasi Anda."
    else
        echo "✅ File .env sudah ada."
    fi
    
    echo ""
    echo "📋 Langkah-langkah setup:"
    echo ""
    echo "1. Dapatkan Alchemy API Key (GRATIS):"
    echo "   - Kunjungi: https://www.alchemy.com/"
    echo "   - Buat akun (gratis)"
    echo "   - Buat app baru untuk Polygon Mumbai"
    echo "   - Copy HTTP URL ke BLOCKCHAIN_RPC_URL"
    echo ""
    echo "2. Buat wallet atau gunakan wallet yang ada:"
    echo "   - Install MetaMask: https://metamask.io/"
    echo "   - Buat wallet baru atau import existing"
    echo "   - Export private key (Settings > Security > Export Private Key)"
    echo "   - Copy ke PRIVATE_KEY (tanpa 0x prefix)"
    echo ""
    echo "3. Dapatkan testnet MATIC (untuk gas fee):"
    echo "   - Kunjungi: https://faucet.polygon.technology/"
    echo "   - Pilih Polygon Mumbai"
    echo "   - Masukkan wallet address Anda"
    echo "   - Request testnet MATIC (gratis)"
    echo ""
    echo "4. Install dependencies:"
    echo "   npm install"
    echo ""
    echo "5. Compile contract:"
    echo "   npm run compile"
    echo ""
    echo "6. Deploy contract:"
    echo "   npm run deploy"
    echo ""
    echo "7. Copy contract address ke backend/.env:"
    echo "   CONTRACT_ADDRESS=0x..."
    echo ""
    echo "✨ Setup selesai!"
fi

