"use client";

import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { TerrainNode } from "@/lib/types";
import { getBiome } from "@/lib/languages";
import { useAppStore } from "@/lib/store";

interface TerrainBlockProps {
  node: TerrainNode;
  riseDelay: number;
  totalNodes: number;
}

export function TerrainBlock({ node, riseDelay }: TerrainBlockProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const setSelectedNode = useAppStore((s) => s.setSelectedNode);
  const selectedNode = useAppStore((s) => s.selectedNode);
  const repoData = useAppStore((s) => s.repoData);

  const isSelected = selectedNode?.path === node.path;
  const biome = useMemo(() => getBiome(node.language), [node.language]);

  const { position, dimensions, baseColor, accentColor } = useMemo(() => {
    const w = Math.max(node.rect.width * 0.88, 0.1);
    const d = Math.max(node.rect.height * 0.88, 0.1);
    const h = Math.max(node.elevation * 10 + 0.4, 0.4);

    const cx = node.rect.x + node.rect.width / 2;
    const cz = node.rect.y + node.rect.height / 2;

    return {
      position: [cx, h / 2, cz] as [number, number, number],
      dimensions: [w, h, d] as [number, number, number],
      baseColor: new THREE.Color(biome.base),
      accentColor: new THREE.Color(biome.accent),
    };
  }, [node, biome]);

  const uniforms = useMemo(
    () => ({
      uBaseColor: { value: baseColor },
      uAccentColor: { value: accentColor },
      uHeat: { value: node.heat },
      uTime: { value: 0 },
      uHovered: { value: 0 },
      uSelected: { value: 0 },
    }),
    [baseColor, accentColor, node.heat]
  );

  useFrame((state) => {
    if (!materialRef.current) return;
    const t = state.clock.elapsedTime;
    materialRef.current.uniforms.uTime.value = t;

    const riseStart = riseDelay;
    const riseEnd = riseDelay + 0.8;
    const progress = THREE.MathUtils.smoothstep(t, riseStart, riseEnd);

    const targetHover = hovered ? 1 : 0;
    const targetSelect = isSelected ? 1 : 0;
    materialRef.current.uniforms.uHovered.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uHovered.value,
      targetHover,
      0.1
    );
    materialRef.current.uniforms.uSelected.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uSelected.value,
      targetSelect,
      0.1
    );

    if (meshRef.current) {
      meshRef.current.scale.y = progress;
      meshRef.current.position.y = (dimensions[1] * progress) / 2;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[position[0], 0, position[2]]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedNode(isSelected ? null : node);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (repoData) {
          const url = `https://github.com/${repoData.owner}/${repoData.repo}/blob/${repoData.defaultBranch || "main"}/${node.path}`;
          window.open(url, "_blank", "noopener");
        }
      }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={dimensions} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        toneMapped={false}
        vertexShader={`
          varying vec2 vUv;
          varying float vElevation;
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          void main() {
            vUv = uv;
            vElevation = position.y + ${dimensions[1].toFixed(2)} * 0.5;
            vNormal = normalize(normalMatrix * normal);
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          varying float vElevation;
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          uniform vec3 uBaseColor;
          uniform vec3 uAccentColor;
          uniform float uHeat;
          uniform float uTime;
          uniform float uHovered;
          uniform float uSelected;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
              f.y
            );
          }

          void main() {
            // Bright, clear lighting
            vec3 lightDir = normalize(vec3(0.4, 1.0, 0.3));
            float diffuse = max(dot(vNormal, lightDir), 0.0);
            float ambient = 0.5;
            float lighting = ambient + diffuse * 0.5;

            // Color: blend heavily toward accent (bright) based on elevation
            float elevMix = 0.4 + smoothstep(0.0, 8.0, vElevation) * 0.4;
            vec3 color = mix(uBaseColor, uAccentColor, elevMix);

            // Subtle noise texture
            float n = noise(vWorldPosition.xz * 3.0);
            color += (n - 0.5) * 0.03;

            // Top face is brighter
            float topFace = step(0.9, vNormal.y);
            color += vec3(0.05) * topFace;

            // Side faces: subtle edge darkening for depth
            float sideDarken = (1.0 - abs(vNormal.y)) * 0.1;
            lighting -= sideDarken;

            // Heat overlay
            if (uHeat > 0.05) {
              vec3 heatColor = mix(vec3(0.2, 0.35, 0.55), vec3(1.0, 0.35, 0.15), uHeat);
              color += heatColor * uHeat * 0.2;
            }

            color *= lighting;

            // Snow on high peaks
            float snowLine = smoothstep(7.0, 9.0, vElevation);
            float snowNoise = noise(vWorldPosition.xz * 10.0);
            color = mix(color, vec3(0.9, 0.92, 0.97), snowLine * (0.4 + snowNoise * 0.4));

            // Hover/select glow
            float highlight = max(uHovered * 0.4, uSelected * 0.6);
            color += uAccentColor * highlight * (0.8 + 0.2 * sin(uTime * 3.0));

            // Edge glow for selected
            if (uSelected > 0.5) {
              float edge = 1.0 - abs(dot(vNormal, vec3(0.0, 1.0, 0.0)));
              color += uAccentColor * edge * 0.4;
            }

            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}
