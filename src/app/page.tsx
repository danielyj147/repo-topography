"use client";

import { useCallback, useEffect, Suspense, lazy } from "react";
import { useAppStore } from "@/lib/store";
import { SearchBar } from "@/components/ui/SearchBar";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { InfoPanel } from "@/components/ui/InfoPanel";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import { Minimap } from "@/components/ui/Minimap";
import { FileSearch } from "@/components/ui/FileSearch";
import { ExportButton } from "@/components/ui/ExportButton";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { StatsOverlay } from "@/components/ui/StatsOverlay";

import { useEnrichment } from "@/hooks/useEnrichment";
import { buildTerrainLayout } from "@/lib/treemap";
import { parseRepoInput } from "@/lib/github";
import type { RepoData, LoadingPhase } from "@/lib/types";

// Lazy load the 3D scene to avoid SSR issues
const TerrainScene = lazy(() =>
  import("@/components/terrain/TerrainScene").then((m) => ({
    default: m.TerrainScene,
  }))
);

function AppContent() {
  const terrainData = useAppStore((s) => s.terrainData);
  const loading = useAppStore((s) => s.loading);
  // Progressive enrichment with commit data
  useEnrichment();

  const handleSubmit = useCallback(async (owner: string, repo: string) => {
    const store = useAppStore.getState();
    store.reset();
    store.setLoading(true);
    store.setError(null);

    // Update URL for shareability
    const url = new URL(window.location.href);
    url.searchParams.set("r", `${owner}/${repo}`);
    window.history.pushState({}, "", url.toString());

    try {
      store.setLoadingPhase("fetching-repo" as LoadingPhase);
      store.setLoadingProgress(0.1);

      const res = await fetch(
        `/api/repo?repo=${encodeURIComponent(`${owner}/${repo}`)}`
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      store.setLoadingPhase("fetching-tree" as LoadingPhase);
      store.setLoadingProgress(0.4);

      const data: RepoData = await res.json();
      store.setRepoData(data);

      store.setLoadingPhase("generating-terrain" as LoadingPhase);
      store.setLoadingProgress(0.7);

      await new Promise((r) => requestAnimationFrame(r));

      const terrain = buildTerrainLayout(data.tree);
      store.setTerrainData(terrain);

      store.setLoadingPhase("complete" as LoadingPhase);
      store.setLoadingProgress(1.0);

      setTimeout(() => {
        store.setLoading(false);
      }, 500);
    } catch (err) {
      store.setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      store.setLoading(false);
    }
  }, []);

  // Auto-load from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const repo = params.get("r");
    if (repo) {
      const parsed = parseRepoInput(repo);
      if (parsed) {
        handleSubmit(parsed.owner, parsed.repo);
      }
    }
  }, [handleSubmit]);

  const showLanding = !terrainData && !loading;

  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* 3D Terrain */}
      {terrainData && (
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
              <div className="text-center">
                <div className="shimmer w-32 h-2 rounded-full mx-auto mb-3" />
                <p className="text-gray-600 text-xs">Initializing renderer...</p>
              </div>
            </div>
          }
        >
          <TerrainScene terrainData={terrainData} />
        </Suspense>
      )}

      {/* Landing screen */}
      {showLanding && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-10">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/8 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-violet-600/6 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 text-center mb-10">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
              Repo
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Topography
              </span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl font-light max-w-xl mx-auto leading-relaxed">
              See the shape of any codebase. Structure becomes geography.
              Activity becomes weather. Languages become biomes.
            </p>
          </div>

          <div className="relative z-10 w-full">
            <SearchBar onSubmit={handleSubmit} />
          </div>

          <div className="relative z-10 mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                ),
                title: "Structure → Geography",
                desc: "Directories become regions. Files become peaks. Nesting creates valleys.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ),
                title: "Size → Elevation",
                desc: "Larger files rise higher. Find the complexity peaks at a glance.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                ),
                title: "Language → Biome",
                desc: "JavaScript is forest, Rust is desert, Python is ocean. Each ecosystem has its palette.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="glass-light rounded-xl p-5 text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mx-auto mb-3 text-indigo-400">
                  {item.icon}
                </div>
                <h3 className="text-white text-sm font-medium mb-1">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-xs leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search bar when viewing terrain */}
      {terrainData && !loading && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 w-96">
          <SearchBar onSubmit={handleSubmit} />
        </div>
      )}

      {/* Home button — top left, next to repo info panel */}
      {terrainData && !loading && (
        <button
          onClick={() => {
            useAppStore.getState().reset();
            window.history.pushState({}, "", window.location.pathname);
          }}
          className="fixed top-5 left-[340px] z-20 glass rounded-lg w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
          title="Back to home"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
          </svg>
        </button>
      )}

      {/* Minimap, File Search & Export */}
      {terrainData && !loading && <Minimap terrainData={terrainData} />}
      {terrainData && !loading && <FileSearch />}
      {terrainData && !loading && (
        <div className="fixed bottom-[340px] right-4 z-20">
          <ExportButton />
        </div>
      )}

      {/* Breadcrumb for selected file */}
      {terrainData && !loading && <Breadcrumb />}

      {/* Overlays */}
      <LoadingOverlay />
      <InfoPanel />
      <StatsOverlay />
      <ErrorDisplay />
    </main>
  );
}

export default function HomePage() {
  return <AppContent />;
}
