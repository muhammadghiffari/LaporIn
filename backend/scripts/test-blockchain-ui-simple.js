/**
 * Test Blockchain UI Flow - Simple Version
 * 
 * Test flow:
 * 1. Create report langsung via database
 * 2. Trigger blockchain logging
 * 3. Verify blockchain hash format
 * 4. Check apakah hash bisa dibaca di UI
 */

require('dotenv').config();
const prisma = require('../database/prisma');
const { logReportToBlockchain } = require('../services/blockchainService');
const { ethers } = require('ethers');

console.log('🧪 Testing Blockchain UI Flow (Simple)...\n');

async function testBlockchainUI() {
  let testReportId = null;
  
  try {
    // Step 1: Get first user sebagai warga
    console.log('1️⃣  Step: Get Test User\n');
    
    const testUser = await prisma.user.findFirst({
      where: { role: 'warga' }
    });
    
    if (!testUser) {
      console.log('   ❌ No warga user found in database');
      console.log('   💡 Please create a warga user first');
      return;
    }
    
    console.log(`   ✅ Using user: ${testUser.name} (${testUser.email})`);
    console.log(`   User ID: ${testUser.id}\n`);
    
    // Step 2: Create report
    console.log('2️⃣  Step: Create Report\n');
    
    const reportData = {
      title: 'Test Laporan Blockchain UI - ' + new Date().toISOString(),
      description: 'Ini adalah test laporan untuk verify blockchain link di UI admin. Got mampet di depan rumah, perlu segera diperbaiki.',
      location: 'Jl. Test Blockchain No. 123, RT001/RW005',
      category: 'infrastruktur',
      urgency: 'medium',
      status: 'pending'
    };
    
    console.log(`   Creating report: "${reportData.title}"`);
    
    const newReport = await prisma.report.create({
      data: {
        title: reportData.title,
        description: reportData.description,
        location: reportData.location,
        category: reportData.category,
        urgency: reportData.urgency,
        status: reportData.status,
        userId: testUser.id
      }
    });
    
    testReportId = newReport.id;
    console.log(`   ✅ Report created! ID: ${testReportId}\n`);
    
    // Step 3: Trigger blockchain logging
    console.log('3️⃣  Step: Trigger Blockchain Logging\n');
    
    const teksLengkap = `${reportData.title} ${reportData.description} ${reportData.location}`;
    const hashMeta = ethers.id(teksLengkap).substring(0, 10);
    
    console.log('   Generating meta hash...');
    console.log(`   Meta hash: ${hashMeta}`);
    
    console.log('   Calling logReportToBlockchain()...');
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
      console.log(`   ✅ Blockchain hash saved!`);
      console.log(`   Hash: ${blockchainHash}\n`);
    } else {
      console.log('   ⚠️  Blockchain hash invalid or null');
      console.log(`   Hash received: ${blockchainHash || 'null'}\n`);
    }
    
    // Wait a bit untuk memastikan blockchain transaction confirmed
    console.log('   ⏳ Waiting 3 seconds for blockchain confirmation...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Fetch report and verify
    console.log('4️⃣  Step: Verify Blockchain Hash\n');
    
    const reportWithHash = await prisma.report.findUnique({
      where: { id: testReportId },
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
    
    if (!reportWithHash) {
      throw new Error('Report not found!');
    }
    
    const storedHash = reportWithHash.blockchainTxHash;
    
    console.log(`   Report ID: ${reportWithHash.id}`);
    console.log(`   Title: ${reportWithHash.title}`);
    console.log(`   Blockchain Hash: ${storedHash || 'NOT SET'}\n`);
    
    // Step 5: Verify format and generate UI links
    console.log('5️⃣  Step: Generate UI Links\n');
    
    if (!storedHash) {
      console.log('   ❌ Blockchain hash NOT FOUND in database');
      console.log('   ⚠️  Report tidak memiliki blockchain transaction hash');
      console.log('   💡 Check blockchain configuration in backend/.env\n');
    } else {
      // Validate format
      const isValidFormat = storedHash.length === 66 && storedHash.startsWith('0x');
      
      if (isValidFormat) {
        console.log('   ✅ Blockchain hash format VALID');
        console.log(`   ✅ Length: ${storedHash.length} chars (correct!)`);
        console.log(`   ✅ Starts with: ${storedHash.substring(0, 2)} (correct!)\n`);
        
        // Generate Polygonscan URL
        const network = process.env.BLOCKCHAIN_RPC_URL?.includes('amoy') ? 'amoy' : 'mumbai';
        const polygonscanUrl = `https://polygonscan.com/${network === 'amoy' ? 'testnet/' : ''}tx/${storedHash}`;
        const amoyUrl = `https://amoy.polygonscan.com/tx/${storedHash}`;
        
        console.log('   🔗 Blockchain Links:');
        console.log(`      Polygonscan: ${polygonscanUrl}`);
        console.log(`      Amoy: ${amoyUrl}\n`);
        
        // UI Display formats
        const displayHash = storedHash.substring(0, 20) + '...';
        const displayHashShort = storedHash.substring(0, 8) + '...';
        
        console.log('   📱 UI Display Formats:');
        console.log(`      Full hash: ${storedHash}`);
        console.log(`      Detail page: ${displayHash}`);
        console.log(`      List page: ${displayHashShort}\n`);
        
        console.log('   ✅ Blockchain link READY untuk di-display di UI!\n');
      } else {
        console.log('   ❌ Blockchain hash format INVALID');
        console.log(`   Expected: 66 chars starting with 0x`);
        console.log(`   Got: ${storedHash.length} chars\n`);
      }
    }
    
    // Step 6: Check UI display locations
    console.log('6️⃣  Step: UI Display Locations\n');
    
    if (storedHash && storedHash.length === 66 && storedHash.startsWith('0x')) {
      console.log('   ✅ Blockchain link akan muncul di:');
      console.log('      1. Report Detail Page (`/reports/${testReportId}`) - Admin only');
      console.log('         - Link clickable ke Polygonscan');
      console.log('         - Format: First 20 chars + "..."');
      console.log('');
      console.log('      2. Report List Page (`/laporan`) - Admin only');
      console.log('         - Link clickable ke Polygonscan');
      console.log('         - Format: First 8 chars + "..."');
      console.log('');
      console.log('      3. ReportsList Component - All users');
      console.log('         - Badge "On-Chain" clickable');
      console.log('         - Badge akan muncul jika ada blockchain_tx_hash\n');
    }
    
    // Final Summary
    console.log('='.repeat(60));
    console.log('📊 BLOCKCHAIN UI FLOW TEST SUMMARY');
    console.log('='.repeat(60));
    
    if (storedHash && storedHash.length === 66 && storedHash.startsWith('0x')) {
      console.log('✅ Status: SUCCESS!');
      console.log(`✅ Report ID: ${testReportId}`);
      console.log(`✅ Blockchain Hash: ${storedHash}`);
      console.log(`✅ Link: https://amoy.polygonscan.com/tx/${storedHash}`);
      console.log('\n✅ Blockchain link READY untuk di-display di UI admin!');
      console.log('\n💡 Untuk test di browser:');
      console.log(`   1. Login sebagai admin di web app`);
      console.log(`   2. Buka laporan #${testReportId}`);
      console.log(`   3. Cari link blockchain (admin only section)`);
      console.log(`   4. Klik link untuk buka Polygonscan`);
      console.log(`   5. Atau buka halaman /laporan dan lihat kolom Blockchain`);
    } else {
      console.log('⚠️  Status: BLOCKCHAIN HASH NOT FOUND or INVALID');
      console.log('💡 Check blockchain configuration in backend/.env');
      console.log('💡 Verify:');
      console.log('   - BLOCKCHAIN_RPC_URL is set correctly');
      console.log('   - PRIVATE_KEY is set correctly');
      console.log('   - CONTRACT_ADDRESS is set correctly');
      console.log('   - Wallet has balance for gas');
    }
    
    console.log('\n📝 Test Report ID:', testReportId);
    console.log('   (Keeping for manual UI test)');
    
  } catch (error) {
    console.error('\n❌ Error in blockchain UI flow test:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
testBlockchainUI().catch(console.error);

