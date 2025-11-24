/* Script untuk menghapus data seeder yang tidak penting
 * Tetap mempertahankan:
 * - ChatbotConversation (data training AI chatbot)
 * - ChatbotTrainingData (data training AI chatbot)
 * - Data yang dibuat user secara manual (bukan dari seeder)
 */

const prisma = require('../database/prisma');

// Pattern email dari seeder
const SEEDER_EMAIL_PATTERNS = [
  /^warga\d+@example\.com$/,
  /^adminsistem@example\.com$/,
  /^adminrw@example\.com$/,
  /^ketuart@example\.com$/,
  /^sekretarisrt@example\.com$/,
  /^pengurus@example\.com$/
];

function isSeederEmail(email) {
  return SEEDER_EMAIL_PATTERNS.some(pattern => pattern.test(email));
}

async function clearSeederData() {
  try {
    console.log('🧹 Mulai membersihkan data seeder...\n');

    // 1. Identifikasi users dari seeder
    console.log('📋 Mengidentifikasi users dari seeder...');
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, role: true }
    });

    const seederUserIds = allUsers
      .filter(user => isSeederEmail(user.email))
      .map(user => user.id);

    console.log(`   Ditemukan ${seederUserIds.length} users dari seeder`);

    // Keep minimal 1 admin untuk testing (opsional)
    const keepAdminForTesting = true;
    let usersToDelete = seederUserIds;

    if (keepAdminForTesting) {
      // Keep 1 admin user untuk testing
      const adminUsers = allUsers.filter(
        user => isSeederEmail(user.email) && user.role === 'admin'
      );
      if (adminUsers.length > 0) {
        const keepAdminId = adminUsers[0].id;
        usersToDelete = seederUserIds.filter(id => id !== keepAdminId);
        console.log(`   Menyimpan 1 admin untuk testing: ${adminUsers[0].email}`);
      }
    }

    console.log(`   Akan menghapus ${usersToDelete.length} users\n`);

    // 2. Identifikasi reports dari seeder users
    console.log('📋 Mengidentifikasi reports dari seeder...');
    const seederReports = await prisma.report.findMany({
      where: { userId: { in: usersToDelete } },
      select: { id: true }
    });
    const seederReportIds = seederReports.map(r => r.id);
    console.log(`   Ditemukan ${seederReportIds.length} reports dari seeder\n`);

    // 3. Hapus data terkait reports (dengan urutan yang benar untuk foreign key)
    if (seederReportIds.length > 0) {
      console.log('🗑️  Menghapus data terkait reports...');

      // Hapus ReportStatusHistory
      const deletedHistory = await prisma.reportStatusHistory.deleteMany({
        where: { reportId: { in: seederReportIds } }
      });
      console.log(`   ✅ Dihapus ${deletedHistory.count} report status history`);

      // Hapus AiProcessingLog (kecuali jika user ingin keep untuk training)
      // Tapi karena ini dari seeder dummy, kita hapus juga
      const deletedAiLogs = await prisma.aiProcessingLog.deleteMany({
        where: { reportId: { in: seederReportIds } }
      });
      console.log(`   ✅ Dihapus ${deletedAiLogs.count} AI processing logs`);

      // Hapus Reports
      const deletedReports = await prisma.report.deleteMany({
        where: { id: { in: seederReportIds } }
      });
      console.log(`   ✅ Dihapus ${deletedReports.count} reports\n`);
    }

    // 4. Update ChatbotConversation: set userId menjadi null untuk conversations dari seeder users
    // (untuk mempertahankan data training meskipun user dihapus)
    if (usersToDelete.length > 0) {
      console.log('📝 Mempertahankan ChatbotConversation dari seeder users...');
      const updatedConversations = await prisma.chatbotConversation.updateMany({
        where: { userId: { in: usersToDelete } },
        data: { userId: null }
      });
      console.log(`   ✅ ${updatedConversations.count} conversations dipertahankan (userId di-set null)\n`);
    }

    // 5. Hapus users (akan cascade ke data terkait jika ada)
    if (usersToDelete.length > 0) {
      console.log('🗑️  Menghapus users dari seeder...');
      
      // Hapus FaceVerificationLogs (jika ada)
      const deletedFaceLogs = await prisma.faceVerificationLog.deleteMany({
        where: { userId: { in: usersToDelete } }
      });
      console.log(`   ✅ Dihapus ${deletedFaceLogs.count} face verification logs`);

      // Hapus Bantuan (jika ada)
      const deletedBantuan = await prisma.bantuan.deleteMany({
        where: { userId: { in: usersToDelete } }
      });
      console.log(`   ✅ Dihapus ${deletedBantuan.count} bantuan`);

      // Hapus Users (ChatbotConversation sudah di-update, jadi aman)
      const deletedUsers = await prisma.user.deleteMany({
        where: { id: { in: usersToDelete } }
      });
      console.log(`   ✅ Dihapus ${deletedUsers.count} users\n`);
    }

    // 6. Verifikasi data yang tetap dipertahankan
    console.log('✅ Verifikasi data yang dipertahankan:');
    const remainingConversations = await prisma.chatbotConversation.count();
    const remainingTrainingData = await prisma.chatbotTrainingData.count();
    const remainingUsers = await prisma.user.count();
    const remainingReports = await prisma.report.count();

    console.log(`   📊 ChatbotConversation: ${remainingConversations} (dipertahankan)`);
    console.log(`   📊 ChatbotTrainingData: ${remainingTrainingData} (dipertahankan)`);
    console.log(`   📊 Users: ${remainingUsers}`);
    console.log(`   📊 Reports: ${remainingReports}\n`);

    console.log('✨ Pembersihan data seeder selesai!');
    console.log('💡 Data training AI chatbot tetap dipertahankan.\n');

  } catch (error) {
    console.error('❌ Error saat membersihkan data seeder:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan script
clearSeederData()
  .then(() => {
    console.log('✅ Script selesai');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script gagal:', error);
    process.exit(1);
  });

