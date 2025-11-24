/**
 * 🎭 MOCK BLOCKCHAIN SERVICE - Untuk Demo/Hackathon
 * 
 * Service ini mensimulasikan blockchain tanpa perlu:
 * - Deploy contract ke testnet
 * - Setup RPC URL
 * - Private key wallet
 * - Gas fee
 * 
 * Perfect untuk demo app yang tidak perlu blockchain real!
 * 
 * CARA MENGGUNAKAN:
 * 1. Tambahkan di backend/.env:
 *    USE_MOCK_BLOCKCHAIN=true
 * 
 * 2. Restart backend server
 * 
 * 3. Blockchain akan bekerja seperti biasa, tapi menggunakan simulasi!
 */

const CryptoJS = require('crypto-js');

// Encryption key untuk demo
const ENCRYPTION_KEY = process.env.BLOCKCHAIN_ENCRYPTION_KEY || 'demo-encryption-key-for-hackathon';

// Simulasi storage untuk "blockchain" data (in-memory)
const mockBlockchainStorage = {
  reports: new Map(),
  transactions: new Map(),
  blockNumber: 0
};

/**
 * Generate mock transaction hash (format seperti real blockchain)
 */
function generateMockTxHash() {
  const randomHex = Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `0x${randomHex}`;
}

/**
 * Enkripsi data sensitif (sama seperti real service)
 */
function encryptSensitiveData(data) {
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return data;
  }
}

/**
 * Dekripsi data (sama seperti real service)
 */
function decryptSensitiveData(encryptedData) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedData;
  }
}

/**
 * Mock: Log report ke "blockchain" (simulasi)
 */
async function logReportToBlockchain(reportId, status, metaHash, reportData = null) {
  try {
    console.log('[Mock Blockchain] 📝 Logging report to mock blockchain:', {
      reportId,
      status,
      hasReportData: !!reportData
    });

    // Simulasi delay network (seperti real blockchain)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate mock transaction hash
    const txHash = generateMockTxHash();
    mockBlockchainStorage.blockNumber++;

    // Simulasi encrypted metadata
    let encryptedMetaHash = metaHash;
    if (reportData) {
      const sensitiveData = {
        description: reportData.description,
        location: reportData.location,
        encryptedAt: new Date().toISOString(),
      };
      const encrypted = encryptSensitiveData(JSON.stringify(sensitiveData));
      encryptedMetaHash = `${metaHash}:${encrypted.substring(0, 10)}`;
    }

    // Simpan ke "blockchain" storage
    const event = {
      reportId: Number(reportId),
      status,
      actor: '0x' + Array.from({ length: 40 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join(''), // Mock address
      timestamp: Math.floor(Date.now() / 1000),
      metaHash: encryptedMetaHash,
      txHash,
      blockNumber: mockBlockchainStorage.blockNumber,
      date: new Date().toISOString()
    };

    // Store event
    if (!mockBlockchainStorage.reports.has(reportId)) {
      mockBlockchainStorage.reports.set(reportId, []);
    }
    mockBlockchainStorage.reports.get(reportId).push(event);
    mockBlockchainStorage.transactions.set(txHash, event);

    console.log('[Mock Blockchain] ✅ Transaction "confirmed":', {
      txHash,
      blockNumber: mockBlockchainStorage.blockNumber,
      reportId
    });

    return txHash;
  } catch (error) {
    console.error('[Mock Blockchain] Error:', error);
    return null;
  }
}

/**
 * Mock: Log bantuan ke "blockchain"
 */
async function logBantuanToBlockchain(bantuanId, jenisBantuan, nominal, recipientAddress) {
  try {
    console.log('[Mock Blockchain] 📝 Logging bantuan to mock blockchain:', {
      bantuanId,
      jenisBantuan,
      nominal
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    const txHash = generateMockTxHash();
    mockBlockchainStorage.blockNumber++;

    console.log('[Mock Blockchain] ✅ Bantuan transaction "confirmed":', txHash);
    return txHash;
  } catch (error) {
    console.error('[Mock Blockchain] Error:', error);
    return null;
  }
}

/**
 * Mock: Ambil log blockchain events untuk laporan
 */
async function getReportBlockchainLogs(reportId) {
  try {
    console.log('[Mock Blockchain] 📖 Fetching logs for reportId:', reportId);

    const events = mockBlockchainStorage.reports.get(Number(reportId)) || [];
    
    console.log(`[Mock Blockchain] Found ${events.length} events`);

    return events.map((event, index) => ({
      index,
      reportId: event.reportId,
      status: event.status,
      actor: event.actor,
      timestamp: event.timestamp,
      metaHash: event.metaHash,
      txHash: event.txHash,
      blockNumber: event.blockNumber,
      date: event.date
    })).sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('[Mock Blockchain] Error fetching logs:', error);
    return [];
  }
}

/**
 * Mock: Ambil semua blockchain events
 */
async function getAllBlockchainLogs(limit = 100) {
  try {
    const allReportEvents = [];
    for (const [reportId, events] of mockBlockchainStorage.reports.entries()) {
      allReportEvents.push(...events);
    }

    return {
      reportEvents: allReportEvents
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit)
        .map((event, index) => ({
          index,
          reportId: event.reportId,
          status: event.status,
          actor: event.actor,
          timestamp: event.timestamp,
          metaHash: event.metaHash,
          txHash: event.txHash,
          blockNumber: event.blockNumber,
          date: event.date
        })),
      bantuanEvents: [] // Mock tidak support bantuan events untuk sekarang
    };
  } catch (error) {
    console.error('[Mock Blockchain] Error fetching all logs:', error);
    return { reportEvents: [], bantuanEvents: [] };
  }
}

/**
 * Check apakah blockchain bisa digunakan (selalu true untuk mock)
 */
function canUseBlockchain() {
  return true; // Mock selalu available
}

module.exports = {
  logReportToBlockchain,
  logBantuanToBlockchain,
  encryptSensitiveData,
  decryptSensitiveData,
  getReportBlockchainLogs,
  getAllBlockchainLogs,
  canUseBlockchain,
};

