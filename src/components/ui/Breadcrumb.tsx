"use client";

import { useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import type { TerrainNode } from "@/lib/types";

export function Breadcrumb() {
  const selectedNode = useAppStore((s) => s.selectedNode);
  const terrainData = useAppStore((s) => s.terrainData);
  const setSelectedNode = useAppStore((s) => s.setSelectedNode);
  const setCameraTarget = useAppStore((s) => s.setCameraTarget);

  const pathParts = useMemo(() => {
    if (!selectedNode) return [];
    return selectedNode.path.split("/");
  }, [selectedNode]);

  const navigateToPath = useCallback(
    (index: number) => {
      if (!terrainData) return;
      const targetPath = pathParts.slice(0, index + 1).join("/");
      // Find the terrain node matching this path
      const findNode = (nodes: TerrainNode[]): TerrainNode | null => {
        for (const node of nodes) {
          if (node.path === targetPath) return node;
          if (node.children) {
            const found = findNode(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      // Also check flat nodes for files
      const flatMatch = terrainData.flatNodes.find((n) => n.path === targetPath);
      const match = flatMatch || findNode(terrainData.nodes);

      if (match) {
        setSelectedNode(match);
        const cx = match.rect.x + match.rect.width / 2 - terrainData.bounds.width / 2;
        const cz = match.rect.y + match.rect.height / 2 - terrainData.bounds.height / 2;
        setCameraTarget([cx, match.elevation * 4 + 2, cz]);
      }
    },
    [pathParts, terrainData, setSelectedNode, setCameraTarget]
  );

  if (!selectedNode || pathParts.length === 0) return null;

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
      <div className="glass rounded-xl px-4 py-2 flex items-center gap-1 text-xs">
        <span className="text-gray-600">/</span>
        {pathParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-700">/</span>}
            <button
              onClick={() => navigateToPath(i)}
              className={`hover:text-white transition-colors ${
                i === pathParts.length - 1
                  ? "text-indigo-400 font-medium"
                  : "text-gray-400"
              }`}
            >
              {part}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
