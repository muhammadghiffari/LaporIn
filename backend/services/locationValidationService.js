const turf = require('@turf/turf');

/**
 * Validate if a report location is within RT/RW boundary
 * Supports both circular (radius) and polygon boundaries
 * @param {number} reportLat - Report latitude
 * @param {number} reportLng - Report longitude
 * @param {Object} userRtRw - User object with RT/RW boundary data
 * @returns {Object} { isValid: boolean, distance: number (meters), mismatch: boolean }
 */
function validateLocationForRT(reportLat, reportLng, userRtRw) {
  if (!reportLat || !reportLng) {
    return {
      isValid: false,
      distance: null,
      mismatch: false,
      error: 'Report coordinates tidak tersedia'
    };
  }

  // Jika RT/RW belum set boundary, skip validation
  if (!userRtRw.rtRwLatitude || !userRtRw.rtRwLongitude) {
    return {
      isValid: true, // Skip validation jika boundary belum di-set
      distance: null,
      mismatch: false,
      warning: 'RT/RW boundary belum di-set, validation di-skip'
    };
  }

  const rtRwCenter = {
    lat: userRtRw.rtRwLatitude,
    lng: userRtRw.rtRwLongitude
  };

  const reportPoint = turf.point([reportLng, reportLat]);
  const rtRwCenterPoint = turf.point([rtRwCenter.lng, rtRwCenter.lat]);

  // Calculate distance dari report ke RT/RW center
  const distance = turf.distance(reportPoint, rtRwCenterPoint, { units: 'meters' });

  // Check if within boundary
  let isValid = false;
  let mismatch = false;

  // Priority 1: Check polygon boundary (lebih akurat)
  if (userRtRw.rtRwPolygon && Array.isArray(userRtRw.rtRwPolygon) && userRtRw.rtRwPolygon.length >= 3) {
    try {
      // Convert polygon coordinates to GeoJSON format
      const polygonCoords = userRtRw.rtRwPolygon.map(coord => [coord.lng || coord.longitude, coord.lat || coord.latitude]);
      
      // Close polygon (first point = last point)
      if (polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] || 
          polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1]) {
        polygonCoords.push(polygonCoords[0]);
      }

      const polygon = turf.polygon([polygonCoords]);
      isValid = turf.booleanPointInPolygon(reportPoint, polygon);
      mismatch = !isValid;

      console.log('📍 Polygon validation:', {
        isValid,
        distance: distance.toFixed(2) + 'm',
        polygonPoints: polygonCoords.length
      });

      return {
        isValid,
        distance: Math.round(distance),
        mismatch,
        method: 'polygon'
      };
    } catch (error) {
      console.error('❌ Polygon validation error:', error.message);
      // Fallback to radius validation
    }
  }

  // Priority 2: Check radius boundary (fallback atau jika polygon tidak ada)
  if (userRtRw.rtRwRadius && userRtRw.rtRwRadius > 0) {
    isValid = distance <= userRtRw.rtRwRadius;
    mismatch = !isValid;

    console.log('📍 Radius validation:', {
      isValid,
      distance: distance.toFixed(2) + 'm',
      radius: userRtRw.rtRwRadius + 'm',
      withinRadius: distance <= userRtRw.rtRwRadius
    });

    return {
      isValid,
      distance: Math.round(distance),
      mismatch,
      method: 'radius'
    };
  }

  // Jika tidak ada boundary yang di-set, anggap valid (skip validation)
  return {
    isValid: true,
    distance: Math.round(distance),
    mismatch: false,
    warning: 'RT/RW boundary tidak lengkap, validation di-skip'
  };
}

/**
 * Calculate distance between two points in meters
 * @param {number} lat1 - Latitude point 1
 * @param {number} lng1 - Longitude point 1
 * @param {number} lat2 - Latitude point 2
 * @param {number} lng2 - Longitude point 2
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const point1 = turf.point([lng1, lat1]);
  const point2 = turf.point([lng2, lat2]);
  return turf.distance(point1, point2, { units: 'meters' });
}

/**
 * Check if a point is within a polygon
 * @param {number} lat - Point latitude
 * @param {number} lng - Point longitude
 * @param {Array} polygonCoords - Array of {lat, lng} or [{lat, lng}, ...]
 * @returns {boolean} True if point is inside polygon
 */
function isPointInPolygon(lat, lng, polygonCoords) {
  try {
    const point = turf.point([lng, lat]);
    
    // Convert polygon coordinates
    const coords = polygonCoords.map(coord => [
      coord.lng || coord.longitude,
      coord.lat || coord.latitude
    ]);
    
    // Close polygon
    if (coords[0][0] !== coords[coords.length - 1][0] || 
        coords[0][1] !== coords[coords.length - 1][1]) {
      coords.push(coords[0]);
    }
    
    const polygon = turf.polygon([coords]);
    return turf.booleanPointInPolygon(point, polygon);
  } catch (error) {
    console.error('❌ Point in polygon check error:', error.message);
    return false;
  }
}

/**
 * Check if a point is within a radius
 * @param {number} lat - Point latitude
 * @param {number} lng - Point longitude
 * @param {number} centerLat - Center latitude
 * @param {number} centerLng - Center longitude
 * @param {number} radiusMeters - Radius in meters
 * @returns {Object} { within: boolean, distance: number }
 */
function isPointInRadius(lat, lng, centerLat, centerLng, radiusMeters) {
  const distance = calculateDistance(lat, lng, centerLat, centerLng);
  return {
    within: distance <= radiusMeters,
    distance: Math.round(distance)
  };
}

module.exports = {
  validateLocationForRT,
  calculateDistance,
  isPointInPolygon,
  isPointInRadius
};

