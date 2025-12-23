"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { InputShaderSettings } from "@/lib/types"

interface BlackHoleShaderProps {
  settings: InputShaderSettings
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/**
 * Black Hole Shader - Gravitational lensing and accretion disk
 * Based on Shadertoy shader with procedural noise
 */
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uBackgroundColor;
  uniform bool uAnimate;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uDiskIntensity;
  uniform float uWarpStrength;
  uniform float uColorShift;
  uniform float uGlowIntensity;
  uniform float uRotationSpeed;

  varying vec2 vUv;

  // Smooth interpolation
  float smootherstep(float x) {
    return x * x * (3.0 - 2.0 * x);
  }

  vec2 smootherstep2(vec2 x) {
    return vec2(smootherstep(x.x), smootherstep(x.y));
  }

  // Simple hash function for procedural noise
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Value noise (replacement for texture-based noise)
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    // Smooth interpolation
    vec2 u = smootherstep2(f);

    // Four corners
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    // Bilinear interpolation
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 0.5 + 0.25;
  }

  void main() {
    float time = uAnimate ? uTime * uSpeed : 0.0;

    vec2 r = uResolution.xy;
    vec2 p = vUv * r;

    // Center and normalize coordinates
    p = (p + p - r) / sqrt(r.x * r.y) * 16.0 * uScale;

    // Gravitational lensing distortion
    float warp = uWarpStrength;
    p -= p / max(dot(p, p) / (tanh(p.y * 0.7 + sqrt(p.x * p.x * 7.0 + 1.0) * 0.15 - 0.6) + 1.0) / 5.0 * warp, 1.0);

    // Vertical stretching for accretion disk perspective
    p.y *= 4.5;
    p /= 1.0 - p.y * 0.04;

    vec2 h1 = p;
    vec2 h2 = p;
    float d = length(p);

    // Rotation matrices for the swirling disk effect
    float rotSpeed = time * uRotationSpeed;
    float angle1 = rotSpeed / pow(floor(d) + 0.5, 2.0) * 173.0;
    float angle2 = rotSpeed / pow(ceil(d) + 0.5, 2.0) * 173.0;

    mat2 rot1 = mat2(cos(angle1), sin(angle1 + 11.0), sin(angle1 + 33.0), cos(angle1));
    mat2 rot2 = mat2(cos(angle2), sin(angle2 + 11.0), sin(angle2 + 33.0), cos(angle2));

    h1 = rot1 * h1;
    h2 = rot2 * h2;

    // Sample noise at different scales
    float noiseOffset = time * 0.5;
    vec4 c = vec4(0.0);
    c += vec4(mix(noise(h1 * 0.7 / 1.5 + noiseOffset), noise(h2 * 0.7 / 1.5 + noiseOffset), smootherstep(fract(d))));
    c += vec4(mix(noise(h1 * 1.7 / 1.5 + noiseOffset), noise(h2 * 1.7 / 1.5 + noiseOffset), smootherstep(fract(d)))) * 0.4;

    // Apply radial falloff and intensity
    c *= uDiskIntensity;
    c /= d * d * 0.03;
    c -= 0.11;
    c *= d * d;
    c -= 14.0 / d / d / d;
    c /= 13.0;

    // Color shift (blue to orange based on colorShift parameter)
    vec3 coldColor = vec3(0.0, 0.4, 0.9);
    vec3 hotColor = vec3(0.9, 0.4, 0.0);
    vec3 colorTint = mix(coldColor, hotColor, uColorShift);
    c.rgb -= colorTint * (1.0 - uColorShift * 0.5);

    // Add glow around the event horizon
    float glowRadius = 2.0;
    float glow = exp(-d / glowRadius) * uGlowIntensity;
    c.rgb += glow * mix(coldColor, hotColor, uColorShift) * 0.5;

    // Clamp and add background
    c.rgb = max(c.rgb, vec3(0.0));
    c.rgb = mix(uBackgroundColor, c.rgb, clamp(c.r + c.g + c.b, 0.0, 1.0));

    // Ensure black hole center stays dark
    float eventHorizon = smoothstep(0.5, 1.5, d);
    c.rgb *= eventHorizon;
    c.rgb = mix(uBackgroundColor, c.rgb, eventHorizon);

    gl_FragColor = vec4(c.rgb, 1.0);
  }
`

export function BlackHoleShader({ settings }: BlackHoleShaderProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport, size } = useThree()

  // Safe access to nested settings with defaults
  const blackHoleParams = settings?.blackHole || {
    animate: true,
    speed: 0.5,
    scale: 1.0,
    diskIntensity: 0.8,
    warpStrength: 0.7,
    colorShift: 0.5,
    glowIntensity: 0.6,
    rotationSpeed: 1.0,
  }

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uBackgroundColor: { value: new THREE.Vector3(0, 0, 0) },
    uAnimate: { value: blackHoleParams.animate },
    uSpeed: { value: blackHoleParams.speed },
    uScale: { value: blackHoleParams.scale },
    uDiskIntensity: { value: blackHoleParams.diskIntensity },
    uWarpStrength: { value: blackHoleParams.warpStrength },
    uColorShift: { value: blackHoleParams.colorShift },
    uGlowIntensity: { value: blackHoleParams.glowIntensity },
    uRotationSpeed: { value: blackHoleParams.rotationSpeed },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  // Convert hex to vec3
  const hexToVec3 = (hex: string) => {
    const cleanHex = hex.replace('#', '')
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255
    return new THREE.Vector3(r, g, b)
  }

  // Update uniforms when settings change
  useFrame((state) => {
    if (meshRef.current && settings) {
      const material = meshRef.current.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = state.clock.elapsedTime
      material.uniforms.uResolution.value.set(size.width, size.height)
      material.uniforms.uBackgroundColor.value.copy(hexToVec3(settings?.backgroundColor || "#000000"))
      material.uniforms.uAnimate.value = blackHoleParams.animate
      material.uniforms.uSpeed.value = blackHoleParams.speed
      material.uniforms.uScale.value = blackHoleParams.scale
      material.uniforms.uDiskIntensity.value = blackHoleParams.diskIntensity
      material.uniforms.uWarpStrength.value = blackHoleParams.warpStrength
      material.uniforms.uColorShift.value = blackHoleParams.colorShift
      material.uniforms.uGlowIntensity.value = blackHoleParams.glowIntensity
      material.uniforms.uRotationSpeed.value = blackHoleParams.rotationSpeed
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
