"use client";

import { useAppStore } from "@/lib/store";
import { LOADING_PHASE_LABELS } from "@/lib/types";

export function LoadingOverlay() {
  const loading = useAppStore((s) => s.loading);
  const phase = useAppStore((s) => s.loadingPhase);
  const progress = useAppStore((s) => s.loadingProgress);

  if (!loading) return null;

  const label = LOADING_PHASE_LABELS[phase] || "Loading...";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="glass rounded-2xl px-8 py-6 max-w-sm w-full mx-4 animate-fade-in">
        {/* Terrain generation animation */}
        <div className="flex justify-center mb-5">
          <TerrainLoadingAnimation progress={progress} />
        </div>

        <p className="text-center text-white text-sm font-medium mb-3">
          {label}
        </p>

        {/* Progress bar */}
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <p className="text-center text-gray-500 text-xs mt-2">
          {Math.round(progress * 100)}%
        </p>
      </div>
    </div>
  );
}

function TerrainLoadingAnimation({ progress }: { progress: number }) {
  // Generate procedural "bars" that rise like terrain being generated
  const bars = Array.from({ length: 20 }, (_, i) => {
    const phase = (i / 20) * Math.PI * 2;
    const height = Math.sin(phase + progress * Math.PI * 4) * 0.5 + 0.5;
    const active = i / 20 <= progress;
    return { height, active };
  });

  return (
    <div className="flex items-end gap-[2px] h-12">
      {bars.map((bar, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full transition-all duration-300"
          style={{
            height: `${(bar.active ? bar.height * 80 + 20 : 8)}%`,
            background: bar.active
              ? `linear-gradient(to top, #4f46e5, #818cf8)`
              : "rgba(255,255,255,0.05)",
            transitionDelay: `${i * 20}ms`,
          }}
        />
      ))}
    </div>
  );
}
