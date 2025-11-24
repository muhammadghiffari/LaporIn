#!/bin/bash

echo "🚀 Starting Hardhat Local Node"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")"

# Check if node is already running
if curl -s http://127.0.0.1:8545 > /dev/null 2>&1; then
    echo "✅ Hardhat node sudah berjalan di http://127.0.0.1:8545"
    echo ""
    echo "💡 Untuk stop node, tekan Ctrl+C atau kill process"
    exit 0
fi

echo "📡 Starting Hardhat node..."
echo ""
echo "💡 Node akan berjalan di: http://127.0.0.1:8545"
echo "💡 Press Ctrl+C untuk stop node"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run node

