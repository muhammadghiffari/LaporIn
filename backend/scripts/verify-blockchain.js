#!/usr/bin/env node

/**
 * Script untuk verifikasi konfigurasi blockchain
 * Digunakan untuk memastikan semua setup sudah benar sebelum demo/presentasi
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
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkmark(passed) {
  return passed ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
}

async function main() {
  console.log('\n' + '='.repeat(60));
  log('🔍 Blockchain Configuration Verification', 'cyan');
  console.log('='.repeat(60) + '\n');

  let allPassed = true;
  const results = [];

  // 1. Check Environment Variables
  log('1. Environment Variables:', 'blue');
  console.log('   ' + '-'.repeat(50));

  const hasRpc = Boolean(process.env.BLOCKCHAIN_RPC_URL);
  const hasPrivateKey = Boolean(process.env.PRIVATE_KEY);
  const hasContract = Boolean(process.env.CONTRACT_ADDRESS);
  const useMock = process.env.USE_MOCK_BLOCKCHAIN === 'true';

  log(`   ${checkmark(hasRpc)} BLOCKCHAIN_RPC_URL: ${hasRpc ? 'SET' : 'MISSING'}`, hasRpc ? 'green' : 'red');
  if (hasRpc) {
    const rpc = process.env.BLOCKCHAIN_RPC_URL;
    if (rpc.includes('localhost') || rpc.includes('127.0.0.1')) {
      log(`      ⚠️  Warning: Using localhost. For Polygon Amoy, use: https://rpc-amoy.polygon.technology`, 'yellow');
    } else {
      log(`      ${rpc.substring(0, 50)}...`, 'green');
    }
  }

  log(`   ${checkmark(hasPrivateKey)} PRIVATE_KEY: ${hasPrivateKey ? 'SET' : 'MISSING'}`, hasPrivateKey ? 'green' : 'red');
  if (hasPrivateKey) {
    const pk = process.env.PRIVATE_KEY;
    if (pk.startsWith('0x')) {
      log(`      ⚠️  Warning: Private key has 0x prefix! Remove it.`, 'yellow');
      allPassed = false;
    } else if (pk.length < 64) {
      log(`      ⚠️  Warning: Private key too short! Must be 64+ characters.`, 'yellow');
      allPassed = false;
    } else {
      log(`      Length: ${pk.length} characters (OK)`, 'green');
    }
  }

  log(`   ${checkmark(hasContract)} CONTRACT_ADDRESS: ${hasContract ? 'SET' : 'MISSING'}`, hasContract ? 'green' : 'red');
  if (hasContract) {
    log(`      ${process.env.CONTRACT_ADDRESS}`, 'green');
  }

  log(`   ${checkmark(!useMock)} USE_MOCK_BLOCKCHAIN: ${useMock ? 'true (using mock)' : 'false (using real blockchain)'}`, useMock ? 'yellow' : 'green');

  results.push({ name: 'Environment Variables', passed: hasRpc && hasPrivateKey && hasContract && !useMock });
  if (!hasRpc || !hasPrivateKey || !hasContract) allPassed = false;

  console.log('');

  // Skip network tests if using mock
  if (useMock) {
    log('🎭 Mock blockchain mode detected - skipping network tests', 'yellow');
    console.log('');
    log('Summary:', 'blue');
    log(`   ${checkmark(allPassed)} Overall: ${allPassed ? 'READY' : 'NEEDS FIXING'}`, allPassed ? 'green' : 'red');
    console.log('');
    return;
  }

  // 2. Test Network Connection
  log('2. Network Connection:', 'blue');
  console.log('   ' + '-'.repeat(50));

  try {
    const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    const blockNumber = await provider.getBlockNumber();
    log(`   ${checkmark(true)} Connected!`, 'green');
    log(`      Current block: ${blockNumber}`, 'green');
    results.push({ name: 'Network Connection', passed: true });
  } catch (error) {
    log(`   ${checkmark(false)} Connection failed!`, 'red');
    log(`      Error: ${error.message}`, 'red');
    results.push({ name: 'Network Connection', passed: false });
    allPassed = false;
    console.log('');
    log('⚠️  Cannot continue without network connection', 'yellow');
    console.log('');
    return;
  }

  console.log('');

  // 3. Wallet Info
  log('3. Wallet Information:', 'blue');
  console.log('   ' + '-'.repeat(50));

  try {
    const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const address = await wallet.getAddress();
    const balance = await provider.getBalance(address);
    const balanceFormatted = ethers.formatEther(balance);

    log(`   ${checkmark(true)} Wallet address:`, 'green');
    log(`      ${address}`, 'green');
    log(`   ${checkmark(parseFloat(balanceFormatted) > 0)} Balance: ${balanceFormatted} MATIC`, parseFloat(balanceFormatted) > 0 ? 'green' : 'red');

    if (parseFloat(balanceFormatted) === 0) {
      log(`      ⚠️  Warning: Wallet has no MATIC!`, 'yellow');
      log(`      💡 Get testnet MATIC from: https://faucet.polygon.technology/`, 'yellow');
      allPassed = false;
    } else if (parseFloat(balanceFormatted) < 0.01) {
      log(`      ⚠️  Warning: Low balance! May run out soon.`, 'yellow');
    }

    results.push({ name: 'Wallet Balance', passed: parseFloat(balanceFormatted) > 0 });
  } catch (error) {
    log(`   ${checkmark(false)} Wallet error!`, 'red');
    log(`      Error: ${error.message}`, 'red');
    results.push({ name: 'Wallet Information', passed: false });
    allPassed = false;
  }

  console.log('');

  // 4. Contract Verification
  log('4. Contract Verification:', 'blue');
  console.log('   ' + '-'.repeat(50));

  if (!process.env.CONTRACT_ADDRESS) {
    log(`   ${checkmark(false)} Contract address not set!`, 'red');
    log(`      💡 Deploy contract: cd ../blockchain && npm run deploy`, 'yellow');
    results.push({ name: 'Contract Verification', passed: false });
    allPassed = false;
  } else {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
      const code = await provider.getCode(process.env.CONTRACT_ADDRESS);

      if (code && code !== '0x') {
        log(`   ${checkmark(true)} Contract deployed and verified!`, 'green');
        log(`      Address: ${process.env.CONTRACT_ADDRESS}`, 'green');
        
        // Check if it's Polygon Amoy
        const network = await provider.getNetwork();
        if (network.chainId === 80002n) {
          log(`      🔗 View on explorer: https://amoy.polygonscan.com/address/${process.env.CONTRACT_ADDRESS}`, 'cyan');
        }
        
        results.push({ name: 'Contract Verification', passed: true });
      } else {
        log(`   ${checkmark(false)} Contract not found at address!`, 'red');
        log(`      💡 Contract may not be deployed yet`, 'yellow');
        log(`      💡 Deploy: cd ../blockchain && npm run deploy`, 'yellow');
        results.push({ name: 'Contract Verification', passed: false });
        allPassed = false;
      }
    } catch (error) {
      log(`   ${checkmark(false)} Contract verification error!`, 'red');
      log(`      Error: ${error.message}`, 'red');
      results.push({ name: 'Contract Verification', passed: false });
      allPassed = false;
    }
  }

  console.log('');

  // Summary
  log('Summary:', 'blue');
  console.log('   ' + '-'.repeat(50));
  
  results.forEach(result => {
    log(`   ${checkmark(result.passed)} ${result.name}`, result.passed ? 'green' : 'red');
  });

  console.log('');
  log('='.repeat(60), 'cyan');
  
  if (allPassed) {
    log('✅ All checks passed! Blockchain is ready to use!', 'green');
  } else {
    log('❌ Some checks failed. Please fix the issues above.', 'red');
    console.log('');
    log('💡 Quick fixes:', 'yellow');
    if (!hasRpc) log('   - Set BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology', 'yellow');
    if (!hasPrivateKey) log('   - Export private key from MetaMask and set PRIVATE_KEY', 'yellow');
    if (!hasContract) log('   - Deploy contract: cd ../blockchain && npm run deploy', 'yellow');
    if (useMock) log('   - Set USE_MOCK_BLOCKCHAIN=false to use real blockchain', 'yellow');
  }
  
  console.log('='.repeat(60) + '\n');

  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('\n' + colors.red + '❌ Unexpected error:' + colors.reset);
  console.error(error);
  process.exit(1);
});

