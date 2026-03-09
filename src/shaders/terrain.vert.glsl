// Terrain vertex shader
// Displaces vertices based on heightmap data

varying vec2 vUv;
varying float vElevation;
varying vec3 vNormal;
varying vec3 vWorldPosition;

uniform float uTime;
uniform float uRiseProgress;

void main() {
  vUv = uv;
  vElevation = position.y;
  vNormal = normalize(normalMatrix * normal);

  // Animate terrain rising from ground
  vec3 pos = position;
  pos.y *= smoothstep(0.0, 1.0, uRiseProgress);

  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
