"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree, createPortal } from "@react-three/fiber"
import { useFBO } from "@react-three/drei"
import * as THREE from "three"
import type { Artboard } from "@/lib/types"
import { useCanvasStore } from "@/lib/store"

interface ArtboardRendererProps {
  artboard: Artboard
}

export function ArtboardRenderer({ artboard }: ArtboardRendererProps) {
  const { gl, scene: mainScene } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const selectedArtboardId = useCanvasStore((state) => state.editor.selectedArtboardId)
  const selectArtboard = useCanvasStore((state) => state.selectArtboard)

  const isSelected = selectedArtboardId === artboard.id
  const { width, height } = artboard.size

  // Create a render target (FBO) for this artboard
  const renderTarget = useFBO(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    stencilBuffer: false,
    depthBuffer: true,
  })

  // Create a separate scene for this artboard's content
  const artboardScene = useMemo(() => new THREE.Scene(), [])
  const artboardCamera = useMemo(() => {
    const cam = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      0.1,
      1000
    )
    cam.position.z = 500
    return cam
  }, [width, height])

  // Render the artboard content to the FBO
  useFrame(({ gl }) => {
    // Set background color
    const bgColor = new THREE.Color(artboard.backgroundColor)
    gl.setClearColor(bgColor)

    // Render artboard scene to FBO
    gl.setRenderTarget(renderTarget)
    gl.clear()
    gl.render(artboardScene, artboardCamera)
    gl.setRenderTarget(null)
  })

  // Handle click to select artboard
  const handleClick = (e: THREE.Event) => {
    e.stopPropagation()
    selectArtboard(artboard.id)
  }

  // Scale factor to display artboard in world units
  // This converts pixel dimensions to reasonable canvas units
  const scaleFactor = 0.1

  return (
    <group position={[artboard.position[0], artboard.position[1], 0]}>
      {/* Artboard display plane */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        scale={[width * scaleFactor, height * scaleFactor, 1]}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={renderTarget.texture} />
      </mesh>

      {/* Selection outline */}
      {isSelected && (
        <mesh scale={[width * scaleFactor + 4, height * scaleFactor + 4, 1]} position={[0, 0, -0.1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
        </mesh>
      )}

      {/* Artboard border */}
      <lineSegments scale={[width * scaleFactor, height * scaleFactor, 1]} position={[0, 0, 0.1]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} />
        <lineBasicMaterial color={isSelected ? "#3b82f6" : "#555555"} />
      </lineSegments>

      {/* Label */}
      <ArtboardLabel
        name={artboard.name}
        width={width * scaleFactor}
        height={height * scaleFactor}
        isSelected={isSelected}
      />

      {/* Portal for artboard content - renders to the FBO scene */}
      {createPortal(
        <ArtboardContent artboard={artboard} />,
        artboardScene
      )}
    </group>
  )
}

// Artboard content rendered to FBO
function ArtboardContent({ artboard }: { artboard: Artboard }) {
  const { width, height } = artboard.size

  return (
    <group>
      {/* Background */}
      <mesh position={[0, 0, -10]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={artboard.backgroundColor} />
      </mesh>

      {/* Render layers */}
      {artboard.layers
        .filter((layer) => layer.visible)
        .map((layer) => (
          <LayerPlaceholder key={layer.id} layer={layer} artboard={artboard} />
        ))}
    </group>
  )
}

// Placeholder for layer rendering - will be replaced with actual layer renderers
function LayerPlaceholder({
  layer,
  artboard,
}: {
  layer: Artboard["layers"][0]
  artboard: Artboard
}) {
  const { width, height } = artboard.size
  const transform = layer.transform

  // Position based on transform percentage
  const x = (transform.x / 100) * width - width / 2
  const y = (transform.y / 100) * height - height / 2

  return (
    <group
      position={[x, y, 0]}
      rotation={[0, 0, (transform.rotation * Math.PI) / 180]}
      scale={[transform.scale, transform.scale, 1]}
    >
      {/* Placeholder visualization */}
      <mesh>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial
          color={
            layer.type === "3d"
              ? "#ff6b6b"
              : layer.type === "media"
              ? "#4ecdc4"
              : layer.type === "shader"
              ? "#ffe66d"
              : "#95e1d3"
          }
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  )
}

// Artboard label displayed above the artboard
function ArtboardLabel({
  name,
  width,
  height,
  isSelected,
}: {
  name: string
  width: number
  height: number
  isSelected: boolean
}) {
  // Using a simple plane with text texture would be more performant
  // For now, we'll skip the label in 3D and show it in HTML overlay
  return null
}
