"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { getBiome } from "@/lib/languages";
import type { TerrainNode, TerrainData } from "@/lib/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Compute language distribution from actual rendered blocks (not API data)
// so the legend exactly matches what the user sees
function LanguageBar({ terrainData }: { terrainData: TerrainData }) {
  const { sorted, total } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const node of terrainData.flatNodes) {
      const lang = node.language || "Other";
      counts[lang] = (counts[lang] || 0) + node.size;
    }
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    return { sorted, total };
  }, [terrainData]);

  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden mb-2">
        {sorted.map(([lang, bytes]) => {
          const biome = getBiome(lang);
          const pct = (bytes / total) * 100;
          return (
            <div
              key={lang}
              style={{
                width: `${pct}%`,
                backgroundColor: biome.accent,
                minWidth: pct > 1 ? undefined : "2px",
              }}
              title={`${lang}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {sorted.map(([lang, bytes]) => {
          const biome = getBiome(lang);
          const pct = ((bytes / total) * 100).toFixed(1);
          return (
            <div key={lang} className="flex items-center gap-1.5 text-[11px]">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: biome.accent }}
              />
              <span className="text-gray-300">{lang}</span>
              <span className="text-gray-500">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NodeDetail({ node }: { node: TerrainNode }) {
  const biome = getBiome(node.language);

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="text-white font-medium text-sm truncate">{node.name}</h3>
          <p className="text-gray-500 text-xs font-mono truncate">{node.path}</p>
        </div>
        <button
          onClick={() => useAppStore.getState().setSelectedNode(null)}
          className="text-gray-500 hover:text-white transition-colors ml-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Size</span>
          <span className="text-gray-300">{formatBytes(node.size)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Language</span>
          <span className="text-gray-300 flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ backgroundColor: biome.accent }}
            />
            {node.language || "Unknown"}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Directory</span>
          <span className="text-gray-300 font-mono truncate max-w-[160px]">{node.path.includes("/") ? node.path.substring(0, node.path.lastIndexOf("/")) + "/" : "/"}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Depth</span>
          <span className="text-gray-300">Level {node.depth}</span>
        </div>
        {node.heat > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Recent Activity</span>
            <span className="text-orange-300">{(node.heat * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function InfoPanel() {
  const repoData = useAppStore((s) => s.repoData);
  const terrainData = useAppStore((s) => s.terrainData);
  const selectedNode = useAppStore((s) => s.selectedNode);
  const showUI = useAppStore((s) => s.showUI);

  if (!repoData || !terrainData || !showUI) return null;

  return (
    <>
      {/* Top-left: Repo info + language legend */}
      <div className="fixed top-4 left-4 z-20 glass rounded-xl p-4 w-80 animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 16 16">
            <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1h-8a1 1 0 00-1 1v6.708A2.486 2.486 0 014.5 9h8V1.5z" />
          </svg>
          <a
            href={`https://github.com/${repoData.owner}/${repoData.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white font-semibold text-sm hover:text-indigo-400 transition-colors"
          >
            {repoData.owner}/{repoData.repo}
          </a>
        </div>

        {repoData.truncated && (
          <div className="mb-3 px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-400">
            Large repo — some files may be missing due to API limits.
          </div>
        )}

        <div className="flex gap-4 mb-3 text-xs">
          <div>
            <span className="text-gray-500">Files </span>
            <span className="text-white font-medium">{repoData.totalFiles.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500">Size </span>
            <span className="text-white font-medium">{formatBytes(repoData.totalSize)}</span>
          </div>
        </div>

        {/* Language color legend — this is the key to reading the visualization */}
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-medium">
          Block Colors = Languages
        </div>
        <LanguageBar terrainData={terrainData} />
      </div>

      {/* Selected node detail — top right, below file search */}
      {selectedNode && (
        <div className="fixed top-16 right-4 z-20 glass rounded-xl p-4 w-72 animate-fade-in">
          <NodeDetail node={selectedNode} />
        </div>
      )}

      {/* Bottom-left: How to read this visualization */}
      <div className="fixed bottom-4 left-4 z-20">
        <div className="glass rounded-xl px-4 py-3 max-w-xs">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-medium">
            How to Read
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <div className="flex items-end gap-[1px] h-4 shrink-0">
                <div className="w-1.5 h-1 bg-gray-500 rounded-t-sm" />
                <div className="w-1.5 h-2 bg-gray-400 rounded-t-sm" />
                <div className="w-1.5 h-4 bg-gray-300 rounded-t-sm" />
              </div>
              <span className="text-gray-300">
                <strong className="text-white">Height</strong> = file size (taller = larger)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-[1px] shrink-0">
                <div className="w-2 h-3 rounded-sm bg-green-500" />
                <div className="w-2 h-3 rounded-sm bg-blue-500" />
                <div className="w-2 h-3 rounded-sm bg-orange-500" />
              </div>
              <span className="text-gray-300">
                <strong className="text-white">Color</strong> = programming language
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-[22px] h-3 border border-dashed border-gray-500 rounded-sm shrink-0" />
              <span className="text-gray-300">
                <strong className="text-white">Region</strong> = directory / folder
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-[22px] h-3 bg-gradient-to-r from-blue-900 to-orange-500 rounded-sm shrink-0" />
              <span className="text-gray-300">
                <strong className="text-white">Warm glow</strong> = recently changed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls hint — above minimap (minimap ~180px) */}
      <div className="fixed bottom-[192px] right-4 z-20">
        <div className="glass rounded-xl px-3 py-2 text-[10px] text-gray-500 space-y-0.5">
          <div>Orbit: Click + Drag</div>
          <div>Zoom: Scroll</div>
          <div>Pan: Right-click + Drag</div>
          <div>Inspect: Click block</div>
          <div>Open on GitHub: Double-click</div>
          <div>Search: <kbd className="px-1 bg-white/5 rounded">⌘K</kbd></div>
          <div>Stats: <kbd className="px-1 bg-white/5 rounded">Tab</kbd></div>
        </div>
      </div>
    </>
  );
}
