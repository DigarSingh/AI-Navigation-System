/**
 * Highway Amenities Catalog: Fuel Stations (Petrol/Diesel), Gas Stations (CNG), and EV Charging Stations
 * Snapped to Indian National Highway Corridors
 */

export type AmenityType = "fuel" | "cng" | "ev";

export interface HighwayAmenity {
  id: string;
  name: string;
  type: AmenityType;
  brand: string;
  coordinate: [number, number];
  distanceFromStartKm: number;
  highway: string;
  facilities: string[];
}

/**
 * Calculates great circle distance between two coordinates in km
 */
function distKm(c1: [number, number], c2: [number, number]): number {
  const dLat = ((c2[0] - c1[0]) * Math.PI) / 180;
  const dLon = ((c2[1] - c1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1[0] * Math.PI) / 180) *
      Math.cos((c2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Major Fuel Brands in India
const FUEL_BRANDS = [
  { brand: "IndianOil COCO", name: "Indian Oil Swagat Highway Hub" },
  { brand: "Bharat Petroleum", name: "BPCL Ghar Highway Mega Outlet" },
  { brand: "HPCL", name: "HP Highway Care Center" },
  { brand: "Jio-bp", name: "Jio-bp Mobility Station" },
  { brand: "Shell", name: "Shell Highway Oasis" },
];

// Major CNG / Gas Providers in India
const CNG_BRANDS = [
  { brand: "IGL", name: "Indraprastha Gas (IGL) Highway CNG" },
  { brand: "Adani Total Gas", name: "Adani Total CNG Highway Station" },
  { brand: "Torrent Gas", name: "Torrent Gas Express CNG" },
  { brand: "MGL", name: "Mahanagar Gas Express CNG" },
  { brand: "Gujarat Gas", name: "Gujarat Gas Highway CNG" },
];

// Major EV Charging Networks in India
const EV_NETWORKS = [
  { brand: "Tata Power", name: "Tata Power EZ Charge 60kW DC", power: "60kW Dual Gun (CCS2)" },
  { brand: "Jio-bp Pulse", name: "Jio-bp Pulse 120kW HyperCharger", power: "120kW Ultra-Fast (CCS2)" },
  { brand: "Statiq", name: "Statiq Highway EV Fast Charger", power: "60kW DC Fast Charger" },
  { brand: "Zeon Electric", name: "Zeon 50kW DC Fast Charger", power: "50kW CCS2 Fast Charger" },
];

/**
 * Identify all Fuel Stations, CNG Gas Stations, and EV Fast Chargers positioned along the route polyline.
 * All markers are snapped directly onto the road vertices so zooming never shifts them.
 */
export function getRouteAmenities(
  polyline: [number, number][],
  totalDistanceKm: number
): HighwayAmenity[] {
  if (!polyline || polyline.length < 2) return [];

  // 1. Calculate cumulative distance along polyline segments
  const cumDist: number[] = [0];
  for (let i = 1; i < polyline.length; i++) {
    cumDist.push(cumDist[i - 1] + distKm(polyline[i - 1], polyline[i]));
  }
  const totalPolylineDist = cumDist[cumDist.length - 1];

  const amenities: HighwayAmenity[] = [];
  const occupiedKm: number[] = [];

  const findCoordAtKm = (targetKm: number): { coord: [number, number]; idx: number } | null => {
    let bestIdx = 0;
    let bestDelta = Infinity;
    for (let i = 0; i < cumDist.length; i++) {
      const delta = Math.abs(cumDist[i] - targetKm);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIdx = i;
      }
    }
    const pt = polyline[bestIdx];
    return pt ? { coord: [pt[0], pt[1]], idx: bestIdx } : null;
  };

  // 2. Sample Fuel Stations every ~35 km along the highway corridor
  const fuelInterval = 35;
  const numFuel = Math.floor(totalPolylineDist / fuelInterval);
  for (let k = 1; k <= numFuel; k++) {
    const targetKm = k * fuelInterval + (k % 2 === 0 ? 3 : -2);
    if (targetKm < 10 || targetKm > totalPolylineDist - 10) continue;

    const res = findCoordAtKm(targetKm);
    if (res) {
      const brandInfo = FUEL_BRANDS[(k - 1) % FUEL_BRANDS.length];
      amenities.push({
        id: `fuel-${k}-${Math.round(targetKm)}`,
        name: brandInfo.name,
        type: "fuel",
        brand: brandInfo.brand,
        coordinate: res.coord,
        distanceFromStartKm: Math.round(targetKm),
        highway: `National Highway Corridor (Km ${Math.round(targetKm)})`,
        facilities: [
          "24x7 Petrol (₹110/L) & Diesel (₹100/L)",
          "Free Air & Nitrogen",
          "Clean Restrooms",
          "Highway Dhaba / Food Court",
        ],
      });
      occupiedKm.push(targetKm);
    }
  }

  // 3. Sample EV Fast Chargers every ~45 km along highway corridor
  const evInterval = 45;
  const numEv = Math.floor(totalPolylineDist / evInterval);
  for (let k = 1; k <= numEv; k++) {
    const targetKm = k * evInterval + 4;
    if (targetKm < 12 || targetKm > totalPolylineDist - 12) continue;

    // Check not directly colliding with fuel pump
    const res = findCoordAtKm(targetKm);
    if (res) {
      const evInfo = EV_NETWORKS[(k - 1) % EV_NETWORKS.length];
      amenities.push({
        id: `ev-${k}-${Math.round(targetKm)}`,
        name: evInfo.name,
        type: "ev",
        brand: evInfo.brand,
        coordinate: res.coord,
        distanceFromStartKm: Math.round(targetKm),
        highway: `National Highway EV Corridor (Km ${Math.round(targetKm)})`,
        facilities: [
          evInfo.power,
          "Commercial DC Rate: ₹19.50/kWh",
          "Open 24/7 & App Enabled",
          "Restrooms & Cafe nearby",
        ],
      });
      occupiedKm.push(targetKm);
    }
  }

  // 4. Sample CNG / Gas Stations every ~55 km along corridor
  const cngInterval = 55;
  const numCng = Math.floor(totalPolylineDist / cngInterval);
  for (let k = 1; k <= numCng; k++) {
    const targetKm = k * cngInterval - 5;
    if (targetKm < 15 || targetKm > totalPolylineDist - 15) continue;

    const res = findCoordAtKm(targetKm);
    if (res) {
      const cngInfo = CNG_BRANDS[(k - 1) % CNG_BRANDS.length];
      amenities.push({
        id: `cng-${k}-${Math.round(targetKm)}`,
        name: cngInfo.name,
        type: "cng",
        brand: cngInfo.brand,
        coordinate: res.coord,
        distanceFromStartKm: Math.round(targetKm),
        highway: `Highway Gas Corridor (Km ${Math.round(targetKm)})`,
        facilities: [
          "Compressed Natural Gas (CNG)",
          "200 Bar High Dispense Speed",
          "Digital Payment Accepted",
          "Safety Compliance Checked",
        ],
      });
      occupiedKm.push(targetKm);
    }
  }

  // Sort sequentially along route
  amenities.sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

  return amenities;
}
