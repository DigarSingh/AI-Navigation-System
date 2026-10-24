"use client";

import { useState } from "react";
import { RouteData, AlternateRouteDetail } from "@/app/page";
import {
  CheckCircle2,
  Car,
  Truck,
  Zap,
  Bike,
  Fuel,
  Coins,
  MapPin,
  Compass,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Navigation,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface RouteDetailsProps {
  routeData: RouteData;
  onSelectAlternateRoute?: (detail: AlternateRouteDetail) => void;
  onResetToOptimal?: () => void;
  isAlternateSelected?: boolean;
  onStartNavigation?: () => void;
}

type VehicleType = "car" | "suv" | "ev" | "bike";
type FuelType = "petrol" | "diesel";

interface FuelOption {
  efficiency: number; // km per liter
  pricePerUnit: number; // INR per liter
  label: string;
}

interface VehicleConfig {
  label: string;
  unit: string;
  tollRatePerKm: number; // INR per km
  fuelOptions?: Record<FuelType, FuelOption>;
  efficiency?: number;
  pricePerUnit?: number;
}

// Configured per user specification: Petrol ₹110/L & Diesel ₹100/L
const VEHICLES: Record<VehicleType, VehicleConfig> = {
  car: {
    label: "Car",
    unit: "L",
    tollRatePerKm: 1.75, // Official NHAI FASTag 4-lane base + WPI rate (~₹1.75/km)
    fuelOptions: {
      petrol: {
        efficiency: 16.5, // Real highway mileage ~16.5 km/L
        pricePerUnit: 110.0, // User calibrated rate: ₹110/L
        label: "Petrol (₹110/L)",
      },
      diesel: {
        efficiency: 18.5, // Diesel cars highway mileage ~18.5 km/L
        pricePerUnit: 100.0, // User calibrated rate: ₹100/L
        label: "Diesel (₹100/L)",
      },
    },
  },
  suv: {
    label: "SUV",
    unit: "L",
    tollRatePerKm: 1.85, // NHAI FASTag LMV rate (~₹1.85/km)
    fuelOptions: {
      petrol: {
        efficiency: 11.5, // Petrol SUV highway mileage ~11.5 km/L
        pricePerUnit: 110.0, // User calibrated rate: ₹110/L
        label: "Petrol (₹110/L)",
      },
      diesel: {
        efficiency: 13.5, // Diesel SUV highway mileage ~13.5 km/L
        pricePerUnit: 100.0, // User calibrated rate: ₹100/L
        label: "Diesel (₹100/L)",
      },
    },
  },
  ev: {
    label: "EV",
    unit: "kWh",
    efficiency: 7.2, // ~138 Wh/km real highway consumption
    pricePerUnit: 19.5, // Commercial highway DC fast charger rate with GST
    tollRatePerKm: 1.75, // Standard LMV FASTag rate
  },
  bike: {
    label: "Bike",
    unit: "L",
    efficiency: 45.0, // Real highway mileage ~45 km/L
    pricePerUnit: 110.0, // Petrol rate: ₹110/L
    tollRatePerKm: 0.0, // 100% EXEMPT from NHAI tolls under MoRTH rules!
  },
};

export default function RouteDetails({
  routeData,
  onSelectAlternateRoute,
  onResetToOptimal,
  isAlternateSelected = false,
  onStartNavigation,
}: RouteDetailsProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>("car");
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>("petrol");
  const [activeTab, setActiveTab] = useState<"directions" | "waypoints">(
    "directions"
  );
  const [showCostEstimator, setShowCostEstimator] = useState(true);

  const alternateDetails = routeData.alternate_route_details || [];
  const hasAlternates =
    alternateDetails.length > 0 ||
    (routeData.alternate_routes && routeData.alternate_routes.length > 0);

  // Dynamic cost calculations based on selected vehicle and fuel type
  const vehicle = VEHICLES[selectedVehicle];
  let efficiency = vehicle.efficiency || 16.5;
  let pricePerUnit = vehicle.pricePerUnit || 110.0;
  let fuelLabel = selectedVehicle === "ev" ? "Electricity" : "Fuel";

  if (vehicle.fuelOptions) {
    const fuelOpt = vehicle.fuelOptions[selectedFuelType];
    efficiency = fuelOpt.efficiency;
    pricePerUnit = fuelOpt.pricePerUnit;
    fuelLabel =
      selectedFuelType === "petrol"
        ? "Petrol (₹110/L)"
        : "Diesel (₹100/L)";
  } else if (selectedVehicle === "bike") {
    fuelLabel = "Petrol (₹110/L)";
  } else if (selectedVehicle === "ev") {
    fuelLabel = "Electricity (₹19.50/kWh)";
  }

  const fuelNeeded = Number((routeData.distance / efficiency).toFixed(1));
  const fuelCost = Math.round(fuelNeeded * pricePerUnit);
  const tollCost = Math.round(routeData.distance * vehicle.tollRatePerKm);
  const totalCost = fuelCost + tollCost;

  return (
    <div className="p-3 sm:p-4 space-y-3.5 transition-colors">
      {/* Route Headline Banner */}
      <div className="glass-card rounded-2xl p-4 border border-white/60 dark:border-white/10 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {isAlternateSelected ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Alternate Route
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Fastest Route
                </span>
              )}
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                via National Highway
              </span>
            </div>

            {/* Big Font Time & Big Font Distance */}
            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {routeData.time}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                {routeData.distance.toFixed(1)}{" "}
                <span className="text-base font-bold text-slate-500 dark:text-slate-400">
                  km
                </span>
              </span>
            </div>

            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Connected across {routeData.path.length} cities on official corridor
            </p>
          </div>

          {isAlternateSelected && onResetToOptimal && (
            <button
              onClick={onResetToOptimal}
              className="py-1 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm flex-shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Optimal
            </button>
          )}
        </div>
      </div>

      {/* Start Turn-by-Turn Navigation Action */}
      {onStartNavigation && (
        <button
          type="button"
          onClick={onStartNavigation}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/40 transition transform active:scale-[0.98]"
        >
          <Navigation className="w-5 h-5 fill-white" />
          <span>Start Navigation (Turn-by-Turn)</span>
        </button>
      )}

      {/* Alternative Routes Switcher */}
      {hasAlternates && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Alternative Routes
          </p>

          <div className="space-y-2">
            {alternateDetails.length > 0 ? (
              alternateDetails.map((alt, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl glass-card border border-white/60 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500 transition shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    <span>Alternative via {alt.path[1] || "Highway"}</span>
                    <span className="text-slate-600 dark:text-slate-400 font-bold">
                      {alt.time} &bull; {alt.distance} km
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-2">
                    {alt.path.join(" → ")}
                  </p>

                  {onSelectAlternateRoute && (
                    <button
                      type="button"
                      onClick={() => onSelectAlternateRoute(alt)}
                      className="w-full py-1.5 px-3 rounded-xl glass-card hover:bg-blue-50/80 dark:hover:bg-slate-700/80 text-blue-600 dark:text-blue-400 text-xs font-bold border border-white/60 dark:border-white/10 transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span>Preview Route on Map</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              routeData.alternate_routes?.map((route, idx) => (
                <div
                  key={idx}
                  className="text-xs text-slate-700 dark:text-slate-300 p-2.5 rounded-xl glass-card border border-white/60 dark:border-white/10"
                >
                  Route {idx + 1}: {route.join(" → ")}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Fuel & Toll Cost Breakdown (Collapsible) */}
      <div className="rounded-2xl glass-card border border-white/60 dark:border-white/10 overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setShowCostEstimator(!showCostEstimator)}
          className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 transition hover:bg-white/40 dark:hover:bg-slate-800/40"
        >
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Trip Cost Estimator</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
              ₹{totalCost.toLocaleString("en-IN")}
            </span>
            {showCostEstimator ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {showCostEstimator && (
          <div className="p-3.5 pt-0 space-y-3">
            {/* Vehicle Type Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/50 dark:bg-slate-800/60 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setSelectedVehicle("car");
                  setSelectedFuelType("petrol");
                }}
                className={`py-1.5 rounded-lg text-[11px] font-bold flex flex-col items-center gap-0.5 transition ${
                  selectedVehicle === "car"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md ring-1 ring-black/5"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Car</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedVehicle("suv");
                  setSelectedFuelType("diesel");
                }}
                className={`py-1.5 rounded-lg text-[11px] font-bold flex flex-col items-center gap-0.5 transition ${
                  selectedVehicle === "suv"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md ring-1 ring-black/5"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>SUV</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedVehicle("ev")}
                className={`py-1.5 rounded-lg text-[11px] font-bold flex flex-col items-center gap-0.5 transition ${
                  selectedVehicle === "ev"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md ring-1 ring-black/5"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>EV</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedVehicle("bike")}
                className={`py-1.5 rounded-lg text-[11px] font-bold flex flex-col items-center gap-0.5 transition ${
                  selectedVehicle === "bike"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md ring-1 ring-black/5"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Bike</span>
              </button>
            </div>

            {/* Fuel Type Selector (Petrol @ ₹110 vs Diesel @ ₹100) */}
            {vehicle.fuelOptions && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/50 dark:bg-slate-800/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedFuelType("petrol")}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    selectedFuelType === "petrol"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>⛽</span>
                  <span>Petrol @ ₹110/L</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFuelType("diesel")}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    selectedFuelType === "diesel"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>🛢️</span>
                  <span>Diesel @ ₹100/L</span>
                </button>
              </div>
            )}

            {/* Cost Breakdown Cards */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl glass-card border border-white/60 dark:border-white/10">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                  <Fuel className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold truncate">
                    {fuelLabel}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="font-black text-slate-900 dark:text-white text-sm">
                    ₹{fuelCost.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {fuelNeeded} {vehicle.unit}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl glass-card border border-white/60 dark:border-white/10">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold truncate">NHAI FASTag Tolls</span>
                </div>
                <p className="font-black text-slate-900 dark:text-white text-sm">
                  {selectedVehicle === "bike" ? (
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      ₹0 (Toll Exempt)
                    </span>
                  ) : (
                    `₹${tollCost.toLocaleString("en-IN")}`
                  )}
                </p>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center italic">
              Petrol ₹110/L &bull; Diesel ₹100/L &bull; Bikes 100% Toll Exempt
            </p>
          </div>
        )}
      </div>

      {/* Directions & Waypoints Tabs */}
      <div className="rounded-2xl glass-card border border-white/60 dark:border-white/10 p-3.5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200/70 dark:border-slate-700/70 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("directions")}
            className={`text-xs font-bold pb-1 transition flex items-center gap-1.5 border-b-2 ${
              activeTab === "directions"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Turn-by-Turn</span>
            {routeData.steps && routeData.steps.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-800">
                {routeData.steps.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("waypoints")}
            className={`text-xs font-bold pb-1 transition flex items-center gap-1.5 border-b-2 ${
              activeTab === "waypoints"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Waypoints ({routeData.path.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "directions" ? (
          <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar pr-1">
            {routeData.steps && routeData.steps.length > 0 ? (
              routeData.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 py-1.5 border-b border-slate-200/40 dark:border-slate-800/80 last:border-0"
                >
                  <div className="mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0">
                    {step.type === "turn" &&
                    step.modifier?.includes("right") ? (
                      <CornerUpRight className="w-3.5 h-3.5" />
                    ) : step.type === "turn" &&
                      step.modifier?.includes("left") ? (
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    ) : step.type === "arrive" ? (
                      <MapPin className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {step.instruction}
                    </p>
                    {step.distance_km > 0 && (
                      <p className="text-[11px] text-slate-400">
                        {step.distance_km} km
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                Turn-by-turn steps available along highway corridors.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
            {routeData.path.map((city, index) => (
              <div key={index} className="flex items-center gap-2.5 text-xs">
                {index === 0 && (
                  <span className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="bg-emerald-500 rounded-full w-2.5 h-2.5 flex-shrink-0" />
                    {city}{" "}
                    <span className="text-[10px] text-slate-400 font-normal">
                      (Origin)
                    </span>
                  </span>
                )}
                {index > 0 && index < routeData.path.length - 1 && (
                  <span className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400">
                    <span className="bg-blue-500 rounded-full w-2 h-2 flex-shrink-0" />
                    {city}{" "}
                    <span className="text-[10px] text-slate-400 font-normal">
                      (Via Point #{index})
                    </span>
                  </span>
                )}
                {index === routeData.path.length - 1 && index > 0 && (
                  <span className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400">
                    <span className="bg-red-500 rounded-full w-2.5 h-2.5 flex-shrink-0" />
                    {city}{" "}
                    <span className="text-[10px] text-slate-400 font-normal">
                      (Destination)
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
