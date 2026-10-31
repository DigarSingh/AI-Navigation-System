"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { RouteData } from "@/app/page";
import {
  Loader2,
  LocateFixed,
  Layers,
  Map as MapIcon,
  Globe,
  Mountain,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getRouteTollPlazas, TollPlaza } from "@/lib/tolls";
import { getRouteAmenities, HighwayAmenity } from "@/lib/amenities";

interface MapViewProps {
  routeData: RouteData | null;
  loading: boolean;
  theme?: "light" | "dark";
  userLocation?: [number, number] | null;
  onLocateMe?: () => void;
  locating?: boolean;
  isNavigating?: boolean;
  activeCarPosition?: [number, number] | null;
  carHeading?: number;
  isMapFollowActive?: boolean;
  onUserFollowChange?: (following: boolean) => void;
}

type MapType = "streets" | "satellite" | "terrain";

/**
 * Fetch real driving road geometry via OSRM routing service
 */
async function fetchRoadGeometry(
  coords: [number, number][]
): Promise<[number, number][]> {
  if (!coords || coords.length < 2) return coords;

  try {
    const waypoints = coords.map((c) => `${c[1]},${c[0]}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM responded ${res.status}`);

    const data = await res.json();
    const geometry = data?.routes?.[0]?.geometry?.coordinates as
      | [number, number][]
      | undefined;

    if (data?.code === "Ok" && geometry && geometry.length > 0) {
      return geometry.map(([lon, lat]) => [lat, lon] as [number, number]);
    }
  } catch (err) {
    console.warn("Road routing unavailable, using straight line:", err);
  }

  return coords;
}

