#!/usr/bin/env node

/**
 * Script untuk melihat data yang tersimpan di blockchain
 * Contoh konkret bagaimana data ditanam di blockchain
 */

require('dotenv').config();
const { ethers } = require('ethers');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Contract ABI (simplified)
const CONTRACT_ABI = [
  "function logReportEvent(uint256 reportId, string memory status, string memory metaHash) public",
  "function getReportEvents(uint256 reportId) public view returns (tuple(uint256 reportId, string status, address actor, uint256 timestamp, string metaHash)[])",
  "event ReportEventCreated(uint256 indexed reportId, string status, address actor, uint256 timestamp, string metaHash)",
];

async function main() {
  console.log('\n' + '='.repeat(70));
  log('📊 Contoh Data di Blockchain - LaporIn', 'cyan');
  console.log('='.repeat(70) + '\n');

  // Check environment
  if (!process.env.BLOCKCHAIN_RPC_URL || !process.env.CONTRACT_ADDRESS) {
    log('❌ Error: BLOCKCHAIN_RPC_URL atau CONTRACT_ADDRESS tidak di-set', 'red');
    log('💡 Pastikan backend/.env sudah di-configure dengan benar', 'yellow');
    process.exit(1);
  }

  try {
    // Initialize provider and contract
    const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );

    log('✅ Connected to blockchain', 'green');
    log(`   Network: ${await provider.getNetwork().then(n => n.name)}`, 'green');
    log(`   Contract: ${process.env.CONTRACT_ADDRESS}`, 'green');
    console.log('');

    // Get report ID from command line argument
    const reportId = process.argv[2] ? parseInt(process.argv[2]) : null;

    if (reportId) {
      // View specific report
      log(`📋 Viewing Report ID: ${reportId}`, 'blue');
      console.log('');

      try {
        // Method 1: Query events via filter
        log('🔍 Method 1: Query Events via Filter', 'cyan');
        const eventFilter = contract.filters.ReportEventCreated(reportId);
        const events = await contract.queryFilter(eventFilter);

        if (events.length === 0) {
          log(`   ⚠️  No events found for report ID ${reportId}`, 'yellow');
          log('   💡 Report mungkin belum di-log ke blockchain atau ID salah', 'yellow');
        } else {
          log(`   ✅ Found ${events.length} event(s)`, 'green');
          console.log('');

          events.forEach((event, index) => {
            log(`   📝 Event #${index + 1}:`, 'magenta');
            console.log('   ' + '-'.repeat(60));
            log(`      Report ID    : ${event.args.reportId.toString()}`, 'green');
            log(`      Status       : ${event.args.status}`, 'green');
            log(`      Actor        : ${event.args.actor}`, 'green');
            log(`      Timestamp    : ${event.args.timestamp.toString()}`, 'green');
            log(`      Date         : ${new Date(Number(event.args.timestamp) * 1000).toLocaleString('id-ID')}`, 'green');
            log(`      Meta Hash    : ${event.args.metaHash}`, 'green');
            log(`      TX Hash      : ${event.transactionHash}`, 'cyan');
            log(`      Block Number : ${event.blockNumber.toString()}`, 'cyan');
            log(`      🔗 View TX    : https://amoy.polygonscan.com/tx/${event.transactionHash}`, 'cyan');
            console.log('');
          });
        }

        // Method 2: Call contract function
        log('🔍 Method 2: Call Contract Function', 'cyan');
        try {
          const reportEvents = await contract.getReportEvents(reportId);
          
          if (reportEvents.length === 0) {
            log(`   ⚠️  No events returned from contract function`, 'yellow');
          } else {
            log(`   ✅ Found ${reportEvents.length} event(s)`, 'green');
            console.log('');

            reportEvents.forEach((event, index) => {
              log(`   📝 Event #${index + 1}:`, 'magenta');
              console.log('   ' + '-'.repeat(60));
              log(`      Report ID    : ${event.reportId.toString()}`, 'green');
              log(`      Status       : ${event.status}`, 'green');
              log(`      Actor        : ${event.actor}`, 'green');
              log(`      Timestamp    : ${event.timestamp.toString()}`, 'green');
              log(`      Date         : ${new Date(Number(event.timestamp) * 1000).toLocaleString('id-ID')}`, 'green');
              log(`      Meta Hash    : ${event.metaHash}`, 'green');
              console.log('');
            });
          }
        } catch (funcError) {
          log(`   ⚠️  Error calling contract function: ${funcError.message}`, 'yellow');
        }

      } catch (error) {
        log(`❌ Error querying events: ${error.message}`, 'red');
      }

    } else {
      // Show example data structure
      log('📚 Contoh Struktur Data di Blockchain', 'blue');
      console.log('');

      log('1️⃣  Data Input dari User:', 'cyan');
      console.log(JSON.stringify({
        title: "Jalan Rusak di RT 05",
        description: "Jalan di depan rumah Pak Budi berlubang besar...",
        location: "Jl. Merdeka No. 15, RT 05/RW 02..."
      }, null, 2));
      console.log('');

      log('2️⃣  Data yang Tersimpan di Database (PostgreSQL):', 'cyan');
      console.log(JSON.stringify({
        id: 42,
        userId: 1,
        title: "Jalan Rusak di RT 05",
        description: "Jalan di depan rumah Pak Budi berlubang besar...",
        location: "Jl. Merdeka No. 15, RT 05/RW 02...",
        status: "pending",
        blockchainTxHash: "0xabc123def456..."
      }, null, 2));
      console.log('');

      log('3️⃣  Data yang Tersimpan di Blockchain:', 'cyan');
      console.log(JSON.stringify({
        reportId: 42,
        status: "pending",
        actor: "0x8a527b67b88ff61393c19960408eD6d9464027d4",
        timestamp: 1700734200,
        metaHash: "0x9b3c4d5e",
        transactionHash: "0xabc123def456...",
        blockNumber: 29467851
      }, null, 2));
      console.log('');

      log('4️⃣  Perbandingan:', 'cyan');
      console.log('   ✅ Database: Data lengkap (title, description, location)');
      console.log('   ✅ Blockchain: Hanya metadata hash (privacy & cost efficient)');
      console.log('   ✅ Keduanya saling melengkapi!');
      console.log('');

      log('💡 Usage:', 'yellow');
      log('   node scripts/view-blockchain-data.js [reportId]', 'yellow');
      log('   Contoh: node scripts/view-blockchain-data.js 42', 'yellow');
      console.log('');

      // Try to get recent events
      log('🔍 Mencoba melihat recent events...', 'cyan');
      try {
        const recentFilter = contract.filters.ReportEventCreated();
        const recentEvents = await contract.queryFilter(recentFilter, -1000); // Last 1000 blocks
        
        if (recentEvents.length > 0) {
          log(`   ✅ Found ${recentEvents.length} recent event(s)`, 'green');
          console.log('');
          
          // Show last 5 events
          const lastEvents = recentEvents.slice(-5).reverse();
          log('   📋 Last 5 Events:', 'magenta');
          lastEvents.forEach((event, index) => {
            log(`   ${index + 1}. Report ID ${event.args.reportId.toString()} - Status: ${event.args.status}`, 'green');
            log(`      TX: ${event.transactionHash}`, 'cyan');
            log(`      Block: ${event.blockNumber.toString()}`, 'cyan');
            console.log('');
          });

          log('   💡 Untuk melihat detail, jalankan:', 'yellow');
          log(`   node scripts/view-blockchain-data.js ${lastEvents[0].args.reportId.toString()}`, 'yellow');
        } else {
          log('   ⚠️  No recent events found', 'yellow');
          log('   💡 Buat laporan baru untuk melihat data di blockchain', 'yellow');
        }
      } catch (error) {
        log(`   ⚠️  Error: ${error.message}`, 'yellow');
      }
    }

    console.log('');
    log('='.repeat(70), 'cyan');
    log('✅ Done!', 'green');
    console.log('');

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();

