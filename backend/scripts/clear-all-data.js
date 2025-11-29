/**
 * Script untuk menghapus semua data dari database
 * Tetap mempertahankan:
 * - ChatbotConversation (data training AI chatbot)
 * - ChatbotTrainingData (data training AI chatbot)
 * 
 * PERINGATAN: Script ini akan menghapus SEMUA data users, reports, dll!
 * Hanya jalankan jika benar-benar ingin reset database.
 */

const prisma = require('../database/prisma');

async function clearAllData() {
  try {
    console.log('🧹 Mulai membersihkan SEMUA data dari database...\n');
    console.log('⚠️  PERINGATAN: Script ini akan menghapus semua users, reports, dll!\n');

    // 1. Hapus ReportStatusHistory
    console.log('🗑️  Menghapus ReportStatusHistory...');
    const deletedHistory = await prisma.reportStatusHistory.deleteMany({});
    console.log(`   ✅ Dihapus ${deletedHistory.count} report status history`);

    // 2. Hapus AiProcessingLog
    console.log('🗑️  Menghapus AiProcessingLog...');
    const deletedAiLogs = await prisma.aiProcessingLog.deleteMany({});
    console.log(`   ✅ Dihapus ${deletedAiLogs.count} AI processing logs`);

    // 3. Hapus Reports
    console.log('🗑️  Menghapus Reports...');
    const deletedReports = await prisma.report.deleteMany({});
    console.log(`   ✅ Dihapus ${deletedReports.count} reports`);

    // 4. Update ChatbotConversation: set userId menjadi null
    // (untuk mempertahankan data training meskipun user dihapus)
    console.log('📝 Mempertahankan ChatbotConversation (set userId = null)...');
    const updatedConversations = await prisma.chatbotConversation.updateMany({
      data: { userId: null }
    });
    console.log(`   ✅ ${updatedConversations.count} conversations dipertahankan (userId di-set null)`);

    // 5. Hapus FaceVerificationLogs
    console.log('🗑️  Menghapus FaceVerificationLogs...');
    const deletedFaceLogs = await prisma.faceVerificationLog.deleteMany({});
    console.log(`   ✅ Dihapus ${deletedFaceLogs.count} face verification logs`);

    // 6. Hapus Bantuan
    console.log('🗑️  Menghapus Bantuan...');
    const deletedBantuan = await prisma.bantuan.deleteMany({});
    console.log(`   ✅ Dihapus ${deletedBantuan.count} bantuan`);

    // 7. Hapus Users (ChatbotConversation sudah di-update, jadi aman)
    console.log('🗑️  Menghapus Users...');
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`   ✅ Dihapus ${deletedUsers.count} users`);

    // 8. Verifikasi data yang tetap dipertahankan
    console.log('\n✅ Verifikasi data yang dipertahankan:');
    const remainingConversations = await prisma.chatbotConversation.count();
    const remainingTrainingData = await prisma.chatbotTrainingData.count();
    const remainingUsers = await prisma.user.count();
    const remainingReports = await prisma.report.count();

    console.log(`   📊 ChatbotConversation: ${remainingConversations} (dipertahankan)`);
    console.log(`   📊 ChatbotTrainingData: ${remainingTrainingData} (dipertahankan)`);
    console.log(`   📊 Users: ${remainingUsers}`);
    console.log(`   📊 Reports: ${remainingReports}\n`);

    console.log('✨ Pembersihan data selesai!');
    console.log('💡 Data training AI chatbot tetap dipertahankan.\n');

  } catch (error) {
    console.error('❌ Error saat membersihkan data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan script
clearAllData()
  .then(() => {
    console.log('✅ Script selesai');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script gagal:', error);
    process.exit(1);
  });

