"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { InputShaderSettings } from "@/lib/types"
import { colorsToVec3Array, hexToVec3 } from "@/components/renderer/input-shader"

interface ParticlesShaderProps {
  settings: InputShaderSettings
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Particles with mouse trail and click bursts
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform vec2 uMouseHistory[8];
  uniform float uClickTime;
  uniform vec3 uColors[8];
  uniform int uColorCount;
  uniform vec3 uBackgroundColor;
  uniform float uParticleCount;
  uniform float uSpeed;
  uniform float uSize;
  uniform float uSpread;
  uniform float uAttraction;
  uniform float uGlow;
  uniform float uTrail;

  varying vec2 vUv;

  #define PI 3.14159265359
  #define TAU 6.28318530718

  // Hash function for pseudo-random numbers
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  vec2 hash2(float n) {
    return vec2(hash(n), hash(n + 57.0));
  }

  // Smooth noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = i.x + i.y * 57.0;
    return mix(
      mix(hash(n), hash(n + 1.0), f.x),
      mix(hash(n + 57.0), hash(n + 58.0), f.x),
      f.y
    );
  }

  // Get interpolated mouse position from history
  vec2 getHistoricalMouse(float t) {
    float idx = t * 7.0;
    int i0 = int(min(idx, 7.0));
    int i1 = int(min(idx + 1.0, 7.0));
    float blend = fract(idx);
    vec2 m0 = uMouseHistory[i0] * 0.5 + 0.5;
    vec2 m1 = uMouseHistory[i1] * 0.5 + 0.5;
    return mix(m0, m1, blend);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;

    // Current mouse position
    vec2 mouse = uMouse * 0.5 + 0.5;
    if (length(uMouse) < 0.001) {
      mouse = vec2(0.5);
    }

    vec3 color = uBackgroundColor;
    float totalIntensity = 0.0;
    vec3 particleColorSum = vec3(0.0);

    // Click burst effect
    float timeSinceClick = uTime - uClickTime;
    float clickBurst = 0.0;
    if (timeSinceClick >= 0.0 && timeSinceClick < 2.0) {
      clickBurst = exp(-timeSinceClick * 2.0);
    }

    // Render particles - each particle is attracted to a different point in mouse history
    int particleCount = int(uParticleCount);
    for (int i = 0; i < 500; i++) {
      if (i >= particleCount) break;

      float fi = float(i);

      // Base position from hash
      vec2 basePos = hash2(fi * 127.1);

      // Each particle follows a different point in mouse history
      // This creates a trailing swarm effect
      float historyT = hash(fi * 567.3); // Random point in history for this particle
      vec2 attractMouse = getHistoricalMouse(historyT * uTrail);

      // Add movement based on time
      float angle = hash(fi * 311.7) * PI * 2.0 + uTime * uSpeed * (0.5 + hash(fi * 173.3));
      float radius = hash(fi * 227.9) * uSpread;
      vec2 movement = vec2(cos(angle), sin(angle)) * radius * 0.3;

      // Add noise-based wandering
      vec2 noiseOffset = vec2(
        noise(vec2(fi * 0.1, uTime * uSpeed * 0.5)) - 0.5,
        noise(vec2(fi * 0.1 + 100.0, uTime * uSpeed * 0.5)) - 0.5
      ) * uSpread * 0.5;

      vec2 particlePos = basePos + movement + noiseOffset;

      // Mouse attraction - particles attracted to their historical mouse point
      vec2 toMouse = attractMouse - particlePos;
      float distToMouse = length(toMouse);
      if (distToMouse > 0.001) {
        float attractionStrength = uAttraction * 0.3;
        vec2 attractionForce = normalize(toMouse) * attractionStrength / (distToMouse + 0.1);
        particlePos += attractionForce;
      }

      // Keep particles in bounds with wrapping
      particlePos = fract(particlePos);

      // Distance from current pixel to particle
      vec2 diff = uv - particlePos;
      diff.x *= aspect;
      float dist = length(diff);

      // Particle size with variation - use square root for gentler scaling
      float particleSize = sqrt(uSize) * 0.007 * (0.5 + hash(fi * 433.7) * 0.5);

      // Soft particle with glow
      float intensity = smoothstep(particleSize * (1.0 + uGlow * 2.0), 0.0, dist);

      // Color selection
      int colorIdx = int(mod(fi, float(uColorCount)));
      vec3 particleColor = uColors[colorIdx];

      // Add some color variation based on position
      particleColor = mix(particleColor, particleColor * 1.3, hash(fi * 789.5) * 0.3);

      particleColorSum += particleColor * intensity;
      totalIntensity += intensity;
    }

    // Click burst - explosion of particles from mouse
    if (clickBurst > 0.01) {
      for (int i = 0; i < 80; i++) {
        float fi = float(i) + 1000.0;
        float seed = fi * 73.1;

        // Burst particles radiate outward from mouse
        float burstLife = timeSinceClick;
        float angle = hash(seed) * TAU;
        float velocity = 0.2 + hash(seed + 1.0) * 0.4;

        vec2 dir = vec2(cos(angle), sin(angle));
        vec2 burstPos = mouse + dir * velocity * burstLife;

        // Slight gravity
        burstPos.y -= burstLife * burstLife * 0.1;

        // Keep in bounds
        burstPos = fract(burstPos);

        vec2 diff = uv - burstPos;
        diff.x *= aspect;
        float dist = length(diff);

        float burstSize = sqrt(uSize) * 0.01 * clickBurst * (1.0 - burstLife * 0.3);
        float burstIntensity = exp(-dist * dist / (burstSize * burstSize)) * clickBurst;

        int colorIdx = int(mod(hash(seed + 2.0) * float(uColorCount), float(uColorCount)));
        vec3 burstColor = uColors[colorIdx];

        // White-hot center
        particleColorSum += mix(burstColor, vec3(1.0), burstIntensity * 0.4) * burstIntensity;
        totalIntensity += burstIntensity;
      }

      // Central flash on click
      vec2 diffMouse = uv - mouse;
      diffMouse.x *= aspect;
      float mouseDist = length(diffMouse);
      float flash = exp(-mouseDist * 8.0) * clickBurst * 0.5;
      particleColorSum += uColors[0] * flash;
      totalIntensity += flash;
    }

    // Combine particle colors
    if (totalIntensity > 0.0) {
      vec3 avgColor = particleColorSum / max(totalIntensity, 1.0);
      color = mix(uBackgroundColor, avgColor, min(totalIntensity, 1.0));

      // Add bloom/glow
      color += particleColorSum * uGlow * 0.3;
    }

    // Subtle mouse glow at current position
    vec2 diffMouse = uv - mouse;
    diffMouse.x *= aspect;
    float mouseGlowDist = length(diffMouse);
    float mouseGlow = exp(-mouseGlowDist * 4.0) * uGlow * 0.15;
    color += uColors[0] * mouseGlow;

    gl_FragColor = vec4(color, 1.0);
  }
