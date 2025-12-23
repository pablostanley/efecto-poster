"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { InputShaderSettings } from "@/lib/types"
import { hexToVec3, colorsToVec3Array } from "@/components/renderer/input-shader"

interface GlassShaderProps {
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
  uniform vec3 uBackgroundColor;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uRefraction;
  uniform float uDispersion;
  uniform float uBlur;
  uniform vec3 uTint;
  uniform bool uAnimate;
  uniform vec3 uColors[8];
  uniform int uColorCount;

  varying vec2 vUv;

  #define PI 3.14159265359

  // Simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
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
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // FBM
  float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for(int i = 0; i < 5; i++) {
      if(i >= octaves) break;
      value += amplitude * snoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  // Get color from user's palette with smooth interpolation
  vec3 getColorFromPalette(float t) {
    if (uColorCount <= 1) return uColors[0];

    float scaledT = t * float(uColorCount - 1);
    int idx = int(floor(scaledT));
    float frac = fract(scaledT);

    // Clamp indices
    int idx1 = min(idx, uColorCount - 1);
    int idx2 = min(idx + 1, uColorCount - 1);

    return mix(uColors[idx1], uColors[idx2], frac);
  }

  // Create a dynamic background pattern using user colors
  vec3 getBackground(vec2 uv, float t) {
    // Animated gradient background
    float angle = atan(uv.y - 0.5, uv.x - 0.5);
    float radius = length(uv - 0.5);

    // Multiple blending waves
    float wave1 = sin(angle * 2.0 + t * 0.5 + radius * 4.0) * 0.5 + 0.5;
    float wave2 = sin(angle * 3.0 - t * 0.3 + radius * 6.0) * 0.5 + 0.5;
    float wave3 = cos(angle * 1.5 + t * 0.4 - radius * 3.0) * 0.5 + 0.5;

    // Blend multiple samples from the user's color palette
    float colorPos1 = wave1;
    float colorPos2 = wave2;
    float colorPos3 = wave3;

    vec3 col1 = getColorFromPalette(colorPos1);
    vec3 col2 = getColorFromPalette(colorPos2);
    vec3 col3 = getColorFromPalette(colorPos3);

    // Blend the colors together
    vec3 bg = mix(col1, col2, 0.5);
    bg = mix(bg, col3, 0.3);

    return bg;
  }

  // Rainbow color from hue
  vec3 rainbow(float t) {
    vec3 c = vec3(t * 6.0);
    c = clamp(abs(mod(c + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 uvAspect = vec2(uv.x * aspect, uv.y);

    float t = uAnimate ? uTime * uSpeed : 0.0;

    // Scale factor (inverted so higher = bigger features)
    float scaleFactor = 1.0 / max(uScale * 0.5, 0.1);

    // Create glass surface distortion
    vec3 p = vec3(uvAspect * scaleFactor, t * 0.3);

    // Surface noise for glass texture
    float surface = fbm(p, 4);
    float surface2 = fbm(p * 2.0 + vec3(50.0, 0.0, 0.0), 3);

    // Calculate refraction normals
    float eps = 0.02;
    float nx = fbm(vec3(uvAspect * scaleFactor + vec2(eps, 0.0), t * 0.3), 4) - surface;
    float ny = fbm(vec3(uvAspect * scaleFactor + vec2(0.0, eps), t * 0.3), 4) - surface;

    vec2 normal2D = vec2(nx, ny) * 10.0 * uRefraction;

    // Chromatic aberration / dispersion
    vec2 refractR = uv + normal2D * (1.0 + uDispersion * 0.2);
    vec2 refractG = uv + normal2D;
    vec2 refractB = uv + normal2D * (1.0 - uDispersion * 0.2);

    // Get refracted background colors
    vec3 bgR = getBackground(refractR, t);
    vec3 bgG = getBackground(refractG, t);
    vec3 bgB = getBackground(refractB, t);

    // Combine with chromatic aberration
    vec3 refractedColor;
    if(uDispersion > 0.01) {
      refractedColor = vec3(bgR.r, bgG.g, bgB.b);
      // Add rainbow dispersion effect at edges
      float edgeDispersion = length(normal2D) * uDispersion * 2.0;
      vec3 rainbowColor = rainbow(surface + t * 0.1);
      refractedColor = mix(refractedColor, rainbowColor, edgeDispersion * 0.5);
    } else {
      refractedColor = bgG;
    }

    // Blur/frosted effect
    if(uBlur > 0.01) {
      vec3 blurColor = vec3(0.0);
      float blurSamples = 5.0;
      for(float i = 0.0; i < 5.0; i++) {
        float angle = i * PI * 2.0 / blurSamples;
        vec2 offset = vec2(cos(angle), sin(angle)) * uBlur * 0.05;
        blurColor += getBackground(uv + normal2D + offset, t);
      }
      blurColor /= blurSamples;
      refractedColor = mix(refractedColor, blurColor, uBlur);
    }

    // Fresnel effect
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 normal3D = normalize(vec3(normal2D * 2.0, 1.0));
    float fresnel = pow(1.0 - max(dot(viewDir, normal3D), 0.0), 3.0);

    // Specular highlights
    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
    vec3 reflectDir = reflect(-viewDir, normal3D);
    float specular = pow(max(dot(reflectDir, lightDir), 0.0), 64.0);

    // Secondary specular
    vec3 lightDir2 = normalize(vec3(-0.6, 0.4, 0.8));
    float specular2 = pow(max(dot(reflectDir, lightDir2), 0.0), 32.0) * 0.5;

    // Glass surface color
    vec3 glassColor = refractedColor;

    // Apply tint
    glassColor *= uTint;

    // Add fresnel reflection
    vec3 reflectionColor = vec3(0.8, 0.9, 1.0);
    glassColor = mix(glassColor, reflectionColor, fresnel * 0.3);

    // Add specular highlights
    glassColor += vec3(1.0) * specular * 0.8;
    glassColor += vec3(0.9, 0.95, 1.0) * specular2 * 0.5;

    // Subtle surface variation
    float surfaceDetail = surface2 * 0.1 + 0.95;
    glassColor *= surfaceDetail;

    // Edge glow
    float edgeGlow = fresnel * 0.2;
    glassColor += uTint * edgeGlow;

    gl_FragColor = vec4(glassColor, 1.0);
  }
`

export function GlassShader({ settings }: GlassShaderProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport, size } = useThree()

  // Safe access to nested settings with defaults
  const glassParams = settings?.glass || {
    animate: true, speed: 0.3, scale: 4, refraction: 0.4,
    dispersion: 0.6, blur: 0, tint: "#FFFFFF"
  }

  // Convert colors to vec3 array
  const colorVectors = colorsToVec3Array(settings?.colors || [])
  // Pad to 8 colors for shader uniform
  const paddedColors = [...colorVectors]
  while (paddedColors.length < 8) {
    paddedColors.push(new THREE.Vector3(1, 1, 1))
  }

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uBackgroundColor: { value: hexToVec3(settings?.backgroundColor) },
    uSpeed: { value: glassParams.speed },
    uScale: { value: glassParams.scale },
    uRefraction: { value: glassParams.refraction },
    uDispersion: { value: glassParams.dispersion },
    uBlur: { value: glassParams.blur },
    uTint: { value: hexToVec3(glassParams.tint) },
    uAnimate: { value: glassParams.animate },
    uColors: { value: paddedColors },
    uColorCount: { value: colorVectors.length },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  // Update uniforms when settings change
  useFrame((state) => {
    if (meshRef.current && settings) {
      const material = meshRef.current.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = state.clock.elapsedTime
      material.uniforms.uResolution.value.set(size.width, size.height)
      material.uniforms.uBackgroundColor.value.copy(hexToVec3(settings?.backgroundColor))
      material.uniforms.uSpeed.value = glassParams.speed
      material.uniforms.uScale.value = glassParams.scale
      material.uniforms.uRefraction.value = glassParams.refraction
      material.uniforms.uDispersion.value = glassParams.dispersion
      material.uniforms.uBlur.value = glassParams.blur
      material.uniforms.uTint.value.copy(hexToVec3(glassParams.tint))
      material.uniforms.uAnimate.value = glassParams.animate

      // Update colors
      const currentColors = colorsToVec3Array(settings?.colors || [])
      const currentPadded = [...currentColors]
      while (currentPadded.length < 8) {
        currentPadded.push(new THREE.Vector3(1, 1, 1))
      }
      material.uniforms.uColors.value = currentPadded
      material.uniforms.uColorCount.value = currentColors.length
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
