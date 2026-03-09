"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { TerrainData, TerrainNode } from "@/lib/types";
import { getBiome } from "@/lib/languages";
import { useAppStore } from "@/lib/store";

interface InstancedTerrainProps {
  terrainData: TerrainData;
}

const vertShader = /* glsl */ `
  attribute vec3 instanceColorAttr;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vHeight;

  void main() {
    vColor = instanceColorAttr;
    vUv = uv;
    vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vHeight = (instanceMatrix * vec4(position, 1.0)).y;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragShader = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vHeight;

  void main() {
    vec3 lightDir = normalize(vec3(0.3, 1.0, 0.2));
    float diff = max(dot(vNormal, lightDir), 0.0);
    float isTop = step(0.8, vNormal.y);
    float isSide = 1.0 - isTop;
    float isBottom = step(0.8, -vNormal.y);
    float lighting = isTop * 1.0 + isSide * (0.55 + diff * 0.25) + isBottom * 0.3;

    float edgeX = smoothstep(0.0, 0.06, vUv.x) * smoothstep(0.0, 0.06, 1.0 - vUv.x);
    float edgeY = smoothstep(0.0, 0.06, vUv.y) * smoothstep(0.0, 0.06, 1.0 - vUv.y);
    lighting *= (0.7 + edgeX * edgeY * 0.3);

    if (isTop > 0.5) {
      float topEdge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(0.0, 0.15, 1.0 - vUv.x)
                    * smoothstep(0.0, 0.15, vUv.y) * smoothstep(0.0, 0.15, 1.0 - vUv.y);
      lighting += (1.0 - topEdge) * 0.15;
    }

    vec3 color = vColor * lighting;
    color *= 1.0 + vHeight * 0.01;
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Spatial grid for O(1) click lookups instead of O(n) scan
function buildSpatialGrid(flatNodes: TerrainNode[], cellSize: number) {
  const grid = new Map<string, TerrainNode[]>();
  for (const node of flatNodes) {
    const r = node.rect;
    const x0 = Math.floor(r.x / cellSize);
    const x1 = Math.floor((r.x + r.width) / cellSize);
    const y0 = Math.floor(r.y / cellSize);
    const y1 = Math.floor((r.y + r.height) / cellSize);
    for (let gx = x0; gx <= x1; gx++) {
      for (let gy = y0; gy <= y1; gy++) {
        const key = `${gx},${gy}`;
        let cell = grid.get(key);
        if (!cell) { cell = []; grid.set(key, cell); }
        cell.push(node);
      }
    }
  }
  return grid;
}

function findNodeAtPoint(
  worldX: number, worldZ: number,
  grid: Map<string, TerrainNode[]>,
  cellSize: number, cx: number, cz: number
): TerrainNode | null {
  const tx = worldX + cx;
  const tz = worldZ + cz;
  const gx = Math.floor(tx / cellSize);
  const gy = Math.floor(tz / cellSize);
  const candidates = grid.get(`${gx},${gy}`);
  if (!candidates) return null;

  let best: TerrainNode | null = null;
  let bestArea = Infinity;
  for (const node of candidates) {
    const r = node.rect;
    if (tx >= r.x && tx <= r.x + r.width && tz >= r.y && tz <= r.y + r.height) {
      const area = r.width * r.height;
      if (area < bestArea) { best = node; bestArea = area; }
    }
  }
  return best;
}

export function InstancedTerrain({ terrainData }: InstancedTerrainProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { flatNodes, bounds } = terrainData;
  const count = flatNodes.length;
  const [startTime, setStartTime] = useState<number | null>(null);
  const lastClickRef = useRef(0);

  const cx = bounds.width / 2;
  const cz = bounds.height / 2;
  const planeSize = Math.max(bounds.width, bounds.height) * 1.5;

  // Pre-compute all animation data in flat typed arrays (no per-frame allocations)
  const { colorArray, animData, spatialGrid, cellSize } = useMemo(() => {
    const colorData = new Float32Array(count * 3);
    // animData: per-node [posX, posY, posZ, scaleX, scaleY, scaleZ, delay] = 7 floats
    const animData = new Float32Array(count * 7);
    const maxDist = Math.sqrt(cx * cx + cz * cz) || 1;
    const identityQuat = new THREE.Quaternion();
    const baseColor = new THREE.Color();
    const accentColor = new THREE.Color();
    const warmColor = new THREE.Color(1.0, 0.45, 0.15);

    for (let i = 0; i < count; i++) {
      const node = flatNodes[i];
      const w = Math.max(node.rect.width * 0.88, 0.08);
      const d = Math.max(node.rect.height * 0.88, 0.08);
      const h = Math.max(node.elevation * 10 + 0.5, 0.5);
      const posX = node.rect.x + node.rect.width / 2 - cx;
      const posZ = node.rect.y + node.rect.height / 2 - cz;
      const dist = Math.sqrt(posX * posX + posZ * posZ);
      const delay = (dist / maxDist) * 1.2 + 0.1;

      const off = i * 7;
      animData[off] = posX;
      animData[off + 1] = h / 2;
      animData[off + 2] = posZ;
      animData[off + 3] = w;
      animData[off + 4] = h;
      animData[off + 5] = d;
      animData[off + 6] = delay;

      // Color computation — reuse objects
      const biome = getBiome(node.language);
      baseColor.set(biome.base);
      accentColor.set(biome.accent);
      const mixAmt = 0.5 + node.elevation * 0.4;
      baseColor.lerp(accentColor, mixAmt);
      if (node.heat > 0.05) {
        baseColor.lerp(warmColor, node.heat * 0.3);
      }
      colorData[i * 3] = baseColor.r;
      colorData[i * 3 + 1] = baseColor.g;
      colorData[i * 3 + 2] = baseColor.b;
    }

    // Spatial grid for click lookups
    const cellSize = Math.max(bounds.width, bounds.height) / 20;
    const spatialGrid = buildSpatialGrid(flatNodes, cellSize);

    return { colorArray: colorData, animData, spatialGrid, cellSize };
  }, [flatNodes, cx, cz, count, bounds]);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: vertShader,
      fragmentShader: fragShader,
      toneMapped: false,
    });
  }, []);

  // Scratch objects for animation loop — allocated ONCE, reused every frame
  const scratchMatrix = useRef(new THREE.Matrix4());
  const scratchPos = useRef(new THREE.Vector3());
  const scratchScale = useRef(new THREE.Vector3());
  const scratchQuat = useRef(new THREE.Quaternion());

  // Setup instances
  useEffect(() => {
    if (!meshRef.current) return;
    setStartTime(null);

    const geo = meshRef.current.geometry;
    geo.setAttribute("instanceColorAttr", new THREE.InstancedBufferAttribute(colorArray, 3));

    const mat = scratchMatrix.current;
    const pos = scratchPos.current;
    const scale = scratchScale.current;
    const quat = scratchQuat.current;

    for (let i = 0; i < count; i++) {
      const off = i * 7;
      pos.set(animData[off], 0.01, animData[off + 2]);
      scale.set(animData[off + 3], 0.01, animData[off + 5]);
      mat.compose(pos, quat, scale);
      meshRef.current.setMatrixAt(i, mat);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    requestAnimationFrame(() => setStartTime(performance.now() / 1000));
  }, [animData, colorArray, count, shaderMaterial]);

  // Click handler
  const handlePlaneClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      const point = e.point as THREE.Vector3;
      const node = findNodeAtPoint(point.x, point.z, spatialGrid, cellSize, cx, cz);
      if (!node) {
        useAppStore.getState().setSelectedNode(null);
        return;
      }

      const now = Date.now();
      const isDouble = now - lastClickRef.current < 400;
      lastClickRef.current = now;

      if (isDouble) {
        const repoData = useAppStore.getState().repoData;
        if (repoData) {
          const url = `https://github.com/${repoData.owner}/${repoData.repo}/blob/${repoData.defaultBranch || "main"}/${node.path}`;
          window.open(url, "_blank", "noopener");
        }
      } else {
        const clickTime = now;
        setTimeout(() => {
          if (lastClickRef.current === clickTime) {
            const current = useAppStore.getState().selectedNode;
            useAppStore.getState().setSelectedNode(
              current?.path === node.path ? null : node
            );
          }
        }, 400);
      }
    },
    [spatialGrid, cellSize, cx, cz]
  );

  // Animate rise — zero allocations per frame
  useFrame(() => {
    if (!meshRef.current || startTime === null) return;
    const elapsed = performance.now() / 1000 - startTime;

    const mat = scratchMatrix.current;
    const pos = scratchPos.current;
    const scale = scratchScale.current;
    const quat = scratchQuat.current;

    let allDone = true;
    for (let i = 0; i < count; i++) {
      const off = i * 7;
      const delay = animData[off + 6];
      const progress = Math.min(Math.max((elapsed - delay) / 0.6, 0), 1);

      if (progress < 1) allDone = false;

      const eased = 1 - (1 - progress) * (1 - progress) * (1 - progress); // cubic ease-out

      pos.set(animData[off], animData[off + 1] * eased, animData[off + 2]);
      scale.set(animData[off + 3], Math.max(animData[off + 4] * eased, 0.01), animData[off + 5]);
      mat.compose(pos, quat, scale);
      meshRef.current.setMatrixAt(i, mat);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;

    if (allDone) {
      // Set final matrices precisely
      for (let i = 0; i < count; i++) {
        const off = i * 7;
        pos.set(animData[off], animData[off + 1], animData[off + 2]);
        scale.set(animData[off + 3], animData[off + 4], animData[off + 5]);
        mat.compose(pos, quat, scale);
        meshRef.current.setMatrixAt(i, mat);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
      setStartTime(null);
    }
  });

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, count]}
        material={shaderMaterial}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>

      {/* Invisible click-catcher plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onClick={handlePlaneClick}
      >
        <planeGeometry args={[planeSize, planeSize]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}
