"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { getBiome } from "@/lib/languages";
import type { TerrainNode } from "@/lib/types";

export function FileSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const terrainData = useAppStore((s) => s.terrainData);
  const setSelectedNode = useAppStore((s) => s.setSelectedNode);
  const setCameraTarget = useAppStore((s) => s.setCameraTarget);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!query.trim() || !terrainData) return [];
    const q = query.toLowerCase();
    return terrainData.flatNodes
      .filter((n) => n.path.toLowerCase().includes(q))
      .slice(0, 12);
  }, [query, terrainData]);

  const selectResult = useCallback(
    (node: TerrainNode) => {
      if (!terrainData) return;
      setSelectedNode(node);
      const cx = node.rect.x + node.rect.width / 2 - terrainData.bounds.width / 2;
      const cz = node.rect.y + node.rect.height / 2 - terrainData.bounds.height / 2;
      setCameraTarget([cx, node.elevation * 4, cz]);
      setOpen(false);
      setQuery("");
    },
    [terrainData, setSelectedNode, setCameraTarget]
  );

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!terrainData) return null;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-30 glass rounded-xl px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Search files
        <kbd className="ml-1 px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-gray-500">
          {typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "⌘" : "Ctrl"}K
        </kbd>
      </button>

      {/* Search modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Search panel */}
          <div className="relative w-full max-w-lg mx-4 glass rounded-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center px-4 py-3 border-b border-white/5">
              <svg className="w-4 h-4 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results.length > 0) {
                    selectResult(results[0]);
                  }
                }}
                placeholder="Search files..."
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-600"
              />
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-gray-600">
                ESC
              </kbd>
            </div>

            {results.length > 0 && (
              <div className="max-h-64 overflow-y-auto py-1">
                {results.map((node) => {
                  const biome = getBiome(node.language);
                  return (
                    <button
                      key={node.path}
                      onClick={() => selectResult(node)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: biome.accent }}
                      />
                      <div className="min-w-0">
                        <div className="text-white text-sm truncate">{node.name}</div>
                        <div className="text-gray-600 text-xs truncate font-mono">{node.path}</div>
                      </div>
                      <span className="text-gray-600 text-[10px] ml-auto shrink-0">
                        {node.language || ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {query && results.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-600 text-sm">
                No files found matching &ldquo;{query}&rdquo;
              </div>
            )}

            {!query && (
              <div className="px-4 py-6 text-center text-gray-600 text-sm">
                Type to search across {terrainData.flatNodes.length.toLocaleString()} files
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
