"use client";

import { useAppStore } from "@/lib/store";

export function ErrorDisplay() {
  const error = useAppStore((s) => s.error);
  const reset = useAppStore((s) => s.reset);

  if (!error) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-6 max-w-md w-full animate-fade-in">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-medium text-sm">Something went wrong</h3>
            <p className="text-gray-400 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm rounded-xl transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
