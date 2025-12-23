"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { InputShaderSettings } from "@/lib/types"
import { colorsToVec3Array, hexToVec3 } from "@/components/renderer/input-shader"

interface MeshGradientShaderProps {
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
  uniform float uSpeed;
  uniform float uScale;
  uniform float uRotation;
  uniform float uWave;
  uniform float uBlur;

  varying vec2 vUv;

  #define PI 3.14159265359

  // Smooth noise for organic distortion
  vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                   dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
               mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                   dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
  }

  // Rotate point
  vec2 rotate(vec2 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;

    // Center and apply aspect ratio
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

    // Apply rotation
    p = rotate(p, uRotation * PI / 180.0);

    // Apply scale (inverted so higher = zoomed in)
    p /= uScale;

    // Time for animation
    float t = uTime * uSpeed;

    // Organic distortion using noise (not predictable sine waves)
    float distortStrength = uWave * 0.25;
    vec2 distort = vec2(
      noise(p * 2.0 + t * 0.5),
      noise(p * 2.0 + 100.0 + t * 0.4)
    ) * distortStrength;
    p += distort;

    // Color blending with sharp falloff for distinct blobs
    vec3 color = vec3(0.0);
    float totalWeight = 0.0;

    // Blur controls the softness: 0 = sharp distinct blobs, 1 = very blended
    float sharpness = 3.0 + (1.0 - uBlur) * 12.0; // 3 to 15

    for(int i = 0; i < 8; i++) {
      if(i >= uColorCount) break;

      float fi = float(i);

      // Position each color using golden angle
      float goldenAngle = 2.39996;
      float baseAngle = fi * goldenAngle;
      float radius = 0.25 + 0.2 * (fi / max(float(uColorCount) - 1.0, 1.0));

      // Animate positions smoothly
      float animAngle = baseAngle + t * 0.15;
      float animRadius = radius + 0.1 * sin(t * 0.3 + fi * 2.0);

      vec2 colorPos = vec2(
        cos(animAngle) * animRadius,
        sin(animAngle) * animRadius
      );

      // Distance and weight with controllable sharpness
      float dist = length(p - colorPos);
      float weight = 1.0 / pow(1.0 + dist * sharpness, 2.0);

      color += uColors[i] * weight;
      totalWeight += weight;
    }

    // Normalize
    if(totalWeight > 0.0) {
      color /= totalWeight;
    }

    gl_FragColor = vec4(color, 1.0);
  }
`

export function MeshGradientShader({ settings }: MeshGradientShaderProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport } = useThree()

  const meshGradientParams = settings?.meshGradient || {
    animate: true,
    speed: 0.5,
    scale: 1.0,
    rotation: 0,
    wave: 0.3,
    blur: 0.3
  }

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
    uResolution: { value: new THREE.Vector2(viewport.width, viewport.height) },
    uColors: { value: getColorsArray() },
    uColorCount: { value: colorsToVec3Array(settings?.colors).length },
    uBackgroundColor: { value: hexToVec3(settings?.backgroundColor) },
    uSpeed: { value: meshGradientParams.speed },
    uScale: { value: meshGradientParams.scale },
    uRotation: { value: meshGradientParams.rotation },
    uWave: { value: meshGradientParams.wave },
    uBlur: { value: meshGradientParams.blur },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  useFrame((state) => {
    if (meshRef.current && settings) {
      const material = meshRef.current.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = meshGradientParams.animate ? state.clock.elapsedTime : 0
      material.uniforms.uResolution.value.set(viewport.width, viewport.height)

      const newColors = getColorsArray()
      const colorCount = colorsToVec3Array(settings?.colors).length
      for (let i = 0; i < 8; i++) {
        material.uniforms.uColors.value[i].copy(newColors[i])
      }
      material.uniforms.uColorCount.value = colorCount

      material.uniforms.uBackgroundColor.value.copy(hexToVec3(settings?.backgroundColor))
      material.uniforms.uSpeed.value = meshGradientParams.speed
      material.uniforms.uScale.value = meshGradientParams.scale
      material.uniforms.uRotation.value = meshGradientParams.rotation
      material.uniforms.uWave.value = meshGradientParams.wave
      material.uniforms.uBlur.value = meshGradientParams.blur
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
