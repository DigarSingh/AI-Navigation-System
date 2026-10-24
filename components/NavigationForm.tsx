"use client";

import { useState } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";

interface NavigationFormProps {
  onSubmit: (source: string, destination: string) => void;
  loading: boolean;
}

export default function NavigationForm({ onSubmit, loading }: NavigationFormProps) {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  // Which input is currently focused — drives the Quick Select suggestions
  const [activeField, setActiveField] = useState<"source" | "destination" | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (source.trim() && destination.trim()) {
      onSubmit(source.trim(), destination.trim());
    }
  };

  // Fill the currently focused field when a Quick Select city is clicked
  const handleQuickSelect = (city: string) => {
    if (activeField === "source") {
      setSource(city);
    } else if (activeField === "destination") {
      setDestination(city);
    }
  };

  // Strategic cities for presentation - showcasing diverse routes across India
  const popularLocations = [
    // Tier-1 Metro Cities (Financial & Tech Hubs)
    "Delhi",
    "Mumbai",
    "Bangalore",
    "Chennai",
    "Kolkata",
    "Hyderabad",
    
    // Iconic Tourist & Cultural Cities
    "Jaipur",      // Pink City
    "Agra",        // Taj Mahal
    "Varanasi",    // Spiritual Capital
    "Amritsar",    // Golden Temple
    "Goa",         // Beach Paradise
    "Mysore",      // Palace City
    
    // Geographic Extremes (For Impressive Long Routes)
    "Srinagar",    // Northernmost (Kashmir)
    "Thiruvananthapuram", // Southernmost (Kerala)
    "Guwahati",    // Easternmost (Northeast)
    "Jamnagar",    // Westernmost (Gujarat)
    
    // Strategic Transit Hubs
    "Pune",        // IT Hub
    "Ahmedabad",   // Industrial Capital
    "Chandigarh",  // Planned City
    "Kochi",       // Port City
  ];

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl p-8 border-2 border-primary-200">
      <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
        <div className="bg-primary-500 p-2 rounded-lg">
          <Navigation className="w-6 h-6 text-white" />
        </div>
        Plan Your Route
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Source Input */}
        <div>
          <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
            <MapPin className="w-5 h-5 text-green-600" />
            Starting Point
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onFocus={() => setActiveField("source")}
            onBlur={() => setActiveField(null)}
            placeholder="Enter starting point..."
            className="w-full px-5 py-4 text-base font-medium border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-primary-300 focus:border-primary-500 outline-none transition bg-white text-gray-900 placeholder-gray-500"
            disabled={loading}
            required
          />
        </div>

        {/* Destination Input */}
        <div>
          <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
            <MapPin className="w-5 h-5 text-red-600" />
            Destination
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onFocus={() => setActiveField("destination")}
            onBlur={() => setActiveField(null)}
            placeholder="Enter destination..."
            className="w-full px-5 py-4 text-base font-medium border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-primary-300 focus:border-primary-500 outline-none transition bg-white text-gray-900 placeholder-gray-500"
            disabled={loading}
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !source.trim() || !destination.trim()}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold text-lg py-4 px-6 rounded-xl transition shadow-lg hover:shadow-xl flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95"
        >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Finding Best Route...
            </>
          ) : (
            <>
              <Navigation className="w-6 h-6" />
              Find Best Route 🚀
            </>
          )}
        </button>
      </form>

      {/* Quick Select — shown only while an input is focused */}
      {activeField && (() => {
        const query = (activeField === "source" ? source : destination).trim().toLowerCase();
        const matches = popularLocations.filter((city) =>
          city.toLowerCase().includes(query)
        );

        return (
          <div className="mt-8">
            <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              ⚡ Quick Select for {activeField === "source" ? "Starting Point" : "Destination"}:
            </p>
            {matches.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {matches.map((location) => (
                  <button
                    key={location}
                    type="button"
                    // Prevent the input from blurring before the click registers
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleQuickSelect(location)}
                    disabled={loading}
                    className="text-sm font-semibold px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-primary-100 hover:to-primary-200 hover:text-primary-700 text-gray-700 rounded-full transition-all disabled:opacity-50 shadow-sm hover:shadow-md border border-gray-300"
                  >
                    {location}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No matching cities</p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
