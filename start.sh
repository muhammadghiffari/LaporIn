#!/bin/bash

echo "🚀 Menjalankan LaporIn Application"
echo "=================================="
echo ""

# Cek apakah Prisma Client sudah di-generate
if [ ! -d "backend/generated" ]; then
    echo "⚠️  Prisma Client belum di-generate!"
    echo "📦 Generating Prisma Client..."
    cd backend
    npx prisma generate
    cd ..
    echo ""
fi

# Cek apakah .env ada
if [ ! -f "backend/.env" ]; then
    echo "⚠️  File backend/.env tidak ditemukan!"
    echo "📝 Silakan buat file backend/.env dengan konfigurasi database"
    exit 1
fi

echo "✅ Prisma Client sudah siap"
echo ""

# Jalankan backend di background
echo "🔧 Menjalankan Backend Server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Tunggu sebentar agar backend start
sleep 3

# Jalankan frontend
echo "🎨 Menjalankan Frontend..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Aplikasi sedang berjalan!"
echo ""
echo "📍 Backend:  http://localhost:3001"
echo "📍 Frontend: http://localhost:3000"
echo ""
echo "Tekan Ctrl+C untuk menghentikan semua server"
echo ""

# Trap Ctrl+C untuk kill semua process
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Tunggu sampai user tekan Ctrl+C
wait

