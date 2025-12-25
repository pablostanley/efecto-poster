"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { EffectSettings } from "@/lib/types"

interface ArtboardEffectProps {
  inputTexture: THREE.Texture
  effect: EffectSettings
  width: number
  height: number
}

// ASCII Effect Shader - simplified for per-artboard use
const asciiVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const asciiFragmentShader = `
uniform sampler2D tInput;
uniform float cellSize;
uniform bool invert;
uniform bool colorMode;
uniform float time;
uniform vec2 resolution;
uniform vec3 inkColor;
uniform vec3 paperColor;
uniform float contrast;
uniform float jitter;
uniform float jitterSpeed;
uniform float vignette;
uniform float noise;
uniform float noiseSpeed;

varying vec2 vUv;

// Pseudo-random
float random(vec2 st) {
  return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
}

// Get ASCII character value based on brightness
float getChar(float brightness, vec2 p) {
  vec2 grid = floor(p * vec2(5.0, 7.0));
  float val = 0.0;

  if (brightness < 0.1) {
    val = 0.0;
  } else if (brightness < 0.2) {
    val = (grid.x == 2.0 && grid.y == 5.0) ? 1.0 : 0.0;
  } else if (brightness < 0.3) {
    val = (grid.x == 2.0 && (grid.y == 2.0 || grid.y == 4.0)) ? 1.0 : 0.0;
  } else if (brightness < 0.4) {
    val = (grid.y == 2.0 || grid.y == 4.0) && (grid.x >= 1.0 && grid.x <= 3.0) ? 1.0 : 0.0;
  } else if (brightness < 0.5) {
    bool center = (grid.x == 2.0 && grid.y == 3.0);
    bool vert = (grid.x == 2.0 && (grid.y >= 2.0 && grid.y <= 4.0));
    bool horiz = (grid.y == 3.0 && (grid.x >= 1.0 && grid.x <= 3.0));
    val = (center || vert || horiz) ? 1.0 : 0.0;
  } else if (brightness < 0.6) {
    bool outline = ((grid.y == 2.0 || grid.y == 4.0) && (grid.x >= 1.0 && grid.x <= 3.0)) ||
                   ((grid.x == 1.0 || grid.x == 3.0) && grid.y == 3.0);
    val = outline ? 1.0 : 0.0;
  } else if (brightness < 0.7) {
    bool outline = ((grid.y == 1.0 || grid.y == 5.0) && (grid.x >= 1.0 && grid.x <= 3.0)) ||
                   ((grid.x == 0.0 || grid.x == 4.0) && (grid.y >= 2.0 && grid.y <= 4.0));
    val = outline ? 1.0 : 0.0;
  } else if (brightness < 0.8) {
    bool outline = ((grid.y == 1.0 || grid.y == 5.0) && (grid.x >= 1.0 && grid.x <= 3.0)) ||
                   ((grid.x == 0.0 || grid.x == 4.0) && (grid.y >= 2.0 && grid.y <= 4.0));
    bool diag = abs(grid.x - 2.0) == abs(grid.y - 3.0) && grid.x >= 1.0 && grid.x <= 3.0;
    val = (outline || diag) ? 1.0 : 0.0;
  } else if (brightness < 0.9) {
    bool top = ((grid.y == 1.0 || grid.y == 3.0) && (grid.x >= 1.0 && grid.x <= 3.0)) ||
               ((grid.x == 1.0 || grid.x == 3.0) && grid.y == 2.0);
    bool bot = ((grid.y == 3.0 || grid.y == 5.0) && (grid.x >= 1.0 && grid.x <= 3.0)) ||
               ((grid.x == 1.0 || grid.x == 3.0) && grid.y == 4.0);
    val = (top || bot) ? 1.0 : 0.0;
  } else {
    val = 1.0;
  }

  return val;
}

void main() {
  vec2 cellCount = resolution / cellSize;
  vec2 cellCoord = floor(vUv * cellCount);
  vec2 cellUV = (cellCoord + 0.5) / cellCount;

  // Add jitter
  if (jitter > 0.0) {
    float jitterOffset = (random(cellCoord + floor(time * jitterSpeed) * 0.1) - 0.5) * jitter * 0.01;
    cellUV += jitterOffset;
  }

  vec4 cellColor = texture2D(tInput, cellUV);
  float brightness = dot(cellColor.rgb, vec3(0.299, 0.587, 0.114));

  // Apply contrast
  brightness = (brightness - 0.5) * contrast + 0.5;
  brightness = clamp(brightness, 0.0, 1.0);

  // Add noise
  if (noise > 0.0) {
    float noiseVal = random(vUv * 100.0 + time * noiseSpeed);
    brightness = mix(brightness, noiseVal, noise * 0.1);
  }

  if (invert) {
    brightness = 1.0 - brightness;
  }

  vec2 localUV = fract(vUv * cellCount);
  float charValue = getChar(brightness, localUV);

  vec3 finalColor;
  if (colorMode) {
    finalColor = mix(paperColor, cellColor.rgb, charValue);
  } else {
    finalColor = mix(paperColor, inkColor, charValue * brightness);
  }

  // Apply vignette
  if (vignette > 0.0) {
    vec2 centered = vUv - 0.5;
    float dist = length(centered) / 0.707;
    float vignetteVal = smoothstep(0.8, 0.3, dist);
    finalColor *= mix(1.0, vignetteVal, vignette);
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
`

