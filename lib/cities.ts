/**
 * 105 Major Indian Cities with real coordinates and geospatial snapping utilities
 */

export const CITY_COORDS: Record<string, [number, number]> = {
  // Tier-1 Metro Cities
  "Delhi": [28.6139, 77.2090],
  "Mumbai": [19.0760, 72.8777],
  "Bangalore": [12.9716, 77.5946],
  "Kolkata": [22.5726, 88.3639],
  "Chennai": [13.0827, 80.2707],
  "Hyderabad": [17.3850, 78.4867],

  // Tier-2 Major Cities
  "Pune": [18.5204, 73.8567],
  "Ahmedabad": [23.0225, 72.5714],
  "Jaipur": [26.9124, 75.7873],
  "Surat": [21.1702, 72.8311],
  "Lucknow": [26.8467, 80.9462],
  "Kanpur": [26.4499, 80.3319],
  "Nagpur": [21.1458, 79.0882],
  "Indore": [22.7196, 75.8577],
  "Bhopal": [23.2599, 77.4126],
  "Visakhapatnam": [17.6868, 83.2185],
  "Patna": [25.5941, 85.1376],
  "Vadodara": [22.3072, 73.1812],
  "Ludhiana": [30.9010, 75.8573],
  "Agra": [27.1767, 78.0081],
  "Nashik": [19.9975, 73.7898],
  "Rajkot": [22.3039, 70.8022],
  "Varanasi": [25.3176, 82.9739],
  "Meerut": [28.9845, 77.7064],
  "Faridabad": [28.4089, 77.3178],
  "Ghaziabad": [28.6692, 77.4538],

  // Tier-3 Important Cities
  "Amritsar": [31.6340, 74.8723],
  "Allahabad": [25.4358, 81.8463],
  "Ranchi": [23.3441, 85.3096],
  "Howrah": [22.5958, 88.2636],
  "Coimbatore": [11.0168, 76.9558],
  "Jabalpur": [23.1815, 79.9864],
  "Gwalior": [26.2183, 78.1828],
  "Vijayawada": [16.5062, 80.6480],
  "Madurai": [9.9252, 78.1198],
  "Mysore": [12.2958, 76.6394],
  "Goa": [15.2993, 74.1240],
  "Chandigarh": [30.7333, 76.7794],
  "Thiruvananthapuram": [8.5241, 76.9366],
  "Kochi": [9.9312, 76.2673],
  "Guwahati": [26.1445, 91.7362],
  "Bhubaneswar": [20.2961, 85.8245],
  "Dehradun": [30.3165, 78.0322],
  "Raipur": [21.2514, 81.6296],
  "Jodhpur": [26.2389, 73.0243],
  "Kota": [25.2138, 75.8648],
  "Udaipur": [24.5854, 73.7125],

  // North India Cities
  "Shimla": [31.1048, 77.1734],
  "Jammu": [32.7266, 74.8570],
  "Srinagar": [34.0837, 74.7973],
  "Haridwar": [29.9457, 78.1642],
  "Rishikesh": [30.0869, 78.2676],
  "Muzaffarpur": [26.1225, 85.3906],
  "Aligarh": [27.8974, 78.0880],
  "Moradabad": [28.8389, 78.7378],
  "Saharanpur": [29.9680, 77.5460],
  "Gorakhpur": [26.7606, 83.3732],
  "Bareilly": [28.3640, 79.4150],
  "Jhansi": [25.4484, 78.5685],

  // South India Cities
  "Tiruchirappalli": [10.7905, 78.7047],
  "Salem": [11.6643, 78.1460],
  "Tirupati": [13.6288, 79.4192],
  "Vellore": [12.9165, 79.1325],
  "Warangal": [17.9689, 79.5941],
  "Guntur": [16.3067, 80.4365],
  "Nellore": [14.4426, 79.9865],
  "Kakinada": [16.9891, 82.2475],
  "Rajahmundry": [17.0005, 81.8040],
  "Tirunelveli": [8.7139, 77.7567],
  "Erode": [11.3410, 77.7172],
  "Thanjavur": [10.7870, 79.1378],
  "Mangalore": [12.9141, 74.8560],
  "Hubli": [15.3647, 75.1240],
  "Belgaum": [15.8497, 74.4977],
  "Gulbarga": [17.3297, 76.8343],

  // West India Cities
  "Aurangabad": [19.8762, 75.3433],
  "Kolhapur": [16.7050, 74.2433],
  "Solapur": [17.6599, 75.9064],
  "Jalgaon": [21.0077, 75.5626],
  "Bhavnagar": [21.7645, 72.1519],
  "Jamnagar": [22.4707, 70.0577],
  "Gandhinagar": [23.2156, 72.6369],
  "Anand": [22.5645, 72.9289],

  // East India Cities
  "Siliguri": [26.7271, 88.3953],
  "Durgapur": [23.5204, 87.3119],
  "Asansol": [23.6739, 86.9524],
  "Cuttack": [20.5124, 85.8829],
  "Rourkela": [22.2604, 84.8536],
  "Jamshedpur": [22.8046, 86.2029],
  "Dhanbad": [23.7957, 86.4304],
  "Bokaro": [23.6693, 86.1511],

  // Central India Cities
  "Ujjain": [23.1765, 75.7885],
  "Sagar": [23.8388, 78.7378],
  "Ratlam": [23.3315, 75.0367],
  "Satna": [24.6005, 80.8322],
  "Bilaspur": [22.0797, 82.1409],
  "Korba": [22.3595, 82.7501],

  // Northeast India Cities
  "Shillong": [25.5788, 91.8933],
  "Imphal": [24.8170, 93.9368],
  "Agartala": [23.8315, 91.2868],
  "Aizawl": [23.7271, 92.7176],
  "Kohima": [25.6701, 94.1077],
  "Itanagar": [27.1022, 93.6919],
  "Dibrugarh": [27.4728, 94.9120],
  "Silchar": [24.8333, 92.7789],
};

export const ALL_CITIES = Object.keys(CITY_COORDS).sort();

/**
 * Calculates great circle distance between two points on Earth in km
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Snaps any GPS [lat, lon] to the nearest connected city in the highway network
 */
export function findNearestCity(
  userLat: number,
  userLon: number
): { city: string; distanceKm: number; coord: [number, number] } {
  let closestCity = "Delhi";
  let minDistance = Infinity;

  for (const [city, [cLat, cLon]] of Object.entries(CITY_COORDS)) {
    const dist = haversineDistance(userLat, userLon, cLat, cLon);
    if (dist < minDistance) {
      minDistance = dist;
      closestCity = city;
    }
  }

  return {
    city: closestCity,
    distanceKm: Math.round(minDistance * 10) / 10,
    coord: CITY_COORDS[closestCity],
  };
}
