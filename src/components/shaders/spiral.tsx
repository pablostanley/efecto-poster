"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { InputShaderSettings } from "@/lib/types"
import { colorsToVec3Array, hexToVec3 } from "@/components/renderer/input-shader"

interface SpiralShaderProps {
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
  uniform float uArms;
  uniform float uSpacing;
  uniform float uRotation;
  uniform float uSpeed;
  uniform float uThickness;
  uniform bool uTaper;
  
  varying vec2 vUv;
  
  #define PI 3.14159265359
  #define TAU 6.28318530718
  
  void main() {
    vec2 uv = vUv - 0.5;
    float aspect = uResolution.x / uResolution.y;
    uv.x *= aspect;
    
    // Polar coordinates
    float r = length(uv);
    float theta = atan(uv.y, uv.x);
    
    // Add rotation (convert degrees to radians and add time-based animation)
    float rotationRad = uRotation * PI / 180.0;
    float animRotation = uTime * uSpeed;
    theta += rotationRad + animRotation;
    
    // Spiral formula: theta = a + b * r (Archimedean spiral)
    // We want to find if the current point is on a spiral arm
    
    // Calculate the spiral angle for this radius
    float spiralAngle = r * uSpacing;
    
    // Find the angular distance to the nearest spiral arm
    float armAngle = TAU / uArms;
    float relativeAngle = mod(theta - spiralAngle, armAngle);
    if(relativeAngle > armAngle * 0.5) {
      relativeAngle = armAngle - relativeAngle;
    }
    
    // Convert angular distance to linear distance at this radius
    float dist = relativeAngle * r * uSpacing * 0.5;
    
    // Calculate thickness (with optional taper)
    float thickness = uThickness * 0.01;
    if(uTaper) {
      // Taper from center outward
      thickness *= (1.0 - r * 0.8);
    }
    
    // Anti-aliased edge
    float spiral = 1.0 - smoothstep(thickness - 0.002, thickness + 0.002, dist);
    
    // Color based on arm index
    float armIndex = floor(mod(theta - spiralAngle + PI, TAU) / armAngle);
    
    vec3 spiralColor = uColors[0];
    if(uColorCount > 1) {
      int colorIdx = int(mod(armIndex, float(uColorCount)));
      spiralColor = uColors[colorIdx];
    }
    
    // Mix background and spiral
    vec3 color = mix(uBackgroundColor, spiralColor, spiral);
    
    gl_FragColor = vec4(color, 1.0);
  }
`

export function SpiralShader({ settings }: SpiralShaderProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport, size } = useThree()

  // Safe access to nested settings with defaults
  const spiralParams = settings?.spiral || {
    animate: true, arms: 4, spacing: 10, rotation: 0, speed: 0.5, thickness: 30, taper: true
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
    uArms: { value: spiralParams.arms },
    uSpacing: { value: spiralParams.spacing },
    uRotation: { value: spiralParams.rotation },
    uSpeed: { value: spiralParams.speed },
    uThickness: { value: spiralParams.thickness },
    uTaper: { value: spiralParams.taper },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  // Update uniforms when settings change
  useFrame((state) => {
    if (meshRef.current && settings) {
      const material = meshRef.current.material as THREE.ShaderMaterial
      // Only animate if animate flag is true
      material.uniforms.uTime.value = spiralParams.animate ? state.clock.elapsedTime : 0
      material.uniforms.uResolution.value.set(size.width, size.height)

      // Update colors - must update individual elements
      const newColors = getColorsArray()
      const colorCount = colorsToVec3Array(settings?.colors).length
      for (let i = 0; i < 8; i++) {
        material.uniforms.uColors.value[i].copy(newColors[i])
      }
      material.uniforms.uColorCount.value = colorCount

      material.uniforms.uBackgroundColor.value.copy(hexToVec3(settings?.backgroundColor))
      material.uniforms.uArms.value = spiralParams.arms
      material.uniforms.uSpacing.value = spiralParams.spacing
      material.uniforms.uRotation.value = spiralParams.rotation
      material.uniforms.uSpeed.value = spiralParams.speed
      material.uniforms.uThickness.value = spiralParams.thickness
      material.uniforms.uTaper.value = spiralParams.taper
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

