"use client"

import { useRef, useMemo } from "react"
import { useFrame, ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"
import type { LayerShader as LayerShaderType } from "@/lib/types"
import { LayerHandles } from "./layer-handles"

interface LayerShaderProps {
  layer: LayerShaderType
  artboardWidth: number
  artboardHeight: number
  zIndex: number
  isSelected: boolean
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void
  onPointerUp?: (e: ThreeEvent<PointerEvent>) => void
  onResize?: (deltaScale: number, corner: string) => void
  onResizeStart?: () => void
  onResizeEnd?: () => void
}

// Simple mesh gradient shader
const meshGradientShader = {
  uniforms: {
    uTime: { value: 0 },
    uSpeed: { value: 1 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uSpeed;
    uniform vec2 uResolution;
    varying vec2 vUv;

    vec3 palette(float t) {
      vec3 a = vec3(0.5, 0.5, 0.5);
      vec3 b = vec3(0.5, 0.5, 0.5);
      vec3 c = vec3(1.0, 1.0, 1.0);
      vec3 d = vec3(0.263, 0.416, 0.557);
      return a + b * cos(6.28318 * (c * t + d));
    }

    void main() {
      vec2 uv = vUv;
      float t = uTime * uSpeed * 0.2;

      // Create animated mesh gradient
      float d = length(uv - 0.5);
      vec3 col = palette(d + t);

      // Add some noise/variation
      col += 0.1 * sin(uv.x * 10.0 + t) * sin(uv.y * 10.0 + t);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
}

// Liquid metal shader
const liquidMetalShader = {
  uniforms: {
    uTime: { value: 0 },
    uSpeed: { value: 1 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uSpeed;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      float t = uTime * uSpeed * 0.3;

      float x = uv.x * 6.0;
      float y = uv.y * 6.0;

      float v = sin(x + t) + sin(y + t) + sin(x + y + t);
      v += sin(sqrt(x * x + y * y) + t);

      vec3 col = vec3(0.5 + 0.5 * sin(v), 0.5 + 0.5 * sin(v + 2.0), 0.5 + 0.5 * sin(v + 4.0));
      col = pow(col, vec3(0.8)); // Metallic look

      gl_FragColor = vec4(col, 1.0);
    }
  `,
}

// Voronoi shader
const voronoiShader = {
  uniforms: {
    uTime: { value: 0 },
    uSpeed: { value: 1 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uSpeed;
    varying vec2 vUv;

    vec2 hash(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return fract(sin(p) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv * 5.0;
      float t = uTime * uSpeed * 0.5;

      vec2 i = floor(uv);
      vec2 f = fract(uv);

      float minDist = 1.0;

      for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 point = hash(i + neighbor);
          point = 0.5 + 0.5 * sin(t + 6.2831 * point);
          vec2 diff = neighbor + point - f;
          float dist = length(diff);
          minDist = min(minDist, dist);
        }
      }

      vec3 col = vec3(minDist);
      col = mix(vec3(0.1, 0.2, 0.4), vec3(0.9, 0.8, 0.7), col);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
}

// Chrome shader
const chromeShader = {
  uniforms: {
    uTime: { value: 0 },
    uSpeed: { value: 1 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uSpeed;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      float t = uTime * uSpeed * 0.2;

      float v1 = sin(uv.x * 10.0 + t);
      float v2 = sin(uv.y * 10.0 - t);
      float v3 = sin((uv.x + uv.y) * 10.0 + t);
      float v4 = sin(length(uv - 0.5) * 10.0 - t);

      float v = (v1 + v2 + v3 + v4) * 0.25;

      vec3 col = vec3(
        0.5 + 0.5 * sin(v * 3.14159),
        0.5 + 0.5 * sin(v * 3.14159 + 2.094),
        0.5 + 0.5 * sin(v * 3.14159 + 4.188)
      );

      // Make it more chrome-like
      col = pow(col, vec3(0.6));

      gl_FragColor = vec4(col, 1.0);
    }
  `,
}

function getShader(type: LayerShaderType["settings"]["type"]) {
  switch (type) {
    case "liquidMetal":
      return liquidMetalShader
    case "voronoi":
      return voronoiShader
    case "chrome":
      return chromeShader
    case "meshGradient":
    default:
      return meshGradientShader
  }
}

export function LayerShader({
  layer,
  artboardWidth,
  artboardHeight,
  zIndex,
  isSelected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onResize,
  onResizeStart,
  onResizeEnd,
}: LayerShaderProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { transform, settings, opacity } = layer

  // Position based on transform (percentage of artboard)
  const x = (transform.x / 100) * artboardWidth
  const y = (transform.y / 100) * artboardHeight

  const shader = getShader(settings.type)

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        ...shader.uniforms,
        uSpeed: { value: settings.speed },
      },
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      transparent: true,
      opacity: opacity,
    })
  }, [settings.type, settings.speed, opacity])

  // Animate shader
  useFrame(({ clock }) => {
    if (shaderMaterial.uniforms.uTime) {
      shaderMaterial.uniforms.uTime.value = clock.elapsedTime
    }
  })

  return (
    <group
      position={[x, y, zIndex * 0.1]}
      rotation={[0, 0, (transform.rotation * Math.PI) / 180]}
      scale={[transform.scale, transform.scale, 1]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <mesh ref={meshRef} material={shaderMaterial}>
        <planeGeometry args={[artboardWidth, artboardHeight]} />
      </mesh>

      {/* Resize handles */}
      <LayerHandles
        width={artboardWidth}
        height={artboardHeight}
        isSelected={isSelected}
        onResize={onResize}
        onResizeStart={onResizeStart}
        onResizeEnd={onResizeEnd}
      />
    </group>
  )
}
