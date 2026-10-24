"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { RouteData } from "@/app/page";
import { Loader2 } from "lucide-react";

interface MapViewProps {
  routeData: RouteData | null;
  loading: boolean;
}

/**
 * Fetch real driving geometry that follows the road network (via the public
 * OSRM routing service) so the route is drawn along actual highways instead
 * of straight lines between cities. Falls back to the straight-line city
 * coordinates if the routing service is unavailable.
 *
 * @param coords city waypoints as [lat, lon] pairs
 * @returns the road path as [lat, lon] pairs
 */
async function fetchRoadGeometry(
  coords: [number, number][]
): Promise<[number, number][]> {
  if (!coords || coords.length < 2) return coords;

  try {
    // OSRM expects "lon,lat" pairs separated by ";"
    const waypoints = coords.map((c) => `${c[1]},${c[0]}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM responded ${res.status}`);

    const data = await res.json();
    const geometry = data?.routes?.[0]?.geometry?.coordinates as
      | [number, number][]
      | undefined;

    if (data?.code === "Ok" && geometry && geometry.length > 0) {
      // GeoJSON is [lon, lat]; Leaflet wants [lat, lon]
      return geometry.map(([lon, lat]) => [lat, lon] as [number, number]);
    }
  } catch (err) {
    console.warn("Road routing unavailable, using straight line:", err);
  }

  return coords;
}

export default function MapView({ routeData, loading }: MapViewProps) {
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (!mapInstanceRef.current && mapRef.current) {
        const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;

        // The container is inside a grid that finishes sizing after mount;
        // recompute the map size so tiles lay out on the correct grid.
        setTimeout(() => map.invalidateSize(), 100);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!routeData || !routeData.coordinates || !mapInstanceRef.current) return;

    let cancelled = false;

    import("leaflet").then(async (L) => {
      const map = mapInstanceRef.current;

      // Clear existing markers and polylines
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }

      // Custom icons
      const greenIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const blueIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const redIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // Add markers for each city in the path
      routeData.coordinates.forEach((coord, index) => {
        let icon = blueIcon;
        let popupText = `<b>🔵 ${routeData.path[index]}</b><br>Via point`;

        if (index === 0) {
          icon = greenIcon;
          popupText = `<b>🟢 ${routeData.path[index]}</b><br>Starting Point`;
        } else if (index === routeData.coordinates.length - 1) {
          icon = redIcon;
          popupText = `<b>🔴 ${routeData.path[index]}</b><br>Destination`;
        }

        const marker = L.marker(coord, { icon }).addTo(map);
        marker.bindPopup(popupText);
        markersRef.current.push(marker);
      });

      // Fit map to the cities first so the user sees something immediately,
      // even while the road geometry is still being fetched.
      const bounds = L.latLngBounds(routeData.coordinates);
      map.fitBounds(bounds, { padding: [50, 50] });

      // Prefer the road geometry already computed by the backend (keeps the
      // drawn line consistent with the reported distance/time). Otherwise fetch
      // it here, and fall back to straight lines if routing is unavailable.
      const roadPath =
        routeData.geometry && routeData.geometry.length > 1
          ? routeData.geometry
          : await fetchRoadGeometry(routeData.coordinates);

      // A newer route may have been requested while we were fetching.
      if (cancelled || !mapInstanceRef.current) return;

      // Draw polyline following the real road network
      const polyline = L.polyline(roadPath, {
        color: "#3b82f6",
        weight: 5,
        opacity: 0.8,
        smoothFactor: 1,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(map);

      polyline.bindPopup(
        `<b>📊 Route Information</b><br>` +
        `Distance: ${routeData.distance.toFixed(2)} km<br>` +
        `Est. Time: ${routeData.time}<br>` +
        `Cities: ${routeData.path.length}`
      );

      polylineRef.current = polyline;

      // Re-fit to the full road geometry so the whole route is visible
      map.fitBounds(L.latLngBounds(roadPath), { padding: [50, 50] });
    });

    return () => {
      cancelled = true;
    };
  }, [routeData]);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 z-10 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-bold text-gray-700">Finding best route...</p>
            <p className="text-sm text-gray-600 mt-2">Using Dijkstra&apos;s algorithm with ML prediction</p>
          </div>
        </div>
      )}

      {!routeData && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-xl font-bold text-gray-800 mb-2">Ready to Navigate India!</p>
            <p className="text-sm text-gray-600 mb-4">Select cities from Quick Select or type them manually</p>
            <div className="bg-white rounded-lg p-4 shadow-md max-w-md mx-auto">
              <p className="text-xs font-semibold text-gray-700 mb-2">✨ Features:</p>
              <ul className="text-xs text-gray-600 space-y-1 text-left">
                <li>✅ 105 Indian cities with real coordinates</li>
                <li>✅ 153 real highway connections</li>
                <li>✅ ML-powered time predictions (99.42% accuracy)</li>
                <li>✅ Dijkstra&apos;s shortest path algorithm</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full rounded-lg" />

      {routeData && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-xl p-4 z-[1000] border-2 border-primary-300">
          <p className="text-xs font-bold text-gray-700 mb-2">📍 Route Legend:</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs font-semibold text-gray-700">Start Point</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-xs font-semibold text-gray-700">Via Cities</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs font-semibold text-gray-700">Destination</span>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-300">
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-blue-500 rounded"></div>
                <span className="text-xs font-semibold text-gray-700">Route Path</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
