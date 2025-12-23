"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { InputShaderSettings } from "@/lib/types"
import { hexToVec3 } from "@/components/renderer/input-shader"

interface LiquidMetalShaderProps {
  settings: InputShaderSettings
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Fast liquid metal shader - flat chrome surface with animated reflections
// No raymarching - uses noise-based normals for liquid effect
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uBackgroundColor;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uDistortion;
  uniform float uReflectivity;
  uniform vec3 uMetalColor;
  uniform vec3 uHighlightColor;
  uniform bool uAnimate;

  varying vec2 vUv;

  #define PI 3.14159265359

  // ============================================
  // Simplex noise for smooth liquid animation
  // ============================================

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // Multi-octave noise for richer detail
  float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for(int i = 0; i < 4; i++) {
      if(i >= octaves) break;
      value += amplitude * snoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  // ============================================
  // Procedural environment for reflections
  // ============================================

  vec3 getEnvironment(vec3 rd) {
    // Studio-style HDRI environment

    // Vertical gradient (sky to ground)
    float skyGrad = rd.y * 0.5 + 0.5;
    vec3 skyTop = vec3(1.0, 1.0, 1.0);
    vec3 skyMid = vec3(0.7, 0.75, 0.8);
    vec3 skyBottom = vec3(0.2, 0.22, 0.25);

    vec3 sky;
    if(rd.y > 0.0) {
      sky = mix(skyMid, skyTop, pow(rd.y, 0.4));
    } else {
      sky = mix(skyMid, skyBottom, pow(-rd.y, 0.6));
    }

    // Bright horizon line
    float horizonLine = exp(-abs(rd.y) * 8.0);
    sky += vec3(1.0, 0.98, 0.95) * horizonLine * 0.6;

    // Soft horizontal studio light bands
    float bands = sin(rd.y * 20.0) * 0.5 + 0.5;
    bands = pow(bands, 4.0);
    sky += vec3(0.3) * bands * (1.0 - abs(rd.y));

    // Vertical variation for interest
    float vBands = sin(rd.x * 6.0 + rd.z * 3.0) * 0.5 + 0.5;
    vBands = smoothstep(0.3, 0.7, vBands);
    sky *= 0.9 + vBands * 0.2;

    // Add some color variation
    float colorShift = rd.x * 0.1;
    sky.r *= 1.0 + colorShift * 0.1;
    sky.b *= 1.0 - colorShift * 0.1;

    return sky;
  }

  // ============================================
  // Fresnel for metallic edge reflections
  // ============================================

  vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
  }

  // ============================================
  // Main
  // ============================================

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

    float t = uAnimate ? uTime * uSpeed : 0.0;

    // Scale for noise sampling (higher scale = larger features)
    float noiseScale = 2.0 / max(uScale, 0.1);

    // Create animated liquid surface normals using noise
    vec3 noisePos = vec3(p * noiseScale, t * 0.3);

    // Calculate normal from noise gradient (central differences)
    float eps = 0.01;
    float nx = fbm(noisePos + vec3(eps, 0.0, 0.0), 3) - fbm(noisePos - vec3(eps, 0.0, 0.0), 3);
    float ny = fbm(noisePos + vec3(0.0, eps, 0.0), 3) - fbm(noisePos - vec3(0.0, eps, 0.0), 3);

    // Distortion controls how wavy the surface is
    float normalStrength = uDistortion * 3.0;
    vec3 normal = normalize(vec3(-nx * normalStrength, -ny * normalStrength, 1.0));

    // View direction (looking down at surface)
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    // Reflection direction
    vec3 reflectDir = reflect(-viewDir, normal);

    // Get environment color from reflection
    vec3 envColor = getEnvironment(reflectDir);

    // Fresnel effect - metals are more reflective at glancing angles
    float NdotV = max(dot(normal, viewDir), 0.0);
    vec3 F0 = uMetalColor; // Metal's F0 is its color
    vec3 fresnel = fresnelSchlick(NdotV, F0);

