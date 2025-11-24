const { PrismaClient } = require('../generated/prisma');

// Inisialisasi Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Handle graceful shutdown - tutup koneksi saat aplikasi ditutup
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;