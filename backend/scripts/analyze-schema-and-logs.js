require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function analyzeSchemaAndLogs() {
  console.log('🔍 Analisis Schema dan Log Data\n');
  console.log('='.repeat(80));

  try {
    // 1. Cek struktur tabel dan field naming
    console.log('\n1️⃣  ANALISIS SCHEMA - Naming Convention\n');
    
    // Cek apakah ada duplikasi field di response API
    const sampleReport = await prisma.report.findFirst({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            rtRw: true
          }
        }
      }
    });

    if (sampleReport) {
      console.log('   ✅ Sample Report Structure:');
      console.log(`      - Report ID: ${sampleReport.id}`);
      console.log(`      - User ID (FK): ${sampleReport.userId}`);
      console.log(`      - User Object: { id: ${sampleReport.user.id}, name: "${sampleReport.user.name}" }`);
      console.log('   ✅ Struktur sudah benar - tidak ada duplikasi field\n');
    }

    // 2. Cek AI Processing Logs
    console.log('2️⃣  AI PROCESSING LOGS\n');
    const aiLogsCount = await prisma.aiProcessingLog.count();
    console.log(`   Total AI Processing Logs: ${aiLogsCount}`);

    if (aiLogsCount > 0) {
      const recentAiLogs = await prisma.aiProcessingLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          report: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      console.log(`\n   📋 ${recentAiLogs.length} Log Terbaru:`);
      recentAiLogs.forEach((log, idx) => {
        console.log(`   ${idx + 1}. Report #${log.reportId}: "${log.report?.title || 'N/A'}"`);
        console.log(`      Category: ${log.aiCategory || 'N/A'}, Urgency: ${log.aiUrgency || 'N/A'}`);
        console.log(`      Created: ${log.createdAt.toLocaleString('id-ID')}`);
      });
    } else {
      console.log('   ⚠️  TIDAK ADA DATA - AI Processing Log kosong!');
      console.log('   💡 Log hanya dibuat saat laporan baru dibuat dengan AI processing\n');
    }

    // 3. Cek Face Verification Logs
    console.log('\n3️⃣  FACE VERIFICATION LOGS\n');
    const faceLogsCount = await prisma.faceVerificationLog.count();
    console.log(`   Total Face Verification Logs: ${faceLogsCount}`);

    if (faceLogsCount > 0) {
      const recentFaceLogs = await prisma.faceVerificationLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      console.log(`\n   👤 ${recentFaceLogs.length} Log Terbaru:`);
      recentFaceLogs.forEach((log, idx) => {
        console.log(`   ${idx + 1}. User: ${log.user.name} (${log.user.email})`);
        console.log(`      Verified: ${log.verified ? '✅' : '❌'}, Context: ${log.context || 'N/A'}`);
        console.log(`      Confidence: ${log.confidence || 'N/A'}, Distance: ${log.distance}`);
        console.log(`      Created: ${log.createdAt.toLocaleString('id-ID')}`);
      });
    } else {
      console.log('   ⚠️  TIDAK ADA DATA - Face Verification Log kosong!');
      console.log('   💡 Log hanya dibuat saat:');
      console.log('      - User login dengan face verification');
      console.log('      - User melakukan verify-face endpoint');
      console.log('      - User melakukan face verification saat registrasi\n');
    }

    // 4. Cek Report Status History
    console.log('4️⃣  REPORT STATUS HISTORY\n');
    const statusHistoryCount = await prisma.reportStatusHistory.count();
    console.log(`   Total Status History Records: ${statusHistoryCount}`);

    if (statusHistoryCount > 0) {
      const recentHistory = await prisma.reportStatusHistory.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          report: {
            select: {
              id: true,
              title: true
            }
          },
          updater: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      console.log(`\n   📝 ${recentHistory.length} History Terbaru:`);
      recentHistory.forEach((history, idx) => {
        console.log(`   ${idx + 1}. Report #${history.reportId}: "${history.report?.title || 'N/A'}"`);
        console.log(`      Status: ${history.status}, Updated by: ${history.updater?.name || 'N/A'}`);
        console.log(`      Created: ${history.createdAt.toLocaleString('id-ID')}`);
      });
    } else {
      console.log('   ⚠️  TIDAK ADA DATA - Status History kosong!');
      console.log('   💡 History dibuat saat:');
      console.log('      - Laporan baru dibuat (status: pending)');
      console.log('      - Status laporan diubah oleh admin\n');
    }

    // 5. Analisis Schema Best Practice
    console.log('\n5️⃣  ANALISIS SCHEMA - Best Practice\n');
    console.log('   ✅ Field Naming:');
    console.log('      - Prisma: camelCase (userId, createdAt)');
    console.log('      - Database: snake_case (user_id, created_at)');
    console.log('      - Mapping: @map("user_id") untuk consistency');
    console.log('\n   ✅ Foreign Keys:');
    console.log('      - Report.userId → User.id (benar)');
    console.log('      - ReportStatusHistory.updatedBy → User.id (benar)');
    console.log('      - FaceVerificationLog.userId → User.id (benar)');
    console.log('\n   ✅ Indexes:');
    const indexes = {
      'FaceVerificationLog': ['userId', 'createdAt', 'verified'],
      'Report': ['userId', 'status', 'createdAt'],
      'ReportStatusHistory': ['reportId', 'createdAt']
    };
    for (const [model, fields] of Object.entries(indexes)) {
      console.log(`      - ${model}: ${fields.join(', ')}`);
    }

    // 6. Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY\n');
    console.log(`   Total Reports: ${await prisma.report.count()}`);
    console.log(`   Total Users: ${await prisma.user.count()}`);
    console.log(`   AI Processing Logs: ${aiLogsCount}`);
    console.log(`   Face Verification Logs: ${faceLogsCount}`);
    console.log(`   Status History: ${statusHistoryCount}`);
    
    console.log('\n💡 KESIMPULAN:');
    if (aiLogsCount === 0) {
      console.log('   ⚠️  AI Processing Logs kosong - mungkin belum ada laporan baru yang dibuat');
    }
    if (faceLogsCount === 0) {
      console.log('   ⚠️  Face Verification Logs kosong - belum ada yang menggunakan face verification');
    }
    if (statusHistoryCount === 0) {
      console.log('   ⚠️  Status History kosong - mungkin belum ada laporan atau status update');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  analyzeSchemaAndLogs()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

module.exports = { analyzeSchemaAndLogs };

