"use client";

import { useMemo } from "react";
import type { TerrainData, TerrainNode } from "@/lib/types";
import { getBiome } from "@/lib/languages";
import { useAppStore } from "@/lib/store";

interface MinimapProps {
  terrainData: TerrainData;
}

export function Minimap({ terrainData }: MinimapProps) {
  const hoveredNode = useAppStore((s) => s.hoveredNode);
  const selectedNode = useAppStore((s) => s.selectedNode);
  const setCameraTarget = useAppStore((s) => s.setCameraTarget);

  const mapSize = 160;
  const { bounds, flatNodes } = terrainData;
  const scale = mapSize / Math.max(bounds.width, bounds.height);

  const rects = useMemo(() => {
    return flatNodes.map((node) => {
      const biome = getBiome(node.language);
      return {
        node,
        x: node.rect.x * scale,
        y: node.rect.y * scale,
        w: Math.max(node.rect.width * scale, 1),
        h: Math.max(node.rect.height * scale, 1),
        color: biome.accent,
        opacity: 0.3 + node.elevation * 0.7,
      };
    });
  }, [flatNodes, scale]);

  return (
    <div className="fixed bottom-4 right-4 z-20 glass rounded-xl p-2 animate-fade-in">
      <svg
        width={mapSize}
        height={mapSize}
        className="block"
        style={{ cursor: "crosshair" }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          // Convert minimap coords to world coords
          const worldX = mx / scale - bounds.width / 2;
          const worldZ = my / scale - bounds.height / 2;
          setCameraTarget([worldX, 2, worldZ]);
        }}
      >
        {/* Background */}
        <rect width={mapSize} height={mapSize} fill="#08080f" rx={4} />

        {/* File blocks */}
        {rects.map(({ node, x, y, w, h, color, opacity }) => {
          const isHovered = hoveredNode?.path === node.path;
          const isSelected = selectedNode?.path === node.path;

          return (
            <rect
              key={node.path}
              x={x}
              y={y}
              width={w}
              height={h}
              fill={isHovered || isSelected ? "#fff" : color}
              opacity={isHovered || isSelected ? 1 : opacity}
              rx={0.5}
            />
          );
        })}
      </svg>
    </div>
  );
}
