"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Line, Html } from "@react-three/drei";
import type { TerrainData, TerrainNode } from "@/lib/types";
import { getBiome } from "@/lib/languages";

interface RegionBordersProps {
  terrainData: TerrainData;
}

// Draws visible border lines around top-level directories
// and labels them — this makes the treemap structure legible
export function RegionBorders({ terrainData }: RegionBordersProps) {
  const { nodes, bounds } = terrainData;
  const cx = bounds.width / 2;
  const cz = bounds.height / 2;

  const regions = useMemo(() => {
    // Top-level directories = regions
    return nodes
      .filter((n) => n.type === "directory")
      .map((n) => {
        const biome = getBiome(n.language);
        const x1 = n.rect.x - cx;
        const z1 = n.rect.y - cz;
        const x2 = x1 + n.rect.width;
        const z2 = z1 + n.rect.height;
        const labelX = (x1 + x2) / 2;
        const labelZ = (z1 + z2) / 2;

        // Get tallest child for label placement
        const maxElev = n.children
          ? Math.max(0.5, ...n.children.map((c) => c.elevation))
          : n.elevation;

        return {
          name: n.name,
          language: n.language,
          biome,
          x1, z1, x2, z2,
          labelX, labelZ,
          labelY: maxElev * 10 + 2.5,
          size: n.size,
          isLarge: n.rect.width > bounds.width * 0.06 && n.rect.height > bounds.height * 0.06,
        };
      });
  }, [nodes, bounds, cx, cz]);

  return (
    <group>
      {regions.map((r) => (
        <group key={r.name}>
          {/* Border line on ground */}
          <Line
            points={[
              [r.x1, 0.02, r.z1],
              [r.x2, 0.02, r.z1],
              [r.x2, 0.02, r.z2],
              [r.x1, 0.02, r.z2],
              [r.x1, 0.02, r.z1],
            ]}
            color={r.biome.accent}
            lineWidth={1.5}
            opacity={0.4}
            transparent
          />

          {/* Directory label — fixed screen size so it's readable at any zoom */}
          {r.isLarge && (
            <Html
              position={[r.labelX, r.labelY, r.labelZ]}
              center
              style={{ pointerEvents: "none" }}
              zIndexRange={[0, 0]}
            >
              <div className="flex flex-col items-center select-none">
                <div
                  className="text-[13px] font-bold whitespace-nowrap px-2.5 py-1 rounded-md"
                  style={{
                    color: r.biome.accent,
                    textShadow: `0 1px 8px rgba(0,0,0,1), 0 0 20px ${r.biome.accent}33`,
                    background: "rgba(0,0,0,0.55)",
                    border: `1px solid ${r.biome.accent}33`,
                  }}
                >
                  {r.name}/
                </div>
                <div
                  className="text-[10px] whitespace-nowrap mt-1 px-1.5"
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    textShadow: "0 1px 4px rgba(0,0,0,1)",
                  }}
                >
                  {r.language || "mixed"} · {formatSize(r.size)}
                </div>
              </div>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