// Dither Effect Shader
const ditherFragmentShader = `
uniform sampler2D tInput;
uniform float pixelSize;
uniform vec3 color1;
uniform vec3 color2;
uniform float contrast;
uniform float brightness;
uniform bool colorful;
uniform vec2 resolution;

varying vec2 vUv;

// Bayer 4x4 matrix
const mat4 bayerMatrix = mat4(
  0.0/16.0, 8.0/16.0, 2.0/16.0, 10.0/16.0,
  12.0/16.0, 4.0/16.0, 14.0/16.0, 6.0/16.0,
  3.0/16.0, 11.0/16.0, 1.0/16.0, 9.0/16.0,
  15.0/16.0, 7.0/16.0, 13.0/16.0, 5.0/16.0
);

void main() {
  vec2 pixelCoord = floor(vUv * resolution / pixelSize);
  vec2 sampleUV = (pixelCoord + 0.5) * pixelSize / resolution;

  vec4 color = texture2D(tInput, sampleUV);

  // Apply brightness and contrast
  color.rgb = (color.rgb - 0.5) * (1.0 + contrast) + 0.5 + brightness;
  color.rgb = clamp(color.rgb, 0.0, 1.0);

  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  // Get Bayer threshold
  int x = int(mod(pixelCoord.x, 4.0));
  int y = int(mod(pixelCoord.y, 4.0));
  float threshold = bayerMatrix[y][x];

  vec3 finalColor;
  if (colorful) {
    // Per-channel dithering
    finalColor.r = color.r > threshold ? color1.r : color2.r;
    finalColor.g = color.g > threshold ? color1.g : color2.g;
    finalColor.b = color.b > threshold ? color1.b : color2.b;
  } else {
    // Luma-based dithering
    finalColor = luma > threshold ? color1 : color2;
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
`

// Halftone Effect Shader
const halftoneFragmentShader = `
uniform sampler2D tInput;
uniform float dotSize;
uniform float spacing;
uniform float angle;
uniform bool colorMode;
uniform vec2 resolution;

varying vec2 vUv;

void main() {
  float angleRad = angle * 3.14159 / 180.0;
  mat2 rotation = mat2(cos(angleRad), -sin(angleRad), sin(angleRad), cos(angleRad));

  vec2 rotatedUV = rotation * (vUv - 0.5) + 0.5;
  vec2 gridUV = mod(rotatedUV * resolution / spacing, 1.0);
  vec2 cellCenter = vec2(0.5);
  float dist = distance(gridUV, cellCenter);

  vec2 sampleUV = floor(vUv * resolution / spacing) * spacing / resolution + spacing / resolution * 0.5;
  vec4 color = texture2D(tInput, sampleUV);
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  float radius = luma * dotSize / spacing;
  float dot = smoothstep(radius + 0.02, radius, dist);

  vec3 finalColor;
  if (colorMode) {
    finalColor = color.rgb * dot;
  } else {
    finalColor = vec3(dot);
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
`

// Parse hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ]
  }
  return [0, 0, 0]
}

