"use client";

import {
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  MapPin,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
  X,
  Gauge,
  Navigation as NavigationIcon,
  AlertTriangle,
  LocateFixed,
} from "lucide-react";
import { RouteStep } from "@/app/page";

interface NavigationHUDProps {
  steps: RouteStep[];
  currentStepIndex: number;
  totalDistanceKm: number;
  remainingDistanceKm: number;
  estimatedTime: string;
  voiceEnabled: boolean;
  sourceCity?: string;
  destinationCity?: string;
  currentSpeedKmh: number | null;
  speedStatus?: "sensor" | "calculated" | "unavailable";
  gpsLost?: boolean;
  gpsAccuracyMeters?: number | null;
  isMapFollowActive?: boolean;
  onRecenterMap?: () => void;
  onToggleVoice: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onExitNavigation: () => void;
}

export default function NavigationHUD({
  steps,
  currentStepIndex,
  totalDistanceKm,
  remainingDistanceKm,
  estimatedTime,
  voiceEnabled,
  sourceCity,
  destinationCity,
  currentSpeedKmh,
  speedStatus = "sensor",
  gpsLost = false,
  gpsAccuracyMeters,
  isMapFollowActive = true,
  onRecenterMap,
  onToggleVoice,
  onNextStep,
  onPrevStep,
  onExitNavigation,
}: NavigationHUDProps) {
  const currentStep = steps[currentStepIndex] || {
    instruction: "Proceed along route",
    distance_km: 0,
    type: "continue",
    modifier: "straight",
  };

  const nextStep = steps[currentStepIndex + 1] || null;

  // Calculate estimated arrival clock time (e.g., 7:45 PM)
  const calculateETA = () => {
    const now = new Date();
    const remainingHours = remainingDistanceKm / 70;
    const etaMs = now.getTime() + remainingHours * 3600 * 1000;
    const etaDate = new Date(etaMs);
    return etaDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const renderManeuverIcon = (step: RouteStep, size = "w-7 h-7 sm:w-9 sm:h-9") => {
    const mod = (step.modifier || "").toLowerCase();
    const type = (step.type || "").toLowerCase();

    if (type === "arrive") {
      return <MapPin className={`${size} text-white`} />;
    }
    if (mod.includes("right") || type.includes("right")) {
      return <CornerUpRight className={`${size} text-white`} />;
    }
    if (mod.includes("left") || type.includes("left")) {
      return <CornerUpLeft className={`${size} text-white`} />;
    }
    return <ArrowUp className={`${size} text-white`} />;
  };

  const formatDistance = (km: number) => {
    if (km <= 0) return "Now";
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  return (
    <>
      {/* Top Google Maps Turn-by-Turn Guidance Banner */}
      <div className="fixed top-2 sm:top-4 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-xl sm:w-full z-[1200] pointer-events-auto shadow-2xl rounded-2xl overflow-hidden transition-all animate-in fade-in slide-in-from-top-4 duration-300">
        {/* GPS Lost / Warning Banner */}
        {gpsLost && (
          <div className="bg-amber-600 text-white px-3.5 py-1.5 text-xs font-bold flex items-center justify-between border-b border-amber-500/50 animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>GPS Signal Lost — Searching for satellites...</span>
            </div>
            <span className="text-[10px] opacity-80 uppercase tracking-wider">Reconnecting</span>
          </div>
        )}

        {/* Primary Turn Card */}
        <div className="bg-emerald-600 dark:bg-emerald-700 text-white p-3 sm:p-4 flex items-center gap-2.5 sm:gap-4 shadow-lg border border-emerald-500/30">
          {/* Large Maneuver Icon */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
            {renderManeuverIcon(currentStep)}
          </div>

          {/* Turn Text & Distance */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">
                {formatDistance(currentStep.distance_km)}
              </span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-bold leading-tight">
                {currentStepIndex + 1}/{steps.length}
              </span>
            </div>

            <p className="text-xs sm:text-base font-bold text-white leading-snug line-clamp-2">
              {currentStep.instruction}
            </p>
          </div>

          {/* Controls: Voice & Quick Exit (44px touch targets) */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={onToggleVoice}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white transition border border-white/20 flex items-center justify-center touch-manipulation cursor-pointer"
              title={voiceEnabled ? "Mute voice guidance" : "Enable voice guidance"}
              aria-label={voiceEnabled ? "Mute voice guidance" : "Enable voice guidance"}
            >
              {voiceEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5 text-white/70" />
              )}
            </button>
            <button
              type="button"
              onClick={onExitNavigation}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/15 hover:bg-red-500/80 active:bg-red-600 text-white transition border border-white/20 flex items-center justify-center touch-manipulation cursor-pointer"
              title="Exit navigation mode"
              aria-label="Exit navigation mode"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Next Step Sub-banner (if available) */}
        {nextStep && (
          <div className="bg-emerald-700/95 dark:bg-emerald-800/95 text-white/95 px-3.5 py-1.5 text-xs font-semibold flex items-center gap-2 border-t border-emerald-500/20 backdrop-blur-sm">
            <span className="text-white/70 font-bold uppercase tracking-wider text-[10px]">Then:</span>
            <div className="flex items-center gap-1.5 truncate">
              {renderManeuverIcon(nextStep, "w-3.5 h-3.5")}
              <span className="truncate">{nextStep.instruction}</span>
            </div>
          </div>
        )}
      </div>

      {/* Recenter Navigation Floating Control (Visible when user panned map away) */}
      {!isMapFollowActive && onRecenterMap && (
        <div className="fixed top-24 sm:top-28 left-1/2 -translate-x-1/2 z-[1200] pointer-events-auto animate-in fade-in zoom-in-90 duration-200">
          <button
            type="button"
            onClick={onRecenterMap}
            className="px-4 py-2.5 rounded-full bg-slate-900/90 dark:bg-black/90 text-white font-bold text-xs shadow-2xl border border-white/30 backdrop-blur-md flex items-center gap-2 hover:bg-black active:scale-95 transition touch-manipulation min-h-[44px]"
          >
            <NavigationIcon className="w-4 h-4 text-emerald-400 fill-emerald-400 animate-pulse" />
            <span>Re-center on Vehicle</span>
          </button>
        </div>
      )}

      {/* Speedometer Floating Badge (High Visibility, Sleek, Mobile-Clean) */}
      <div className="fixed bottom-24 sm:bottom-24 left-3 sm:left-6 z-[1200] pointer-events-auto">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full glass-panel bg-white/95 dark:bg-slate-900/95 shadow-2xl flex flex-col items-center justify-center border-2 border-white/80 dark:border-white/20 backdrop-blur-md transition-all">
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
            {currentSpeedKmh !== null ? currentSpeedKmh : "--"}
          </span>
          <span className="text-[8.5px] sm:text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
            km/h
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                gpsLost
                  ? "bg-amber-500"
                  : currentSpeedKmh !== null && currentSpeedKmh > 0
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-blue-500"
              }`}
            />
            <span className="text-[7px] sm:text-[8px] font-bold text-slate-600 dark:text-slate-300">
              {gpsLost
                ? "SEARCHING"
                : speedStatus === "sensor"
                ? "SENSOR"
                : speedStatus === "calculated"
                ? "EST"
                : "READY"}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Google Maps Navigation Status Bar - Fully Responsive 320px–1920px */}
      <div className="fixed bottom-2 sm:bottom-4 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-xl sm:w-full z-[1200] pointer-events-auto glass-panel rounded-2xl shadow-2xl p-2.5 sm:p-3.5 border border-white/60 dark:border-white/10 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between gap-1.5 sm:gap-3">
          {/* ETA & Remaining Distance */}
          <div className="flex flex-col text-left min-w-0">
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight whitespace-nowrap">
                {estimatedTime}
              </span>
              <span className="text-xs sm:text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight whitespace-nowrap">
                {remainingDistanceKm.toFixed(1)}{" "}
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                  km
                </span>
              </span>
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 truncate">
              <span>ETA: <strong className="text-slate-900 dark:text-white">{calculateETA()}</strong></span>
              {gpsAccuracyMeters && (
                <span className="hidden sm:inline text-slate-400 text-[10px]">
                  &bull; ±{Math.round(gpsAccuracyMeters)}m
                </span>
              )}
            </div>
          </div>

          {/* Controls: Steppers & Exit with 44px min touch targets */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {/* Step Backward */}
            <button
              type="button"
              onClick={onPrevStep}
              disabled={currentStepIndex === 0}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition disabled:opacity-30 active:scale-95 touch-manipulation flex items-center justify-center cursor-pointer min-w-[40px] min-h-[40px]"
              title="Previous maneuver"
              aria-label="Previous maneuver"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Step Forward */}
            <button
              type="button"
              onClick={onNextStep}
              disabled={currentStepIndex >= steps.length - 1}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition disabled:opacity-30 active:scale-95 touch-manipulation flex items-center justify-center cursor-pointer min-w-[40px] min-h-[40px]"
              title="Next maneuver"
              aria-label="Next maneuver"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Exit Navigation Mode */}
            <button
              type="button"
              onClick={onExitNavigation}
              className="px-3 sm:px-3.5 h-10 sm:h-11 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-950/70 dark:hover:bg-red-900/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 text-xs font-bold transition flex items-center gap-1 active:scale-95 touch-manipulation cursor-pointer min-h-[40px]"
              title="Exit navigation mode"
              aria-label="Exit navigation mode"
            >
              <X className="w-4 h-4" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
