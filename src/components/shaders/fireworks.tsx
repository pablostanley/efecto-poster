"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { InputShaderSettings } from "@/lib/types"
import { colorsToVec3Array, hexToVec3 } from "@/components/renderer/input-shader"

interface FireworksShaderProps {
  settings: InputShaderSettings
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Handheld sparkler effect - sparks trail behind mouse movement
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform vec2 uMouseHistory[8];
  uniform float uClickTime;
  uniform vec3 uColors[8];
  uniform int uColorCount;
  uniform vec3 uBackgroundColor;
  uniform float uSparkCount;
  uniform float uSpeed;
  uniform float uSize;
  uniform float uSpread;
  uniform float uGravity;
  uniform float uFadeSpeed;
  uniform float uGlow;

  varying vec2 vUv;

  #define PI 3.14159265359
  #define TAU 6.28318530718

  // Fast hash functions
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // Smooth noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 uvAspect = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

    // Current mouse position
    vec2 mouse = uMouse * 0.5 + 0.5;
    if (length(uMouse) < 0.001) {
      mouse = vec2(0.5);
    }
    vec2 mouseAspect = vec2((mouse.x - 0.5) * aspect, mouse.y - 0.5);

    float time = uTime * uSpeed;
    vec3 color = uBackgroundColor;

    // Click burst effect
    float timeSinceClick = uTime - uClickTime;
    float clickBurst = 0.0;
    if (timeSinceClick >= 0.0 && timeSinceClick < 1.5) {
      clickBurst = exp(-timeSinceClick * 3.0);
    }

    int numSparks = int(uSparkCount);

    // Main sparks - emit from current mouse position
    for (int i = 0; i < 500; i++) {
      if (i >= numSparks) break;

      float fi = float(i);
      float seed = fi * 127.1;

      // Each spark has a birth time that cycles
      float sparkCycle = 1.5 + hash(seed) * 2.0;
      float sparkLife = mod(time + hash(seed + 10.0) * sparkCycle, sparkCycle);
      float lifeNorm = sparkLife / sparkCycle;

      // Skip if spark is too old
      if (lifeNorm > 0.8 * uFadeSpeed) continue;

      // Determine which historical mouse position this spark came from
      // Older sparks came from older mouse positions
      float historyIndex = sparkLife * 4.0; // Map life to history index
      int histIdx = int(min(historyIndex, 7.0));
      int histIdxNext = int(min(historyIndex + 1.0, 7.0));
      float histBlend = fract(historyIndex);

      // Get the emission point from mouse history (where spark was born)
      vec2 emitMouse1 = uMouseHistory[histIdx] * 0.5 + 0.5;
      vec2 emitMouse2 = uMouseHistory[histIdxNext] * 0.5 + 0.5;
      vec2 emitMouse = mix(emitMouse1, emitMouse2, histBlend);
      vec2 emitAspect = vec2((emitMouse.x - 0.5) * aspect, emitMouse.y - 0.5);

      // Random initial direction - radial burst
      float angle = hash(seed + 1.0) * TAU;
      angle += noise(vec2(fi * 0.1, time * 0.5)) * 0.5;

      // Initial velocity with variation
      float velocity = (0.2 + hash(seed + 2.0) * 0.6) * uSpread;
      velocity *= 0.5 + uSpeed * 0.5;

      // Position: starts at historical mouse position, moves outward
      vec2 dir = vec2(cos(angle), sin(angle));

      // Add some wobble/turbulence to the path
      float wobble = noise(vec2(fi, time * 3.0)) * 0.15;
      dir += vec2(cos(angle + PI * 0.5), sin(angle + PI * 0.5)) * wobble;

      // Calculate position with gravity - spark age is sparkLife
      float t = sparkLife;
      vec2 sparkPos = emitAspect;
      sparkPos += dir * velocity * t;

      // Gravity pulls sparks down
      sparkPos.y -= uGravity * t * t * 0.5;

      // Distance to spark
      float dist = length(uvAspect - sparkPos);

      // Spark size - starts bigger, gets smaller
      float sparkSize = uSize * 0.003 * (1.0 - lifeNorm * 0.7);
      sparkSize *= 0.5 + hash(seed + 3.0) * 0.5;

      // Spark intensity - fades over life
      float fade = 1.0 - pow(lifeNorm / (0.8 * uFadeSpeed), 2.0);
      fade = max(0.0, fade);

      // Flicker effect
      float flicker = 0.7 + 0.3 * sin(time * 20.0 + seed * 5.0);
      flicker *= 0.8 + 0.2 * noise(vec2(fi, time * 10.0));

      // Core bright point
      float spark = smoothstep(sparkSize, sparkSize * 0.1, dist) * fade * flicker;

      // Glow around spark
      float glowSize = sparkSize * (2.0 + uGlow * 4.0);
      float sparkGlow = exp(-dist / glowSize) * fade * uGlow * 0.5;

      // Color - cycle through palette
      float colorPhase = hash(seed + 4.0) + time * 0.2;
      int colorIdx = int(mod(colorPhase * float(uColorCount), float(uColorCount)));
      int nextIdx = int(mod(colorPhase * float(uColorCount) + 1.0, float(uColorCount)));
      float colorBlend = fract(colorPhase * float(uColorCount));
      vec3 sparkColor = mix(uColors[colorIdx], uColors[nextIdx], colorBlend);

      // White-hot core for bright sparks
      vec3 coreColor = mix(sparkColor, vec3(1.0), spark * 0.6);

      // Accumulate
      color += coreColor * spark;
      color += sparkColor * sparkGlow;
    }

