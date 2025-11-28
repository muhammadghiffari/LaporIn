/**
 * Debug Script: Cek Reports untuk Ketua RT
 * 
 * Script ini membantu debug kenapa laporan tidak muncul di dashboard RT
 */

require('dotenv').config();
const prisma = require('../database/prisma');

async function debugRTReports() {
  try {
    console.log('🔍 Debug: Cek Reports untuk Ketua RT\n');
    
    // 1. Cari Ketua RT pertama
    const ketuaRT = await prisma.user.findFirst({
      where: { role: 'ketua_rt' },
      select: {
        id: true,
        email: true,
        name: true,
        rtRw: true
      }
    });
    
    if (!ketuaRT) {
      console.log('❌ Tidak ada Ketua RT ditemukan!');
      return;
    }
    
    console.log('1️⃣  Ketua RT ditemukan:');
    console.log(`   ID: ${ketuaRT.id}`);
    console.log(`   Email: ${ketuaRT.email}`);
    console.log(`   Nama: ${ketuaRT.name}`);
    console.log(`   RT/RW: ${ketuaRT.rtRw}\n`);
    
    // 2. Cari semua reports dari RT/RW yang sama
    console.log(`2️⃣  Mencari reports dari RT/RW: ${ketuaRT.rtRw}\n`);
    
    const reportsInRtRw = await prisma.report.findMany({
      where: {
        user: {
          rtRw: ketuaRT.rtRw
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            rtRw: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`   Total reports ditemukan: ${reportsInRtRw.length}\n`);
    
    if (reportsInRtRw.length > 0) {
      console.log('3️⃣  Detail Reports:\n');
      reportsInRtRw.forEach((r, idx) => {
        console.log(`   Report #${idx + 1}:`);
        console.log(`   - ID: ${r.id}`);
        console.log(`   - Judul: ${r.title}`);
        console.log(`   - Status: ${r.status}`);
        console.log(`   - Urgensi: ${r.urgency || 'N/A'}`);
        console.log(`   - Warga: ${r.user.name} (${r.user.email})`);
        console.log(`   - RT/RW Warga: ${r.user.rtRw}`);
        console.log(`   - RT/RW Match: ${r.user.rtRw === ketuaRT.rtRw ? '✅' : '❌'}`);
        console.log(`   - Created: ${r.createdAt.toISOString()}\n`);
      });
      
      // 4. Group by status
      const statusCounts = reportsInRtRw.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('4️⃣  Status Breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} laporan`);
      });
      console.log('');
      
      // 5. Filter pending/in_progress
      const pendingReports = reportsInRtRw.filter(r => 
        r.status === 'pending' || r.status === 'in_progress'
      );
      
      console.log(`5️⃣  Reports Pending/In Progress: ${pendingReports.length}`);
      if (pendingReports.length > 0) {
        pendingReports.forEach(r => {
          console.log(`   - Report #${r.id}: ${r.title} (${r.status})`);
        });
      } else {
        console.log('   ⚠️  Tidak ada reports pending/in_progress!');
      }
      
    } else {
      console.log('3️⃣  ❌ Tidak ada reports ditemukan untuk RT/RW ini!\n');
      
      // Cek apakah ada reports di database
      const totalReports = await prisma.report.count();
      console.log(`   Total reports di database: ${totalReports}`);
      
      if (totalReports > 0) {
        console.log('\n   📋 Sample reports di database:');
        const sampleReports = await prisma.report.findMany({
          take: 5,
          include: {
            user: {
              select: {
                rtRw: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        
        sampleReports.forEach(r => {
          console.log(`   - Report #${r.id}: ${r.title}`);
          console.log(`     Status: ${r.status}`);
          console.log(`     RT/RW: ${r.user.rtRw}`);
          console.log(`     Warga: ${r.user.name}`);
          console.log(`     Match with Ketua RT: ${r.user.rtRw === ketuaRT.rtRw ? '✅' : '❌'}\n`);
        });
      }
    }
    
    // 6. Cek format RT/RW
    console.log('\n6️⃣  Cek Format RT/RW:\n');
    
    const allRtRw = await prisma.user.findMany({
      where: {
        rtRw: { not: null }
      },
      select: {
        rtRw: true,
        role: true
      },
      distinct: ['rtRw']
    });
    
    console.log('   Semua RT/RW di database:');
    allRtRw.forEach(u => {
      const match = u.rtRw === ketuaRT.rtRw;
      console.log(`   - ${u.rtRw} ${match ? '✅ (match)' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRTReports();

