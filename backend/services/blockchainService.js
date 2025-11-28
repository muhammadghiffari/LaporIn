const { ethers } = require('ethers');
const CryptoJS = require('crypto-js');
require('dotenv').config();

// DEMO MODE: Gunakan mock blockchain jika USE_MOCK_BLOCKCHAIN=true
// Perfect untuk demo/hackathon tanpa perlu deploy contract!
if (process.env.USE_MOCK_BLOCKCHAIN === 'true') {
  console.log('🎭 [Blockchain] Using MOCK blockchain service (demo mode)');
  console.log('🎭 [Blockchain] No real blockchain needed - perfect for demo!');
  module.exports = require('./blockchainService.mock');
  return; // Exit early, use mock service
}

// Encryption key dari environment variable (atau generate sekali)
const ENCRYPTION_KEY = process.env.BLOCKCHAIN_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

/**
 * Enkripsi data sensitif sebelum di-log ke blockchain
 * Menggunakan AES encryption untuk melindungi data sensitif seperti deskripsi lengkap
 */
function encryptSensitiveData(data) {
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return data; // Fallback: return original data if encryption fails
  }
}

/**
 * Dekripsi data yang di-encrypt (untuk verifikasi/display)
 */
function decryptSensitiveData(encryptedData) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedData; // Fallback: return encrypted data if decryption fails
  }
}

// Contract ABI (simplified)
const CONTRACT_ABI = [
  "function logReportEvent(uint256 reportId, string memory status, string memory metaHash) public",
  "function logBantuanEvent(uint256 bantuanId, string memory jenisBantuan, uint256 nominal, address recipient) public",
  "function logBiometricEvent(uint256 userId, string memory biometricHash, string memory action) public",
  "function getReportEvents(uint256 reportId) public view returns (tuple(uint256 reportId, string status, address actor, uint256 timestamp, string metaHash)[])",
  "event ReportEventCreated(uint256 indexed reportId, string status, address actor, uint256 timestamp, string metaHash)",
  "event BantuanEventCreated(uint256 indexed bantuanId, string jenisBantuan, uint256 nominal, address recipient, uint256 timestamp)",
  "event BiometricEventCreated(uint256 indexed userId, string biometricHash, string action, address actor, uint256 timestamp)"
];

let cached = {
  provider: null,
  wallet: null,
  contract: null,
};

function canUseBlockchain() {
  const hasRpc = Boolean(process.env.BLOCKCHAIN_RPC_URL);
  const hasPrivateKey = Boolean(process.env.PRIVATE_KEY);
  const hasContract = Boolean(process.env.CONTRACT_ADDRESS);
  
  if (!hasRpc || !hasPrivateKey || !hasContract) {
    console.log('[Blockchain] Missing config:', {
      hasRpc,
      hasPrivateKey,
      hasContract
    });
  }
  
  return hasRpc && hasPrivateKey && hasContract;
}

async function initContract() {
  if (!canUseBlockchain()) {
    console.log('[Blockchain] Cannot use blockchain - missing environment variables');
    return null;
  }

  if (cached.contract) {
    return cached.contract;
  }

  try {
    if (!cached.provider) {
      cached.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    }
    if (!cached.wallet) {
      cached.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, cached.provider);
    }
    cached.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      CONTRACT_ABI,
      cached.wallet
    );
    
    // Verify contract is deployed
    try {
      const code = await cached.provider.getCode(process.env.CONTRACT_ADDRESS);
      if (code === '0x') {
        console.error('[Blockchain] Contract not deployed at address:', process.env.CONTRACT_ADDRESS);
        cached = { provider: null, wallet: null, contract: null };
        return null;
      }
      console.log('[Blockchain] Contract initialized successfully at:', process.env.CONTRACT_ADDRESS);
    } catch (verifyError) {
      console.error('[Blockchain] Error verifying contract:', verifyError?.message);
    }
    
    return cached.contract;
  } catch (error) {
    console.error('[Blockchain] Init error:', error?.shortMessage || error?.message || error);
    cached = { provider: null, wallet: null, contract: null };
    return null;
  }
}

