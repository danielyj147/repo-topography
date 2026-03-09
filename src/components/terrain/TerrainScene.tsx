"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  Grid,
  Html,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import type { TerrainData, TerrainNode } from "@/lib/types";
import { TerrainBlock } from "./TerrainBlock";
import { InstancedTerrain } from "./InstancedTerrain";
import { RegionBorders } from "./RegionBorders";
import { getBiome } from "@/lib/languages";
import { useAppStore } from "@/lib/store";

const INSTANCED_THRESHOLD = 500;

interface TerrainMeshProps {
  terrainData: TerrainData;
}

function TerrainMesh({ terrainData }: TerrainMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { bounds, flatNodes } = terrainData;
  const cx = bounds.width / 2;
  const cz = bounds.height / 2;

  const nodeDelays = useMemo(() => {
    return flatNodes.map((node) => {
      const nx = node.rect.x + node.rect.width / 2 - cx;
      const nz = node.rect.y + node.rect.height / 2 - cz;
      const dist = Math.sqrt(nx * nx + nz * nz);
      const maxDist = Math.sqrt(cx * cx + cz * cz) || 1;
      return (dist / maxDist) * 1.5 + 0.2;
    });
  }, [flatNodes, cx, cz]);

  return (
    <group ref={groupRef} position={[-cx, 0, -cz]}>
      {flatNodes.map((node, i) => (
        <TerrainBlock
          key={node.path}
          node={node}
          riseDelay={nodeDelays[i]}
          totalNodes={flatNodes.length}
        />
      ))}
    </group>
  );
}

// Dark ground with grid
function Ground({ size }: { size: number }) {
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow
        onClick={() => useAppStore.getState().setSelectedNode(null)}
      >
        <planeGeometry args={[size * 3, size * 3]} />
        <meshBasicMaterial color="#0a0a14" />
      </mesh>
      <Grid
        position={[0, -0.01, 0]}
        args={[size * 3, size * 3]}
        cellSize={2}
        cellThickness={0.3}
        cellColor="#161625"
        sectionSize={10}
        sectionThickness={0.5}
        sectionColor="#1e1e35"
        fadeDistance={size * 2}
        fadeStrength={1}
        infiniteGrid
      />
    </>
  );
}

// Minimal scene lights — the block shaders handle their own lighting
// These lights are mainly for the ground plane and grid
function SceneLights({ terrainSize }: { terrainSize: number }) {
  const fogNear = terrainSize * 2;
  const fogFar = terrainSize * 5;

  return (
    <>
      <ambientLight intensity={0.3} color="#aab0dd" />
      <directionalLight
        position={[30, 60, 25]}
        intensity={0.8}
        color="#fff5e8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={terrainSize * 3}
        shadow-camera-left={-terrainSize}
        shadow-camera-right={terrainSize}
        shadow-camera-top={terrainSize}
        shadow-camera-bottom={-terrainSize}
      />
      <fog attach="fog" args={["#080812", fogNear, fogFar]} />
    </>
  );
}

// Cinematic intro camera that sweeps in from far away, then hands off to orbit controls
function CameraController({ bounds }: { bounds: { width: number; height: number } }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const cameraTarget = useAppStore((s) => s.cameraTarget);
  const [introPhase, setIntroPhase] = useState<"cinematic" | "done">("cinematic");
  const introStart = useRef(performance.now() / 1000);

  const dist = Math.max(bounds.width, bounds.height) * 0.7;

  // Cinematic path: far top-down → sweeping arc → final orbit position
  // Duration ~3s, uses cubic easing for smooth deceleration
  const INTRO_DURATION = 3.0;

  useEffect(() => {
    // Start camera far away, looking almost straight down
    camera.position.set(dist * 1.5, dist * 2.0, dist * 1.5);
    camera.lookAt(0, 0, 0);
    introStart.current = performance.now() / 1000;
    setIntroPhase("cinematic");

    // Disable orbit controls during intro
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }
  }, [camera, dist]);

  useFrame(() => {
    if (introPhase === "cinematic") {
      const elapsed = performance.now() / 1000 - introStart.current;
      const t = Math.min(elapsed / INTRO_DURATION, 1);

      // Ease-out cubic for smooth deceleration
      const e = 1 - Math.pow(1 - t, 3);

      // Start position: far away, high up, slightly behind
      const startX = dist * 1.5;
      const startY = dist * 2.0;
      const startZ = dist * 1.5;

      // End position: standard orbit view
      const endX = dist * 0.5;
      const endY = dist * 0.55;
      const endZ = dist * 0.5;

      // Sweep through an arc — add a slight curve via sin for cinematic feel
      const arcBulge = Math.sin(t * Math.PI) * dist * 0.15;

      const x = startX + (endX - startX) * e - arcBulge;
      const y = startY + (endY - startY) * e + arcBulge * 0.3;
      const z = startZ + (endZ - startZ) * e;

      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);

      if (t >= 1) {
        setIntroPhase("done");
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
          // Sync orbit controls target to where camera is looking
          controlsRef.current.target.set(0, 0, 0);
        }
      }
    } else {
      // Normal orbit mode — handle fly-to-target from file search
      if (cameraTarget && controlsRef.current) {
        const target = controlsRef.current.target as THREE.Vector3;
        target.lerp(new THREE.Vector3(...cameraTarget), 0.05);
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      maxPolarAngle={Math.PI / 2.1}
      minDistance={3}
      maxDistance={dist * 2.5}
      target={[0, 0, 0]}
      enabled={introPhase === "done"}
    />
  );
}