    // Base reflection
    vec3 color = envColor * fresnel * uReflectivity;

    // Add specular highlights from virtual lights
    vec3 lights[3];
    lights[0] = normalize(vec3(0.5, 0.8, 1.0));
    lights[1] = normalize(vec3(-0.6, 0.4, 0.8));
    lights[2] = normalize(vec3(0.0, -0.5, 1.0));

    vec3 lightColors[3];
    lightColors[0] = vec3(1.0, 0.98, 0.95);
    lightColors[1] = vec3(0.95, 0.97, 1.0);
    lightColors[2] = vec3(1.0, 1.0, 1.0);

    for(int i = 0; i < 3; i++) {
      vec3 H = normalize(viewDir + lights[i]);
      float NdotH = max(dot(normal, H), 0.0);

      // Sharp specular for that chrome look
      float spec = pow(NdotH, 128.0 * uReflectivity);
      color += uHighlightColor * lightColors[i] * spec * 0.5;

      // Softer specular for glow
      float softSpec = pow(NdotH, 16.0);
      color += uHighlightColor * lightColors[i] * softSpec * 0.1 * uReflectivity;
    }

    // Edge glow (stronger fresnel at edges)
    float edgeFresnel = pow(1.0 - NdotV, 3.0);
    color += uHighlightColor * edgeFresnel * 0.15 * uReflectivity;

    // Subtle iridescence at edges
    float iridAngle = atan(normal.y, normal.x) / PI * 0.5 + 0.5 + t * 0.1;
    vec3 iridescence = vec3(
      sin(iridAngle * PI * 2.0) * 0.5 + 0.5,
      sin(iridAngle * PI * 2.0 + PI * 0.666) * 0.5 + 0.5,
      sin(iridAngle * PI * 2.0 + PI * 1.333) * 0.5 + 0.5
    );
    color = mix(color, color + iridescence * 0.2, edgeFresnel * uDistortion * 0.5);

    // Tone mapping (Reinhard)
    color = color / (color + vec3(1.0));

    // Gamma correction
    color = pow(color, vec3(1.0 / 2.2));

    gl_FragColor = vec4(color, 1.0);
  }
`

export function LiquidMetalShader({ settings }: LiquidMetalShaderProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport, size } = useThree()

  // Safe access to nested settings with defaults
  const liquidMetalParams = settings?.liquidMetal || {
    animate: true, speed: 0.4, scale: 3, distortion: 0.6,
    reflectivity: 0.9, metalColor: "#C0C0C0", highlightColor: "#FFFFFF"
  }

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uBackgroundColor: { value: hexToVec3(settings?.backgroundColor) },
    uSpeed: { value: liquidMetalParams.speed },
    uScale: { value: liquidMetalParams.scale },
    uDistortion: { value: liquidMetalParams.distortion },
    uReflectivity: { value: liquidMetalParams.reflectivity },
    uMetalColor: { value: hexToVec3(liquidMetalParams.metalColor) },
    uHighlightColor: { value: hexToVec3(liquidMetalParams.highlightColor) },
    uAnimate: { value: liquidMetalParams.animate },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  // Update uniforms when settings change
  useFrame((state) => {
    if (meshRef.current && settings) {
      const material = meshRef.current.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = state.clock.elapsedTime
      material.uniforms.uResolution.value.set(size.width, size.height)
      material.uniforms.uBackgroundColor.value.copy(hexToVec3(settings?.backgroundColor))
      material.uniforms.uSpeed.value = liquidMetalParams.speed
      material.uniforms.uScale.value = liquidMetalParams.scale
      material.uniforms.uDistortion.value = liquidMetalParams.distortion
      material.uniforms.uReflectivity.value = liquidMetalParams.reflectivity
      material.uniforms.uMetalColor.value.copy(hexToVec3(liquidMetalParams.metalColor))
      material.uniforms.uHighlightColor.value.copy(hexToVec3(liquidMetalParams.highlightColor))
      material.uniforms.uAnimate.value = liquidMetalParams.animate
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
