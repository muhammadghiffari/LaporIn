const faceapi = require('face-api.js');
const { Canvas, Image, ImageData } = require('canvas');
const fs = require('fs').promises;
const path = require('path');

// Setup face-api.js dengan canvas untuk Node.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Note: face-api.js uses TensorFlow.js v1.7.0 internally
// We don't install @tensorflow/tfjs-node separately to avoid version conflicts
// face-api.js will use its own bundled TensorFlow.js version

let modelsLoaded = false;
const MODEL_PATH = path.join(__dirname, '../../public/models'); // Path ke models folder

/**
 * Load face-api.js models (hanya sekali saat startup)
 */
async function loadModels() {
  if (modelsLoaded) {
    return true;
  }

  try {
    console.log('[Face Extraction] Loading face-api.js models...');
    
    // Cek apakah models folder ada
    try {
      await fs.access(MODEL_PATH);
    } catch {
      console.error('[Face Extraction] Models folder not found!');
      console.error('[Face Extraction] Please run: npm run download:face-models');
      throw new Error('Model pengenalan wajah belum tersedia. Silakan hubungi administrator untuk mengunduh model terlebih dahulu.');
    }

    // Untuk Node.js, gunakan path absolut langsung
    // face-api.js akan menggunakan fs untuk load dari disk
    const absoluteModelPath = path.resolve(MODEL_PATH);
    
    // Load models dengan path absolut
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromDisk(absoluteModelPath),
      faceapi.nets.faceLandmark68Net.loadFromDisk(absoluteModelPath),
      faceapi.nets.faceRecognitionNet.loadFromDisk(absoluteModelPath)
    ]);

    modelsLoaded = true;
    console.log('[Face Extraction] Models loaded successfully');
    return true;
  } catch (error) {
    console.error('[Face Extraction] Error loading models:', error);
    throw new Error('Failed to load face recognition models: ' + error.message);
  }
}

/**
 * Extract face descriptor dari image buffer atau base64
 * @param {Buffer|string} imageData - Image buffer atau base64 string
 * @param {boolean} isBase64 - True jika imageData adalah base64 string
 * @returns {Promise<Array<number>>} Face descriptor (128 dimensions)
 */