/**
 * Log report ke blockchain dengan enkripsi data sensitif
 * @param {number} reportId - ID laporan
 * @param {string} status - Status laporan
 * @param {string} metaHash - Hash metadata (akan di-encrypt jika mengandung data sensitif)
 * @param {object} reportData - Optional: data laporan lengkap untuk enkripsi
 */
async function logReportToBlockchain(reportId, status, metaHash, reportData = null, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 detik
  
  try {
    console.log('[Blockchain] logReportToBlockchain called:', {
      reportId,
      status,
      hasReportData: !!reportData,
      canUseBlockchain: canUseBlockchain(),
      retryCount
    });
    
    const contractInstance = await initContract();
    if (!contractInstance) {
      console.error('[Blockchain] Contract instance is null. Check blockchain configuration:');
      console.error('[Blockchain] - BLOCKCHAIN_RPC_URL:', process.env.BLOCKCHAIN_RPC_URL ? `SET (${process.env.BLOCKCHAIN_RPC_URL.substring(0, 30)}...)` : 'MISSING');
      console.error('[Blockchain] - PRIVATE_KEY:', process.env.PRIVATE_KEY ? 'SET' : 'MISSING');
      console.error('[Blockchain] - CONTRACT_ADDRESS:', process.env.CONTRACT_ADDRESS ? `SET (${process.env.CONTRACT_ADDRESS})` : 'MISSING');
      
      // PENTING: Cek apakah RPC URL adalah localhost (bukan testnet)
      if (process.env.BLOCKCHAIN_RPC_URL && process.env.BLOCKCHAIN_RPC_URL.includes('127.0.0.1') || process.env.BLOCKCHAIN_RPC_URL.includes('localhost')) {
        console.error('[Blockchain] ⚠️  WARNING: RPC URL menggunakan localhost. Untuk Polygon Amoy Testnet, gunakan:');
        console.error('[Blockchain]    https://rpc-amoy.polygon.technology atau');
        console.error('[Blockchain]    https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY');
      }
      
      return null;
    }
    
    let encryptedMetaHash = metaHash;
    if (reportData) {
      const sensitiveData = {
        description: reportData.description,
        location: reportData.location,
        encryptedAt: new Date().toISOString(),
      };
      const encrypted = encryptSensitiveData(JSON.stringify(sensitiveData));
      // Gabungkan hash original dengan encrypted data
      encryptedMetaHash = ethers.id(`${metaHash}:${encrypted}`).substring(0, 10);
      console.log('[Blockchain] Encrypted metadata hash generated');
    }
    
    console.log('[Blockchain] Calling logReportEvent on contract...');
    const tx = await contractInstance.logReportEvent(reportId, status, encryptedMetaHash);
    console.log('[Blockchain] Transaction sent, waiting for confirmation...', tx.hash);
    
    // PERBAIKAN: Wait dengan timeout dan retry mechanism
    // Wait untuk konfirmasi dengan timeout 60 detik
    try {
      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout after 60 seconds')), 60000)
        )
      ]);
      
      // Validasi receipt untuk memastikan transaction benar-benar confirmed
      if (!receipt || !receipt.status) {
        console.error('[Blockchain] Transaction receipt invalid or failed:', receipt);
        throw new Error('Transaction failed - receipt status is 0');
      }
      
      console.log('[Blockchain] Transaction confirmed:', {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        status: receipt.status
      });
      
      // Validasi transaction hash format (harus 66 karakter dengan 0x prefix)
      if (!tx.hash || tx.hash.length !== 66 || !tx.hash.startsWith('0x')) {
        console.error('[Blockchain] Invalid transaction hash format:', tx.hash);
        throw new Error('Invalid transaction hash format');
      }
      
      return tx.hash;
    } catch (waitError) {
      console.error('[Blockchain] Error waiting for transaction confirmation:', {
        error: waitError?.message || waitError,
        txHash: tx.hash,
        reportId
      });
      
      // Jika timeout atau error, coba cek status transaction
      try {
        const txReceipt = await cached.provider.getTransactionReceipt(tx.hash);
        if (txReceipt && txReceipt.status === 1) {
          console.log('[Blockchain] Transaction confirmed via receipt check:', tx.hash);
    return tx.hash;
        } else if (txReceipt && txReceipt.status === 0) {
          console.error('[Blockchain] Transaction failed (status 0):', tx.hash);
          throw new Error('Transaction failed on blockchain');
        }
      } catch (receiptError) {
        console.error('[Blockchain] Could not get transaction receipt:', receiptError?.message);
      }
      
      // Jika masih error, throw untuk retry
      throw waitError;
    }
  } catch (error) {
    console.error('[Blockchain] Error in logReportToBlockchain:', {
      error: error?.shortMessage || error?.message || error,
      stack: error?.stack,
      reportId,
      status,
      retryCount
    });
    
    // PERBAIKAN: Retry mechanism jika error dan belum mencapai max retries
    if (retryCount < MAX_RETRIES) {
      const isRetryableError = 
        error?.code === 'NETWORK_ERROR' || 
        error?.message?.includes('timeout') ||
        error?.message?.includes('network') ||
        error?.message?.includes('Transaction timeout') ||
        error?.code === 'TIMEOUT';
      
      if (isRetryableError) {
        console.log(`[Blockchain] Retrying transaction (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1))); // Exponential backoff
        return logReportToBlockchain(reportId, status, metaHash, reportData, retryCount + 1);
      }
    }
    
    // Log lebih detail untuk debugging
    if (error?.code === 'INSUFFICIENT_FUNDS') {
      console.error('[Blockchain] INSUFFICIENT_FUNDS: Wallet tidak memiliki cukup balance untuk gas fee');
    } else if (error?.code === 'NETWORK_ERROR') {
      console.error('[Blockchain] NETWORK_ERROR: Tidak bisa connect ke blockchain network');
    } else if (error?.code === 'CALL_EXCEPTION') {
      console.error('[Blockchain] CALL_EXCEPTION: Contract call failed, mungkin contract address salah atau contract tidak deployed');
    } else if (error?.message?.includes('timeout')) {
      console.error('[Blockchain] TIMEOUT: Transaction confirmation timeout');
    }
    
    return null;
  }
}

async function logBantuanToBlockchain(bantuanId, jenisBantuan, nominal, recipientAddress) {
  try {
    const contractInstance = await initContract();
    if (!contractInstance) {
      return null;
    }
    const tx = await contractInstance.logBantuanEvent(
      bantuanId,
      jenisBantuan,
      ethers.parseEther(nominal.toString()),
      recipientAddress
    );
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error('Blockchain error:', error?.shortMessage || error?.message || error);
    return null;
  }
}

/**
 * Log biometric registration ke blockchain
 * Hanya menyimpan HASH dari biometric (bukan data asli) untuk keamanan
 * @param {number} userId - ID user
 * @param {string} biometricHash - Hash dari face descriptor (untuk audit trail)
 * @param {string} action - 'register' atau 'update'
 */
async function logBiometricToBlockchain(userId, biometricHash, action = 'register', retryCount = 0) {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000; // 2 detik
  
  try {
    console.log('[Blockchain] logBiometricToBlockchain called:', {
      userId,
      action,
      hasHash: !!biometricHash,
      canUseBlockchain: canUseBlockchain(),
      retryCount
    });
    
    const contractInstance = await initContract();
    if (!contractInstance) {
      console.warn('[Blockchain] Cannot log biometric - contract not initialized');
      return null;
    }
    
    // Pastikan biometricHash adalah hash yang valid (bukan data asli)
    // Hash harus berupa string yang aman untuk disimpan di blockchain
    const safeHash = biometricHash || ethers.id(`${userId}-${Date.now()}`).substring(0, 20);
    
    console.log('[Blockchain] Calling logBiometricEvent on contract...');
    const tx = await contractInstance.logBiometricEvent(userId, safeHash, action);
    console.log('[Blockchain] Biometric transaction sent, waiting for confirmation...', tx.hash);
    
    // Wait untuk konfirmasi dengan timeout 60 detik
    try {
      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout after 60 seconds')), 60000)
        )
      ]);
      
      // Validasi receipt
      if (!receipt || !receipt.status) {
        console.error('[Blockchain] Biometric transaction receipt invalid or failed:', receipt);
        throw new Error('Transaction failed - receipt status is 0');
      }
      
      console.log('[Blockchain] Biometric transaction confirmed:', {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        status: receipt.status
      });
      
      // Validasi transaction hash format
      if (!tx.hash || tx.hash.length !== 66 || !tx.hash.startsWith('0x')) {
        console.error('[Blockchain] Invalid biometric transaction hash format:', tx.hash);
        throw new Error('Invalid transaction hash format');
      }
      
      return tx.hash;
    } catch (waitError) {
      console.error('[Blockchain] Error waiting for biometric transaction confirmation:', waitError);
      
      // Retry mechanism
      if (retryCount < MAX_RETRIES) {
        console.log(`[Blockchain] Retrying biometric transaction (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return logBiometricToBlockchain(userId, biometricHash, action, retryCount + 1);
      }
      
      throw waitError;
    }
  } catch (error) {
    console.error('[Blockchain] Error in logBiometricToBlockchain:', {
      error: error?.shortMessage || error?.message || error,
      userId,
      action,
      retryCount
    });
    
    // Retry mechanism untuk error lainnya
    if (retryCount < MAX_RETRIES && (
      error?.message?.includes('timeout') ||
      error?.message?.includes('network') ||
      error?.code === 'NETWORK_ERROR'
    )) {
      console.log(`[Blockchain] Retrying biometric transaction due to network error (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return logBiometricToBlockchain(userId, biometricHash, action, retryCount + 1);
    }
    
    return null;
  }
}

/**
 * Ambil log blockchain events untuk laporan tertentu
 * @param {number} reportId - ID laporan
 */
async function getReportBlockchainLogs(reportId) {
  try {
    const contractInstance = await initContract();
    if (!contractInstance) {
      console.log('[Blockchain] Contract not initialized');
      return [];
    }
    
    console.log(`[Blockchain] Fetching logs for reportId: ${reportId}`);
    
    // Method 1: Coba query events dengan filter berdasarkan reportId
    try {
      const eventFilter = contractInstance.filters.ReportEventCreated(reportId);
      const events = await contractInstance.queryFilter(eventFilter);
      
      console.log(`[Blockchain] Found ${events.length} events via queryFilter`);
      
      if (events.length > 0) {
        // Transform events dari queryFilter
        return events.map((event, index) => ({
          index: index,
          reportId: Number(event.args.reportId),
          status: event.args.status,
          actor: event.args.actor,
          timestamp: Number(event.args.timestamp),
          metaHash: event.args.metaHash,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          date: new Date(Number(event.args.timestamp) * 1000).toISOString(),
        })).sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp ascending
      }
    } catch (queryError) {
      console.error('[Blockchain] QueryFilter error:', queryError?.shortMessage || queryError?.message);
    }
    
    // Method 2: Fallback - coba panggil function getReportEvents dari contract
    try {
      console.log('[Blockchain] Trying getReportEvents function...');
      const events = await contractInstance.getReportEvents(reportId);
      console.log(`[Blockchain] getReportEvents returned ${events?.length || 0} events`);
      
      if (events && events.length > 0) {
        // Transform ke format yang lebih mudah dibaca
        return events.map((event, index) => ({
          index: index,
          reportId: Number(event.reportId),
          status: event.status,
          actor: event.actor,
          timestamp: Number(event.timestamp),
          metaHash: event.metaHash,
          date: new Date(Number(event.timestamp) * 1000).toISOString(),
        })).sort((a, b) => a.timestamp - b.timestamp);
      }
    } catch (functionError) {
      console.error('[Blockchain] getReportEvents function error:', functionError?.shortMessage || functionError?.message);
    }
    
    // Method 3: Query semua events dan filter manual (fallback terakhir)
    try {
      console.log('[Blockchain] Trying to query all events and filter...');
      const allEventsFilter = contractInstance.filters.ReportEventCreated();
      const allEvents = await contractInstance.queryFilter(allEventsFilter);
      
      // Filter berdasarkan reportId
      const filteredEvents = allEvents.filter(event => 
        Number(event.args.reportId) === reportId
      );
      
      console.log(`[Blockchain] Found ${filteredEvents.length} events after filtering`);
      
      if (filteredEvents.length > 0) {
        return filteredEvents.map((event, index) => ({
          index: index,
          reportId: Number(event.args.reportId),
          status: event.args.status,
          actor: event.args.actor,
          timestamp: Number(event.args.timestamp),
          metaHash: event.args.metaHash,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          date: new Date(Number(event.args.timestamp) * 1000).toISOString(),
        })).sort((a, b) => a.timestamp - b.timestamp);
      }
    } catch (fallbackError) {
      console.error('[Blockchain] Fallback query error:', fallbackError?.shortMessage || fallbackError?.message);
    }
    
    console.log(`[Blockchain] No logs found for reportId: ${reportId}`);
    return [];
  } catch (error) {
    console.error('[Blockchain] Error fetching blockchain logs:', error?.shortMessage || error?.message || error);
    console.error('[Blockchain] Error stack:', error?.stack);
    return [];
  }
}

/**
 * Ambil semua blockchain events dari contract (untuk admin)
 */
async function getAllBlockchainLogs(limit = 100) {
  try {
    const contractInstance = await initContract();
    if (!contractInstance) {
      return { reportEvents: [], bantuanEvents: [] };
    }
    
    // Query events dari blockchain menggunakan filter
    // Query ReportEventCreated events (ambil dari block terakhir)
    const reportEventFilter = contractInstance.filters.ReportEventCreated();
    const reportEvents = await contractInstance.queryFilter(reportEventFilter);
    
    // Query BantuanEventCreated events
    const bantuanEventFilter = contractInstance.filters.BantuanEventCreated();
    const bantuanEvents = await contractInstance.queryFilter(bantuanEventFilter);
    
    // Transform events dan sort by timestamp (terbaru dulu)
    const transformedReportEvents = reportEvents
      .map((event, index) => ({
        index: index,
        reportId: Number(event.args.reportId),
        status: event.args.status,
        actor: event.args.actor,
        timestamp: Number(event.args.timestamp),
        metaHash: event.args.metaHash,
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        date: new Date(Number(event.args.timestamp) * 1000).toISOString(),
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    const transformedBantuanEvents = bantuanEvents
      .map((event, index) => ({
        index: index,
        bantuanId: Number(event.args.bantuanId),
        jenisBantuan: event.args.jenisBantuan,
        nominal: ethers.formatEther(event.args.nominal),
        recipient: event.args.recipient,
        timestamp: Number(event.args.timestamp),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        date: new Date(Number(event.args.timestamp) * 1000).toISOString(),
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    return {
      reportEvents: transformedReportEvents,
      bantuanEvents: transformedBantuanEvents,
    };
  } catch (error) {
    console.error('Error fetching all blockchain logs:', error?.shortMessage || error?.message || error);
    return { reportEvents: [], bantuanEvents: [] };
  }
}

module.exports = {
  logReportToBlockchain,
  logBantuanToBlockchain,
  logBiometricToBlockchain,
  encryptSensitiveData,
  decryptSensitiveData,
  getReportBlockchainLogs,
  getAllBlockchainLogs,
  canUseBlockchain,
};

