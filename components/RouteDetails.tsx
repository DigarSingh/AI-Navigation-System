"use client";

import { RouteData, AlternateRouteDetail } from "@/app/page";
import { Clock, TrendingUp, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

interface RouteDetailsProps {
  routeData: RouteData;
  onSelectAlternateRoute?: (detail: AlternateRouteDetail) => void;
  onResetToOptimal?: () => void;
  isAlternateSelected?: boolean;
}

export default function RouteDetails({
  routeData,
  onSelectAlternateRoute,
  onResetToOptimal,
  isAlternateSelected = false,
}: RouteDetailsProps) {
  const alternateDetails = routeData.alternate_route_details || [];
  const hasAlternates = alternateDetails.length > 0 || (routeData.alternate_routes && routeData.alternate_routes.length > 0);

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl p-6 border-2 border-primary-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black text-gray-900">
            Route Details
          </h2>
          {isAlternateSelected ? (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              Alternate Route Active
            </span>
          ) : (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-800 border border-green-300">
              Optimal Shortest Path
            </span>
          )}
        </div>

        {isAlternateSelected && onResetToOptimal && (
          <button
            onClick={onResetToOptimal}
            className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow"
          >
            <CheckCircle2 className="w-4 h-4" />
            Switch back to Optimal Route
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Column 1: Key Metrics (Distance & Estimated Travel Time) */}
        <div className="space-y-4">
          {/* Distance */}
          <div className="p-4 bg-white rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-primary-600" />
                <div>
                  <p className="text-sm font-bold text-gray-600">Distance</p>
                  <p className="text-xs text-gray-500">Real road distance via highways</p>
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900">{routeData.distance.toFixed(2)} km</p>
            </div>
          </div>

          {/* Time */}
          <div className="p-4 bg-white rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-gray-600">Estimated Travel Time</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    {routeData.prediction_method === "ml_random_forest" ? (
                      <span className="text-primary-700 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary-600 inline" /> Random Forest ML prediction
                      </span>
                    ) : (
                      <span>Standard 60 km/h driving estimate</span>
                    )}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900">{routeData.time}</p>
            </div>
          </div>
        </div>

        {/* Column 2: Step-by-Step Waypoints */}
        <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-300 h-full">
          <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            Step-by-Step Waypoints ({routeData.path.length} cities):
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {routeData.path.map((city, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                {index === 0 && (
                  <span className="flex items-center gap-2 font-bold text-green-700">
                    <span className="bg-green-500 rounded-full w-3 h-3 flex-shrink-0"></span>
                    {city} <span className="text-xs font-medium text-gray-600">(Origin)</span>
                  </span>
                )}
                {index > 0 && index < routeData.path.length - 1 && (
                  <span className="flex items-center gap-2 font-semibold text-blue-700">
                    <span className="bg-blue-500 rounded-full w-2.5 h-2.5 flex-shrink-0"></span>
                    {city} <span className="text-xs font-medium text-gray-600">(Via Point #{index})</span>
                  </span>
                )}
                {index === routeData.path.length - 1 && index > 0 && (
                  <span className="flex items-center gap-2 font-bold text-red-700">
                    <span className="bg-red-500 rounded-full w-3 h-3 flex-shrink-0"></span>
                    {city} <span className="text-xs font-medium text-gray-600">(Destination)</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Alternate Routes Comparison */}
        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-300 h-full">
          <p className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
            Alternative Routes Comparison:
          </p>

          {hasAlternates ? (
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {alternateDetails.length > 0 ? (
                alternateDetails.map((alt, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                      <span>Alternative #{idx + 1}</span>
                      <span className="text-gray-700">
                        {alt.distance} km • {alt.time}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      {alt.path.join(" → ")}
                    </div>
                    {onSelectAlternateRoute && (
                      <button
                        type="button"
                        onClick={() => onSelectAlternateRoute(alt)}
                        className="mt-1 w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        View on Map <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                routeData.alternate_routes?.map((route, idx) => (
                  <div key={idx} className="text-xs font-medium text-amber-800 bg-white p-2 rounded border border-amber-200">
                    Route {idx + 1}: {route.join(" → ")}
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="text-xs text-amber-800 italic">
              No alternate highway routes available between these cities. The primary path shown is the only connected route.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
