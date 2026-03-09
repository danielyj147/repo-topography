"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import type { TerrainNode } from "@/lib/types";

// Progressively enriches terrain data with commit activity.
// Mutates heat values in place to avoid cloning the entire tree,
// then triggers a shallow store update so components re-render.
export function useEnrichment() {
  const repoData = useAppStore((s) => s.repoData);
  const terrainData = useAppStore((s) => s.terrainData);
  const setTerrainData = useAppStore((s) => s.setTerrainData);
  const enrichedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!repoData || !terrainData) return;

    const key = `${repoData.owner}/${repoData.repo}`;
    if (enrichedRef.current === key) return;
    enrichedRef.current = key;

    async function enrich() {
      try {
        const res = await fetch(
          `/api/commits?owner=${encodeURIComponent(repoData!.owner)}&repo=${encodeURIComponent(repoData!.repo)}`
        );
        if (!res.ok) return;

        const { activity } = await res.json();
        if (!activity || !terrainData) return;

        const activityMap = new Map<string, number>();
        let maxCommits = 1;
        for (const item of activity) {
          activityMap.set(item.path, item.commits);
          maxCommits = Math.max(maxCommits, item.commits);
        }

        // Mutate heat in place — avoids cloning thousands of nodes
        function applyHeat(nodes: TerrainNode[]): void {
          for (const node of nodes) {
            const commits = activityMap.get(node.path) || 0;
            node.heat = Math.pow(commits / maxCommits, 0.6);
            if (node.children) applyHeat(node.children);
          }
        }

        applyHeat(terrainData!.nodes);
        for (const node of terrainData!.flatNodes) {
          const commits = activityMap.get(node.path) || 0;
          node.heat = Math.pow(commits / maxCommits, 0.6);
        }

        // Shallow update to trigger re-render (nodes are already mutated)
        setTerrainData({ ...terrainData! });
      } catch {
        // Enrichment is optional, fail silently
      }
    }

    const timer = setTimeout(enrich, 1000);
    return () => clearTimeout(timer);
  }, [repoData, terrainData, setTerrainData]);
}