async function extractFaceDescriptor(imageData, isBase64 = false) {
  try {
    // Ensure models loaded
    if (!modelsLoaded) {
      await loadModels();
    }

    let image;
    
    if (isBase64) {
      // Validate and clean base64 string
      if (typeof imageData !== 'string') {
        throw new Error('Invalid image data: expected base64 string');
      }
      
      // Remove data URL prefix if exists
      let base64Data = imageData;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      } else if (base64Data.startsWith('data:image/')) {
        base64Data = base64Data.replace(/^data:image\/\w+;base64,/, '');
      }
      
      // Validate base64 string
      if (!base64Data || base64Data.trim().length === 0) {
        throw new Error('Invalid base64 data: empty or invalid format');
      }
      
      // Decode base64 to buffer
      let buffer;
      try {
        buffer = Buffer.from(base64Data, 'base64');
      } catch (bufferError) {
        const errorMsg = bufferError?.message || bufferError?.toString() || 'Unknown error';
        console.error('[Face Extraction] Base64 decode error:', {
          error: errorMsg,
          base64Length: base64Data?.length,
          base64Preview: base64Data?.substring(0, 50)
        });
        throw new Error('Failed to decode base64 image data: ' + errorMsg);
      }
      
      // Validate buffer
      if (!buffer || buffer.length === 0) {
        console.error('[Face Extraction] Invalid buffer:', {
          bufferExists: !!buffer,
          bufferLength: buffer?.length,
          base64Length: base64Data?.length
        });
        throw new Error('Invalid image buffer: empty or corrupted. Buffer length: ' + (buffer?.length || 0));
      }
      
      // Log buffer info for debugging
      console.log('[Face Extraction] Buffer created successfully:', {
        bufferLength: buffer.length,
        firstBytes: Array.from(buffer.slice(0, 10))
      });
      
      // Convert buffer to canvas (most compatible with face-api.js and TensorFlow)
      // This avoids TensorFlow compatibility issues
      try {
        // Load image first
        const img = new Image();
        img.src = buffer;
        
        // Wait for image to load
        await new Promise((resolve, reject) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = (err) => {
              console.error('[Face Extraction] Image load error:', err);
              reject(new Error('Failed to load image from buffer: ' + (err?.message || 'Unknown error')));
            };
            // Timeout after 5 seconds
            setTimeout(() => {
              reject(new Error('Image load timeout'));
            }, 5000);
          }
        });
        
        if (!img || !img.width || !img.height) {
          throw new Error('Invalid image object: missing width or height');
        }
        
        // Use Image directly for face detection (after monkeyPatch, face-api.js can work with Image)
        // This avoids TensorFlow compatibility issues with canvas
        image = img;
        
        console.log('[Face Extraction] Image loaded successfully:', {
          width: img.width,
          height: img.height
        });
      } catch (imageError) {
        const errorMsg = imageError?.message || imageError?.toString() || 'Unknown error';
        console.error('[Face Extraction] Image conversion error:', {
          error: errorMsg,
          errorStack: imageError?.stack,
          bufferLength: buffer?.length,
          bufferType: typeof buffer,
          isBuffer: Buffer.isBuffer(buffer),
          firstBytes: Array.from(buffer.slice(0, 20))
        });
        throw new Error('Failed to convert buffer to image: ' + errorMsg);
      }
    } else {
      // imageData is Buffer
      if (!Buffer.isBuffer(imageData)) {
        throw new Error('Invalid image data: expected Buffer for non-base64 input');
      }
      
      if (imageData.length === 0) {
        throw new Error('Invalid image buffer: empty');
      }
      
      try {
        // Load image first
        const img = new Image();
        img.src = imageData;
        
        // Wait for image to load
        await new Promise((resolve, reject) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = (err) => {
              console.error('[Face Extraction] Image load error (non-base64):', err);
              reject(new Error('Failed to load image from buffer: ' + (err?.message || 'Unknown error')));
            };
            // Timeout after 5 seconds
            setTimeout(() => {
              reject(new Error('Image load timeout'));
            }, 5000);
          }
        });
        
        if (!img || !img.width || !img.height) {
          throw new Error('Invalid image object: missing width or height');
        }
        
        // Use Image directly for face detection (after monkeyPatch, face-api.js can work with Image)
        // This avoids TensorFlow compatibility issues with canvas
        image = img;
      } catch (imageError) {
        const errorMsg = imageError?.message || imageError?.toString() || 'Unknown error';
        console.error('[Face Extraction] Image conversion error (non-base64):', {
          error: errorMsg,
          errorStack: imageError?.stack,
          bufferLength: imageData?.length,
          bufferType: typeof imageData,
          isBuffer: Buffer.isBuffer(imageData)
        });
        throw new Error('Failed to convert buffer to image: ' + errorMsg);
      }
    }
    
    // Validate image object
    if (!image) {
      throw new Error('Failed to create image object from provided data');
    }

    // Detect face dengan landmarks
    // Always use canvas for better TensorFlow compatibility
    // Create canvas from image to ensure proper format
    let canvasForDetection;
    
    if (image && image.width && image.height) {
      // Create canvas and draw image
      canvasForDetection = new Canvas(image.width, image.height);
      const ctx = canvasForDetection.getContext('2d');
      ctx.drawImage(image, 0, 0);
    } else {
      throw new Error('Invalid image object: missing width or height');
    }
    
    // Use canvas for face detection (most compatible with TensorFlow)
    // Note: There's a known compatibility issue with TensorFlow.js v4.x
    // If error occurs, it will be caught and handled gracefully
    let detections;
    try {
      detections = await faceapi
        .detectAllFaces(canvasForDetection, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();
    } catch (tfError) {
      // Check if it's the known TensorFlow compatibility error
      const errorMsg = tfError?.message || tfError?.toString() || '';
      const errorStack = tfError?.stack || '';
      
      if (errorMsg.includes('isNullOrUndefined') || errorMsg.includes('util_1') || errorStack.includes('isNullOrUndefined')) {
        console.error('[Face Extraction] TensorFlow.js compatibility error detected:', {
          error: errorMsg,
          stack: errorStack.substring(0, 500)
        });
        
        // Provide user-friendly error message
        throw new Error('Sistem pengenalan wajah sedang mengalami masalah teknis. Silakan coba lagi nanti atau gunakan versi web untuk mendaftarkan wajah. Error: Kompatibilitas TensorFlow.');
      }
      
      // Log other errors for debugging
      console.error('[Face Extraction] Face detection error:', {
        error: errorMsg,
        stack: errorStack.substring(0, 500)
      });
      
      // Re-throw other errors (face detection errors, not TensorFlow errors)
      throw tfError;
    }

    if (detections.length === 0) {
      throw new Error('Tidak ada wajah terdeteksi. Pastikan wajah Anda terlihat jelas di depan kamera dengan pencahayaan yang cukup.');
    }

    if (detections.length > 1) {
      throw new Error('Terdeteksi lebih dari satu wajah. Pastikan hanya wajah Anda yang terlihat di kamera.');
    }

    // Extract descriptor (128-dimensional vector)
    const descriptor = Array.from(detections[0].descriptor);
    
    console.log('[Face Extraction] Face descriptor extracted successfully (128 dimensions)');
    return descriptor;
  } catch (error) {
    console.error('[Face Extraction] Error extracting face descriptor:', error);
    throw error;
  }
}

/**
 * Save image to disk (optional, untuk backup/audit)
 * @param {Buffer} imageBuffer - Image buffer
 * @param {number} userId - User ID
 * @returns {Promise<string>} Path to saved image
 */
async function saveFaceImage(imageBuffer, userId) {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads/faces');
    const userDir = path.join(uploadsDir, String(userId));
    
    // Create directories if not exist
    await fs.mkdir(userDir, { recursive: true });
    
    // Save with timestamp
    const timestamp = Date.now();
    const filename = `${timestamp}.jpg`;
    const filepath = path.join(userDir, filename);
    
    await fs.writeFile(filepath, imageBuffer);
    
    console.log(`[Face Extraction] Image saved to ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('[Face Extraction] Error saving image:', error);
    // Don't throw, image saving is optional
    return null;
  }
}

module.exports = {
  loadModels,
  extractFaceDescriptor,
  saveFaceImage
};

