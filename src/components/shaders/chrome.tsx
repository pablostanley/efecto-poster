"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { InputShaderSettings } from "@/lib/types"
import { hexToVec3 } from "@/components/renderer/input-shader"

interface ChromeShaderProps {
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
 * Chrome Shader - Sinusoidal Warp Metal Effect
 * Based on Shadertoy shader tfdBWH
 * Creates a flowing, liquid chrome surface with sharp specular highlights
 */
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uBackgroundColor;
  uniform bool uAnimate;
  uniform float uSpeed;
  uniform int uIterations;
  uniform float uScale;
  uniform vec3 uMetalColor;
  uniform float uSpecularPower;
  uniform float uFresnelStrength;
  uniform float uEnvironmentTint;

  varying vec2 vUv;

  // Warp function - creates smooth metallic deformation using sinusoidal layers
  float getWarp(vec2 U, float t) {
    U = U * uScale;

    for (int i = 0; i < 8; i++) {
      if (i >= uIterations) break;
      U += cos(U.yx * 3.0 + vec2(t, 1.6)) / 3.0;
      U += sin(U.yx + t + vec2(1.6, 0.0)) / 2.0;
      U *= 1.3;
    }

    return length(mod(U, 2.0) - 1.0);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;

    float t = uAnimate ? uTime * uSpeed : 0.0;

    // Center UV coordinates
    vec2 U = (uv - 0.5) * vec2(aspect, 1.0);

    // Sample warp at nearby points for fake normals
    float eps = 0.02;
    float warpC = getWarp(U, t);
    float warpX = getWarp(U + vec2(eps, 0.0), t);
    float warpY = getWarp(U + vec2(0.0, eps), t);

    // Calculate smooth normals for mirror look
    vec3 normal = normalize(vec3(
      (warpC - warpX) * 5.0,
      (warpC - warpY) * 5.0,
      1.0
    ));

    // View and reflection vectors
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 reflectDir = reflect(-viewDir, normal);

    // Environment colors based on metal color
    float envY = reflectDir.y * 0.5 + 0.5;
    vec3 darkColor = uMetalColor * 0.25;
    vec3 lightColor = uMetalColor * 1.5;
    vec3 envColor = mix(darkColor, lightColor, envY);

    // Single strong light for mirror reflection
    vec3 lightDir = normalize(vec3(0.3, 0.6, 1.0));
    vec3 halfDir = normalize(lightDir + viewDir);

    // Sharp specular highlights
    float spec = pow(max(dot(normal, halfDir), 0.0), uSpecularPower);
    float spec2 = pow(max(dot(normal, halfDir), 0.0), 32.0);

    // Fresnel - metals reflect more at edges
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);

    // Start with metallic base - darker with colored reflections
    vec3 color = uMetalColor * 0.3;

    // Depth from warp creates shadows in valleys
    color *= smoothstep(0.1, 0.9, warpC) * 0.5 + 0.5;

    // Colored metallic reflection (metals tint their reflections)
    color += uMetalColor * spec2 * 1.2;

    // Bright specular with slight color tint
    vec3 specColor = mix(vec3(1.0), uMetalColor, 0.3);
    color += specColor * spec * 2.5;

    // Strong metallic fresnel
    color = mix(color, uMetalColor * 2.5, fresnel * uFresnelStrength);

    // Add subtle environment reflection
    color += envColor * uEnvironmentTint;

    // Tone mapping
    color = color / (color + vec3(1.0));

    // Gamma correction
    color = pow(color, vec3(1.0 / 2.2));

    gl_FragColor = vec4(color, 1.0);
  }
`

export function ChromeShader({ settings }: ChromeShaderProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport, size } = useThree()

  // Safe access to nested settings with defaults
  const chromeParams = settings?.chrome || {
    animate: true,
    speed: 0.5,
    iterations: 5,
    scale: 3,
    metalColor: "#6B4EE6",
    specularPower: 256,
    fresnelStrength: 0.7,
    environmentTint: 0.2,
  }

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uBackgroundColor: { value: hexToVec3(settings?.backgroundColor) },
    uAnimate: { value: chromeParams.animate },
    uSpeed: { value: chromeParams.speed },
    uIterations: { value: chromeParams.iterations },
    uScale: { value: chromeParams.scale },
    uMetalColor: { value: hexToVec3(chromeParams.metalColor) },
    uSpecularPower: { value: chromeParams.specularPower },
    uFresnelStrength: { value: chromeParams.fresnelStrength },
    uEnvironmentTint: { value: chromeParams.environmentTint },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  // Update uniforms when settings change
  useFrame((state) => {
    if (meshRef.current && settings) {
      const material = meshRef.current.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = state.clock.elapsedTime
      material.uniforms.uResolution.value.set(size.width, size.height)
      material.uniforms.uBackgroundColor.value.copy(hexToVec3(settings?.backgroundColor))
      material.uniforms.uAnimate.value = chromeParams.animate
      material.uniforms.uSpeed.value = chromeParams.speed
      material.uniforms.uIterations.value = chromeParams.iterations
      material.uniforms.uScale.value = chromeParams.scale
      material.uniforms.uMetalColor.value.copy(hexToVec3(chromeParams.metalColor))
      material.uniforms.uSpecularPower.value = chromeParams.specularPower
      material.uniforms.uFresnelStrength.value = chromeParams.fresnelStrength
      material.uniforms.uEnvironmentTint.value = chromeParams.environmentTint
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
