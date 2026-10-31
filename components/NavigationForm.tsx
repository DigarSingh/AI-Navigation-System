"use client";

import { useState, useEffect, useRef } from "react";
import { Navigation, Loader2, LocateFixed, ArrowUpDown, X, Check, MapPin, AlertCircle } from "lucide-react";
import { ALL_CITIES } from "@/lib/cities";

interface NavigationFormProps {
  onSubmit: (source: string, destination: string) => void;
  loading: boolean;
  externalSource?: string;
  externalGpsNotice?: string | null;
  locating?: boolean;
  onLocateMe?: () => void;
}

export default function NavigationForm({
  onSubmit,
  loading,
  externalSource,
  externalGpsNotice,
  locating = false,
  onLocateMe,
}: NavigationFormProps) {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [activeField, setActiveField] = useState<"source" | "destination" | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const destinationInputRef = useRef<HTMLInputElement | null>(null);

  // Sync externalSource when user clicks GPS locate
  useEffect(() => {
    if (externalSource) {
      setSource(externalSource);
      setValidationError(null);
    }
  }, [externalSource]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveField(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSource = source.trim();
    const cleanDestination = destination.trim();

    if (!cleanSource || !cleanDestination) {
      setValidationError("Please specify both starting city and destination.");
      return;
    }

    if (cleanSource.toLowerCase() === cleanDestination.toLowerCase()) {
      setValidationError("Starting point and destination cannot be the same.");
      return;
    }

    setValidationError(null);
    setActiveField(null);
    onSubmit(cleanSource, cleanDestination);
  };

  const handleSwap = () => {
    setSource(destination);
    setDestination(source);
    setValidationError(null);
  };

  const selectCity = (city: string, field: "source" | "destination") => {
    if (field === "source") {
      setSource(city);
      setValidationError(null);
      // Auto-advance focus to destination if destination is still empty
      if (!destination.trim()) {
        setActiveField("destination");
        setTimeout(() => destinationInputRef.current?.focus(), 50);
      } else {
        setActiveField(null);
      }
    } else {
      setDestination(city);
      setValidationError(null);
      setActiveField(null);
    }
  };

  const popularLocations = [
    "Delhi",
    "Mumbai",
    "Bangalore",
    "Chennai",
    "Kolkata",
    "Hyderabad",
    "Jaipur",
    "Pune",
    "Ahmedabad",
    "Chandigarh",
    "Dehradun",
    "Goa",
    "Agra",
  ];

  const getFilteredCities = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return popularLocations;
    return ALL_CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  };

  const isSameCity =
    source.trim() &&
    destination.trim() &&
    source.trim().toLowerCase() === destination.trim().toLowerCase();

  return (
    <div
      ref={containerRef}
      className="glass-card rounded-2xl p-3.5 sm:p-5 m-2.5 sm:m-3 border border-white/60 dark:border-white/10 shadow-xl transition-all"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Origin & Destination inputs with connector */}
        <div className="relative space-y-2.5">
          {/* Visual connecting line between origin & destination */}
          <div className="absolute left-[19px] top-[26px] bottom-[26px] w-[2px] bg-slate-300/80 dark:bg-slate-700 pointer-events-none" />

          {/* Source Input */}
          <div className="relative">
            <div className="flex items-center relative">
              <div className="absolute left-3.5 flex items-center justify-center z-10 pointer-events-none">
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 ${
                    source === "Your Location"
                      ? "border-blue-600 bg-blue-100 dark:bg-blue-900/60"
                      : "border-emerald-500 bg-white dark:bg-slate-900"
                  } flex items-center justify-center shadow-sm`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      source === "Your Location" ? "bg-blue-600 animate-pulse" : "bg-emerald-500"
                    }`}
                  />
                </div>
              </div>

              <input
                ref={sourceInputRef}
                type="text"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onFocus={() => setActiveField("source")}
                placeholder="Origin city or GPS location..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="w-full pl-10 pr-28 py-3 text-sm font-semibold rounded-xl glass-input text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition shadow-sm min-h-[44px]"
                disabled={loading}
                required
              />

              <div className="absolute right-1.5 flex items-center gap-1 z-10">
                {source && (
                  <button
                    type="button"
                    onClick={() => {
                      setSource("");
                      sourceInputRef.current?.focus();
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Clear origin"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {onLocateMe && (
                  <button
                    type="button"
                    onClick={onLocateMe}
                    disabled={loading || locating}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border shadow-xs active:scale-95 touch-manipulation min-h-[36px] ${
                      source === "Your Location"
                        ? "bg-blue-600 text-white border-blue-600 shadow-blue-500/25"
                        : "glass-card hover:bg-blue-50 dark:hover:bg-blue-950/70 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-900/60"
                    }`}
                    title="Use current GPS location"
                  >
                    {locating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LocateFixed className="w-3.5 h-3.5" />
                    )}
                    <span>GPS</span>
                  </button>
                )}
              </div>
            </div>

            {/* Source Autocomplete Dropdown */}
            {activeField === "source" && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 glass-panel rounded-2xl shadow-2xl border border-white/70 dark:border-white/10 overflow-hidden max-h-56 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-2 border-b border-slate-200/60 dark:border-slate-700/60 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{source.trim() ? "Matching Cities" : "Popular Origins"}</span>
                  <span className="text-[9px] text-slate-400 font-normal">105 Cities Network</span>
                </div>
                {onLocateMe && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onLocateMe();
                      setActiveField(null);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/80 dark:hover:bg-slate-800/80 flex items-center gap-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 border-b border-slate-200/40 dark:border-slate-800/50 min-h-[44px]"
                  >
                    <LocateFixed className="w-4 h-4 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span>Use Your Current Location (GPS)</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                        Starts navigation from your exact GPS coordinates
                      </span>
                    </div>
                  </button>
                )}
                {getFilteredCities(source).map((city) => (
                  <button
                    key={city}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectCity(city, "source");
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 transition min-h-[44px]"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>{city}</span>
                    </div>
                    {source.trim().toLowerCase() === city.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex justify-end pr-2 -my-1 relative z-10">
            <button
              type="button"
              onClick={handleSwap}
              disabled={loading || (!source && !destination)}
              className="p-2 sm:p-1.5 rounded-full glass-card hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition shadow-sm border border-white/60 dark:border-white/10 active:scale-95 touch-manipulation min-w-[38px] min-h-[38px] flex items-center justify-center"
              title="Swap origin and destination"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Destination Input */}
          <div className="relative">
            <div className="flex items-center relative">
              <div className="absolute left-3.5 flex items-center justify-center z-10 pointer-events-none">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-red-500 bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
              </div>

              <input
                ref={destinationInputRef}
                type="text"
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onFocus={() => setActiveField("destination")}
                placeholder="Destination city..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="w-full pl-10 pr-10 py-3 text-sm font-semibold rounded-xl glass-input text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition shadow-sm min-h-[44px]"
                disabled={loading}
                required
              />

              {destination && (
                <button
                  type="button"
                  onClick={() => {
                    setDestination("");
                    destinationInputRef.current?.focus();
                  }}
                  className="absolute right-2 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Clear destination"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Destination Autocomplete Dropdown */}
            {activeField === "destination" && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 glass-panel rounded-2xl shadow-2xl border border-white/70 dark:border-white/10 overflow-hidden max-h-56 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-2 border-b border-slate-200/60 dark:border-slate-700/60 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{destination.trim() ? "Matching Destinations" : "Popular Destinations"}</span>
                  <span className="text-[9px] text-slate-400 font-normal">105 Cities Network</span>
                </div>
                {getFilteredCities(destination).map((city) => (
                  <button
                    key={city}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectCity(city, "destination");
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 transition min-h-[44px]"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span>{city}</span>
                    </div>
                    {destination.trim().toLowerCase() === city.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* GPS status pill notice if active */}
        {externalGpsNotice && (
          <div className="px-3 py-1.5 rounded-xl glass-card text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5 border border-blue-200/80 dark:border-blue-900/60 shadow-xs">
            <LocateFixed className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate font-semibold">{externalGpsNotice}</span>
          </div>
        )}

        {/* Inline Validation Notice */}
        {(validationError || isSameCity) && (
          <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/40 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {validationError || "Starting city and destination cannot be identical. Please pick a different destination."}
            </span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading || !source.trim() || !destination.trim() || Boolean(isSameCity)}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm min-h-[48px] transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform active:scale-[0.98] touch-manipulation cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Calculating Highway Route...</span>
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 fill-white" />
              <span>Find Fastest Route</span>
            </>
          )}
        </button>
      </form>

      {/* Quick Select Cities Chips */}
      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Popular Highway Hubs
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto no-scrollbar pr-0.5">
          {popularLocations.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => {
                if (!source.trim()) {
                  selectCity(city, "source");
                } else {
                  selectCity(city, "destination");
                }
              }}
              disabled={loading}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg glass-card hover:bg-blue-50/80 dark:hover:bg-slate-700/80 text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 border border-white/60 dark:border-white/10 transition shadow-xs touch-manipulation min-h-[30px]"
            >
              {city}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
