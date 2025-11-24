const CryptoJS = require('crypto-js');

// Encryption key untuk face descriptor (harus di-set di .env)
const FACE_ENCRYPTION_KEY = process.env.FACE_ENCRYPTION_KEY || 'default-face-encryption-key-change-in-production-min-32-chars';

/**
 * Encrypt face descriptor sebelum disimpan ke database
 * @param {string} faceDescriptor - Face descriptor (JSON string dari face-api.js)
 * @returns {string} Encrypted face descriptor
 */
function encryptFaceDescriptor(faceDescriptor) {
  try {
    if (!faceDescriptor) {
      return null;
    }
    const encrypted = CryptoJS.AES.encrypt(faceDescriptor, FACE_ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('[Face Recognition] Encryption error:', error);
    throw new Error('Failed to encrypt face descriptor');
  }
}

/**
 * Decrypt face descriptor dari database
 * @param {string} encryptedDescriptor - Encrypted face descriptor
 * @returns {string} Decrypted face descriptor
 */
function decryptFaceDescriptor(encryptedDescriptor) {
  try {
    if (!encryptedDescriptor) {
      return null;
    }
    const bytes = CryptoJS.AES.decrypt(encryptedDescriptor, FACE_ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    console.error('[Face Recognition] Decryption error:', error);
    throw new Error('Failed to decrypt face descriptor');
  }
}

/**
 * Calculate Euclidean distance antara dua face descriptors
 * @param {Array<number>} descriptor1 - Face descriptor 1 (array of numbers)
 * @param {Array<number>} descriptor2 - Face descriptor 2 (array of numbers)
 * @returns {number} Euclidean distance (semakin kecil = semakin mirip)
 */
function calculateDistance(descriptor1, descriptor2) {
  if (!descriptor1 || !descriptor2) {
    return Infinity;
  }
  
  if (descriptor1.length !== descriptor2.length) {
    return Infinity;
  }
  
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

/**
 * Compare dua face descriptors dan tentukan apakah match
 * @param {string} storedDescriptorJson - Stored face descriptor (encrypted, di-decrypt dulu)
 * @param {string} newDescriptorJson - New face descriptor untuk compare
 * @param {number} threshold - Threshold untuk match (default: 0.6, semakin kecil = semakin strict)
 * @returns {Object} { isMatch: boolean, distance: number, threshold: number }
 */
function compareFaceDescriptors(storedDescriptorJson, newDescriptorJson, threshold = 0.7) {
  try {
    if (!storedDescriptorJson || !newDescriptorJson) {
      return { isMatch: false, distance: Infinity, threshold };
    }
    
    // Decrypt stored descriptor
    const decryptedStored = decryptFaceDescriptor(storedDescriptorJson);
    const storedDescriptor = JSON.parse(decryptedStored);
    
    // Parse new descriptor
    const newDescriptor = typeof newDescriptorJson === 'string' 
      ? JSON.parse(newDescriptorJson) 
      : newDescriptorJson;
    
    // Calculate distance
    const distance = calculateDistance(storedDescriptor, newDescriptor);
    
    // Check if match (distance < threshold)
    const isMatch = distance < threshold;
    
    return {
      isMatch,
      distance: distance.toFixed(4),
      threshold,
      confidence: isMatch ? ((1 - distance / threshold) * 100).toFixed(2) : '0.00'
    };
  } catch (error) {
    console.error('[Face Recognition] Compare error:', error);
    return { isMatch: false, distance: Infinity, threshold, error: error.message };
  }
}

/**
 * Validate face descriptor format
 * @param {string} descriptorJson - Face descriptor JSON string
 * @returns {boolean} True if valid
 */
function validateFaceDescriptor(descriptorJson) {
  try {
    if (!descriptorJson) {
      return false;
    }
    
    const descriptor = typeof descriptorJson === 'string' 
      ? JSON.parse(descriptorJson) 
      : descriptorJson;
    
    // Face descriptor harus array of numbers dengan panjang 128 (untuk face-api.js)
    if (!Array.isArray(descriptor)) {
      return false;
    }
    
    if (descriptor.length !== 128) {
      return false;
    }
    
    // Semua elemen harus number
    const allNumbers = descriptor.every(val => typeof val === 'number' && !isNaN(val));
    
    return allNumbers;
  } catch (error) {
    return false;
  }
}

module.exports = {
  encryptFaceDescriptor,
  decryptFaceDescriptor,
  compareFaceDescriptors,
  validateFaceDescriptor,
  calculateDistance
};

