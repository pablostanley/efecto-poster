"use client"

import React, { useState, memo } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { SpinnerGap } from "@phosphor-icons/react"

// =============================================================================
// STATIC THUMBNAILS - For GLTF models (pre-generated PNGs)
// =============================================================================

export function StaticThumbnail({
  id,
  name,
}: {
  id: string
  name: string
}) {
  const [hasError, setHasError] = useState(false)
  const thumbnailPath = `/thumbnails/${id}.png`

  if (hasError) {
    return <ThumbnailPlaceholder name={name} />
  }

  return (
    <div className="w-full h-full p-1">
      <img
        src={thumbnailPath}
        alt={name}
        className="w-full h-full object-contain"
        draggable={false}
        onError={() => setHasError(true)}
      />
    </div>
  )
}

// =============================================================================
// DYNAMIC SHAPE THUMBNAILS - Rendered with current color (fast, lightweight)
// =============================================================================

// Shape geometry component
function ShapeGeometry({ shape }: { shape: string }) {
  const geometry = React.useMemo(() => {
    switch (shape) {
      case "torus": return new THREE.TorusGeometry(0.5, 0.2, 16, 32)
      case "sphere": return new THREE.SphereGeometry(0.6, 32, 32)
      case "box": return new THREE.BoxGeometry(0.8, 0.8, 0.8)
      case "cone": return new THREE.ConeGeometry(0.5, 1, 32)
      case "torusKnot": return new THREE.TorusKnotGeometry(0.4, 0.15, 64, 16)
      case "cylinder": return new THREE.CylinderGeometry(0.4, 0.4, 1, 32)
      case "icosahedron": return new THREE.IcosahedronGeometry(0.6, 0)
      case "octahedron": return new THREE.OctahedronGeometry(0.6, 0)
      case "dodecahedron": return new THREE.DodecahedronGeometry(0.6, 0)
      case "tetrahedron": return new THREE.TetrahedronGeometry(0.6, 0)
      case "capsule": return new THREE.CapsuleGeometry(0.3, 0.5, 8, 16)
      case "plane": return new THREE.PlaneGeometry(1, 1)
      default: return new THREE.TorusGeometry(0.5, 0.2, 16, 32)
    }
  }, [shape])

  return <primitive object={geometry} attach="geometry" />
}

// Dynamic shape thumbnail with color
export const DynamicShapeThumbnail = memo(function DynamicShapeThumbnail({
  shape,
  color = "#808080"
}: {
  shape: string
  color?: string
}) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 2]} intensity={1} />
        <mesh rotation={[0.3, 0.5, 0]}>
          <ShapeGeometry shape={shape} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
        </mesh>
      </Canvas>
    </div>
  )
})

// =============================================================================
// PLACEHOLDER COMPONENTS
// =============================================================================

export function ThumbnailPlaceholder({ name }: { name?: string }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?"

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/50 to-muted/20">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
        <span className="text-sm font-medium text-muted-foreground/70">
          {initial}
        </span>
      </div>
    </div>
  )
}

export function LoadingPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/40 to-muted/20">
      <SpinnerGap className="w-4 h-4 text-muted-foreground/40 animate-spin" />
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT - Routes to dynamic (shapes) or static (models)
// =============================================================================

export function CachedThumbnail({
  type,
  id,
  shape,
  name,
  color
}: {
  type: "shape" | "model"
  id: string
  shape?: string
  url?: string
  name: string
  color?: string
}) {
  // Shapes: render dynamically with color
  if (type === "shape" && shape) {
    return <DynamicShapeThumbnail shape={shape} color={color} />
  }

  // Models: use static pre-generated thumbnails
  return <StaticThumbnail id={id} name={name} />
}

// Legacy hook for compatibility
export function useCachedThumbnail() {
  return { thumbnail: null, status: "ready" as const }
}
