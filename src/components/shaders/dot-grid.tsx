"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { InputShaderSettings } from "@/lib/types"
import { colorsToVec3Array, hexToVec3 } from "@/components/renderer/input-shader"

interface DotGridShaderProps {
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
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uColors[8];
  uniform int uColorCount;
  uniform vec3 uBackgroundColor;
  uniform int uShape; // 0: circle, 1: diamond, 2: square, 3: triangle
  uniform float uSize;
  uniform float uGapX;
  uniform float uGapY;
  uniform float uRotation;
  uniform float uStrokeWidth;
  uniform float uSizeRange;
  uniform float uOpacityRange;
  uniform vec3 uForegroundColor;
  uniform vec3 uStrokeColor;
  // Animation params
  uniform bool uAnimate;
  uniform float uSpeed;
  uniform float uColorShift;
  uniform float uSizeShift;
  uniform float uChaos;

  varying vec2 vUv;

  #define PI 3.14159265359

  // Pseudo-random function
  float random(vec2 st) {
    return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // 2D rotation matrix
  mat2 rotate2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
  }

  // Circle SDF
  float sdCircle(vec2 p, float r) {
    return length(p) - r;
  }

  // Diamond SDF
  float sdDiamond(vec2 p, float r) {
    return (abs(p.x) + abs(p.y)) - r;
  }

  // Square SDF
  float sdSquare(vec2 p, float r) {
    vec2 d = abs(p) - vec2(r);
    return max(d.x, d.y);
  }

  // Triangle SDF
  float sdTriangle(vec2 p, float r) {
    const float k = sqrt(3.0);
    p.x = abs(p.x) - r;
    p.y = p.y + r/k;
    if(p.x + k*p.y > 0.0) p = vec2(p.x - k*p.y, -k*p.x - p.y) / 2.0;
    p.x -= clamp(p.x, -2.0*r, 0.0);
    return -length(p) * sign(p.y);
  }

  float getShape(vec2 p, float r, int shape) {
    if(shape == 0) return sdCircle(p, r);
    if(shape == 1) return sdDiamond(p, r);
    if(shape == 2) return sdSquare(p, r);
    if(shape == 3) return sdTriangle(p, r);
    return sdCircle(p, r);
  }

