#!/bin/bash

echo "🚀 Setup Blockchain Local Network"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Hardhat is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js first."
    exit 1
fi

echo "📦 Step 1: Compiling contracts..."
npm run compile

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed!"
    exit 1
fi

echo ""
echo "✅ Compilation successful!"
echo ""
echo "📤 Step 2: Deploying to local Hardhat network..."
npm run deploy:local

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Copy CONTRACT_ADDRESS dari output di atas"
echo ""
echo "2. Buka file backend/.env dan tambahkan/update:"
echo ""
echo "   BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545"
echo "   CONTRACT_ADDRESS=<paste_contract_address_di_sini>"
echo ""
echo "3. Untuk mendapatkan PRIVATE_KEY:"
echo "   - Jalankan: npm run node (di terminal terpisah)"
echo "   - Hardhat akan menampilkan daftar accounts dengan private keys"
echo "   - Copy private key dari account pertama (tanpa 0x prefix)"
echo "   - Tambahkan ke backend/.env: PRIVATE_KEY=<private_key>"
echo ""
echo "4. Restart backend server"
echo ""
echo "💡 TIP: Untuk development, jalankan 'npm run node' di terminal terpisah"
echo "   sebelum menjalankan backend server agar blockchain node tetap hidup."
echo ""

