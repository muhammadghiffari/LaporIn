const { ethers } = require('ethers');
const CryptoJS = require('crypto-js');
require('dotenv').config();

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
  "event ReportEventCreated(uint256 indexed reportId, string status, address actor, uint256 timestamp, string metaHash)"
];

let cached = {
  provider: null,
  wallet: null,
  contract: null,
};

function canUseBlockchain() {
  return Boolean(
    process.env.BLOCKCHAIN_RPC_URL &&
    process.env.PRIVATE_KEY &&
    process.env.CONTRACT_ADDRESS
  );
}

async function initContract() {
  if (!canUseBlockchain()) {
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
    return cached.contract;
  } catch (error) {
    console.error('Blockchain init error:', error?.shortMessage || error?.message || error);
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
async function logReportToBlockchain(reportId, status, metaHash, reportData = null) {
  try {
    const contractInstance = await initContract();
    if (!contractInstance) {
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
    }
    
    const tx = await contractInstance.logReportEvent(reportId, status, encryptedMetaHash);
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error('Blockchain error:', error?.shortMessage || error?.message || error);
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

module.exports = {
  logReportToBlockchain,
  logBantuanToBlockchain,
  encryptSensitiveData,
  decryptSensitiveData,
};

