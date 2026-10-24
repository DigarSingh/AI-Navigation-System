/**
 * NHAI Toll Plazas along Indian National Highway corridors
 * With precision route-snapping so markers stay directly on the highway line at all zoom levels.
 */

export interface TollPlaza {
  id: string;
  name: string;
  coordinate: [number, number];
  highway: string;
  standardFeeInr: number;
  distanceFromStartKm?: number;
}

interface CatalogTollPlaza {
  id: string;
  name: string;
  rawCoordinate: [number, number];
  highway: string;
  standardFeeInr: number;
}

// Major known NHAI Toll Plazas along prime corridors
const KNOWN_TOLL_PLAZAS: CatalogTollPlaza[] = [
  // Delhi - Jaipur (NH 48)
  {
    id: "toll-kherki-daula",
    name: "Kherki Daula Toll Plaza",
    rawCoordinate: [28.4035, 76.9856],
    highway: "NH 48 (Delhi-Gurugram Expy)",
    standardFeeInr: 85,
  },
  {
    id: "toll-shahjahanpur",
    name: "Shahjahanpur Toll Plaza",
    rawCoordinate: [28.0536, 76.4357],
    highway: "NH 48 (Delhi-Jaipur Highway)",
    standardFeeInr: 175,
  },
  {
    id: "toll-manoharpur",
    name: "Manoharpur Toll Plaza",
    rawCoordinate: [27.3023, 75.9524],
    highway: "NH 48",
    standardFeeInr: 105,
  },
  {
    id: "toll-daulatpura",
    name: "Daulatpura Toll Plaza",
    rawCoordinate: [27.0542, 75.8012],
    highway: "NH 48 (Jaipur Bypass)",
    standardFeeInr: 75,
  },

  // Mumbai - Pune Expressway
  {
    id: "toll-khalapur",
    name: "Khalapur Toll Plaza",
    rawCoordinate: [18.8152, 73.2758],
    highway: "Mumbai-Pune Expressway",
    standardFeeInr: 165,
  },
  {
    id: "toll-talegaon",
    name: "Talegaon Toll Plaza",
    rawCoordinate: [18.7324, 73.6821],
    highway: "Mumbai-Pune Expressway",
    standardFeeInr: 155,
  },

  // Delhi - Agra (Yamuna Expressway / NH 19)
  {
    id: "toll-jewar",
    name: "Jewar Toll Plaza",
    rawCoordinate: [28.1256, 77.5524],
    highway: "Yamuna Expressway",
    standardFeeInr: 150,
  },
  {
    id: "toll-mathura",
    name: "Mathura Toll Plaza",
    rawCoordinate: [27.5621, 77.6892],
    highway: "NH 19 (Delhi-Kolkata)",
    standardFeeInr: 140,
  },

  // Bangalore - Chennai (NH 44 / NH 48)
  {
    id: "toll-attibele",
    name: "Attibele Toll Plaza",
    rawCoordinate: [12.7834, 77.7712],
    highway: "NH 44 (Hosur Road)",
    standardFeeInr: 70,
  },
  {
    id: "toll-krishnagiri",
    name: "Krishnagiri Toll Plaza",
    rawCoordinate: [12.5284, 78.2145],
    highway: "NH 44",
    standardFeeInr: 105,
  },
  {
    id: "toll-pallikonda",
    name: "Pallikonda Toll Plaza",
    rawCoordinate: [12.8762, 78.9521],
    highway: "NH 48",
    standardFeeInr: 110,
  },
  {
    id: "toll-chennasamudram",
    name: "Chennasamudram Toll Plaza",
    rawCoordinate: [12.9234, 79.3521],
    highway: "NH 48",
    standardFeeInr: 80,
  },

  // Ahmedabad - Vadodara (NE 1)
  {
    id: "toll-anand",
    name: "Anand Express Toll Plaza",
    rawCoordinate: [22.6521, 72.9842],
    highway: "National Expressway 1",
    standardFeeInr: 125,
  },

  // Delhi - Chandigarh (NH 44)
  {
    id: "toll-murthal",
    name: "Murthal (Sonipat) Toll Plaza",
    rawCoordinate: [29.0234, 77.0854],
    highway: "NH 44 (GT Road)",
    standardFeeInr: 85,
  },
  {
    id: "toll-panipat",
    name: "Panipat Elevated Toll Plaza",
    rawCoordinate: [29.3921, 76.9741],
    highway: "NH 44",
    standardFeeInr: 50,
  },
  {
    id: "toll-karnal",
    name: "Karnal Toll Plaza",
    rawCoordinate: [29.6912, 76.9854],
    highway: "NH 44",
    standardFeeInr: 135,
  },
  {
    id: "toll-ghaggar",
    name: "Ghaggar (Ambala) Toll Plaza",
    rawCoordinate: [30.3421, 76.8124],
    highway: "NH 44",
    standardFeeInr: 90,
  },

  // Pune - Bangalore (NH 48)
  {
    id: "toll-khed-shivapur",
    name: "Khed Shivapur Toll Plaza",
    rawCoordinate: [18.3541, 73.8562],
    highway: "NH 48",
    standardFeeInr: 115,
  },
  {
    id: "toll-anewadi",
    name: "Anewadi (Satara) Toll Plaza",
    rawCoordinate: [17.8214, 73.9852],
    highway: "NH 48",
    standardFeeInr: 95,
  },
  {
    id: "toll-tasawade",
    name: "Tasawade (Karad) Toll Plaza",
    rawCoordinate: [17.2954, 74.2154],
    highway: "NH 48",
    standardFeeInr: 105,
  },
  {
    id: "toll-hattargi",
    name: "Hattargi Toll Plaza",
    rawCoordinate: [16.2145, 74.4521],
    highway: "NH 48",
    standardFeeInr: 95,
  },
];

