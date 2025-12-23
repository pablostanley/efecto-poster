"use client"

import { forwardRef, useMemo } from "react"
import { Effect } from "postprocessing"
import { Uniform } from "three"

/**
 * Sinusoidal Warp Effect
 * Based on "Bumped Sinusoidal Warp" by Shane on Shadertoy
 * https://www.shadertoy.com/view/4l2XWK
 *
 * Creates flowing, liquid-like deformation with bump mapping and specular highlights
 */

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uAmplitude;
  uniform float uBumpIntensity;
  uniform float uSpecularPower;
  uniform bool uColor;
  uniform float uTextureScale;

  // Warp function - creates layered sinusoidal deformation
  vec2 warp(vec2 p, float t) {
    p = (p + 3.0) * uScale;

    // Layered sinusoidal feedback with time component
    for (int i = 0; i < 3; i++) {
      p += cos(p.yx * 3.0 + vec2(t, 1.57)) / 3.0 * uAmplitude;
      p += sin(p.yx + t + vec2(1.57, 0.0)) / 2.0 * uAmplitude;
      p *= 1.3;
    }

    // Subtle jitter to smooth high frequency sections
    p += fract(sin(p + vec2(13.0, 7.0)) * 50000.0) * 0.03 - 0.015;

    return mod(p, 2.0) - 1.0;
  }

  // Bump function - returns height based on warp
  float bumpFunc(vec2 p, float t) {
    return length(warp(p, t)) * 0.7071;
  }

  // Smooth fract for color blending
  vec3 smoothFract(vec3 x) {
    x = fract(x);
    return min(x, x * (1.0 - x) * 12.0);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float t = uTime * uSpeed;

    // Center UV coordinates
    vec2 centeredUV = uv - 0.5;

    // Calculate warped UV for texture sampling
    vec2 warpedOffset = warp(centeredUV, t) * 0.1 * uAmplitude;
    vec2 textureUV = uv + warpedOffset;

    // Sample original texture with warped coordinates
    vec4 texColor = texture2D(inputBuffer, textureUV);

    // BUMP MAPPING
    float eps = 0.02;
    float f = bumpFunc(centeredUV, t);
    float fx = bumpFunc(centeredUV - vec2(eps, 0.0), t);
    float fy = bumpFunc(centeredUV - vec2(0.0, eps), t);

    // Calculate gradients
    float gradX = (fx - f) / eps;
    float gradY = (fy - f) / eps;

    // Perturb normal
    vec3 normal = normalize(vec3(0.0, 0.0, -1.0) + vec3(gradX, gradY, 0.0) * uBumpIntensity);

    // LIGHTING
    vec3 lightPos = vec3(cos(t) * 0.5, sin(t) * 0.2, -1.0);
    vec3 surfacePos = vec3(centeredUV, 0.0);

    vec3 lightDir = lightPos - surfacePos;
    float lightDist = max(length(lightDir), 0.0001);
    lightDir /= lightDist;

    // Attenuation
    float atten = 1.0 / (1.0 + lightDist * lightDist * 0.15);
    atten *= f * 0.9 + 0.1;

    // Diffuse
    float diff = max(dot(normal, lightDir), 0.0);
    diff = pow(diff, 4.0) * 0.66 + pow(diff, 8.0) * 0.34;

    // Specular
    vec3 viewDir = vec3(0.0, 0.0, -1.0);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(reflectDir, -viewDir), 0.0), uSpecularPower);

    // FINAL COLOR
    vec3 finalColor;

    if (uColor) {
      // Color mode - use warped texture with lighting
      vec3 baseColor = texColor.rgb;
      finalColor = (baseColor * (diff * vec3(1.0, 0.97, 0.92) * 2.0 + 0.5) + vec3(1.0, 0.6, 0.2) * spec * 2.0) * atten;

      // Faux environment reflection
      float ref = max(dot(reflect(viewDir, normal), vec3(1.0, 0.0, 0.0)), 0.0);
      finalColor += finalColor * pow(ref, 4.0) * vec3(0.25, 0.5, 1.0) * 3.0;
    } else {
      // Procedural mode - metallic look without texture
      vec3 procColor = smoothFract(warp(centeredUV, t).xyy) * 0.1 + 0.2;
      finalColor = (procColor * (diff * vec3(1.0, 0.97, 0.92) * 2.0 + 0.5) + vec3(1.0, 0.6, 0.2) * spec * 2.0) * atten;

      float ref = max(dot(reflect(viewDir, normal), vec3(1.0, 0.0, 0.0)), 0.0);
      finalColor += finalColor * pow(ref, 4.0) * vec3(0.25, 0.5, 1.0) * 3.0;
    }

    // Gamma correction
    outputColor = vec4(sqrt(clamp(finalColor, 0.0, 1.0)), texColor.a);
  }
`

interface SineWarpEffectImplOptions {
  speed?: number
  scale?: number
  amplitude?: number
  bumpIntensity?: number
  specularPower?: number
  color?: boolean
  textureScale?: number
}

class SineWarpEffectImpl extends Effect {
  constructor({
    speed = 0.5,
    scale = 4,
    amplitude = 0.5,
    bumpIntensity = 0.05,
    specularPower = 12,
    color = true,
    textureScale = 1,
  }: SineWarpEffectImplOptions = {}) {
    super("SineWarpEffect", fragmentShader, {
      uniforms: new Map([
        ["uTime", new Uniform(0)],
        ["uSpeed", new Uniform(speed)],
        ["uScale", new Uniform(scale)],
        ["uAmplitude", new Uniform(amplitude)],
        ["uBumpIntensity", new Uniform(bumpIntensity)],
        ["uSpecularPower", new Uniform(specularPower)],
        ["uColor", new Uniform(color)],
        ["uTextureScale", new Uniform(textureScale)],
      ]),
    })
  }

  update(_renderer: unknown, _inputBuffer: unknown, deltaTime?: number) {
    if (deltaTime) {
      this.uniforms.get("uTime")!.value += deltaTime
    }
  }
}

interface SineWarpEffectProps {
  speed?: number
  scale?: number
  amplitude?: number
  bumpIntensity?: number
  specularPower?: number
  color?: boolean
  textureScale?: number
}

export const SineWarpEffect = forwardRef<SineWarpEffectImpl, SineWarpEffectProps>(
  (
    {
      speed = 0.5,
      scale = 4,
      amplitude = 0.5,
      bumpIntensity = 0.05,
      specularPower = 12,
      color = true,
      textureScale = 1,
    },
    ref
  ) => {
    const effect = useMemo(
      () =>
        new SineWarpEffectImpl({
          speed,
          scale,
          amplitude,
          bumpIntensity,
          specularPower,
          color,
          textureScale,
        }),
      []
    )

    // Update uniforms when props change
    useMemo(() => {
      effect.uniforms.get("uSpeed")!.value = speed
      effect.uniforms.get("uScale")!.value = scale
      effect.uniforms.get("uAmplitude")!.value = amplitude
      effect.uniforms.get("uBumpIntensity")!.value = bumpIntensity
      effect.uniforms.get("uSpecularPower")!.value = specularPower
      effect.uniforms.get("uColor")!.value = color
      effect.uniforms.get("uTextureScale")!.value = textureScale
    }, [effect, speed, scale, amplitude, bumpIntensity, specularPower, color, textureScale])

    return <primitive ref={ref} object={effect} dispose={null} />
  }
)

SineWarpEffect.displayName = "SineWarpEffect"
