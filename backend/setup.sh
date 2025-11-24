#!/bin/bash

echo "🚀 Setup LaporIn Backend dengan Prisma ORM"
echo "=========================================="
echo ""

# Cek apakah .env sudah ada
if [ ! -f .env ]; then
    echo "⚠️  File .env tidak ditemukan!"
    echo "📝 Membuat file .env dari template..."
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wargalapor?schema=public"

# Server
PORT=3001

# JWT Secret (minimal 32 karakter)
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long_please_change_this

# AI Services
GROQ_API_KEY=your_groq_api_key_here
EOF
    echo "✅ File .env dibuat. Silakan edit dengan konfigurasi yang benar!"
    echo ""
fi

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma Client berhasil di-generate!"
else
    echo "❌ Error saat generate Prisma Client"
    exit 1
fi

echo ""
echo "📊 Setup Database Schema..."
echo "Pilih metode:"
echo "1. Prisma Migrate (recommended - untuk development)"
echo "2. Prisma DB Push (untuk sync schema tanpa migration)"
echo "3. Skip (jika database sudah setup)"
read -p "Pilihan (1/2/3): " choice

case $choice in
    1)
        echo "🔄 Running Prisma Migrate..."
        npx prisma migrate dev --name init
        ;;
    2)
        echo "🔄 Running Prisma DB Push..."
        npx prisma db push
        ;;
    3)
        echo "⏭️  Skip database setup"
        ;;
    *)
        echo "❌ Pilihan tidak valid"
        exit 1
        ;;
esac

echo ""
echo "✅ Setup selesai!"
echo ""
echo "📝 Langkah selanjutnya:"
echo "1. Pastikan DATABASE_URL di .env sudah benar"
echo "2. Pastikan GROQ_API_KEY sudah di-set (gratis di https://console.groq.com/)"
echo "3. Jalankan: npm run dev"
echo ""

