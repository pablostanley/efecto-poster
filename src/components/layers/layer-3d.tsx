"use client"

import { useRef } from "react"
import { useFrame, ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"
import type { Layer3D as Layer3DType } from "@/lib/types"

interface Layer3DProps {
  layer: Layer3DType
  artboardWidth: number
  artboardHeight: number
  zIndex: number
  isSelected: boolean
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void
  onPointerUp?: (e: ThreeEvent<PointerEvent>) => void
}

// Shape geometry factory
function createGeometry(shape: Layer3DType["settings"]["shape"]) {
  switch (shape) {
    case "torus":
      return new THREE.TorusGeometry(40, 15, 32, 64)
    case "sphere":
      return new THREE.SphereGeometry(50, 64, 64)
    case "box":
      return new THREE.BoxGeometry(70, 70, 70)
    case "cone":
      return new THREE.ConeGeometry(40, 80, 64)
    case "torusKnot":
      return new THREE.TorusKnotGeometry(35, 10, 128, 32)
    case "icosahedron":
      return new THREE.IcosahedronGeometry(50, 0)
    case "octahedron":
      return new THREE.OctahedronGeometry(50, 0)
    case "tetrahedron":
      return new THREE.TetrahedronGeometry(50, 0)
    case "dodecahedron":
      return new THREE.DodecahedronGeometry(50, 0)
    case "capsule":
      return new THREE.CapsuleGeometry(30, 50, 16, 32)
    case "cylinder":
      return new THREE.CylinderGeometry(40, 40, 80, 64)
    default:
      return new THREE.TorusGeometry(40, 15, 32, 64)
  }
}

// Material factory
function createMaterial(
  materialType: Layer3DType["settings"]["materialType"],
  color: string,
  opacity: number
) {
  const baseColor = new THREE.Color(color)

  switch (materialType) {
    case "toon":
      return new THREE.MeshToonMaterial({
        color: baseColor,
        transparent: true,
        opacity,
      })
    case "phong":
      return new THREE.MeshPhongMaterial({
        color: baseColor,
        shininess: 100,
        transparent: true,
        opacity,
      })
    case "standard":
      return new THREE.MeshStandardMaterial({
        color: baseColor,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity,
      })
    case "glass":
      return new THREE.MeshPhysicalMaterial({
        color: baseColor,
        metalness: 0,
        roughness: 0,
        transmission: 0.9,
        transparent: true,
        opacity,
      })
    case "glossy":
      return new THREE.MeshPhysicalMaterial({
        color: baseColor,
        metalness: 0.1,
        roughness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        transparent: true,
        opacity,
      })
    case "silver":
      return new THREE.MeshStandardMaterial({
        color: "#c0c0c0",
        metalness: 1,
        roughness: 0.2,
        transparent: true,
        opacity,
      })
    case "gold":
      return new THREE.MeshStandardMaterial({
        color: "#ffd700",
        metalness: 1,
        roughness: 0.3,
        transparent: true,
        opacity,
      })
    case "iridescent":
      return new THREE.MeshPhysicalMaterial({
        color: baseColor,
        metalness: 0.5,
        roughness: 0.2,
        iridescence: 1,
        iridescenceIOR: 1.5,
        transparent: true,
        opacity,
      })
    default:
      return new THREE.MeshStandardMaterial({
        color: baseColor,
        metalness: 0.5,
        roughness: 0.5,
        transparent: true,
        opacity,
      })
  }
}

export function Layer3D({
  layer,
  artboardWidth,
  artboardHeight,
  zIndex,
  isSelected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: Layer3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { transform, settings, opacity } = layer

  // Position based on transform (percentage of artboard)
  const x = (transform.x / 100) * artboardWidth
  const y = (transform.y / 100) * artboardHeight

  // Auto-rotation
  useFrame((_state, delta) => {
    if (meshRef.current && settings.autoRotate) {
      meshRef.current.rotation.y += delta * settings.autoRotateSpeed
    }
  })

  // Only render shapes for now
  if (settings.modelType !== "shape") {
    return null
  }

  const geometry = createGeometry(settings.shape)
  const material = createMaterial(settings.materialType, settings.color, opacity)

  return (
    <group
      position={[x, y, zIndex * 0.1 + 50]}
      rotation={[0, 0, (transform.rotation * Math.PI) / 180]}
      scale={[transform.scale * settings.scale, transform.scale * settings.scale, transform.scale * settings.scale]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Lighting for 3D object */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[100, 100, 100]} intensity={1} />
      <directionalLight position={[-100, -100, 50]} intensity={0.5} />

      {/* 3D Shape */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        rotation={[0, settings.objectRotationY, 0]}
      >
        {settings.wireframe && (
          <meshBasicMaterial wireframe color={settings.color} />
        )}
      </mesh>

      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[0, 0, -50]}>
          <planeGeometry args={[150, 150]} />
          <meshBasicMaterial
            color="#3b82f6"
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}
