"use client";

import { useState, useEffect } from "react";
import { Navigation, Loader2, LocateFixed, ArrowUpDown, X } from "lucide-react";
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

  // Sync externalSource when user clicks GPS locate
  useEffect(() => {
    if (externalSource) {
      setSource(externalSource);
    }
  }, [externalSource]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (source.trim() && destination.trim()) {
      onSubmit(source.trim(), destination.trim());
    }
  };

  const handleSwap = () => {
    setSource(destination);
    setDestination(source);
  };

  const handleQuickSelect = (city: string) => {
    if (activeField === "source" || (!source && destination)) {
      setSource(city);
    } else {
      setDestination(city);
    }
  };

  const popularLocations = [
    "Delhi",
    "Dehradun",
    "Mumbai",
    "Bangalore",
    "Chennai",
    "Kolkata",
    "Hyderabad",
    "Jaipur",
    "Pune",
    "Ahmedabad",
    "Chandigarh",
    "Goa",
    "Agra",
  ];

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 m-3 border border-white/50 dark:border-white/10 shadow-xl transition-all">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Origin & Destination inputs with connector */}
        <div className="relative space-y-2">
          {/* Visual connecting line between origin & destination */}
          <div className="absolute left-[19px] top-[26px] bottom-[26px] w-[2px] bg-slate-300/80 dark:bg-slate-700 pointer-events-none" />

          {/* Source Input */}
          <div className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center justify-center z-10 pointer-events-none">
              <div className={`w-3.5 h-3.5 rounded-full border-2 ${source === "Your Location" ? "border-blue-600 bg-blue-100 dark:bg-blue-900/60" : "border-emerald-500 bg-white dark:bg-slate-900"} flex items-center justify-center shadow-sm`}>
                <div className={`w-1.5 h-1.5 rounded-full ${source === "Your Location" ? "bg-blue-600 animate-pulse" : "bg-emerald-500"}`} />
              </div>
            </div>

            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              onFocus={() => setActiveField("source")}
              onBlur={() => setActiveField(null)}
              placeholder="Starting city or GPS location..."
              className="w-full pl-10 pr-28 py-3 sm:py-2.5 text-base sm:text-sm font-semibold rounded-xl glass-input text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition shadow-sm"
              disabled={loading}
              required
            />

            <div className="absolute right-2 flex items-center gap-1">
              {source && (
                <button
                  type="button"
                  onClick={() => setSource("")}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition touch-manipulation"
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border shadow-xs active:scale-95 touch-manipulation ${
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

          {/* Swap Button */}
          <div className="flex justify-end pr-2 -my-1 relative z-10">
            <button
              type="button"
              onClick={handleSwap}
              disabled={loading || (!source && !destination)}
              className="p-2 sm:p-1.5 rounded-full glass-card hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition shadow-sm border border-white/60 dark:border-white/10 active:scale-95 touch-manipulation"
              title="Reverse origin and destination"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Destination Input */}
          <div className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center justify-center z-10 pointer-events-none">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-red-500 bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </div>
            </div>

            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onFocus={() => setActiveField("destination")}
              onBlur={() => setActiveField(null)}
              placeholder="Destination city..."
              className="w-full pl-10 pr-10 py-3 sm:py-2.5 text-base sm:text-sm font-semibold rounded-xl glass-input text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition shadow-sm"
              disabled={loading}
              required
            />

            {destination && (
              <button
                type="button"
                onClick={() => setDestination("")}
                className="absolute right-3 p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition touch-manipulation"
                title="Clear destination"
              >
                <X className="w-4 h-4" />
              </button>
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

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading || !source.trim() || !destination.trim()}
          className="w-full py-3 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm min-h-[46px] transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform active:scale-[0.98] touch-manipulation"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Calculating Road Route...
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 fill-white" />
              Find Fastest Route
            </>
          )}
        </button>
      </form>

      {/* Quick Select Cities Chips */}
      <div className="mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {activeField ? `Suggested for ${activeField === "source" ? "Origin" : "Destination"}` : "Popular Highway Hubs"}
          </p>
        </div>

        {(() => {
          const query = (activeField === "source" ? source : destination).trim().toLowerCase();
          const list = query
            ? ALL_CITIES.filter((c) => c.toLowerCase().includes(query)).slice(0, 10)
            : popularLocations;

          return (
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar pr-1">
              {list.map((city) => (
                <button
                  key={city}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleQuickSelect(city)}
                  disabled={loading}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg glass-card hover:bg-blue-50/80 dark:hover:bg-slate-700/80 text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 border border-white/60 dark:border-white/10 transition shadow-xs"
                >
                  {city}
                </button>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