// Floating label above the selected block
function SelectedLabel() {
  const selectedNode = useAppStore((s) => s.selectedNode);
  const terrainData = useAppStore((s) => s.terrainData);

  if (!selectedNode || !terrainData) return null;

  const x = selectedNode.rect.x + selectedNode.rect.width / 2;
  const z = selectedNode.rect.y + selectedNode.rect.height / 2;
  const y = selectedNode.elevation * 10 + 3;
  const biome = getBiome(selectedNode.language);

  const dirPath = selectedNode.path.includes("/")
    ? selectedNode.path.substring(0, selectedNode.path.lastIndexOf("/"))
    : "";

  return (
    <Html
      position={[
        x - terrainData.bounds.width / 2,
        y,
        z - terrainData.bounds.height / 2,
      ]}
      center
      style={{ pointerEvents: "none", transform: "translate(-50%, -100%)" }}
      zIndexRange={[10, 10]}
    >
      <div
        className="rounded-xl px-4 py-3 animate-fade-in"
        style={{
          background: "rgba(8,8,16,0.95)",
          border: `1px solid ${biome.accent}55`,
          borderTop: `3px solid ${biome.accent}`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 12px ${biome.accent}22`,
          minWidth: "180px",
        }}
      >
        <div className="font-bold text-white text-[15px] mb-1">{selectedNode.name}</div>

        {dirPath && (
          <div className="text-gray-500 text-[11px] font-mono mb-2 truncate max-w-[280px]">
            {dirPath}/
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: biome.accent }}
            />
            <span style={{ color: biome.accent }}>{selectedNode.language || "Other"}</span>
          </div>
          <div className="text-gray-300">{formatBytes(selectedNode.size)}</div>
        </div>

        {selectedNode.heat > 0.1 && (
          <div className="text-orange-300 text-[11px] mt-1.5">
            {(selectedNode.heat * 100).toFixed(0)}% recently active
          </div>
        )}

        <div className="text-gray-600 text-[10px] mt-2">
          Double-click to open on GitHub
        </div>
      </div>
    </Html>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TerrainScene({ terrainData }: { terrainData: TerrainData }) {
  const terrainSize = Math.max(terrainData.bounds.width, terrainData.bounds.height);

  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        gl={{
          antialias: true,
          // Use linear tonemapping — ACES was desaturating everything to gray
          toneMapping: THREE.NoToneMapping,
          preserveDrawingBuffer: true,
        }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault fov={50} near={0.1} far={terrainSize * 5} />
        <color attach="background" args={["#080812"]} />
        <SceneLights terrainSize={terrainSize} />
        <Stars
          radius={terrainSize * 2}
          depth={50}
          count={1500}
          factor={4}
          saturation={0.3}
          fade
          speed={0.3}
        />
        <Ground size={terrainSize} />
        {terrainData.flatNodes.length > INSTANCED_THRESHOLD ? (
          <InstancedTerrain terrainData={terrainData} />
        ) : (
          <TerrainMesh terrainData={terrainData} />
        )}
        <RegionBorders terrainData={terrainData} />
        <SelectedLabel />
        <CameraController bounds={terrainData.bounds} />
      </Canvas>
    </div>
  );
}