export default function MapView({
  routeData,
  loading,
  theme = "light",
  userLocation = null,
  onLocateMe,
  locating = false,
  isNavigating = false,
  activeCarPosition = null,
  carHeading = 0,
  isMapFollowActive = true,
  onUserFollowChange,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const currentTileLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const tollMarkersRef = useRef<any[]>([]);
  const amenityMarkersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const userMarkerRef = useRef<any[]>([]);
  const navCarMarkerRef = useRef<any>(null);
  const prevNavigatingRef = useRef<boolean>(false);
  const isNavigatingRef = useRef<boolean>(isNavigating);
  const onUserFollowChangeRef = useRef<((following: boolean) => void) | undefined>(onUserFollowChange);

  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

  useEffect(() => {
    onUserFollowChangeRef.current = onUserFollowChange;
  }, [onUserFollowChange]);

  // Cached points of interest along active route
  const tollsDataRef = useRef<TollPlaza[]>([]);
  const amenitiesDataRef = useRef<HighwayAmenity[]>([]);

  // Map Type Selection State (Default / Satellite / Terrain)
  const [mapType, setMapType] = useState<MapType>("streets");
  const [showMapTypeMenu, setShowMapTypeMenu] = useState<boolean>(false);

  // Amenity and Toll Visibility Toggles
  const [showTolls, setShowTolls] = useState(true);
  const [showFuel, setShowFuel] = useState(true);
  const [showCng, setShowCng] = useState(true);
  const [showEv, setShowEv] = useState(true);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);

  // Auto-collapse legend on small mobile screens to keep map clean and visible
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsLegendCollapsed(true);
    }
  }, []);

  // Toggle All Amenities / Tolls on route
  const toggleAllAmenities = () => {
    const anyActive = showTolls || showFuel || showCng || showEv;
    setShowTolls(!anyActive);
    setShowFuel(!anyActive);
    setShowCng(!anyActive);
    setShowEv(!anyActive);
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (!mapInstanceRef.current && mapRef.current) {
        const map = L.map(mapRef.current).setView([22.5, 79.5], 5);

        const defaultTiles = L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }
        ).addTo(map);

        map.on("dragstart", () => {
          if (isNavigatingRef.current) {
            onUserFollowChangeRef.current?.(false);
          }
        });

        currentTileLayerRef.current = defaultTiles;
        mapInstanceRef.current = map;

        setTimeout(() => map.invalidateSize(), 150);
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle Dynamic Map Types (Default Streets, Satellite, Terrain)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;

      if (currentTileLayerRef.current) {
        map.removeLayer(currentTileLayerRef.current);
      }

      let tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      let tileAttribution =
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      let maxTileZoom = 19;

      if (mapType === "satellite") {
        tileUrl =
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
        tileAttribution =
          "Tiles &copy; Esri, Maxar, Earthstar Geographics, CNES/Airbus DS";
        maxTileZoom = 19;
      } else if (mapType === "terrain") {
        tileUrl =
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
        tileAttribution = "Tiles &copy; Esri &mdash; Sources: USGS, Esri";
        maxTileZoom = 19;
      }

      const layer = L.tileLayer(tileUrl, {
        attribution: tileAttribution,
        maxZoom: maxTileZoom,
      }).addTo(map);

      currentTileLayerRef.current = layer;

      const tilePane = map.getContainer().querySelector(".leaflet-tile-pane");
      if (tilePane) {
        if (mapType === "streets") {
          tilePane.classList.add("filter-streets");
        } else {
          tilePane.classList.remove("filter-streets");
        }
      }
    });
  }, [mapType, theme]);

  // Center/Fly to User / Car Location
  const handleCenterOnUser = () => {
    if (isNavigating && activeCarPosition && mapInstanceRef.current) {
      onUserFollowChangeRef.current?.(true);
      mapInstanceRef.current.flyTo(activeCarPosition, 17, { duration: 1.2 });
      return;
    }
    const target = userLocation;
    if (target && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(target, 11, { duration: 1.2 });
      if (!isNavigating && userMarkerRef.current && userMarkerRef.current.length > 1) {
        userMarkerRef.current[1].openPopup();
      }
    } else if (onLocateMe) {
      onLocateMe();
    }
  };

  // Google Maps Style User GPS Location Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;

      userMarkerRef.current.forEach((m) => m.remove());
      userMarkerRef.current = [];

      if (!userLocation) return;

      const accuracyCircle = L.circle(userLocation, {
        radius: 3000,
        stroke: true,
        weight: 1.5,
        color: "#4285F4",
        fill: true,
        fillColor: "#4285F4",
        fillOpacity: 0.15,
      }).addTo(map);

      const googleMapsDot = L.divIcon({
        className: "gmaps-location-marker",
        html: `
          <div class="gmaps-location-pulse" style="position: absolute; top: -8px; left: -8px; width: 40px; height: 40px; border-radius: 50%; background: rgba(66, 133, 244, 0.45); pointer-events: none;"></div>
          <div class="gmaps-location-dot" style="position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background-color: #1a73e8; border: 3px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.45);"></div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14],
      });

      const userMarker = L.marker(userLocation, {
        icon: googleMapsDot,
        zIndexOffset: 1500,
      }).addTo(map);

      userMarker.bindPopup(`
        <div style="text-align: center; font-family: sans-serif; padding: 3px;">
          <div style="font-weight: 800; font-size: 13px; color: #1a73e8; display: flex; items-center; justify-content: center; gap: 4px;">
            <span>📍</span> Your Current Location
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
            ${userLocation[0].toFixed(4)}° N, ${userLocation[1].toFixed(4)}° E
          </div>
          <div style="font-size: 11px; font-weight: 700; color: #16a34a; margin-top: 4px;">
            ● GPS Device Active
          </div>
        </div>
      `);

      userMarkerRef.current.push(accuracyCircle, userMarker);

      // Fly to user location when updated (only if not actively navigating)
      if (!isNavigating) {
        map.flyTo(userLocation, 11, { duration: 1.2 });
      }
    });
  }, [userLocation, isNavigating]);

  // Handle Live Navigation Vehicle Position, Heading, & Road View Zoom
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;

      // Handle Exiting or Inactive Navigation
      if (!isNavigating || !activeCarPosition) {
        if (navCarMarkerRef.current) {
          navCarMarkerRef.current.remove();
          navCarMarkerRef.current = null;
        }

        // When user stops/exits navigation: smoothly fly back out to full route overview
        if (prevNavigatingRef.current) {
          prevNavigatingRef.current = false;
          if (polylineRef.current) {
            map.fitBounds(polylineRef.current.getBounds(), {
              padding: [50, 50],
              maxZoom: 14,
              animate: true,
              duration: 1.2,
            });
          }
        }
        return;
      }

      const isStartingNavigation = !prevNavigatingRef.current && isNavigating;
      prevNavigatingRef.current = true;

      const carIcon = L.divIcon({
        className: "nav-car-icon-wrapper",
        html: `
          <div class="nav-car-rotator" style="transform: rotate(${carHeading}deg); transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); width: 44px; height: 44px; position: relative;">
            <div class="nav-vehicle-beam"></div>
            <div class="nav-vehicle-indicator">
              <div class="nav-vehicle-chevron"></div>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      if (!navCarMarkerRef.current) {
        navCarMarkerRef.current = L.marker(activeCarPosition, {
          icon: carIcon,
          zIndexOffset: 2500,
        }).addTo(map);
      } else {
        navCarMarkerRef.current.setLatLng(activeCarPosition);
        navCarMarkerRef.current.setIcon(carIcon);
      }

      // When starting navigation or if zoomed out: zoom straight into starting point at road view (Zoom 17)
      if (isStartingNavigation) {
        onUserFollowChangeRef.current?.(true);
        map.flyTo(activeCarPosition, 17, {
          animate: true,
          duration: 1.6,
          easeLinearity: 0.25,
        });
      } else if (isMapFollowActive) {
        if (map.getZoom() < 16) {
          map.flyTo(activeCarPosition, 17, {
            animate: true,
            duration: 1.2,
            easeLinearity: 0.25,
          });
        } else {
          // While cruising along the road at zoom 16-17, smoothly pan to follow vehicle
          map.panTo(activeCarPosition, {
            animate: true,
            duration: 0.5,
            noMoveStart: true,
          });
        }
      }
    });
  }, [isNavigating, activeCarPosition, carHeading, isMapFollowActive]);

  // Handle Base Route Calculation & Polyline Drawing
  useEffect(() => {
    if (!routeData || !routeData.coordinates || !mapInstanceRef.current) return;

    let cancelled = false;

    import("leaflet").then(async (L) => {
      const map = mapInstanceRef.current;

      // Clear existing city markers & polyline
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }

      const greenIcon = L.icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const blueIcon = L.icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const redIcon = L.icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      // Markers for each city
      routeData.coordinates.forEach((coord, index) => {
        let icon = blueIcon;
        let popupText = `<b>🔵 ${routeData.path[index]}</b><br>Via point #${index}`;

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

      // Road geometry
      const roadPath =
        routeData.geometry &&
        routeData.geometry.length > routeData.coordinates.length
          ? routeData.geometry
          : await fetchRoadGeometry(routeData.coordinates);

      if (cancelled || !mapInstanceRef.current) return;

      // Draw highway polyline (clean and bold)
      const polyline = L.polyline(roadPath, {
        color:
          mapType === "satellite"
            ? "#38bdf8"
            : theme === "dark"
            ? "#60a5fa"
            : "#2563eb",
        weight: 6,
        opacity: 0.95,
        smoothFactor: 1,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(map);

      polyline.bindPopup(
        `<b>Route Details</b><br>` +
          `Distance: ${routeData.distance.toFixed(2)} km<br>` +
          `Est. Travel Time: ${routeData.time}<br>` +
          `Connected Cities: ${routeData.path.length}`
      );

      polylineRef.current = polyline;

      // Cache toll plazas and amenities for instantaneous toggle without re-fetching
      tollsDataRef.current = getRouteTollPlazas(roadPath, routeData.distance);
      amenitiesDataRef.current = getRouteAmenities(roadPath, routeData.distance);

      // Refit bounds
      if (!isNavigating) {
        const boundsToFit = userLocation
          ? L.latLngBounds([...roadPath, userLocation])
          : L.latLngBounds(roadPath);
        map.fitBounds(boundsToFit, { padding: [50, 50] });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [routeData, theme, userLocation, isNavigating, mapType]);

  // Handle Instantaneous Amenities & Toll Markers Rendering (Allows User to Toggle On/Off to Unhide Route)
  useEffect(() => {
    if (!mapInstanceRef.current || !routeData) return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;

      // Clear existing markers
      tollMarkersRef.current.forEach((m) => m.remove());
      tollMarkersRef.current = [];
      amenityMarkersRef.current.forEach((m) => m.remove());
      amenityMarkersRef.current = [];

      // 1. Render NHAI Toll Plazas if toggled ON
      if (showTolls) {
        const tollIcon = L.divIcon({
          className: "nhai-toll-icon-wrapper",
          html: `<div class="nhai-toll-badge" title="NHAI FASTag Toll Plaza">₹</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          popupAnchor: [0, -14],
        });

        tollsDataRef.current.forEach((plaza) => {
          const tollMarker = L.marker(plaza.coordinate, {
            icon: tollIcon,
            zIndexOffset: 800,
          }).addTo(map);

          tollMarker.bindPopup(`
            <div style="font-family: sans-serif; padding: 3px; min-width: 175px;">
              <div style="font-weight: 800; font-size: 13px; color: #b45309; display: flex; align-items: center; gap: 4px;">
                <span>🟡</span> ${plaza.name}
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                Corridor: <strong>${plaza.highway}</strong>
              </div>
              ${
                plaza.distanceFromStartKm
                  ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 1px;">Route location: ~${plaza.distanceFromStartKm} km along highway</div>`
                  : ""
              }
              <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 3px;">
                Car/SUV FASTag: ₹${plaza.standardFeeInr}
              </div>
              <div style="font-size: 10px; font-weight: 700; color: #16a34a; margin-top: 2px;">
                ● Motorcycles: 100% Toll-Exempt (MoRTH)
              </div>
            </div>
          `);

          tollMarkersRef.current.push(tollMarker);
        });
      }

      // 2. Render Fuel, CNG, and EV Amenities if toggled ON
      amenitiesDataRef.current.forEach((amenity) => {
        if (amenity.type === "fuel" && !showFuel) return;
        if (amenity.type === "cng" && !showCng) return;
        if (amenity.type === "ev" && !showEv) return;

        let badgeHtml = "⛽";
        let badgeClass = "fuel-station-badge";
        let headerColor = "#1d4ed8";

        if (amenity.type === "cng") {
          badgeHtml = "CNG";
          badgeClass = "cng-station-badge";
          headerColor = "#15803d";
        } else if (amenity.type === "ev") {
          badgeHtml = "⚡";
          badgeClass = "ev-station-badge";
          headerColor = "#6d28d9";
        }

        const icon = L.divIcon({
          className: "amenity-icon-wrapper",
          html: `<div class="${badgeClass}" title="${amenity.name}">${badgeHtml}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -14],
        });

        const amenityMarker = L.marker(amenity.coordinate, {
          icon,
          zIndexOffset: 700,
        }).addTo(map);

        amenityMarker.bindPopup(`
          <div style="font-family: sans-serif; padding: 3px; min-width: 185px;">
            <div style="font-weight: 800; font-size: 13px; color: ${headerColor}; display: flex; align-items: center; gap: 4px;">
              <span>${amenity.type === "fuel" ? "⛽" : amenity.type === "cng" ? "🟢" : "⚡"}</span> ${amenity.name}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              Brand: <strong>${amenity.brand}</strong> &bull; ~${amenity.distanceFromStartKm} km
            </div>
            <div style="font-size: 10px; color: #475569; margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 3px; line-height: 1.4;">
              ${amenity.facilities.map((f) => `<div>• ${f}</div>`).join("")}
            </div>
          </div>
        `);

        amenityMarkersRef.current.push(amenityMarker);
      });
    });
  }, [showTolls, showFuel, showCng, showEv, routeData]);

  return (
    <div className="relative w-full h-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md z-[1000] flex items-center justify-center">
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
              Calculating fastest highway route...
            </p>
          </div>
        </div>
      )}

      {/* Initial Map Prompt */}
      {!routeData && !loading && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[1000] pointer-events-none max-w-md w-full px-4">
          <div className="glass-panel rounded-2xl p-4 text-center pointer-events-auto">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">
              Select Route or Use Live Location
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
              Choose starting & destination cities across our 105-city Indian highway network.
            </p>
            <div className="glass-card rounded-xl p-2.5 text-left text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
              <p className="font-bold text-gray-700 dark:text-gray-200">Network Highlights:</p>
              <p>• 105 Indian cities connected across 161 national highway corridors</p>
              <p>• Highway fuel stations, CNG gas pumps & EV fast chargers</p>
              <p>• Official NHAI Toll Plazas with FASTag rates and 2-wheeler toll exemption</p>
            </div>
          </div>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full" />

      {/* Map Legend (Top-Right) with Interactive Show/Hide Toggles */}
      <div
        className={`absolute ${
          isNavigating ? "top-28 sm:top-4" : "top-3 sm:top-4"
        } right-3 sm:right-4 glass-panel rounded-2xl p-2.5 sm:p-3 z-[1000] text-xs max-w-[210px] sm:max-w-[245px] transition-all shadow-2xl`}
      >
        {/* Header with Minimize/Collapse Toggle */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
          <span className="font-bold text-gray-800 dark:text-gray-200 text-[11px] uppercase tracking-wider">
            Map Legend
          </span>
          <button
            type="button"
            onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
            className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-500 transition"
            title={isLegendCollapsed ? "Expand legend" : "Collapse legend"}
          >
            {isLegendCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

          {!isLegendCollapsed && (
            <div className="space-y-1.5">
                {userLocation && (
                  <div className="flex items-center gap-2 py-0.5">
                    <div className="w-3 h-3 rounded-full bg-blue-600 ring-2 ring-white shadow-sm flex-shrink-0"></div>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">Your Location</span>
                  </div>
                )}
                <div className="flex items-center gap-2 py-0.5">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Start Point</span>
                </div>
                <div className="flex items-center gap-2 py-0.5">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0"></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Destination</span>
                </div>

                {/* Highway Route */}
                <div className="flex items-center gap-2 py-0.5">
                  <div className="w-5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full flex-shrink-0"></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Highway Route</span>
                </div>

              {/* Interactive Amenities Toggle Section (Allows Hiding to reveal clean route) */}
              {routeData && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Route Overlays
                    </span>
                    <button
                      type="button"
                      onClick={toggleAllAmenities}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {showTolls || showFuel || showCng || showEv ? "Hide All" : "Show All"}
                    </button>
                  </div>

                  {/* NHAI Toll Plaza Toggle */}
                  <label className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 shadow-sm">
                        ₹
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">NHAI Toll (₹)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showTolls}
                      onChange={(e) => setShowTolls(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                    />
                  </label>

                  {/* Fuel Station Toggle */}
                  <label className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center flex-shrink-0 shadow-sm">
                        ⛽
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Fuel Station</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showFuel}
                      onChange={(e) => setShowFuel(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                    />
                  </label>

                  {/* Gas Station (CNG) Toggle */}
                  <label className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[7.5px] font-black flex items-center justify-center flex-shrink-0 shadow-sm">
                        CNG
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Gas Station (CNG)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showCng}
                      onChange={(e) => setShowCng(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                    />
                  </label>

                  {/* EV Fast Charger Toggle */}
                  <label className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] flex items-center justify-center flex-shrink-0 shadow-sm">
                        ⚡
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">EV Fast Charger</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showEv}
                      onChange={(e) => setShowEv(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

      {/* Floating Map Controls (Bottom-Right: Map Type Layers & My Location) */}
      <div
        className={`absolute ${
          isNavigating
            ? "bottom-36 sm:bottom-6"
            : routeData
            ? "bottom-24 sm:bottom-6"
            : "bottom-6"
        } right-3 sm:right-4 z-[1000] flex flex-col items-end gap-2.5 sm:gap-3 pointer-events-auto transition-all`}
      >
          {/* Map Type (Layers) Quick Selector Button */}
          <div className="relative">
            {showMapTypeMenu && (
              <div className="absolute bottom-0 right-14 glass-panel rounded-2xl p-2.5 shadow-2xl flex items-center gap-2 border border-white/60 dark:border-white/10 z-[1001] animate-in fade-in slide-in-from-right-4 duration-200 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => {
                    setMapType("streets");
                    setShowMapTypeMenu(false);
                  }}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl text-[11px] font-bold transition ${
                    mapType === "streets"
                      ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-400"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <div className="w-12 h-10 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-200 dark:bg-slate-700">
                    <MapIcon className="w-5 h-5 text-blue-500" />
                  </div>
                  <span>Default</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMapType("satellite");
                    setShowMapTypeMenu(false);
                  }}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl text-[11px] font-bold transition ${
                    mapType === "satellite"
                      ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-400"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <div className="w-12 h-10 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 flex items-center justify-center bg-emerald-950 text-emerald-300">
                    <Globe className="w-5 h-5" />
                  </div>
                  <span>Satellite</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMapType("terrain");
                    setShowMapTypeMenu(false);
                  }}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl text-[11px] font-bold transition ${
                    mapType === "terrain"
                      ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-400"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <div className="w-12 h-10 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 flex items-center justify-center bg-amber-950 text-amber-300">
                    <Mountain className="w-5 h-5" />
                  </div>
                  <span>Terrain</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowMapTypeMenu(!showMapTypeMenu)}
              className="w-12 h-12 rounded-2xl glass-panel hover:bg-white dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 shadow-2xl flex items-center justify-center transition transform active:scale-95 border border-white/60 dark:border-white/10 group"
              title="Change Map View (Default, Satellite, Terrain)"
            >
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:rotate-12 transition-transform" />
            </button>
          </div>

          {/* Locate Me Button */}
          <button
            type="button"
            onClick={handleCenterOnUser}
            disabled={locating}
            className="w-12 h-12 rounded-2xl glass-panel hover:bg-white dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 shadow-2xl flex items-center justify-center transition transform active:scale-95 disabled:opacity-50 border border-white/60 dark:border-white/10"
            title={userLocation ? "Center map on your location" : "Locate your position"}
          >
            {locating ? (
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
            ) : (
              <LocateFixed
                className={`w-5 h-5 ${
                  userLocation
                    ? "text-blue-600 dark:text-blue-400 fill-blue-100 dark:fill-blue-950"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              />
            )}
          </button>
        </div>
    </div>
  );
}