`

export function ParticlesShader({ settings }: ParticlesShaderProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport, size, pointer, gl } = useThree()

  // Mouse history for trailing effect - stores past positions
  const mouseHistoryRef = useRef<THREE.Vector2[]>(
    Array.from({ length: 8 }, () => new THREE.Vector2(0, 0))
  )
  const historyTimerRef = useRef(0)
  const clickTimeRef = useRef(-10)

  // Safe access to nested settings with defaults
  const params = settings?.particles || {
    animate: true, particleCount: 100, speed: 0.5, size: 8, spread: 0.5, attraction: 0.3, glow: 0.6, trail: 0.2
  }

  // Create a fixed-size array of 8 vec3s for the shader uniform
  const getColorsArray = () => {
    const colors = colorsToVec3Array(settings?.colors)
    const result: THREE.Vector3[] = []
    for (let i = 0; i < 8; i++) {
      result.push(colors[i] || new THREE.Vector3(0, 0, 0))
    }
    return result
  }

  // Create initial mouse history array for uniforms
  const getMouseHistoryArray = () => {
    return Array.from({ length: 8 }, () => new THREE.Vector2(0, 0))
  }

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uMouseHistory: { value: getMouseHistoryArray() },
    uClickTime: { value: -10 },
    uColors: { value: getColorsArray() },
    uColorCount: { value: colorsToVec3Array(settings?.colors).length },
    uBackgroundColor: { value: hexToVec3(settings?.backgroundColor) },
    uParticleCount: { value: params.particleCount },
    uSpeed: { value: params.speed },
    uSize: { value: params.size },
    uSpread: { value: params.spread },
    uAttraction: { value: params.attraction },
    uGlow: { value: params.glow },
    uTrail: { value: params.trail },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  // Click handler
  useEffect(() => {
    const canvas = gl.domElement
    const handleClick = () => {
      if (meshRef.current) {
        const material = meshRef.current.material as THREE.ShaderMaterial
        clickTimeRef.current = material.uniforms.uTime.value
        material.uniforms.uClickTime.value = clickTimeRef.current
      }
    }
    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [gl])

  // Update uniforms when settings change
  useFrame((state, delta) => {
    if (meshRef.current && settings) {
      const material = meshRef.current.material as THREE.ShaderMaterial

      // Update mouse history every ~30ms for smooth trailing
      historyTimerRef.current += delta
      if (historyTimerRef.current > 0.03) {
        historyTimerRef.current = 0
        // Shift history - oldest positions at higher indices
        for (let i = 7; i > 0; i--) {
          mouseHistoryRef.current[i].copy(mouseHistoryRef.current[i - 1])
        }
        // Current position at index 0
        mouseHistoryRef.current[0].set(pointer.x, pointer.y)
      }

      // Only animate if animate flag is true
      material.uniforms.uTime.value = params.animate ? state.clock.elapsedTime : 0
      material.uniforms.uResolution.value.set(size.width, size.height)
      material.uniforms.uMouse.value.set(pointer.x, pointer.y)

      // Update mouse history uniform
      for (let i = 0; i < 8; i++) {
        material.uniforms.uMouseHistory.value[i].copy(mouseHistoryRef.current[i])
      }

      // Update colors
      const newColors = getColorsArray()
      const colorCount = colorsToVec3Array(settings?.colors).length
      for (let i = 0; i < 8; i++) {
        material.uniforms.uColors.value[i].copy(newColors[i])
      }
      material.uniforms.uColorCount.value = colorCount

      material.uniforms.uBackgroundColor.value.copy(hexToVec3(settings?.backgroundColor))
      material.uniforms.uParticleCount.value = params.particleCount
      material.uniforms.uSpeed.value = params.speed
      material.uniforms.uSize.value = params.size
      material.uniforms.uSpread.value = params.spread
      material.uniforms.uAttraction.value = params.attraction
      material.uniforms.uGlow.value = params.glow
      material.uniforms.uTrail.value = params.trail
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
