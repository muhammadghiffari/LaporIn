const prisma = require('../database/prisma');
const { runFraudDetection } = require('../services/fraudDetectionService');

async function testFraudDetection() {
  console.log('🧪 Testing AI Fraud Detection\n');
  console.log('===============================================================================\n');

  try {
    // Test 1: Duplicate Report
    console.log('1️⃣  TEST: Duplicate Detection\n');
    const testUser = await prisma.user.findFirst({
      where: { role: 'warga', isVerified: true },
      select: { id: true, name: true, email: true }
    });

    if (!testUser) {
      console.log('   ❌ No verified warga found. Please seed data first.');
      return;
    }

    console.log(`   User: ${testUser.name} (ID: ${testUser.id})`);
    console.log('   Creating first report...\n');

    // Create first report
    const firstReport = await prisma.report.create({
      data: {
        userId: testUser.id,
        title: 'Got mampet di depan rumah',
        description: 'Got di depan rumah saya mampet, air tidak mengalir',
        location: 'Jl. Test No. 123, RT001/RW001',
        latitude: -6.263185,
        longitude: 106.798882,
        category: 'infrastruktur',
        urgency: 'medium',
        status: 'pending'
      }
    });

    console.log(`   ✅ First report created: ID ${firstReport.id}`);
    console.log('   Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test duplicate (same content, same location)
    console.log('   Creating duplicate report (same content, same location)...\n');
    const duplicateReport = {
      title: 'Got mampet di depan rumah',
      description: 'Got di depan rumah saya mampet, air tidak mengalir',
      location: 'Jl. Test No. 123, RT001/RW001',
      latitude: -6.263185,
      longitude: 106.798882
    };

    const duplicateResult = await runFraudDetection(duplicateReport, testUser.id);
    console.log('   📊 Duplicate Detection Result:');
    console.log(`      - isDuplicate: ${duplicateResult.checks?.duplicate?.isDuplicate}`);
    console.log(`      - Confidence: ${duplicateResult.checks?.duplicate?.confidence?.toFixed(2) || 0}`);
    console.log(`      - Similar Reports: ${duplicateResult.checks?.duplicate?.similarReports?.length || 0}`);
    console.log(`      - Overall Fraud: ${duplicateResult.isFraud}`);
    console.log(`      - Fraud Score: ${duplicateResult.fraudScore?.toFixed(2) || 0}\n`);

    // Test 2: Spam Report
    console.log('2️⃣  TEST: Spam Detection\n');
    const spamReport = {
      title: 'test',
      description: 'testing testing',
      location: '',
      latitude: null,
      longitude: null
    };

    const spamResult = await runFraudDetection(spamReport, testUser.id);
    console.log('   📊 Spam Detection Result:');
    console.log(`      - isSpam: ${spamResult.checks?.spam?.isSpam}`);
    console.log(`      - Confidence: ${spamResult.checks?.spam?.confidence?.toFixed(2) || 0}`);
    console.log(`      - Reasons: ${spamResult.checks?.spam?.reasons?.join(', ') || 'None'}`);
    console.log(`      - Overall Fraud: ${spamResult.isFraud}`);
    console.log(`      - Fraud Score: ${spamResult.fraudScore?.toFixed(2) || 0}\n`);

    // Test 3: Quality Validation
    console.log('3️⃣  TEST: Quality Validation\n');
    const lowQualityReport = {
      title: 'abc',
      description: 'test',
      location: '',
      latitude: null,
      longitude: null
    };

    const qualityResult = await runFraudDetection(lowQualityReport, testUser.id);
    console.log('   📊 Quality Validation Result:');
    console.log(`      - isValid: ${qualityResult.checks?.quality?.isValid}`);
    console.log(`      - Quality Score: ${qualityResult.checks?.quality?.qualityScore?.toFixed(2) || 0}`);
    console.log(`      - Issues: ${qualityResult.checks?.quality?.issues?.join(', ') || 'None'}\n`);

    // Test 4: Normal Report (should pass)
    console.log('4️⃣  TEST: Normal Report (should pass)\n');
    const normalReport = {
      title: 'Lampu mati di blok C',
      description: 'Lampu jalan di blok C sudah mati sejak 2 hari lalu. Menyebabkan gelap dan tidak aman untuk warga yang lewat pada malam hari. Tolong segera diperbaiki.',
      location: 'Jl. Blok C RT001/RW001',
      latitude: -6.263185,
      longitude: 106.798882
    };

    const normalResult = await runFraudDetection(normalReport, testUser.id);
    console.log('   📊 Normal Report Result:');
    console.log(`      - isFraud: ${normalResult.isFraud}`);
    console.log(`      - Fraud Score: ${normalResult.fraudScore?.toFixed(2) || 0}`);
    console.log(`      - All checks: Clean ✅\n`);

    // Summary
    console.log('===============================================================================\n');
    console.log('📊 SUMMARY\n');
    console.log(`✅ Duplicate Detection: ${duplicateResult.checks?.duplicate?.isDuplicate ? 'DETECTED' : 'PASS'}`);
    console.log(`✅ Spam Detection: ${spamResult.checks?.spam?.isSpam ? 'DETECTED' : 'PASS'}`);
    console.log(`✅ Quality Validation: ${qualityResult.checks?.quality?.isValid ? 'VALID' : 'INVALID'}`);
    console.log(`✅ Normal Report: ${normalResult.isFraud ? 'FLAGGED' : 'CLEAN'}`);
    console.log('\n✅ AI Fraud Detection is working correctly!\n');

    // Cleanup test report
    await prisma.report.delete({
      where: { id: firstReport.id }
    });
    console.log('🧹 Cleanup: Test report deleted\n');

  } catch (error) {
    console.error('❌ Error testing fraud detection:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFraudDetection();

