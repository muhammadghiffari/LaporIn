/* Seed Admin Kelurahan untuk LaporIn */
const bcrypt = require('bcryptjs');
const prisma = require('../database/prisma');

async function jalankan() {
  console.log('🌱 Membuat Admin Kelurahan...\n');

  // Password default untuk admin kelurahan
  const DEFAULT_PASSWORD = 'AdminKelurahan123!';
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  try {
    // Email admin kelurahan (bisa sama dengan EMAIL_USER untuk kirim email)
    const ADMIN_EMAIL = 'abhisuryanu9roho@gmail.com';
    
    // Buat atau update admin kelurahan
    const adminKelurahan = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        passwordHash,
        name: 'Admin Kelurahan',
        role: 'admin',
        rtRw: null, // Admin kelurahan tidak punya RT/RW spesifik
        jenisKelamin: 'laki_laki',
        isVerified: true,
        verifiedAt: new Date()
      },
      create: {
        email: ADMIN_EMAIL,
        passwordHash,
        name: 'Admin Kelurahan',
        role: 'admin',
        rtRw: null,
        jenisKelamin: 'laki_laki',
        isVerified: true,
        verifiedAt: new Date(),
        createdAt: new Date()
      }
    });

    console.log('✅ Admin Kelurahan berhasil dibuat/updated!');
    console.log('\n📋 Informasi Login:');
    console.log(`   Email: ${adminKelurahan.email}`);
    console.log(`   Password: ${DEFAULT_PASSWORD}`);
    console.log(`   Role: ${adminKelurahan.role}`);
    console.log(`   Verified: ${adminKelurahan.isVerified ? '✅ Ya' : '❌ Tidak'}`);
    console.log('\n⚠️  PENTING: Ganti password setelah login pertama kali!\n');

    // Cek apakah ada admin lain
    const totalAdmins = await prisma.user.count({
      where: { role: 'admin' }
    });

    console.log(`📊 Total Admin di sistem: ${totalAdmins}`);

  } catch (error) {
    console.error('❌ Error membuat Admin Kelurahan:', error);
    throw error;
  }
}

jalankan()
  .then(() => {
    console.log('✅ Seeder selesai!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seeder gagal:', err);
    process.exit(1);
  });

