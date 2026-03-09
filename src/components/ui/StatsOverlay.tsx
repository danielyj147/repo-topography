"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { getBiome } from "@/lib/languages";
import type { TerrainNode } from "@/lib/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StatsOverlay() {
  const [visible, setVisible] = useState(false);
  const repoData = useAppStore((s) => s.repoData);
  const terrainData = useAppStore((s) => s.terrainData);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Tab" && repoData) {
        e.preventDefault();
        setVisible((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [repoData]);

  const stats = useMemo(() => {
    if (!repoData || !terrainData) return null;

    const flatNodes = terrainData.flatNodes;

    // Top 10 largest files
    const largestFiles = [...flatNodes]
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    // Deepest nested files
    const deepestFiles = [...flatNodes]
      .sort((a, b) => b.depth - a.depth)
      .slice(0, 5);

    // Language distribution
    const langEntries = Object.entries(repoData.languages)
      .sort((a, b) => b[1] - a[1]);
    const totalLangBytes = langEntries.reduce((s, [, v]) => s + v, 0);

    // Directory sizes (top-level)
    const topDirs = terrainData.nodes
      .filter((n) => n.type === "directory")
      .sort((a, b) => b.size - a.size)
      .slice(0, 8);

    // Hottest files (most commit activity)
    const hottestFiles = [...flatNodes]
      .filter((n) => n.heat > 0)
      .sort((a, b) => b.heat - a.heat)
      .slice(0, 5);

    return {
      largestFiles,
      deepestFiles,
      langEntries,
      totalLangBytes,
      topDirs,
      hottestFiles,
    };
  }, [repoData, terrainData]);

  if (!visible || !stats || !repoData) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => setVisible(false)}
      />
      <div className="relative w-full max-w-4xl mx-4 max-h-[85vh] overflow-y-auto glass rounded-2xl p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white text-lg font-semibold">
              {repoData.owner}/{repoData.repo}
            </h2>
            <p className="text-gray-500 text-xs">
              {repoData.totalFiles.toLocaleString()} files &middot;{" "}
              {formatBytes(repoData.totalSize)} &middot; Press Tab to close
            </p>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Largest Files */}
          <div>
            <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Largest Files (Highest Peaks)
            </h3>
            <div className="space-y-1">
              {stats.largestFiles.map((node) => (
                <FileRow key={node.path} node={node} metric={formatBytes(node.size)} />
              ))}
            </div>
          </div>

          {/* Language Distribution */}
          <div>
            <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              Language Biomes
            </h3>
            <div className="space-y-1.5">
              {stats.langEntries.slice(0, 10).map(([lang, bytes]) => {
                const biome = getBiome(lang);
                const pct = ((bytes / stats.totalLangBytes) * 100).toFixed(1);
                return (
                  <div key={lang} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: biome.accent }}
                    />
                    <span className="text-gray-300 text-xs flex-1">{lang}</span>
                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: biome.accent,
                        }}
                      />
                    </div>
                    <span className="text-gray-500 text-[10px] w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Directories */}
          <div>
            <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Largest Regions (Directories)
            </h3>
            <div className="space-y-1">
              {stats.topDirs.map((node) => (
                <FileRow key={node.path} node={node} metric={formatBytes(node.size)} />
              ))}
            </div>
          </div>

          {/* Active Files */}
          <div>
            <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              Most Active (Hottest Terrain)
            </h3>
            {stats.hottestFiles.length > 0 ? (
              <div className="space-y-1">
                {stats.hottestFiles.map((node) => (
                  <FileRow
                    key={node.path}
                    node={node}
                    metric={`${(node.heat * 100).toFixed(0)}% heat`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-xs">
                Activity data loading...
              </p>
            )}
          </div>

          {/* Deepest Files */}
          <div className="md:col-span-2">
            <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Deepest Nested (Valley Files)
            </h3>
            <div className="space-y-1">
              {stats.deepestFiles.map((node) => (
                <FileRow
                  key={node.path}
                  node={node}
                  metric={`Depth ${node.depth}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileRow({ node, metric }: { node: TerrainNode; metric: string }) {
  const biome = getBiome(node.language);
  const setSelectedNode = useAppStore((s) => s.setSelectedNode);
  const setCameraTarget = useAppStore((s) => s.setCameraTarget);
  const terrainData = useAppStore((s) => s.terrainData);

  return (
    <button
      onClick={() => {
        if (!terrainData) return;
        setSelectedNode(node);
        const cx = node.rect.x + node.rect.width / 2 - terrainData.bounds.width / 2;
        const cz = node.rect.y + node.rect.height / 2 - terrainData.bounds.height / 2;
        setCameraTarget([cx, node.elevation * 4 + 2, cz]);
      }}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: biome.accent }}
      />
      <span className="text-gray-400 text-xs truncate flex-1 group-hover:text-white transition-colors font-mono">
        {node.path}
      </span>
      <span className="text-gray-600 text-[10px] shrink-0">{metric}</span>
    </button>
  );
}
