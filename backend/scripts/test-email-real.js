require('dotenv').config({ path: '../.env' });
const {
  isEmailEnabled,
  sendEmailLaporanBaru,
  sendEmailStatusUpdate,
  broadcastEmailKeWarga,
  initEmailService
} = require('../services/emailService');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function testEmailReal() {
  console.log('📧 Test Email Service - Real Send\n');
  console.log('='.repeat(80));

  try {
    // 1. Check email service
    console.log('\n1️⃣  Cek Email Service Configuration\n');
    if (initEmailService()) {
      console.log('   ✅ Email service initialized');
    } else {
      console.log('   ❌ Email service NOT configured!');
      console.log('   💡 Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS di .env file');
      return;
    }

    console.log(`   Email Enabled: ${isEmailEnabled ? '✅ Yes' : '❌ No'}`);
    console.log(`   Email Host: ${process.env.EMAIL_HOST || 'N/A'}`);
    console.log(`   Email User: ${process.env.EMAIL_USER || 'N/A'}\n`);

    if (!isEmailEnabled) {
      console.log('   ⚠️  Email service tidak aktif. Tidak bisa test email.\n');
      return;
    }

    // 2. Get real data
    console.log('2️⃣  Mengambil Data Real dari Database\n');
    
    // Get a real report from RT001/RW001 (yang punya admin dengan email real)
    const realReport = await prisma.report.findFirst({
      where: {
        user: {
          rtRw: 'RT001/RW001' // Use RT001/RW001 yang punya admin dengan email real
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
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!realReport) {
      console.log('   ❌ Tidak ada report ditemukan!');
      return;
    }

    console.log(`   ✅ Report ditemukan: #${realReport.id} - "${realReport.title}"`);
    console.log(`   Warga: ${realReport.user.name} (${realReport.user.email})`);
    console.log(`   RT/RW: ${realReport.user.rtRw}\n`);

    // Get admin untuk test email
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ['admin', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'pengurus']
        },
        rtRw: realReport.user.rtRw,
        email: {
          not: { contains: '@example' } // Only real emails
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      take: 3
    });

    console.log(`   📧 Admin dengan email real: ${admins.length}`);
    admins.forEach((admin, idx) => {
      console.log(`   ${idx + 1}. ${admin.name} (${admin.role}) - ${admin.email}`);
    });
    console.log('');

    if (admins.length === 0) {
      console.log('   ⚠️  Tidak ada admin dengan email real untuk RT/RW ini.');
      console.log('   💡 Gunakan email real (bukan @example) untuk test email.\n');
      return;
    }

    // 3. Test send email laporan baru
    console.log('3️⃣  Test: Send Email Laporan Baru ke Admin\n');
    console.log(`   Mengirim ke ${admins.length} admin...\n`);

    const emailResult = await sendEmailLaporanBaru(realReport, realReport.user);
    
    if (emailResult.success) {
      console.log(`   ✅ Email berhasil dikirim ke ${emailResult.sentTo || admins.length} admin!`);
      console.log('   💡 Cek inbox email admin untuk konfirmasi.\n');
    } else {
      console.log(`   ❌ Email GAGAL dikirim!`);
      console.log(`   Reason: ${emailResult.reason || emailResult.error || 'Unknown error'}\n`);
    }

    // 4. Test send email status update (jika warga punya email real)
    if (realReport.user.email && !realReport.user.email.includes('@example')) {
      console.log('4️⃣  Test: Send Email Status Update ke Warga\n');
      console.log(`   Mengirim ke: ${realReport.user.email}...\n`);

      const statusResult = await sendEmailStatusUpdate(
        realReport,
        realReport.user,
        'pending',
        'in_progress'
      );

      if (statusResult.success) {
        console.log(`   ✅ Email status update berhasil dikirim ke ${realReport.user.email}!`);
        console.log('   💡 Cek inbox email warga untuk konfirmasi.\n');
      } else {
        console.log(`   ❌ Email status update GAGAL!`);
        console.log(`   Reason: ${statusResult.reason || statusResult.error || 'Unknown error'}\n`);
      }
    } else {
      console.log('4️⃣  Skip: Test Email Status Update\n');
      console.log('   ⚠️  Warga tidak punya email real (gunakan @example)\n');
    }

    // 5. Summary
    console.log('='.repeat(80));
    console.log('\n📊 TEST SUMMARY\n');
    console.log('✅ Email service configuration: OK');
    console.log(`✅ Test emails sent: ${emailResult.success ? 'Yes' : 'No'}`);
    console.log('\n💡 CATATAN:');
    console.log('   - Email akan dikirim ke email real yang ada di database');
    console.log('   - Email @example.com tidak akan menerima email');
    console.log('   - Cek inbox (dan spam folder) untuk konfirmasi email diterima');
    console.log('   - Untuk Gmail, mungkin perlu "Allow less secure apps" atau App Password');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testEmailReal()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

module.exports = { testEmailReal };

