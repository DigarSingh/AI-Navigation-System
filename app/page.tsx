"use client";

import { useState } from "react";
import NavigationForm from "@/components/NavigationForm";
import MapView from "@/components/MapView";
import RouteDetails from "@/components/RouteDetails";
import { Navigation, Sparkles } from "lucide-react";

export interface AlternateRouteDetail {
  path: string[];
  distance: number;
  time: string;
  hours: number;
  method: string;
}

export interface RouteData {
  path: string[];
  distance: number;
  time: string;
  coordinates: [number, number][];
  geometry?: [number, number][];
  alternate_routes?: string[][];
  alternate_route_details?: AlternateRouteDetail[];
  prediction_method?: string;
  predicted_hours?: number;
  ml_estimated_time?: string;
  osrm_estimated_time?: string | null;
  source?: string;
  destination?: string;
}

export default function Home() {
  const [optimalRouteData, setOptimalRouteData] = useState<RouteData | null>(null);
  const [displayedRouteData, setDisplayedRouteData] = useState<RouteData | null>(null);
  const [isAlternateSelected, setIsAlternateSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    for (const city of path) {
      const c = cityCoordMap.get(city);
      if (c) {
        coords.push(c);
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

    try {
      const response = await fetch("/api/shortest-path", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source, destination }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to find route");
      }

      setOptimalRouteData(data);
      setDisplayedRouteData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAlternate = (alt: AlternateRouteDetail) => {
    if (!optimalRouteData) return;
    const newCoords = getCoordinatesForPath(alt.path, optimalRouteData.coordinates);

    setDisplayedRouteData({
      ...optimalRouteData,
      path: alt.path,
      distance: alt.distance,
      time: alt.time,
      coordinates: newCoords,
      geometry: newCoords, // reset geometry to alternate coordinates
      prediction_method: alt.method,
    });
    setIsAlternateSelected(true);
  };

  const handleResetToOptimal = () => {
    if (!optimalRouteData) return;
    setDisplayedRouteData(optimalRouteData);
    setIsAlternateSelected(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-primary-500">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-3 rounded-xl shadow-lg">
              <Navigation className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
                AI Navigation System
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Dijkstra Shortest-Path &bull; Random Forest Travel Time Prediction &bull; Interactive OpenStreetMap
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="mb-6 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-2 border-green-400 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-center gap-3 text-center">
            <span className="text-4xl">🚀</span>
            <div>
              <p className="text-lg font-black text-green-900">
                Production-Ready AI Navigation System
              </p>
              <p className="text-sm font-bold text-green-800 mt-1">
                105 Indian Cities &bull; 161 Real Highway Connections &bull; Random Forest ML Model (99.42% R²)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1 - Plan Your Route */}
          <div className="lg:col-span-3 space-y-6">
            <NavigationForm onSubmit={handleFindRoute} loading={loading} />

            {error && (
              <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 shadow-md text-red-900">
                <p className="font-bold text-sm mb-1">Route Planning Notice</p>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* Column 2 - Interactive Route Map */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-200">
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  🗺️ Interactive Route Map
                </h3>
                {isAlternateSelected && (
                  <span className="text-xs bg-amber-400 text-amber-950 font-bold px-2.5 py-1 rounded-full">
                    Viewing Alternate Route
                  </span>
                )}
              </div>
              <div className="h-[650px] relative">
                <MapView routeData={displayedRouteData} loading={loading} />
              </div>
            </div>
          </div>

          {/* Column 3 - Route Details */}
          <div className="lg:col-span-3">
            {displayedRouteData && optimalRouteData ? (
              <RouteDetails
                routeData={displayedRouteData}
                onSelectAlternateRoute={handleSelectAlternate}
                onResetToOptimal={handleResetToOptimal}
                isAlternateSelected={isAlternateSelected}
              />
            ) : (
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl p-6 border-2 border-primary-200 text-center">
                <div className="text-5xl mb-3">📊</div>
                <p className="text-lg font-bold text-gray-800">Route Details</p>
                <p className="text-sm text-gray-600 mt-2">
                  Select an origin and destination to compute the optimal path, compare alternatives, and see ML-estimated travel times.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 py-8 bg-gray-900 text-white">
        <div className="max-w-[1800px] mx-auto px-4 text-center">
          <p className="text-base font-semibold">Built with Next.js 14, Python Flask, NetworkX & Machine Learning</p>
          <p className="text-sm text-gray-400 mt-2">Dijkstra Shortest-Path &bull; Random Forest Travel Time Regressor (R² = 0.9942, MAE = 0.63 hr)</p>
        </div>
      </footer>
    </main>
  );
}
