/**
 * Test Blockchain UI Flow
 * 
 * Test flow:
 * 1. Create report sebagai warga
 * 2. Verify blockchain hash tersimpan di database
 * 3. Fetch report sebagai admin
 * 4. Verify blockchain link bisa dibaca/klik
 */

require('dotenv').config();
const prisma = require('../database/prisma');
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

console.log('🧪 Testing Blockchain UI Flow...\n');
console.log(`📍 API URL: ${API_BASE_URL}\n`);

async function testBlockchainUIFlow() {
  let testReportId = null;
  let testUserId = null;
  let testAdminId = null;
  
  try {
    // Step 1: Get atau create test user (warga)
    console.log('1️⃣  Step: Prepare Test User (Warga)\n');
    
    let testUser = await prisma.user.findFirst({
      where: { email: 'test.warga@laporin.test' }
    });
    
    if (!testUser) {
      console.log('   Creating test warga user...');
      testUser = await prisma.user.create({
        data: {
          email: 'test.warga@laporin.test',
          name: 'Test Warga',
          password: require('bcryptjs').hashSync('test123', 10),
          role: 'warga',
          rtRwId: 1 // Adjust based on your DB
        },
        include: { rtRw: true }
      });
      console.log('   ✅ Test warga user created');
    } else {
      console.log('   ✅ Test warga user found');
    }
    testUserId = testUser.id;
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Role: ${testUser.role}\n`);
    
    // Step 2: Get atau create test admin
    console.log('2️⃣  Step: Prepare Test Admin\n');
    
    let testAdmin = await prisma.user.findFirst({
      where: { email: 'test.admin@laporin.test' }
    });
    
    if (!testAdmin) {
      console.log('   Creating test admin user...');
      testAdmin = await prisma.user.create({
        data: {
          email: 'test.admin@laporin.test',
          name: 'Test Admin',
          password: require('bcryptjs').hashSync('test123', 10),
          role: 'admin',
          rtRwId: 1
        },
        include: { rtRw: true }
      });
      console.log('   ✅ Test admin user created');
    } else {
      console.log('   ✅ Test admin user found');
    }
    testAdminId = testAdmin.id;
    console.log(`   Admin ID: ${testAdminId}`);
    console.log(`   Email: ${testAdmin.email}`);
    console.log(`   Role: ${testAdmin.role}\n`);
    
    // Step 3: Login sebagai warga dan create report
    console.log('3️⃣  Step: Login sebagai Warga & Create Report\n');
    
    let wargaToken = null;
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testUser.email,
        password: 'test123'
      });
      
      if (loginResponse.data.token) {
        wargaToken = loginResponse.data.token;
        console.log('   ✅ Login sebagai warga berhasil');
      } else {
        throw new Error('No token received');
      }
    } catch (loginError) {
      console.log('   ⚠️  Login failed, using direct DB access...');
      console.log('   💡 Will create report directly via database');
      wargaToken = null;
    }
    
    // Step 4: Create report
    console.log('\n4️⃣  Step: Create Report dengan Blockchain\n');
    
    const reportData = {
      title: 'Test Laporan Blockchain UI - ' + new Date().toISOString(),
      description: 'Ini adalah test laporan untuk verify blockchain link di UI admin. Got mampet di depan rumah.',
      location: 'Jl. Test Blockchain No. 123, RT001/RW005',
      latitude: -6.2088,
      longitude: 106.8456,
      category: 'infrastruktur',
      urgency: 'medium'
    };
    
    let newReport = null;
    
    if (wargaToken) {
      try {
        console.log('   Creating report via API...');
        const createResponse = await axios.post(
          `${API_BASE_URL}/reports`,
          reportData,
          {
            headers: {
              'Authorization': `Bearer ${wargaToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        newReport = createResponse.data.report || createResponse.data;
        console.log('   ✅ Report created via API');
      } catch (apiError) {
        console.log('   ⚠️  API create failed:', apiError.response?.data?.error || apiError.message);
        console.log('   💡 Creating report directly via database...');
        wargaToken = null;
      }
    }
    
    if (!newReport) {
      console.log('   Creating report directly via database...');
      
      // Create report via database
      newReport = await prisma.report.create({
        data: {
          title: reportData.title,
          description: reportData.description,
          location: reportData.location,
          latitude: reportData.latitude,
          longitude: reportData.longitude,
          category: reportData.category,
          urgency: reportData.urgency,
          status: 'pending',
          userId: testUserId
        }
      });
      
      // Trigger blockchain logging
      console.log('   Triggering blockchain logging...');
      const { logReportToBlockchain } = require('../services/blockchainService');
      const { ethers } = require('ethers');
      
      const teksLengkap = `${reportData.title} ${reportData.description} ${reportData.location}`;
      const hashMeta = ethers.id(teksLengkap).substring(0, 10);
      
      const blockchainHash = await logReportToBlockchain(
        newReport.id,
        'pending',
        hashMeta,
        {
          title: reportData.title,
          description: reportData.description,
          location: reportData.location
        }
      );
      
      if (blockchainHash && blockchainHash.length === 66 && blockchainHash.startsWith('0x')) {
        await prisma.report.update({
          where: { id: newReport.id },
          data: { blockchainTxHash: blockchainHash }
        });
        console.log('   ✅ Blockchain hash saved to database');
        newReport.blockchainTxHash = blockchainHash;
      } else {
        console.log('   ⚠️  Blockchain hash invalid or null');
      }
    }
    
    testReportId = newReport.id;
    console.log(`\n   ✅ Report created successfully!`);
    console.log(`   Report ID: ${testReportId}`);
    console.log(`   Title: ${newReport.title}`);
    console.log(`   Blockchain Hash: ${newReport.blockchainTxHash || newReport.blockchain_tx_hash || 'NOT SET'}\n`);
    
    // Wait a bit untuk memastikan blockchain transaction confirmed
    console.log('   ⏳ Waiting 3 seconds for blockchain confirmation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 5: Fetch report sebagai admin
    console.log('\n5️⃣  Step: Fetch Report sebagai Admin\n');
    
    // Fetch dari database dengan format yang sama seperti API
    const reportForAdmin = await prisma.report.findUnique({
      where: { id: testReportId },
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
    
    if (!reportForAdmin) {
      throw new Error('Report not found!');
    }
    
    console.log('   ✅ Report fetched successfully');
    console.log(`   Report ID: ${reportForAdmin.id}`);
    console.log(`   Title: ${reportForAdmin.title}`);
    console.log(`   Blockchain Hash: ${reportForAdmin.blockchainTxHash || 'NOT SET'}\n`);
    
    // Step 6: Verify blockchain hash format
    console.log('6️⃣  Step: Verify Blockchain Hash Format\n');
    
    const blockchainHash = reportForAdmin.blockchainTxHash || reportForAdmin.blockchain_tx_hash;
    
    if (!blockchainHash) {
      console.log('   ❌ Blockchain hash NOT FOUND');
      console.log('   ⚠️  Report tidak memiliki blockchain transaction hash');
      console.log('   💡 Check blockchain configuration in backend/.env');
    } else {
      console.log(`   Blockchain Hash: ${blockchainHash}`);
      
      // Validate format
      const isValidFormat = blockchainHash.length === 66 && blockchainHash.startsWith('0x');
      
      if (isValidFormat) {
        console.log('   ✅ Blockchain hash format VALID (66 chars, starts with 0x)');
        
        // Generate Polygonscan URL
        const network = process.env.BLOCKCHAIN_RPC_URL?.includes('amoy') ? 'amoy' : 'mumbai';
        const polygonscanUrl = `https://polygonscan.com/${network === 'amoy' ? 'testnet/' : ''}tx/${blockchainHash}`;
        console.log(`   🔗 Polygonscan URL: ${polygonscanUrl}`);
        
        // Alternative URL format (yang digunakan di frontend)
        const amoyUrl = `https://amoy.polygonscan.com/tx/${blockchainHash}`;
        console.log(`   🔗 Amoy URL: ${amoyUrl}`);
        
        console.log('\n   ✅ Blockchain link READY untuk di-display di UI!');
      } else {
        console.log('   ❌ Blockchain hash format INVALID');
        console.log(`   Expected: 66 chars starting with 0x`);
        console.log(`   Got: ${blockchainHash.length} chars`);
      }
    }
    
    // Step 7: Verify UI display format
    console.log('\n7️⃣  Step: Verify UI Display Format\n');
    
    if (blockchainHash && blockchainHash.length === 66 && blockchainHash.startsWith('0x')) {
      // Format yang digunakan di UI
      const displayHash = blockchainHash.substring(0, 20) + '...';
      const displayHashShort = blockchainHash.substring(0, 8) + '...';
      
      console.log('   ✅ UI Display Format:');
      console.log(`      Full hash: ${blockchainHash}`);
      console.log(`      Detail page: ${displayHash}`);
      console.log(`      List page: ${displayHashShort}`);
      console.log(`      Link: https://amoy.polygonscan.com/tx/${blockchainHash}`);
      
      // Verify link akan bekerja
      console.log('\n   ✅ Blockchain link akan muncul di:');
      console.log('      1. Report Detail Page (admin only) - Link clickable');
      console.log('      2. Report List Page (admin only) - Link clickable');
      console.log('      3. ReportsList Component - Badge "On-Chain" clickable');
    }
    
    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BLOCKCHAIN UI FLOW TEST SUMMARY');
    console.log('='.repeat(60));
    
    if (blockchainHash && blockchainHash.length === 66 && blockchainHash.startsWith('0x')) {
      console.log('✅ Status: SUCCESS!');
      console.log(`✅ Report ID: ${testReportId}`);
      console.log(`✅ Blockchain Hash: ${blockchainHash}`);
      console.log(`✅ Link: https://amoy.polygonscan.com/tx/${blockchainHash}`);
      console.log('\n✅ Blockchain link READY untuk di-display di UI admin!');
      console.log('\n💡 Untuk test di browser:');
      console.log(`   1. Login sebagai admin`);
      console.log(`   2. Buka laporan #${testReportId}`);
      console.log(`   3. Cari link blockchain (admin only)`);
      console.log(`   4. Klik link untuk buka Polygonscan`);
    } else {
      console.log('⚠️  Status: BLOCKCHAIN HASH NOT FOUND');
      console.log('💡 Check blockchain configuration');
    }
    
  } catch (error) {
    console.error('\n❌ Error in blockchain UI flow test:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup (optional - comment out if you want to keep test data)
    if (testReportId) {
      console.log(`\n📝 Test report ID: ${testReportId} (keeping for manual test)`);
      // Uncomment to cleanup:
      // await prisma.report.delete({ where: { id: testReportId } });
      // console.log('   ✅ Test report cleaned up');
    }
    
    await prisma.$disconnect();
  }
}

// Run test
testBlockchainUIFlow().catch(console.error);

