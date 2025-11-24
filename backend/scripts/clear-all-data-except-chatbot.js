/**
 * Script untuk menghapus semua data user dan laporan
 * TAPI PRESERVE data training AI chatbot (chatbot_conversations, chatbot_training_data)
 * 
 * WARNING: Script ini akan menghapus SEMUA data user dan laporan!
 * Hanya data chatbot training yang akan dipertahankan.
 * 
 * Cara menjalankan:
 * cd backend
 * node scripts/clear-all-data-except-chatbot.js
 */

const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function clearAllDataExceptChatbot() {
  console.log('🚨 WARNING: Script ini akan menghapus SEMUA data user dan laporan!');
  console.log('✅ Data chatbot training (chatbot_conversations, chatbot_training_data) akan dipertahankan.\n');
  
  try {
    console.log('📊 Memulai proses penghapusan data...\n');
    
    // Step 1: Set userId menjadi null untuk chatbot_conversations yang linked ke user yang akan dihapus
    console.log('1️⃣  Memutuskan relasi chatbot_conversations dengan users...');
    const conversationsUpdated = await prisma.chatbotConversation.updateMany({
      where: {
        userId: {
          not: null
        }
      },
      data: {
        userId: null // Set menjadi null untuk preserve conversation data
      }
    });
    console.log(`   ✅ ${conversationsUpdated.count} chatbot conversations di-update (userId = null)\n`);
    
    // Step 2: Hapus Face Verification Logs
    console.log('2️⃣  Menghapus face verification logs...');
    const faceLogsDeleted = await prisma.faceVerificationLog.deleteMany({});
    console.log(`   ✅ ${faceLogsDeleted.count} face verification logs dihapus\n`);
    
    // Step 3: Hapus Report Status History
    console.log('3️⃣  Menghapus report status history...');
    const statusHistoryDeleted = await prisma.reportStatusHistory.deleteMany({});
    console.log(`   ✅ ${statusHistoryDeleted.count} report status history dihapus\n`);
    
    // Step 4: Hapus AI Processing Logs
    console.log('4️⃣  Menghapus AI processing logs...');
    const aiLogsDeleted = await prisma.aiProcessingLog.deleteMany({});
    console.log(`   ✅ ${aiLogsDeleted.count} AI processing logs dihapus\n`);
    
    // Step 5: Hapus Bantuan
    console.log('5️⃣  Menghapus data bantuan...');
    const bantuanDeleted = await prisma.bantuan.deleteMany({});
    console.log(`   ✅ ${bantuanDeleted.count} data bantuan dihapus\n`);
    
    // Step 6: Hapus Reports
    console.log('6️⃣  Menghapus semua laporan...');
    const reportsDeleted = await prisma.report.deleteMany({});
    console.log(`   ✅ ${reportsDeleted.count} laporan dihapus\n`);
    
    // Step 7: Hapus Users (kecuali yang ingin dipertahankan untuk testing)
    console.log('7️⃣  Menghapus semua user...');
    // Hapus semua user (chatbot_conversations sudah di-update userId = null)
    const usersDeleted = await prisma.user.deleteMany({});
    console.log(`   ✅ ${usersDeleted.count} user dihapus\n`);
    
    // Step 8: Verifikasi data chatbot masih ada
    console.log('8️⃣  Verifikasi data chatbot training...');
    const chatbotConversations = await prisma.chatbotConversation.count({});
    const chatbotTrainingData = await prisma.chatbotTrainingData.count({});
    console.log(`   ✅ ${chatbotConversations} chatbot conversations masih ada`);
    console.log(`   ✅ ${chatbotTrainingData} chatbot training data masih ada\n`);
    
    console.log('✅ Selesai! Semua data user dan laporan telah dihapus.');
    console.log('✅ Data chatbot training telah dipertahankan.\n');
    
    console.log('📝 Catatan:');
    console.log('   - Anda perlu membuat user baru untuk testing');
    console.log('   - Data chatbot training masih tersedia untuk training AI');
    console.log('   - chatbot_conversations.userId sudah di-set menjadi null\n');
    
  } catch (error) {
    console.error('❌ Error saat menghapus data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run script
if (require.main === module) {
  clearAllDataExceptChatbot()
    .then(() => {
      console.log('✨ Script selesai dijalankan!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script gagal:', error);
      process.exit(1);
    });
}

module.exports = { clearAllDataExceptChatbot };

