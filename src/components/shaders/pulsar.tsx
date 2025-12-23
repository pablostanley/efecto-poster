"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { InputShaderSettings } from "@/lib/types"
import { hexToVec3, colorsToVec3Array } from "@/components/renderer/input-shader"

interface PulsarShaderProps {
  settings: InputShaderSettings
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uBackgroundColor;
  uniform vec3 uColors[8];
  uniform int uColorCount;
  uniform bool uAnimate;
  uniform float uSpeed;
  uniform float uLineCount;
  uniform float uAmplitude;
  uniform float uFrequency;
  uniform float uNoise;
  uniform float uLineWidth;
  uniform float uSpacing;

  varying vec2 vUv;

  // Simple 1D noise
  float hash(float n) { return fract(sin(n) * 43758.5453); }

  float noise1D(float x) {
    float i = floor(x);
    float f = fract(x);
    return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
  }

  // Get color for line index (cycles through available colors)
  vec3 getLineColor(int lineIndex) {
    if (uColorCount <= 1) return uColors[0];
    int colorIdx = lineIndex - (lineIndex / uColorCount) * uColorCount; // modulo
    return uColors[colorIdx];
  }

  // Get wave height at position x for line i
  float wave(float x, float line, float t) {
    // Center envelope - peaks in middle, flat at edges
    float center = abs(x - 0.5) * 2.0;
    float envelope = 1.0 - center * center;
    envelope = max(envelope, 0.0) * smoothstep(1.0, 0.6, center);

    // Unique seed per line
    float seed = line * 127.1;

    // Multiple noise octaves for jagged mountain look
    float n = 0.0;
    n += noise1D(x * 20.0 * uFrequency + seed + t) * 1.0;
    n += noise1D(x * 40.0 * uFrequency + seed * 1.3 + t * 0.7) * 0.5;
    n += noise1D(x * 80.0 * uFrequency + seed * 1.7 + t * 0.5) * 0.25;
    n = n / 1.75;

    // Add some per-line variation
    float lineVar = hash(seed + 0.5) * 0.5 + 0.5;

    return n * envelope * uAmplitude * lineVar * 0.15;
  }

  void main() {
    vec2 uv = vUv;
    float t = uAnimate ? uTime * uSpeed : 0.0;

    // Output color starts as background
    vec3 col = uBackgroundColor;

    // Line thickness
    float thickness = uLineWidth * 0.001;

    // Number of lines and spacing between them
    float numLines = uLineCount;
    float lineSpacing = 1.0 / (numLines + 1.0) * uSpacing;

    // Calculate total height of all lines
    float totalHeight = (numLines - 1.0) * lineSpacing;

    // Max wave height (scaled down since peaks rarely hit theoretical max)
    float maxWaveHeight = uAmplitude * 0.05;

    // Ceiling - waves can't go above this
    float ceiling = 0.97;

    // Calculate ideal centered position
    float idealOffset = (1.0 - totalHeight) / 2.0;

    // Check if top line + max wave would exceed ceiling
    float topLineY = 1.0 - idealOffset;
    float highestPoint = topLineY + maxWaveHeight;

    // If highest point exceeds ceiling, push everything down
    float verticalOffset = idealOffset;
    if (highestPoint > ceiling) {
      verticalOffset = 1.0 - ceiling + maxWaveHeight;
    }

    // Draw from back (top) to front (bottom)
    for (float i = 0.0; i < 100.0; i++) {
      if (i >= numLines) break;

      // Base Y position for this line (top line first, going down)
      float baseY = 1.0 - verticalOffset - i * lineSpacing;

      // Wave displacement
      float w = wave(uv.x, i + uNoise * 10.0, t);
      float lineY = baseY + w;

      // Distance to line
      float d = uv.y - lineY;

      // Fill below line with background (occlusion)
      if (d < 0.0) {
        col = uBackgroundColor;
      }

      // Draw line stroke with color cycling
      if (abs(d) < thickness) {
        float alpha = 1.0 - smoothstep(0.0, thickness, abs(d));
        vec3 lineColor = getLineColor(int(i));
        col = mix(col, lineColor, alpha);
      }
    }

    gl_FragColor = vec4(col, 1.0);
  }
`

export function PulsarShader({ settings }: PulsarShaderProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport, size } = useThree()

  const pulsarParams = settings?.pulsar || {
    animate: true,
    speed: 0.3,
    lineCount: 50,
    amplitude: 0.8,
    frequency: 1.0,
    noise: 0.5,
    lineWidth: 1.5,
    spacing: 1.0,
  }

  // Create stable Vector3 array for colors uniform (8 slots)
  const colorUniformArray = useMemo(() => {
    return Array.from({ length: 8 }, () => new THREE.Vector3(1, 1, 1))
  }, [])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uBackgroundColor: { value: new THREE.Vector3(0, 0, 0) },
    uColors: { value: colorUniformArray },
    uColorCount: { value: 1 },
    uAnimate: { value: pulsarParams.animate },
    uSpeed: { value: pulsarParams.speed },
    uLineCount: { value: pulsarParams.lineCount },
    uAmplitude: { value: pulsarParams.amplitude },
    uFrequency: { value: pulsarParams.frequency },
    uNoise: { value: pulsarParams.noise },
    uLineWidth: { value: pulsarParams.lineWidth },
    uSpacing: { value: pulsarParams.spacing },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [colorUniformArray])

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = state.clock.elapsedTime
      material.uniforms.uResolution.value.set(size.width, size.height)

      // Update background color
      const bgColor = hexToVec3(settings?.backgroundColor || "#000000")
      material.uniforms.uBackgroundColor.value.copy(bgColor)

      // Update colors from settings
      const currentColors = colorsToVec3Array(settings?.colors || [{ id: '1', color: '#FFFFFF', opacity: 1 }])
      const colorCount = Math.min(currentColors.length, 8)

      // Copy colors to uniform array
      for (let i = 0; i < 8; i++) {
        const sourceColor = currentColors[i % currentColors.length] || currentColors[0]
        if (sourceColor) {
          material.uniforms.uColors.value[i].copy(sourceColor)
        }
      }
      material.uniforms.uColorCount.value = colorCount

      // Update pulsar params
      const params = settings?.pulsar || pulsarParams
      material.uniforms.uAnimate.value = params.animate
      material.uniforms.uSpeed.value = params.speed
      material.uniforms.uLineCount.value = params.lineCount
      material.uniforms.uAmplitude.value = params.amplitude
      material.uniforms.uFrequency.value = params.frequency
      material.uniforms.uNoise.value = params.noise
      material.uniforms.uLineWidth.value = params.lineWidth
      material.uniforms.uSpacing.value = params.spacing
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
