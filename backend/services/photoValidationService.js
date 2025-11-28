/**
 * Photo Validation Service
 * Validasi bahwa foto diambil di lokasi kejadian (bukan di rumah)
 * 
 * Validasi:
 * 1. GPS coordinates dari foto harus sesuai dengan koordinat yang dilaporkan
 * 2. Timestamp foto harus baru (tidak lebih dari 1 jam sebelum laporan dibuat)
 * 3. Foto harus memiliki metadata GPS (jika tidak ada, warning)
 */

const exifr = require('exifr');

/**
 * Extract GPS coordinates dari foto (base64 atau buffer)
 * @param {string|Buffer} imageData - Base64 string atau Buffer
 * @returns {Promise<Object>} { lat, lng, timestamp, hasGPS }
 */
async function extractPhotoMetadata(imageData) {
  try {
    let buffer;
    
    // Convert base64 to buffer jika perlu
    if (typeof imageData === 'string') {
      // Remove data URL prefix jika ada
      const base64Data = imageData.includes(',') 
        ? imageData.split(',')[1] 
        : imageData;
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = imageData;
    }

    // Extract EXIF data
    const exifData = await exifr.parse(buffer, {
      gps: true,
      exif: true,
      ifd0: true,
      translateKeys: false
    });

    if (!exifData) {
      return {
        hasGPS: false,
        hasTimestamp: false,
        warning: 'Foto tidak memiliki metadata EXIF. Pastikan foto diambil langsung dari kamera, bukan dari galeri lama.'
      };
    }

    // Extract GPS coordinates
    let lat = null;
    let lng = null;
    let timestamp = null;

    if (exifData.GPSLatitude && exifData.GPSLongitude) {
      lat = exifData.GPSLatitude;
      lng = exifData.GPSLongitude;
    } else if (exifData.latitude && exifData.longitude) {
      lat = exifData.latitude;
      lng = exifData.longitude;
    }

    // Extract timestamp
    if (exifData.DateTimeOriginal) {
      timestamp = new Date(exifData.DateTimeOriginal);
    } else if (exifData.DateTime) {
      timestamp = new Date(exifData.DateTime);
    } else if (exifData.CreateDate) {
      timestamp = new Date(exifData.CreateDate);
    }

    return {
      lat,
      lng,
      timestamp,
      hasGPS: !!(lat && lng),
      hasTimestamp: !!timestamp,
      exifData: {
        make: exifData.Make || exifData.make,
        model: exifData.Model || exifData.model,
        software: exifData.Software || exifData.software
      }
    };
  } catch (error) {
    console.error('[Photo Validation] Error extracting metadata:', error.message);
    return {
      hasGPS: false,
      hasTimestamp: false,
      error: error.message
    };
  }
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * @param {number} lat1 
 * @param {number} lng1 
 * @param {number} lat2 
 * @param {number} lng2 
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validate photo location against reported location
 * @param {string|Buffer} imageData - Base64 string atau Buffer
 * @param {number} reportedLat - Latitude yang dilaporkan
 * @param {number} reportedLng - Longitude yang dilaporkan
 * @param {Object} options - Validation options
 * @param {number} options.maxDistanceMeters - Max distance tolerance (default: 100m)
 * @param {number} options.maxAgeMinutes - Max age of photo in minutes (default: 60)
 * @returns {Promise<Object>} Validation result
 */
async function validatePhotoLocation(imageData, reportedLat, reportedLng, options = {}) {
  const {
    maxDistanceMeters = parseInt(process.env.PHOTO_LOCATION_TOLERANCE_METERS || '100'), // Default 100m
    maxAgeMinutes = parseInt(process.env.PHOTO_MAX_AGE_MINUTES || '60'), // Default 60 minutes
    strictMode = process.env.PHOTO_STRICT_MODE === 'true' // Default: warning only
  } = options;

  // Extract metadata dari foto
  const metadata = await extractPhotoMetadata(imageData);

  // Jika foto tidak punya GPS metadata
  if (!metadata.hasGPS) {
    const warning = metadata.warning || 'Foto tidak memiliki informasi lokasi GPS. Pastikan foto diambil langsung dari kamera dengan GPS aktif, bukan dari galeri lama.';
    
    if (strictMode) {
      return {
        isValid: false,
        shouldBlock: true,
        error: warning,
        metadata
      };
    }

    return {
      isValid: false,
      shouldBlock: false,
      warning,
      metadata
    };
  }

  // Calculate distance antara GPS foto dengan lokasi yang dilaporkan
  const distance = calculateDistance(
    metadata.lat,
    metadata.lng,
    reportedLat,
    reportedLng
  );

  // Check jika foto diambil di lokasi yang sama
  const isLocationMatch = distance <= maxDistanceMeters;

  // Check timestamp (jika ada)
  let isTimestampValid = true;
  let timestampWarning = null;
  
  if (metadata.hasTimestamp) {
    const now = new Date();
    const photoAge = (now - metadata.timestamp) / (1000 * 60); // Age in minutes
    
    if (photoAge > maxAgeMinutes) {
      isTimestampValid = false;
      timestampWarning = `Foto diambil ${Math.round(photoAge)} menit yang lalu. Pastikan foto diambil di tempat kejadian, bukan foto lama.`;
    }
  }

  // Final validation
  const isValid = isLocationMatch && isTimestampValid;
  const shouldBlock = strictMode && (!isLocationMatch || !isTimestampValid);

  let warning = null;
  if (!isLocationMatch) {
    warning = `Lokasi GPS dari foto (${distance.toFixed(0)}m dari lokasi yang dilaporkan) tidak sesuai. Pastikan foto diambil di tempat kejadian, bukan di rumah.`;
  }
  if (timestampWarning) {
    warning = warning ? `${warning} ${timestampWarning}` : timestampWarning;
  }

  console.log('[Photo Validation]', {
    photoGPS: { lat: metadata.lat, lng: metadata.lng },
    reportedGPS: { lat: reportedLat, lng: reportedLng },
    distance: distance.toFixed(2) + 'm',
    maxDistance: maxDistanceMeters + 'm',
    isLocationMatch,
    photoAge: metadata.timestamp ? Math.round((new Date() - metadata.timestamp) / (1000 * 60)) + ' minutes' : 'unknown',
    isTimestampValid,
    isValid,
    shouldBlock
  });

  return {
    isValid,
    shouldBlock,
    distance: Math.round(distance),
    isLocationMatch,
    isTimestampValid,
    photoGPS: {
      lat: metadata.lat,
      lng: metadata.lng
    },
    reportedGPS: {
      lat: reportedLat,
      lng: reportedLng
    },
    warning,
    metadata
  };
}

module.exports = {
  extractPhotoMetadata,
  validatePhotoLocation,
  calculateDistance
};

