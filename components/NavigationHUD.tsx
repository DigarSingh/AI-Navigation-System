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
  onToggleVoice,
  onNextStep,
  onPrevStep,
  onExitNavigation,
}: NavigationHUDProps) {
  const currentStep = steps[currentStepIndex] || {
    instruction: "Proceed to route",
    distance_km: 0,
    type: "continue",
    modifier: "straight",
  };

  const nextStep = steps[currentStepIndex + 1] || null;

  // Calculate estimated arrival clock time (e.g., 7:45 PM)
  const calculateETA = () => {
    const now = new Date();
    // Rough calculation based on remaining distance at 70 km/h average highway speed
    const remainingHours = (remainingDistanceKm / 70);
    const etaMs = now.getTime() + remainingHours * 3600 * 1000;
    const etaDate = new Date(etaMs);
    return etaDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const renderManeuverIcon = (step: RouteStep, size = "w-9 h-9") => {
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

  return (
    <div className="absolute inset-0 pointer-events-none z-[1200] flex flex-col justify-between p-3 sm:p-5">
      {/* Top Google Maps Turn-by-Turn Guidance Banner */}
      <div className="pointer-events-auto max-w-xl mx-auto w-full shadow-2xl rounded-2xl overflow-hidden transition-all animate-in fade-in slide-in-from-top-4 duration-300">
        {/* Primary Turn Card */}
        <div className="bg-emerald-600 dark:bg-emerald-700 text-white p-3.5 sm:p-5 flex items-start gap-3 sm:gap-4 shadow-lg border border-emerald-500/30">
          {/* Large Maneuver Icon */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
            {renderManeuverIcon(currentStep, "w-7 h-7 sm:w-9 sm:h-9")}
          </div>

          {/* Turn Text & Distance */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {currentStep.distance_km > 0
                  ? currentStep.distance_km >= 1
                    ? `${currentStep.distance_km.toFixed(1)} km`
                    : `${Math.round(currentStep.distance_km * 1000)} m`
                  : "Now"}
              </span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
                Step {currentStepIndex + 1}/{steps.length}
              </span>
            </div>

            <p className="text-sm sm:text-lg font-bold text-white leading-snug line-clamp-2">
              {currentStep.instruction}
            </p>
          </div>

          {/* Controls: Voice & Quick Exit */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={onToggleVoice}
              className="p-2 sm:p-2.5 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white transition border border-white/20 touch-manipulation"
              title={voiceEnabled ? "Mute voice guidance" : "Enable voice guidance"}
            >
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" />
              )}
            </button>
            <button
              type="button"
              onClick={onExitNavigation}
              className="p-2 sm:p-2.5 rounded-xl bg-white/15 hover:bg-red-500/80 active:bg-red-600 text-white transition border border-white/20 touch-manipulation"
              title="Exit navigation mode"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Next Step Sub-banner (if available) */}
        {nextStep && (
          <div className="bg-emerald-700/90 dark:bg-emerald-800/90 text-white/90 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold flex items-center gap-2 border-t border-emerald-500/20 backdrop-blur-sm">
            <span className="text-white/70">Then:</span>
            <div className="flex items-center gap-1.5 truncate">
              {renderManeuverIcon(nextStep, "w-3.5 h-3.5")}
              <span className="truncate">{nextStep.instruction}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Google Maps Navigation Status Bar */}
      <div className="pointer-events-auto max-w-2xl mx-auto w-full glass-panel rounded-2xl shadow-2xl p-3 sm:p-4 border border-white/50 dark:border-white/10 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-row items-center justify-between gap-2 sm:gap-3">
          {/* ETA & Remaining Distance */}
          <div className="flex items-center gap-2 sm:gap-4 text-left min-w-0">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {estimatedTime}
                </span>
                <span className="text-base sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                  {remainingDistanceKm.toFixed(1)}{" "}
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                    km
                  </span>
                </span>
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 truncate">
                <span>ETA: <strong className="text-slate-900 dark:text-white">{calculateETA()}</strong></span>
                <span className="hidden sm:inline">&bull;</span>
                <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-bold">Fastest Route</span>
              </div>
            </div>
          </div>

          {/* Controls: Steppers, Voice, Exit */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Step Backward */}
            <button
              type="button"
              onClick={onPrevStep}
              disabled={currentStepIndex === 0}
              className="p-2 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition disabled:opacity-40 active:scale-95 touch-manipulation"
              title="Previous maneuver"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Live GPS Active Status Indicator (Desktop only for space) */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live GPS Active</span>
            </div>

            {/* Step Forward */}
            <button
              type="button"
              onClick={onNextStep}
              disabled={currentStepIndex >= steps.length - 1}
              className="p-2 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition disabled:opacity-40 active:scale-95 touch-manipulation"
              title="Next maneuver"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Exit Navigation Mode */}
            <button
              type="button"
              onClick={onExitNavigation}
              className="px-2.5 sm:px-3 py-2 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-950/70 dark:hover:bg-red-900/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 text-xs font-bold transition flex items-center gap-1 active:scale-95 touch-manipulation"
              title="Exit navigation mode"
            >
              <X className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
