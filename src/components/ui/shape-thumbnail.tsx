"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { useRef, useMemo, useState, useEffect } from "react"
import * as THREE from "three"
import { Cube, SpinnerGap } from "@phosphor-icons/react"

interface ShapeThumbnailProps {
  shape: string
  color?: string
  name?: string
}

function RotatingShape({ shape, color }: { shape: string; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
    }
  })

  const geometry = useMemo(() => {
    switch (shape) {
      case "torus":
        return new THREE.TorusGeometry(0.5, 0.2, 16, 32)
      case "sphere":
        return new THREE.SphereGeometry(0.6, 32, 32)
      case "box":
        return new THREE.BoxGeometry(0.8, 0.8, 0.8)
      case "cone":
        return new THREE.ConeGeometry(0.5, 1, 32)
      case "torusKnot":
        return new THREE.TorusKnotGeometry(0.4, 0.15, 64, 16)
      case "cylinder":
        return new THREE.CylinderGeometry(0.4, 0.4, 1, 32)
      case "icosahedron":
        return new THREE.IcosahedronGeometry(0.6, 0)
      case "octahedron":
        return new THREE.OctahedronGeometry(0.6, 0)
      case "dodecahedron":
        return new THREE.DodecahedronGeometry(0.6, 0)
      default:
        return new THREE.TorusGeometry(0.5, 0.2, 16, 32)
    }
  }, [shape])

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  )
}

// Graceful placeholder when Canvas fails
function ThumbnailPlaceholder({ name, shape }: { name?: string; shape?: string }) {
  // Use shape name or provided name for the initial
  const displayName = name || shape || "?"
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/80 to-muted/40 dark:from-muted/40 dark:to-muted/20">
      <div className="w-10 h-10 rounded-lg bg-background/60 dark:bg-background/30 backdrop-blur-sm flex items-center justify-center border border-border/50 shadow-sm">
        <span className="text-lg font-semibold text-muted-foreground/70">
          {initial}
        </span>
      </div>
      <Cube className="w-3 h-3 text-muted-foreground/40 mt-1.5" />
    </div>
  )
}

// Loading state placeholder
function LoadingState() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted/30 dark:from-muted/30 dark:to-muted/10">
      <div className="w-8 h-8 rounded-lg bg-background/40 backdrop-blur-sm flex items-center justify-center">
        <SpinnerGap className="w-4 h-4 text-muted-foreground/50 animate-spin" />
      </div>
    </div>
  )
}

export function ShapeThumbnail({ shape, color = "#808080", name }: ShapeThumbnailProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  // Reset on shape change
  useEffect(() => {
    setStatus("loading")
  }, [shape])

  if (status === "error") {
    return <ThumbnailPlaceholder name={name} shape={shape} />
  }

  return (
    <div className="w-full h-full">
      {status === "loading" && (
        <div className="absolute inset-0 z-10">
          <LoadingState />
        </div>
      )}
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{
          antialias: true,
          alpha: true,
          failIfMajorPerformanceCaveat: false,
        }}
        style={{ background: "transparent" }}
        onCreated={() => setStatus("ready")}
        onError={() => setStatus("error")}
        fallback={<ThumbnailPlaceholder name={name} shape={shape} />}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 2]} intensity={1} />
        <directionalLight position={[-2, -1, -1]} intensity={0.3} />
        <RotatingShape shape={shape} color={color} />
      </Canvas>
    </div>
  )
}
