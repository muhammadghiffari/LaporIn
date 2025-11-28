/**
 * Clear All Data & Reseed dengan Data Real Jakarta
 * 
 * Script ini akan:
 * 1. Clear semua data (kecuali chatbot training)
 * 2. Run seeder dengan data real Jakarta
 */

const prisma = require('../database/prisma');

async function clearAllData() {
  console.log('🧹 Membersihkan semua data...\n');
  
  try {
    // 1. Update chatbot_conversations (set userId = null)
    console.log('1️⃣  Memutus relasi chatbot conversations...');
    const chatbotUpdate = await prisma.chatbotConversation.updateMany({
      data: { userId: null }
    });
    console.log(`   ✅ ${chatbotUpdate.count} conversations di-update\n`);
    
    // 2. Hapus face verification logs
    console.log('2️⃣  Menghapus face verification logs...');
    const faceLogs = await prisma.faceVerificationLog.deleteMany({});
    console.log(`   ✅ ${faceLogs.count} face verification logs dihapus\n`);
    
    // 3. Hapus report status history
    console.log('3️⃣  Menghapus report status history...');
    const statusHistory = await prisma.reportStatusHistory.deleteMany({});
    console.log(`   ✅ ${statusHistory.count} status history dihapus\n`);
    
    // 4. Hapus AI processing logs
    console.log('4️⃣  Menghapus AI processing logs...');
    const aiLogs = await prisma.aiProcessingLog.deleteMany({});
    console.log(`   ✅ ${aiLogs.count} AI processing logs dihapus\n`);
    
    // 5. Hapus bantuan
    console.log('5️⃣  Menghapus data bantuan...');
    const bantuan = await prisma.bantuan.deleteMany({});
    console.log(`   ✅ ${bantuan.count} bantuan dihapus\n`);
    
    // 6. Hapus reports
    console.log('6️⃣  Menghapus reports...');
    const reports = await prisma.report.deleteMany({});
    console.log(`   ✅ ${reports.count} reports dihapus\n`);
    
    // 7. Hapus users
    console.log('7️⃣  Menghapus users...');
    const users = await prisma.user.deleteMany({});
    console.log(`   ✅ ${users.count} users dihapus\n`);
    
    console.log('='.repeat(60));
    console.log('✅ Semua data berhasil dihapus!');
    console.log('✅ Chatbot training data dipertahankan');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  }
}

async function run() {
  try {
    await clearAllData();
    console.log('\n🌱 Sekarang menjalankan seeder dengan data real Jakarta...\n');
    
    // Disconnect prisma dulu, lalu run seeder (seeder akan connect sendiri)
    await prisma.$disconnect();
    
    // Run seeder
    require('./seed-real-jakarta.js');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  run();
}

module.exports = { clearAllData };

