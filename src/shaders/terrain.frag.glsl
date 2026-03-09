// Terrain fragment shader
// Colors based on biome (language), elevation, and activity heat

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

// Simple noise function for texture variation
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
  // Base terrain lighting (hemisphere light simulation)
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
  float diffuse = max(dot(vNormal, lightDir), 0.0);
  float ambient = 0.3;
  float lighting = ambient + diffuse * 0.7;

  // Mix base and accent colors based on elevation
  float elevMix = smoothstep(0.0, 0.8, vElevation / 8.0);
  vec3 baseColor = mix(uBaseColor, uAccentColor, elevMix * 0.4);

  // Add noise-based texture variation
  float n = noise(vWorldPosition.xz * 2.0);
  baseColor += (n - 0.5) * 0.05;

  // Heat overlay: warm glow for active files
  vec3 heatColor = mix(vec3(0.1, 0.3, 0.6), vec3(1.0, 0.3, 0.1), uHeat);
  float heatGlow = uHeat * 0.15;

  // Combine
  vec3 color = baseColor * lighting + heatColor * heatGlow;

  // Elevation-based fog (lower areas are darker)
  float fogFactor = smoothstep(-2.0, 5.0, vWorldPosition.y);
  vec3 fogColor = vec3(0.02, 0.02, 0.04);
  color = mix(fogColor, color, 0.7 + fogFactor * 0.3);

  // Snow on peaks
  float snowLine = smoothstep(6.0, 8.0, vElevation);
  float snowNoise = noise(vWorldPosition.xz * 8.0);
  color = mix(color, vec3(0.85, 0.88, 0.95), snowLine * snowNoise * 0.6);

  // Hover/select highlight
  float highlight = max(uHovered * 0.3, uSelected * 0.4);
  color += uAccentColor * highlight * (0.8 + 0.2 * sin(uTime * 3.0));

  // Edge glow for selected
  if (uSelected > 0.5) {
    float edge = 1.0 - abs(dot(vNormal, vec3(0.0, 1.0, 0.0)));
    color += uAccentColor * edge * 0.5;
  }

  gl_FragColor = vec4(color, 1.0);
}
