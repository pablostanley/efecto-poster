"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, Center } from "@react-three/drei"
import { useRef, useMemo, Suspense, useState, useEffect } from "react"
import * as THREE from "three"
import { Cube, SpinnerGap } from "@phosphor-icons/react"

interface ModelThumbnailProps {
  url: string
  name?: string
}

// Target size for normalized thumbnail models
const THUMBNAIL_TARGET_SIZE = 1.8

function RotatingModel({ url }: { url: string }) {
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF(url)
  const clonedScene = useMemo(() => scene.clone(), [scene])

  // Calculate normalization scale
  const normalizedScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDimension = Math.max(size.x, size.y, size.z)
    if (maxDimension > 0) {
      return THUMBNAIL_TARGET_SIZE / maxDimension
    }
    return 1
  }, [clonedScene])

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <group ref={groupRef} scale={normalizedScale}>
      <Center>
        <primitive object={clonedScene} />
      </Center>
    </group>
  )
}

// 3D Loading placeholder (spinning wireframe cube)
function LoadingPlaceholder3D() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5
      meshRef.current.rotation.x += delta * 0.3
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
      <meshBasicMaterial color="#666" wireframe />
    </mesh>
  )
}

// Graceful placeholder when Canvas fails
function ThumbnailPlaceholder({ name }: { name?: string }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?"

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

export function ModelThumbnail({ url, name }: ModelThumbnailProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [canvasKey, setCanvasKey] = useState(0)

  // Reset status when url changes
  useEffect(() => {
    setStatus("loading")
    setCanvasKey(prev => prev + 1)
  }, [url])

  if (status === "error") {
    return <ThumbnailPlaceholder name={name} />
  }

  return (
    <div className="w-full h-full">
      {status === "loading" && (
        <div className="absolute inset-0 z-10">
          <LoadingState />
        </div>
      )}
      <Canvas
        key={canvasKey}
        camera={{ position: [0, 0, 3], fov: 40 }}
        gl={{
          antialias: true,
          alpha: true,
          failIfMajorPerformanceCaveat: false,
        }}
        style={{ background: "transparent" }}
        onCreated={() => setStatus("ready")}
        onError={() => setStatus("error")}
        fallback={<ThumbnailPlaceholder name={name} />}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 3, 3]} intensity={1} />
        <directionalLight position={[-2, -1, -2]} intensity={0.3} />
        <Suspense fallback={<LoadingPlaceholder3D />}>
          <ModelLoader url={url} onError={() => setStatus("error")} />
        </Suspense>
      </Canvas>
    </div>
  )
}

// Wrapper to catch model loading errors
function ModelLoader({ url, onError }: { url: string; onError: () => void }) {
  useEffect(() => {
    // Preload with error handling
    useGLTF.preload(url)
  }, [url])

  try {
    return <RotatingModel url={url} />
  } catch (e) {
    onError()
    return null
  }
}