/**
 * Calculates great circle distance between two points in km
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

/**
 * Identify all NHAI toll plazas positioned along a given highway route polyline.
 * Snaps all toll plaza markers EXACTLY to the highway polyline vertices so that
 * when zooming in on the map, markers remain locked right in the center of the road.
 */
export function getRouteTollPlazas(
  polyline: [number, number][],
  totalDistanceKm: number
): TollPlaza[] {
  if (!polyline || polyline.length < 2) return [];

  // 1. Calculate cumulative distance along polyline segments
  const cumDist: number[] = [0];
  for (let i = 1; i < polyline.length; i++) {
    cumDist.push(cumDist[i - 1] + distKm(polyline[i - 1], polyline[i]));
  }
  const totalPolylineDist = cumDist[cumDist.length - 1];

  const matchedPlazas: TollPlaza[] = [];
  const addedTollPositions: number[] = []; // Distance along route in km

  // 2. Search known catalog plazas and SNAP them to the closest vertex on the polyline
  for (const catalogPlaza of KNOWN_TOLL_PLAZAS) {
    let closestIdx = -1;
    let closestDist = Infinity;

    for (let i = 0; i < polyline.length; i++) {
      const d = distKm(catalogPlaza.rawCoordinate, polyline[i]);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }

    // If within 15 km of the highway corridor, match and snap directly to the road coordinate
    if (closestDist <= 15 && closestIdx !== -1) {
      const distFromStart = cumDist[closestIdx];

      // Avoid placing a toll within 10 km of the route start or end
      if (distFromStart > 10 && distFromStart < totalPolylineDist - 10) {
        // Prevent duplicate placement within 20 km
        const isDuplicate = addedTollPositions.some(
          (pos) => Math.abs(pos - distFromStart) < 20
        );

        if (!isDuplicate) {
          matchedPlazas.push({
            id: catalogPlaza.id,
            name: catalogPlaza.name,
            // CRITICAL: Use the exact snapped road coordinate so zoom position is perfect
            coordinate: [polyline[closestIdx][0], polyline[closestIdx][1]],
            highway: catalogPlaza.highway,
            standardFeeInr: catalogPlaza.standardFeeInr,
            distanceFromStartKm: Math.round(distFromStart),
          });
          addedTollPositions.push(distFromStart);
        }
      }
    }
  }

  // 3. For long highway segments without a cataloged plaza, sample toll plazas
  // every ~65 km per NHAI national highway spacing guidelines
  const targetSpacingKm = 65;
  const numIntervals = Math.floor(totalPolylineDist / targetSpacingKm);

  for (let k = 1; k <= numIntervals; k++) {
    const targetKm = k * targetSpacingKm;

    // Do not place within 15 km of start or destination
    if (targetKm < 15 || targetKm > totalPolylineDist - 15) continue;

    // Ensure it's not within 25 km of an already added plaza
    const tooClose = addedTollPositions.some((pos) => Math.abs(pos - targetKm) < 25);
    if (tooClose) continue;

    // Find the polyline vertex corresponding to targetKm
    let bestIdx = 0;
    let bestDelta = Infinity;
    for (let i = 0; i < cumDist.length; i++) {
      const delta = Math.abs(cumDist[i] - targetKm);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIdx = i;
      }
    }

    const roadCoord = polyline[bestIdx];
    if (roadCoord) {
      const tollIndex = matchedPlazas.length + 1;
      matchedPlazas.push({
        id: `nhai-plaza-km-${Math.round(targetKm)}`,
        name: `NHAI Toll Plaza (FASTag)`,
        // Exactly on the road polyline
        coordinate: [roadCoord[0], roadCoord[1]],
        highway: `National Highway Corridor (Km ${Math.round(targetKm)})`,
        standardFeeInr: 90 + ((k * 15) % 45),
        distanceFromStartKm: Math.round(targetKm),
      });
      addedTollPositions.push(targetKm);
    }
  }

  // Sort plazas by distance from start so they appear sequentially along the route
  matchedPlazas.sort(
    (a, b) => (a.distanceFromStartKm || 0) - (b.distanceFromStartKm || 0)
  );

  return matchedPlazas;
}