export function ArtboardEffect({ inputTexture, effect, width, height }: ArtboardEffectProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const material = useMemo(() => {
    if (!effect.enabled) {
      return new THREE.MeshBasicMaterial({ map: inputTexture })
    }

    if (effect.type === "ascii") {
      const inkRgb = hexToRgb(effect.ascii.inkColor)
      const paperRgb = hexToRgb(effect.ascii.paperColor)

      return new THREE.ShaderMaterial({
        uniforms: {
          tInput: { value: inputTexture },
          cellSize: { value: effect.ascii.cellSize },
          invert: { value: effect.ascii.invert },
          colorMode: { value: effect.ascii.color },
          time: { value: 0 },
          resolution: { value: new THREE.Vector2(width, height) },
          inkColor: { value: new THREE.Vector3(inkRgb[0], inkRgb[1], inkRgb[2]) },
          paperColor: { value: new THREE.Vector3(paperRgb[0], paperRgb[1], paperRgb[2]) },
          contrast: { value: effect.ascii.contrast },
          jitter: { value: effect.ascii.jitter },
          jitterSpeed: { value: effect.ascii.jitterSpeed },
          vignette: { value: effect.ascii.vignette },
          noise: { value: effect.ascii.noise },
          noiseSpeed: { value: effect.ascii.noiseSpeed },
        },
        vertexShader: asciiVertexShader,
        fragmentShader: asciiFragmentShader,
      })
    }

    if (effect.type === "dither") {
      const color1Rgb = hexToRgb(effect.dither.color1)
      const color2Rgb = hexToRgb(effect.dither.color2)

      return new THREE.ShaderMaterial({
        uniforms: {
          tInput: { value: inputTexture },
          pixelSize: { value: effect.dither.pixelSize },
          color1: { value: new THREE.Vector3(color1Rgb[0], color1Rgb[1], color1Rgb[2]) },
          color2: { value: new THREE.Vector3(color2Rgb[0], color2Rgb[1], color2Rgb[2]) },
          contrast: { value: effect.dither.contrast },
          brightness: { value: effect.dither.brightness },
          colorful: { value: effect.dither.colorful },
          resolution: { value: new THREE.Vector2(width, height) },
        },
        vertexShader: asciiVertexShader,
        fragmentShader: ditherFragmentShader,
      })
    }

    if (effect.type === "halftone") {
      return new THREE.ShaderMaterial({
        uniforms: {
          tInput: { value: inputTexture },
          dotSize: { value: effect.halftone.dotSize },
          spacing: { value: effect.halftone.spacing },
          angle: { value: effect.halftone.angle },
          colorMode: { value: effect.halftone.colorMode === "color" },
          resolution: { value: new THREE.Vector2(width, height) },
        },
        vertexShader: asciiVertexShader,
        fragmentShader: halftoneFragmentShader,
      })
    }

    // Default: no effect
    return new THREE.MeshBasicMaterial({ map: inputTexture })
  }, [inputTexture, effect, width, height])

  // Update time uniform for animated effects
  useFrame(({ clock }) => {
    if (materialRef.current && effect.enabled && effect.type === "ascii") {
      const uniforms = (materialRef.current as THREE.ShaderMaterial).uniforms
      if (uniforms?.time) {
        uniforms.time.value = clock.elapsedTime
      }
    }
  })

  // Update uniforms when effect settings change
  useMemo(() => {
    if (materialRef.current && effect.enabled) {
      const shaderMat = materialRef.current as THREE.ShaderMaterial
      if (shaderMat.uniforms) {
        shaderMat.uniforms.tInput.value = inputTexture

        if (effect.type === "ascii") {
          const inkRgb = hexToRgb(effect.ascii.inkColor)
          const paperRgb = hexToRgb(effect.ascii.paperColor)

          shaderMat.uniforms.cellSize.value = effect.ascii.cellSize
          shaderMat.uniforms.invert.value = effect.ascii.invert
          shaderMat.uniforms.colorMode.value = effect.ascii.color
          shaderMat.uniforms.inkColor.value.set(inkRgb[0], inkRgb[1], inkRgb[2])
          shaderMat.uniforms.paperColor.value.set(paperRgb[0], paperRgb[1], paperRgb[2])
          shaderMat.uniforms.contrast.value = effect.ascii.contrast
          shaderMat.uniforms.jitter.value = effect.ascii.jitter
          shaderMat.uniforms.jitterSpeed.value = effect.ascii.jitterSpeed
          shaderMat.uniforms.vignette.value = effect.ascii.vignette
          shaderMat.uniforms.noise.value = effect.ascii.noise
          shaderMat.uniforms.noiseSpeed.value = effect.ascii.noiseSpeed
        }

        if (effect.type === "dither") {
          const color1Rgb = hexToRgb(effect.dither.color1)
          const color2Rgb = hexToRgb(effect.dither.color2)

          shaderMat.uniforms.pixelSize.value = effect.dither.pixelSize
          shaderMat.uniforms.color1.value.set(color1Rgb[0], color1Rgb[1], color1Rgb[2])
          shaderMat.uniforms.color2.value.set(color2Rgb[0], color2Rgb[1], color2Rgb[2])
          shaderMat.uniforms.contrast.value = effect.dither.contrast
          shaderMat.uniforms.brightness.value = effect.dither.brightness
          shaderMat.uniforms.colorful.value = effect.dither.colorful
        }

        if (effect.type === "halftone") {
          shaderMat.uniforms.dotSize.value = effect.halftone.dotSize
          shaderMat.uniforms.spacing.value = effect.halftone.spacing
          shaderMat.uniforms.angle.value = effect.halftone.angle
          shaderMat.uniforms.colorMode.value = effect.halftone.colorMode === "color"
        }
      }
    }
  }, [inputTexture, effect])

  return <primitive ref={materialRef} object={material} attach="material" />
}
