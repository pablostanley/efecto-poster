"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { InputShaderSettings } from "@/lib/types"
import { colorsToVec3Array, hexToVec3 } from "@/components/renderer/input-shader"

interface VoronoiShaderProps {
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
  uniform float uCellCount;
  uniform float uBorderWidth;
  uniform float uBorderSoftness;
  uniform vec3 uBorderColor;
  uniform bool uAnimate;
  uniform float uSpeed;
  uniform float uDistortion;

  varying vec2 vUv;
  
  // Random function
  vec2 random2(vec2 p) {
    return fract(sin(vec2(
      dot(p, vec2(127.1, 311.7)),
      dot(p, vec2(269.5, 183.3))
    )) * 43758.5453);
  }
  
  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    
    // Scale UV to create cells
    float scale = sqrt(uCellCount);
    vec2 scaledUv = uv * vec2(scale * aspect, scale);
    
    // Add distortion
    if(uDistortion > 0.0) {
      float t = uAnimate ? uTime * uSpeed : 0.0;
      scaledUv.x += sin(scaledUv.y * 3.0 + t) * uDistortion * 0.5;
      scaledUv.y += cos(scaledUv.x * 3.0 + t) * uDistortion * 0.5;
    }
    
    // Voronoi calculation
    vec2 cellId = floor(scaledUv);
    vec2 cellUv = fract(scaledUv);
    
    float minDist = 10.0;
    float secondMinDist = 10.0;
    vec2 closestPoint = vec2(0.0);
    vec2 closestId = vec2(0.0);
    
    // Check 3x3 neighborhood
    for(int y = -1; y <= 1; y++) {
      for(int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 neighborId = cellId + neighbor;
        
        // Random point position within cell
        vec2 point = random2(neighborId);
        
        // Animate point position
        if(uAnimate) {
          float t = uTime * uSpeed;
          point = 0.5 + 0.4 * sin(t + 6.2831 * point);
        }
        
        vec2 diff = neighbor + point - cellUv;
        float dist = length(diff);
        
        if(dist < minDist) {
          secondMinDist = minDist;
          minDist = dist;
          closestPoint = point;
          closestId = neighborId;
        } else if(dist < secondMinDist) {
          secondMinDist = dist;
        }
      }
    }
    
    // Edge detection for borders
    float edge = secondMinDist - minDist;
    // borderWidth controls how thick the border appears
    float borderThreshold = uBorderWidth * 0.04; // At max (10), gives 0.4 threshold
    // borderSoftness (mix) controls edge blending: 0 = sharp, 1 = blended into cells
    float borderMask;
    if (uBorderSoftness < 0.01) {
      // Sharp edge using step when mix is at or near 0
      borderMask = 1.0 - step(borderThreshold, edge);
    } else {
      // Smooth edge with controllable softness
      float blend = uBorderSoftness * borderThreshold * 0.6;
      borderMask = 1.0 - smoothstep(borderThreshold - blend * 0.5, borderThreshold + blend, edge);
    }
    
    // Color based on cell ID
    vec3 cellColor = uBackgroundColor;
    if(uColorCount > 0) {
      float colorSeed = random2(closestId).x;
      int colorIdx = int(floor(colorSeed * float(uColorCount)));
      colorIdx = min(colorIdx, uColorCount - 1);
      cellColor = uColors[colorIdx];
    }
    
    // Apply slight variation to each cell
    float shade = 0.9 + 0.1 * random2(closestId).y;
    cellColor *= shade;
    
    // Combine cell color with border
    vec3 color = mix(cellColor, uBorderColor, borderMask);
    
    gl_FragColor = vec4(color, 1.0);
  }
`

export function VoronoiShader({ settings }: VoronoiShaderProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport, size } = useThree()

  // Safe access to nested settings with defaults
  const voronoiParams = settings?.voronoi || {
    cellCount: 16, borderWidth: 2, borderSoftness: 0, borderColor: '#000000',
    animate: true, speed: 0.5, distortion: 0
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

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uColors: { value: getColorsArray() },
    uColorCount: { value: colorsToVec3Array(settings?.colors).length },
    uBackgroundColor: { value: hexToVec3(settings?.backgroundColor) },
    uCellCount: { value: voronoiParams.cellCount },
    uBorderWidth: { value: voronoiParams.borderWidth },
    uBorderSoftness: { value: voronoiParams.borderSoftness },
    uBorderColor: { value: hexToVec3(voronoiParams.borderColor) },
    uAnimate: { value: voronoiParams.animate },
    uSpeed: { value: voronoiParams.speed },
    uDistortion: { value: voronoiParams.distortion },
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
      material.uniforms.uCellCount.value = voronoiParams.cellCount
      material.uniforms.uBorderWidth.value = voronoiParams.borderWidth
      material.uniforms.uBorderSoftness.value = voronoiParams.borderSoftness
      material.uniforms.uBorderColor.value.copy(hexToVec3(voronoiParams.borderColor))
      material.uniforms.uAnimate.value = voronoiParams.animate
      material.uniforms.uSpeed.value = voronoiParams.speed
      material.uniforms.uDistortion.value = voronoiParams.distortion
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