    // Click burst - extra explosion of sparks from current position
    if (clickBurst > 0.01) {
      for (int i = 0; i < 150; i++) {
        float fi = float(i) + 2000.0;
        float seed = fi * 91.7;

        float burstLife = timeSinceClick;
        float angle = hash(seed) * TAU;
        float velocity = 0.3 + hash(seed + 1.0) * 0.5;

        vec2 dir = vec2(cos(angle), sin(angle));
        vec2 sparkPos = mouseAspect + dir * velocity * burstLife;
        sparkPos.y -= uGravity * burstLife * burstLife * 0.8;

        float dist = length(uvAspect - sparkPos);
        float sparkSize = uSize * 0.004 * clickBurst;
        float spark = exp(-dist * dist / (sparkSize * sparkSize)) * clickBurst;

        int colorIdx = int(mod(hash(seed + 2.0) * float(uColorCount), float(uColorCount)));
        vec3 sparkColor = uColors[colorIdx];

        // White-hot burst
        color += mix(sparkColor, vec3(1.0), spark * 0.5) * spark;
      }
    }

    // Trailing sparks along the mouse path
    int trailCount = int(float(numSparks) * 0.4);
    for (int i = 0; i < 200; i++) {
      if (i >= trailCount) break;

      float fi = float(i) + 1000.0;
      float seed = fi * 73.7;

      float sparkCycle = 0.4 + hash(seed) * 0.8;
      float sparkLife = mod(time * 1.5 + hash(seed + 10.0) * sparkCycle, sparkCycle);
      float lifeNorm = sparkLife / sparkCycle;

      if (lifeNorm > 0.6) continue;

      // Use mouse history for trail sparks too
      float historyIndex = sparkLife * 6.0;
      int histIdx = int(min(historyIndex, 7.0));
      vec2 emitMouse = uMouseHistory[histIdx] * 0.5 + 0.5;
      vec2 emitAspect = vec2((emitMouse.x - 0.5) * aspect, emitMouse.y - 0.5);

      float angle = hash(seed + 1.0) * TAU;
      float velocity = (0.05 + hash(seed + 2.0) * 0.25) * uSpread;

      vec2 dir = vec2(cos(angle), sin(angle));
      float t = sparkLife;
      vec2 sparkPos = emitAspect + dir * velocity * t;
      sparkPos.y -= uGravity * t * t * 0.3;

      float dist = length(uvAspect - sparkPos);
      float sparkSize = uSize * 0.002 * (1.0 - lifeNorm);
      float fade = 1.0 - lifeNorm / 0.6;
      float flicker = 0.5 + 0.5 * sin(time * 30.0 + seed * 7.0);

      float spark = exp(-dist * dist / (sparkSize * sparkSize)) * fade * flicker * 0.5;

      int colorIdx = int(mod(hash(seed + 4.0) * float(uColorCount), float(uColorCount)));
      color += uColors[colorIdx] * spark * uGlow;
    }

    // Central glow at current emission point
    float centerDist = length(uvAspect - mouseAspect);
    float centerGlow = exp(-centerDist * 6.0) * uGlow * 0.3;
    centerGlow += clickBurst * exp(-centerDist * 4.0) * 0.5;

    // Pulsing intensity at center
    float pulse = 0.8 + 0.2 * sin(time * 15.0);
    centerGlow *= pulse;

    // Mix colors for center glow
    vec3 centerColor = uColors[0];
    if (uColorCount > 1) {
      float t = fract(time * 0.5);
      int idx = int(mod(time * 0.5, float(uColorCount)));
      int nextIdx2 = int(mod(time * 0.5 + 1.0, float(uColorCount)));
      centerColor = mix(uColors[idx], uColors[nextIdx2], t);
    }
    color += centerColor * centerGlow;

    gl_FragColor = vec4(color, 1.0);
  }
`

export function FireworksShader({ settings }: FireworksShaderProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport, size, pointer, gl } = useThree()

  // Mouse history for trailing effect - stores past positions
  const mouseHistoryRef = useRef<THREE.Vector2[]>(
    Array.from({ length: 8 }, () => new THREE.Vector2(0, 0))
  )
  const historyTimerRef = useRef(0)
  const clickTimeRef = useRef(-10)

  const params = settings?.fireworks || {
    animate: true, sparkCount: 200, speed: 1.0, size: 3, spread: 0.6, gravity: 0.3, fadeSpeed: 1.0, glow: 0.8
  }

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
    uSparkCount: { value: params.sparkCount },
    uSpeed: { value: params.speed },
    uSize: { value: params.size },
    uSpread: { value: params.spread },
    uGravity: { value: params.gravity },
    uFadeSpeed: { value: params.fadeSpeed },
    uGlow: { value: params.glow },
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

      material.uniforms.uTime.value = params.animate ? state.clock.elapsedTime : 0
      material.uniforms.uResolution.value.set(size.width, size.height)
      material.uniforms.uMouse.value.set(pointer.x, pointer.y)

      // Update mouse history uniform
      for (let i = 0; i < 8; i++) {
        material.uniforms.uMouseHistory.value[i].copy(mouseHistoryRef.current[i])
      }

      const newColors = getColorsArray()
      const colorCount = colorsToVec3Array(settings?.colors).length
      for (let i = 0; i < 8; i++) {
        material.uniforms.uColors.value[i].copy(newColors[i])
      }
      material.uniforms.uColorCount.value = colorCount

      material.uniforms.uBackgroundColor.value.copy(hexToVec3(settings?.backgroundColor))
      material.uniforms.uSparkCount.value = params.sparkCount
      material.uniforms.uSpeed.value = params.speed
      material.uniforms.uSize.value = params.size
      material.uniforms.uSpread.value = params.spread
      material.uniforms.uGravity.value = params.gravity
      material.uniforms.uFadeSpeed.value = params.fadeSpeed
      material.uniforms.uGlow.value = params.glow
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
