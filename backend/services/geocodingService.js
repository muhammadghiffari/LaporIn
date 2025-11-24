const axios = require('axios');

/**
 * Reverse geocoding: Convert latitude/longitude to address
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @returns {Promise<string|null>} Formatted address string or null if failed
 */
async function reverseGeocode(latitude, longitude) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ GOOGLE_MAPS_API_KEY tidak ditemukan, skip reverse geocoding');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&language=id`;
    
    const response = await axios.get(url, {
      timeout: 10000 // 10 seconds timeout
    });
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      const components = result.address_components;
      
      // Extract address components
      const streetNumber = components.find(c => c.types.includes('street_number'))?.long_name || '';
      const route = components.find(c => c.types.includes('route'))?.long_name || '';
      const sublocality = components.find(c => c.types.includes('sublocality') || c.types.includes('sublocality_level_1'))?.long_name || '';
      const locality = components.find(c => c.types.includes('locality'))?.long_name || '';
      const administrativeArea = components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || '';
      
      // Format alamat Indonesia: "Jl. [route] No [street_number], [sublocality], [locality]"
      let formattedAddress = '';
      
      if (route) {
        formattedAddress += route;
        if (streetNumber) {
          formattedAddress += ` No ${streetNumber}`;
        }
      } else if (streetNumber) {
        formattedAddress += `No ${streetNumber}`;
      }
      
      if (sublocality) {
        if (formattedAddress) formattedAddress += ', ';
        formattedAddress += sublocality;
      }
      
      if (locality) {
        if (formattedAddress) formattedAddress += ', ';
        formattedAddress += locality;
      }
      
      // Fallback ke formatted_address jika tidak ada komponen yang ditemukan
      if (!formattedAddress) {
        formattedAddress = result.formatted_address;
      }
      
      console.log('✅ Reverse geocoding success:', formattedAddress);
      return formattedAddress;
    } else if (response.data.status === 'ZERO_RESULTS') {
      console.warn('⚠️ No results found for coordinates:', latitude, longitude);
      return null;
    } else {
      console.error('❌ Reverse geocoding error:', response.data.status, response.data.error_message);
      return null;
    }
  } catch (error) {
    console.error('❌ Reverse geocoding error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

/**
 * Forward geocoding: Convert address to latitude/longitude
 * @param {string} address - Alamat text
 * @returns {Promise<{lat: number, lng: number, formatted: string, confidence: string} | null>}
 */
async function forwardGeocode(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ GOOGLE_MAPS_API_KEY tidak ditemukan, skip forward geocoding');
    return null;
  }

  if (!address || address.trim().length === 0) {
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=id`;
    
    const response = await axios.get(url, {
      timeout: 10000 // 10 seconds timeout
    });
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      const location = result.geometry.location;
      
      return {
        lat: location.lat,
        lng: location.lng,
        formatted: result.formatted_address,
        confidence: result.geometry.location_type, // ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE
        placeId: result.place_id
      };
    } else if (response.data.status === 'ZERO_RESULTS') {
      console.warn('⚠️ No results found for address:', address);
      return null;
    } else {
      console.error('❌ Forward geocoding error:', response.data.status, response.data.error_message);
      return null;
    }
  } catch (error) {
    console.error('❌ Forward geocoding error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

/**
 * Alternative: Reverse geocoding using OpenStreetMap Nominatim (free, no API key needed)
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @returns {Promise<string|null>} Formatted address string or null if failed
 */
async function reverseGeocodeOSM(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'LaporIn-App/1.0' // Required by Nominatim
      },
      timeout: 10000
    });
    
    if (response.data && response.data.address) {
      const addr = response.data.address;
      
      // Format alamat Indonesia
      const parts = [];
      if (addr.road) parts.push(addr.road);
      if (addr.house_number) parts.push(`No ${addr.house_number}`);
      if (addr.suburb || addr.village) parts.push(addr.suburb || addr.village);
      if (addr.city || addr.town) parts.push(addr.city || addr.town);
      if (addr.state) parts.push(addr.state);
      
      const formattedAddress = parts.join(', ');
      
      if (formattedAddress) {
        console.log('✅ OSM reverse geocoding success:', formattedAddress);
        return formattedAddress;
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ OSM reverse geocoding error:', error.message);
    return null;
  }
}

module.exports = {
  reverseGeocode,
  reverseGeocodeOSM,
  forwardGeocode
};