  void main() {
    // Apply rotation around center
    vec2 center = uResolution * 0.5;
    vec2 pixelCoord = vUv * uResolution;

    // Rotate around center
    float rotRad = uRotation * PI / 180.0;
    vec2 rotatedCoord = rotate2D(rotRad) * (pixelCoord - center) + center;

    // Grid cell
    vec2 cellSize = vec2(uGapX, uGapY);
    vec2 cellId = floor(rotatedCoord / cellSize);
    vec2 cellUv = mod(rotatedCoord, cellSize) - cellSize * 0.5;

    // Random values per cell (stable - not time-based)
    float randSize = random(cellId);
    float randOpacity = random(cellId + 100.0);
    float randPhase = random(cellId + 200.0);

    // Animation
    float animTime = uAnimate ? uTime * uSpeed : 0.0;

    // Size animation (rhythmic + chaos)
    float rhythmicSize = sin(animTime * 2.0 + randPhase * PI * 2.0 * uChaos) * 0.5 + 0.5;
    float animatedSizeMultiplier = 1.0 + uSizeShift * (rhythmicSize - 0.5) * 2.0;

    // Calculate size with variation and animation
    float baseSize = uSize * (1.0 - uSizeRange * (1.0 - randSize));
    float size = baseSize * (uAnimate ? animatedSizeMultiplier : 1.0);

    // Get SDF
    float d = getShape(cellUv, size, uShape);

    // Calculate fill and stroke
    float fill = 1.0 - smoothstep(-1.0, 0.0, d);
    float stroke = 0.0;
    if(uStrokeWidth > 0.0) {
      stroke = 1.0 - smoothstep(0.0, uStrokeWidth, abs(d));
    }

    // Opacity with variation
    float opacity = 1.0 - uOpacityRange * (1.0 - randOpacity);

    // Color selection with animation
    float colorOffset = 0.0;
    if(uAnimate && uColorShift > 0.0) {
      // Color cycling based on time
      float colorWave = sin(animTime + randPhase * PI * 2.0 * uChaos) * 0.5 + 0.5;
      colorOffset = floor(colorWave * float(uColorCount) * uColorShift);
    }

    vec3 dotColor = uForegroundColor;
    if(uColorCount > 0) {
      int colorIdx = int(mod(cellId.x + cellId.y + colorOffset, float(uColorCount)));
      if(colorIdx < uColorCount) {
        dotColor = uColors[colorIdx];
      }
    }

    // Combine colors
    vec3 color = uBackgroundColor;
    color = mix(color, dotColor, fill * opacity);
    if(uStrokeWidth > 0.0) {
      color = mix(color, uStrokeColor, stroke * opacity);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`

export function DotGridShader({ settings }: DotGridShaderProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport, size } = useThree()

  // Safe access to nested settings with defaults
  const dotGridParams = settings?.dotGrid || {
    shape: 'circle', size: 4, gapX: 32, gapY: 32, rotation: 0, strokeWidth: 0,
    sizeRange: 0, opacityRange: 0, foregroundColor: '#FFFFFF', strokeColor: '#FFAA00',
    animate: false, speed: 1, colorShift: 0.5, sizeShift: 0.3, chaos: 0
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

  const shapeMap: Record<string, number> = {
    circle: 0,
    diamond: 1,
    square: 2,
    triangle: 3,
  }

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uColors: { value: getColorsArray() },
    uColorCount: { value: colorsToVec3Array(settings?.colors).length },
    uBackgroundColor: { value: hexToVec3(settings?.backgroundColor) },
    uShape: { value: shapeMap[dotGridParams.shape] || 0 },
    uSize: { value: dotGridParams.size },
    uGapX: { value: dotGridParams.gapX },
    uGapY: { value: dotGridParams.gapY },
    uRotation: { value: dotGridParams.rotation },
    uStrokeWidth: { value: dotGridParams.strokeWidth },
    uSizeRange: { value: dotGridParams.sizeRange },
    uOpacityRange: { value: dotGridParams.opacityRange },
    uForegroundColor: { value: hexToVec3(dotGridParams.foregroundColor) },
    uStrokeColor: { value: hexToVec3(dotGridParams.strokeColor) },
    // Animation params
    uAnimate: { value: dotGridParams.animate },
    uSpeed: { value: dotGridParams.speed },
    uColorShift: { value: dotGridParams.colorShift },
    uSizeShift: { value: dotGridParams.sizeShift },
    uChaos: { value: dotGridParams.chaos },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  // Update uniforms when settings change
  useFrame((state) => {
    if (meshRef.current && settings) {
      const material = meshRef.current.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = state.clock.elapsedTime
      material.uniforms.uResolution.value.set(size.width, size.height)

      // Update colors - must update individual elements
      const newColors = getColorsArray()
      const colorCount = colorsToVec3Array(settings?.colors).length
      for (let i = 0; i < 8; i++) {
        material.uniforms.uColors.value[i].copy(newColors[i])
      }
      material.uniforms.uColorCount.value = colorCount

      material.uniforms.uBackgroundColor.value.copy(hexToVec3(settings?.backgroundColor))
      material.uniforms.uShape.value = shapeMap[dotGridParams.shape] || 0
      material.uniforms.uSize.value = dotGridParams.size
      material.uniforms.uGapX.value = dotGridParams.gapX
      material.uniforms.uGapY.value = dotGridParams.gapY
      material.uniforms.uRotation.value = dotGridParams.rotation
      material.uniforms.uStrokeWidth.value = dotGridParams.strokeWidth
      material.uniforms.uSizeRange.value = dotGridParams.sizeRange
      material.uniforms.uOpacityRange.value = dotGridParams.opacityRange
      material.uniforms.uForegroundColor.value.copy(hexToVec3(dotGridParams.foregroundColor))
      material.uniforms.uStrokeColor.value.copy(hexToVec3(dotGridParams.strokeColor))
      // Animation params
      material.uniforms.uAnimate.value = dotGridParams.animate
      material.uniforms.uSpeed.value = dotGridParams.speed
      material.uniforms.uColorShift.value = dotGridParams.colorShift
      material.uniforms.uSizeShift.value = dotGridParams.sizeShift
      material.uniforms.uChaos.value = dotGridParams.chaos
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

