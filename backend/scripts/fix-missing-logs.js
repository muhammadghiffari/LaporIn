require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

/**
 * Script untuk fix missing logs:
 * 1. Create missing AI Processing Logs untuk reports yang sudah ada
 * 2. Create missing Report Status History untuk reports yang sudah ada
 */
async function fixMissingLogs() {
  console.log('🔧 Fix Missing Logs\n');
  console.log('='.repeat(80));

  try {
    // 1. Cek reports tanpa AI Processing Log
    console.log('\n1️⃣  Memperbaiki AI Processing Logs...\n');
    
    const reportsWithoutAiLog = await prisma.report.findMany({
      where: {
        aiProcessingLog: {
          none: {}
        }
      },
      include: {
        aiProcessingLog: true
      },
      take: 50 // Limit untuk safety
    });

    console.log(`   📋 Reports tanpa AI Log: ${reportsWithoutAiLog.length}`);

    if (reportsWithoutAiLog.length > 0) {
      console.log('\n   ⚠️  CATATAN: AI Processing Log memerlukan originalText dan hasil AI processing.');
      console.log('   💡 Untuk reports lama, kita hanya bisa membuat log dummy karena data AI tidak ada.');
      console.log('   💡 Reports baru akan otomatis create log saat dibuat.\n');

      // Buat log dummy untuk reports lama (dengan catatan)
      let created = 0;
      for (const report of reportsWithoutAiLog) {
        try {
          await prisma.aiProcessingLog.create({
            data: {
              reportId: report.id,
              originalText: `${report.title}. ${report.description}`,
              aiSummary: report.aiSummary || 'Tidak tersedia (report lama)',
              aiCategory: report.category || 'unknown',
              aiUrgency: report.urgency || 'medium',
              processingTimeMs: null // Tidak diketahui untuk report lama
            }
          });
          created++;
        } catch (err) {
          console.error(`   ❌ Error creating log for report ${report.id}:`, err.message);
        }
      }
      console.log(`   ✅ Created ${created} AI Processing Logs untuk reports lama\n`);
    } else {
      console.log('   ✅ Semua reports sudah memiliki AI Processing Log\n');
    }

    // 2. Cek reports tanpa Status History
    console.log('2️⃣  Memperbaiki Report Status History...\n');
    
    const reportsWithoutHistory = await prisma.report.findMany({
      where: {
        reportStatusHistory: {
          none: {}
        }
      },
      include: {
        reportStatusHistory: true,
        user: {
          select: {
            id: true
          }
        }
      },
      take: 50
    });

    console.log(`   📋 Reports tanpa Status History: ${reportsWithoutHistory.length}`);

    if (reportsWithoutHistory.length > 0) {
      let created = 0;
      for (const report of reportsWithoutHistory) {
        try {
          // Create initial status history (pending)
          await prisma.reportStatusHistory.create({
            data: {
              reportId: report.id,
              status: report.status || 'pending',
              updatedBy: report.userId // User yang membuat report
            }
          });
          created++;
        } catch (err) {
          console.error(`   ❌ Error creating history for report ${report.id}:`, err.message);
        }
      }
      console.log(`   ✅ Created ${created} Status History records untuk reports\n`);
    } else {
      console.log('   ✅ Semua reports sudah memiliki Status History\n');
    }

    // 3. Summary
    console.log('='.repeat(80));
    console.log('\n📊 SUMMARY\n');
    const totalAiLogs = await prisma.aiProcessingLog.count();
    const totalHistory = await prisma.reportStatusHistory.count();
    const totalReports = await prisma.report.count();
    
    console.log(`   Total Reports: ${totalReports}`);
    console.log(`   Total AI Processing Logs: ${totalAiLogs}`);
    console.log(`   Total Status History: ${totalHistory}`);
    
    console.log('\n✅ Selesai! Logs sudah diperbaiki.');
    console.log('💡 Untuk reports baru, logs akan otomatis dibuat saat laporan dibuat.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fixMissingLogs()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

module.exports = { fixMissingLogs };

