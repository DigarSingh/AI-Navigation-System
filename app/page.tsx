"use client";

import { useState, useEffect, useRef } from "react";
import NavigationForm from "@/components/NavigationForm";
import MapView from "@/components/MapView";
import RouteDetails from "@/components/RouteDetails";
import NavigationHUD from "@/components/NavigationHUD";
import { findNearestCity, ALL_CITIES } from "@/lib/cities";
import {
  Compass,
  Sun,
  Moon,
  List,
  Map as MapIcon,
  ChevronDown,
  ChevronUp,
  Navigation,
} from "lucide-react";

export interface AlternateRouteDetail {
  path: string[];
  distance: number;
  time: string;
  hours: number;
  method: string;
  coordinates?: [number, number][];
  geometry?: [number, number][];
}

export interface RouteStep {
  instruction: string;
  distance_km: number;
  duration?: string;
  type?: string;
  modifier?: string;
}

export interface RouteData {
  path: string[];
  distance: number;
  time: string;
  coordinates: [number, number][];
  geometry?: [number, number][];
  steps?: RouteStep[];
  alternate_routes?: string[][];
  alternate_route_details?: AlternateRouteDetail[];
  prediction_method?: string;
  predicted_hours?: number;
  ml_estimated_time?: string;
  osrm_estimated_time?: string | null;
  source?: string;
  destination?: string;
}

function computeHeading(c1: [number, number], c2: [number, number]): number {
  const dLon = ((c2[1] - c1[1]) * Math.PI) / 180;
  const lat1 = (c1[0] * Math.PI) / 180;
  const lat2 = (c2[0] * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export default function Home() {
  const [optimalRouteData, setOptimalRouteData] = useState<RouteData | null>(null);
  const [displayedRouteData, setDisplayedRouteData] = useState<RouteData | null>(null);
  const [isAlternateSelected, setIsAlternateSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // GPS real-time user location state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isUsingGpsSource, setIsUsingGpsSource] = useState(false);
  const [locating, setLocating] = useState(false);
  const [externalSource, setExternalSource] = useState("");
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  // Mobile drawer / sheet visibility toggle
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  // Turn-by-Turn Live GPS Navigation Mode state
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [activeCarPosition, setActiveCarPosition] = useState<[number, number] | null>(null);
  const [carHeading, setCarHeading] = useState(0);

  const watchIdRef = useRef<number | null>(null);

  // Initialize theme on mount from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("ai_nav_theme") as "light" | "dark" | null;
    const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");

    setTheme(initialTheme);
    applyThemeClass(initialTheme);

    // Auto-detect with device GPS if browser permission is already granted
    if (typeof window !== "undefined" && navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((permissionStatus) => {
          if (permissionStatus.state === "granted") {
            handleLocateMe();
          }
          permissionStatus.onchange = () => {
            if (permissionStatus.state === "granted") {
              handleLocateMe();
            }
          };
        })
        .catch(() => { });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyThemeClass = (newTheme: "light" | "dark") => {
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("ai_nav_theme", nextTheme);
    applyThemeClass(nextTheme);
  };

  // Web Speech API - Voice Guidance
  const speakInstruction = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = "en-IN";
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
    }
  };

  // Helper to apply detected coordinates to map and form
  const applyDetectedLocation = (latitude: number, longitude: number, label: string) => {
    setUserLocation([latitude, longitude]);
    const nearest = findNearestCity(latitude, longitude);
    setExternalSource("Your Location");
    setIsUsingGpsSource(true);
    setGpsNotice(
      `${label}: Active (${nearest.city} hub • ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E)`
    );
    setLocating(false);
  };

  // Trigger automatic device GPS detection without manual modals
  const handleLocateMe = () => {
    setLocating(true);
    setGpsNotice("Acquiring real-time position with device GPS...");

    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsNotice("Geolocation is not supported by your browser.");
      setLocating(false);
      return;
    }

    let resolved = false;
    let watchId: number | null = null;

    const stopTracking = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const handleSuccess = (pos: GeolocationPosition) => {
      if (resolved) return;
      resolved = true;
      stopTracking();
      const { latitude, longitude } = pos.coords;
      applyDetectedLocation(latitude, longitude, "Device GPS");
    };

    const handleError = (err: GeolocationPositionError) => {
      if (resolved) return;
      // If initial getCurrentPosition fails or times out, try watchPosition with standard accuracy
      if (watchId === null) {
        watchId = navigator.geolocation.watchPosition(
          handleSuccess,
          (watchErr) => {
            if (resolved) return;
            resolved = true;
            stopTracking();
            let msg = "Could not acquire device GPS.";
            if (watchErr.code === watchErr.PERMISSION_DENIED) {
              msg = "Location permission blocked. Please allow location access in your browser address bar.";
            } else if (watchErr.code === watchErr.TIMEOUT) {
              msg = "GPS request timed out. Please click GPS to retry.";
            } else if (watchErr.code === watchErr.POSITION_UNAVAILABLE) {
              msg = "Device location unavailable. Please ensure device location/Wi-Fi is enabled.";
            }
            setGpsNotice(msg);
            setLocating(false);
          },
          { enableHighAccuracy: false, timeout: 25000, maximumAge: 60000 }
        );
      }
    };

    // Attempt 1: High accuracy GPS with 15s timeout
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Start Live Turn-by-Turn GPS Navigation Mode
  const handleStartNavigation = () => {
    if (!displayedRouteData) return;

    setIsNavigating(true);
    setCurrentStepIndex(0);
    setIsMobilePanelOpen(false);

    // When origin is GPS current location, start car position directly from userLocation
    const isGpsOrigin =
      isUsingGpsSource ||
      (displayedRouteData.path &&
        displayedRouteData.path[0]?.toLowerCase().includes("location"));

    const startingPoint: [number, number] =
      isGpsOrigin && userLocation
        ? userLocation
        : displayedRouteData.geometry && displayedRouteData.geometry.length > 0
        ? displayedRouteData.geometry[0]
        : displayedRouteData.coordinates[0];

    setActiveCarPosition(startingPoint);

    // Initial vehicle heading oriented down the road
    if (displayedRouteData.geometry && displayedRouteData.geometry.length > 1) {
      const heading = computeHeading(
        displayedRouteData.geometry[0],
        displayedRouteData.geometry[1]
      );
      setCarHeading(heading);
    } else if (
      displayedRouteData.coordinates &&
      displayedRouteData.coordinates.length > 1
    ) {
      const heading = computeHeading(
        displayedRouteData.coordinates[0],
        displayedRouteData.coordinates[1]
      );
      setCarHeading(heading);
    }

    const firstInstruction =
      displayedRouteData.steps && displayedRouteData.steps.length > 0
        ? displayedRouteData.steps[0].instruction
        : `Head towards ${displayedRouteData.path[1] || displayedRouteData.path[0]}`;

    speakInstruction(`Starting live navigation towards ${displayedRouteData.destination || "destination"}. ${firstInstruction}`);

    // Real device GPS tracking via Geolocation watchPosition
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setActiveCarPosition([lat, lon]);
          if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
            setCarHeading(pos.coords.heading);
          }
        },
        (err) => console.log("Live GPS tracking notice:", err),
        { enableHighAccuracy: true, maximumAge: 2000 }
      );
    }
  };

  // Exit Navigation Mode
  const handleExitNavigation = () => {
    setIsNavigating(false);
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Next / Prev Step Controls
  const handleNextStep = () => {
    if (!displayedRouteData?.steps) return;
    if (currentStepIndex < displayedRouteData.steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      speakInstruction(displayedRouteData.steps[nextIdx].instruction);

      // Advance vehicle position and heading along road geometry
      if (displayedRouteData.geometry && displayedRouteData.geometry.length > 1) {
        const fraction = nextIdx / (displayedRouteData.steps.length - 1);
        const geoIdx = Math.min(
          Math.floor(fraction * (displayedRouteData.geometry.length - 1)),
          displayedRouteData.geometry.length - 1
        );
        const coord = displayedRouteData.geometry[geoIdx];
        setActiveCarPosition(coord);
        if (geoIdx < displayedRouteData.geometry.length - 1) {
          const heading = computeHeading(
            coord,
            displayedRouteData.geometry[geoIdx + 1]
          );
          setCarHeading(heading);
        }
      }
    }
  };

  const handlePrevStep = () => {
    if (!displayedRouteData?.steps) return;
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      speakInstruction(displayedRouteData.steps[prevIdx].instruction);

      // Move vehicle position and heading back along road geometry
      if (displayedRouteData.geometry && displayedRouteData.geometry.length > 1) {
        const fraction = prevIdx / (displayedRouteData.steps.length - 1);
        const geoIdx = Math.min(
          Math.floor(fraction * (displayedRouteData.geometry.length - 1)),
          displayedRouteData.geometry.length - 1
        );
        const coord = displayedRouteData.geometry[geoIdx];
        setActiveCarPosition(coord);
        if (geoIdx < displayedRouteData.geometry.length - 1) {
          const heading = computeHeading(
            coord,
            displayedRouteData.geometry[geoIdx + 1]
          );
          setCarHeading(heading);
        }
      }
    }
  };

  const handleToggleVoice = () => {
    const nextVoice = !voiceEnabled;
    setVoiceEnabled(nextVoice);
    if (!nextVoice && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Clean up GPS tracking on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Coordinate lookup for path waypoints
  const getCoordinatesForPath = (path: string[], fallbackCoords: [number, number][]): [number, number][] => {
    if (!optimalRouteData) return fallbackCoords;
    const cityCoordMap = new Map<string, [number, number]>();
    optimalRouteData.path.forEach((city, idx) => {
      if (optimalRouteData.coordinates[idx]) {
        cityCoordMap.set(city, optimalRouteData.coordinates[idx]);
      }
    });

    const coords: [number, number][] = [];
    for (let i = 0; i < path.length; i++) {
      const city = path[i];
      if (i === 0 && (isUsingGpsSource || city.toLowerCase().includes("location")) && userLocation) {
        coords.push(userLocation);
      } else {
        const c = cityCoordMap.get(city);
        if (c) {
          coords.push(c);
        }
      }
    }
    return coords.length === path.length ? coords : fallbackCoords;
  };

  const handleFindRoute = async (source: string, destination: string) => {
    setLoading(true);
    setError(null);
    setOptimalRouteData(null);
    setDisplayedRouteData(null);
    setIsAlternateSelected(false);
    setIsNavigating(false);

    // Check if source represents GPS location
    const isGpsOrigin =
      isUsingGpsSource ||
      source.trim().toLowerCase() === "your location" ||
      source.trim().toLowerCase().includes("gps") ||
      source.trim().toLowerCase().includes("current location") ||
      source.trim().toLowerCase().includes("my location");

    setIsUsingGpsSource(isGpsOrigin);

    try {
      const bodyPayload: {
        source: string;
        destination: string;
        userCoord?: [number, number];
      } = { source, destination };

      if (isGpsOrigin && userLocation) {
        bodyPayload.userCoord = userLocation;
      }

      const response = await fetch("/api/shortest-path", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to find route");
      }

      setOptimalRouteData(data);
      setDisplayedRouteData(data);
      // On mobile, collapse details panel after finding route so map & route are immediately visible
      setIsMobilePanelOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAlternate = (alt: AlternateRouteDetail) => {
    if (!optimalRouteData) return;

    const altCoords =
      alt.coordinates && alt.coordinates.length > 0
        ? alt.coordinates
        : getCoordinatesForPath(alt.path, optimalRouteData.coordinates);

    const altGeometry =
      alt.geometry && alt.geometry.length > alt.path.length
        ? alt.geometry
        : undefined;

    setDisplayedRouteData({
      ...optimalRouteData,
      path: alt.path,
      distance: alt.distance,
      time: alt.time,
      coordinates: altCoords,
      geometry: altGeometry,
      prediction_method: alt.method,
    });
    setIsAlternateSelected(true);
    setIsNavigating(false);
  };

  const handleResetToOptimal = () => {
    if (!optimalRouteData) return;
    setDisplayedRouteData(optimalRouteData);
    setIsAlternateSelected(false);
    setIsNavigating(false);
  };

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <main className="h-screen h-[100dvh] w-screen flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors font-sans relative">
        {/* Ambient background glow orbs for glassmorphism reflections */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Top Floating Glass Header / Navbar - Hidden during live route navigation */}
        {!isNavigating && (
          <header className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between z-30 transition-all flex-shrink-0 glass-panel border-b border-white/50 dark:border-white/10 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    NavIndia
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full glass-card text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                    NHAI Highway Network
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* GPS live indicator badge - Click to detect device GPS */}
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={locating}
                className="hidden md:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full glass-card hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-white/60 dark:border-white/10 shadow-xs transition cursor-pointer"
                title="Detect automatically using device GPS"
              >
                <span
                  className={`w-2 h-2 rounded-full ${locating
                      ? "bg-amber-500 animate-ping"
                      : userLocation
                        ? "bg-blue-500 animate-pulse"
                        : "bg-emerald-500"
                    }`}
                />
                <span>
                  {locating
                    ? "Acquiring GPS..."
                    : userLocation
                      ? `📍 ${externalSource || "GPS Active"}`
                      : "Detect Device GPS"}
                </span>
              </button>

              {/* Dark / Light Mode Switcher */}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-card hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-xs border border-white/60 dark:border-white/10"
                title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
              >
                {theme === "light" ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-700" />
                    <span>Dark</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Light</span>
                  </>
                )}
              </button>
            </div>
          </header>
        )}

        {/* Main Application Canvas */}
        <div className="flex-1 w-full h-full relative overflow-hidden">
          {/* Full-Screen Map Canvas - Runs behind everything so glass can blur it! */}
          <div className="absolute inset-0 z-0">
            <MapView
              routeData={displayedRouteData}
              loading={loading}
              theme={theme}
              userLocation={userLocation}
              onLocateMe={handleLocateMe}
              locating={locating}
              isNavigating={isNavigating}
              activeCarPosition={activeCarPosition}
              carHeading={carHeading}
            />
          </div>

          {/* Mobile Map / Route Details Toggle Pill */}
          {!isNavigating && displayedRouteData && (
            <button
              type="button"
              onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
              className="sm:hidden absolute top-3 left-3 z-30 px-3.5 py-2 rounded-full glass-panel shadow-lg border border-white/60 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 active:scale-95 touch-manipulation backdrop-blur-md"
              title={isMobilePanelOpen ? "View Map" : "View Route Details"}
            >
              {isMobilePanelOpen ? (
                <>
                  <MapIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>View Map</span>
                </>
              ) : (
                <>
                  <List className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Route Details</span>
                </>
              )}
            </button>
          )}

          {/* Left Floating Frosted Glass Card - Floats directly on top of the interactive map */}
          {!isNavigating && (
            <aside
              className={`
                absolute z-20 flex flex-col glass-panel shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] overflow-y-auto no-scrollbar transition-all border border-white/60 dark:border-white/10
                ${
                  displayedRouteData
                    ? isMobilePanelOpen
                      ? "top-2 left-2 right-2 bottom-2 sm:top-4 sm:left-4 sm:bottom-4 sm:right-auto sm:w-[430px] rounded-3xl flex"
                      : "hidden sm:flex sm:top-4 sm:left-4 sm:bottom-4 sm:w-[430px] rounded-3xl"
                    : "top-2 left-2 right-2 max-h-[90vh] sm:top-4 sm:left-4 sm:bottom-4 sm:right-auto sm:w-[430px] rounded-3xl flex"
                }
              `}
            >
              {/* Mobile Header in expanded details panel to collapse back to map */}
              {displayedRouteData && (
                <div className="sm:hidden flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/40 dark:border-white/10 flex-shrink-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Route Information
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMobilePanelOpen(false)}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 touch-manipulation"
                  >
                    <span>View Map</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Routing Inputs */}
              <NavigationForm
                onSubmit={handleFindRoute}
                loading={loading}
                externalSource={externalSource}
                externalGpsNotice={gpsNotice}
                locating={locating}
                onLocateMe={handleLocateMe}
              />

              {/* Error Notice */}
              {error && (
                <div className="m-3 p-3.5 rounded-2xl glass-card border border-red-300/80 dark:border-red-900/60 text-red-900 dark:text-red-200 text-xs shadow-sm">
                  <p className="font-bold mb-1">Route Planning Notice</p>
                  <p className="font-medium">{error}</p>
                </div>
              )}

              {/* Active Route Details */}
              {displayedRouteData && optimalRouteData && (
                <div className="flex-1">
                  <RouteDetails
                    routeData={displayedRouteData}
                    onSelectAlternateRoute={handleSelectAlternate}
                    onResetToOptimal={handleResetToOptimal}
                    isAlternateSelected={isAlternateSelected}
                    onStartNavigation={handleStartNavigation}
                  />
                </div>
              )}
            </aside>
          )}

          {/* Mobile Bottom Mini Summary Card - Shown when route is computed and drawer is collapsed */}
          {!isNavigating && displayedRouteData && !isMobilePanelOpen && (
            <div className="sm:hidden absolute bottom-3 left-3 right-3 z-20 glass-panel rounded-2xl p-3 shadow-2xl border border-white/60 dark:border-white/10 animate-in slide-in-from-bottom-3 duration-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold truncate max-w-[105px] text-slate-800 dark:text-slate-100">
                    {displayedRouteData.path[0]}
                  </span>
                  <span className="text-slate-400 text-xs">➔</span>
                  <span className="text-xs font-bold truncate max-w-[105px] text-slate-800 dark:text-slate-100">
                    {displayedRouteData.path[displayedRouteData.path.length - 1]}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {displayedRouteData.time}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    • {displayedRouteData.distance.toFixed(0)} km
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartNavigation}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 active:from-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 touch-manipulation"
                >
                  <Navigation className="w-4 h-4 fill-white" />
                  <span>Start Navigation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobilePanelOpen(true)}
                  className="py-2.5 px-3 rounded-xl glass-card hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 border border-white/60 dark:border-white/10 shadow-xs touch-manipulation"
                >
                  <span>Details</span>
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          )}

          {/* Google Maps Turn-by-Turn Navigation HUD Overlay */}
          {isNavigating && displayedRouteData && displayedRouteData.steps && (
            <NavigationHUD
              steps={displayedRouteData.steps}
              currentStepIndex={currentStepIndex}
              totalDistanceKm={displayedRouteData.distance}
              remainingDistanceKm={
                displayedRouteData.steps
                  .slice(currentStepIndex)
                  .reduce((sum, s) => sum + s.distance_km, 0) || displayedRouteData.distance
              }
              estimatedTime={displayedRouteData.time}
              voiceEnabled={voiceEnabled}
              sourceCity={displayedRouteData.path[0]}
              destinationCity={displayedRouteData.path[displayedRouteData.path.length - 1]}
              onToggleVoice={handleToggleVoice}
              onNextStep={handleNextStep}
              onPrevStep={handlePrevStep}
              onExitNavigation={handleExitNavigation}
            />
          )}
        </div>
      </main>
    </div>
  );
}
