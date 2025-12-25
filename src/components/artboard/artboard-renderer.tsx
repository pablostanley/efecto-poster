"use client"

import { useRef, useMemo, useState } from "react"
import { useFrame, useThree, createPortal, ThreeEvent } from "@react-three/fiber"
import { useFBO, Html } from "@react-three/drei"
import * as THREE from "three"
import type { Artboard } from "@/lib/types"
import { useCanvasStore } from "@/lib/store"

interface ArtboardRendererProps {
  artboard: Artboard
}

export function ArtboardRenderer({ artboard }: ArtboardRendererProps) {
  const { gl, camera } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)

  const selectedArtboardId = useCanvasStore((state) => state.editor.selectedArtboardId)
  const selectArtboard = useCanvasStore((state) => state.selectArtboard)
  const updateArtboard = useCanvasStore((state) => state.updateArtboard)

  const isSelected = selectedArtboardId === artboard.id
  const { width, height } = artboard.size

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ x: number; y: number; artboardX: number; artboardY: number } | null>(null)

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
    const bgColor = new THREE.Color(artboard.backgroundColor)
    gl.setClearColor(bgColor)
    gl.setRenderTarget(renderTarget)
    gl.clear()
    gl.render(artboardScene, artboardCamera)
    gl.setRenderTarget(null)
  })

  // Handle pointer down - start selection/drag
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    selectArtboard(artboard.id)

    // Start drag
    setIsDragging(true)
    dragStart.current = {
      x: e.point.x,
      y: e.point.y,
      artboardX: artboard.position[0],
      artboardY: artboard.position[1],
    }

    // Capture pointer for drag
    ;(e.target as HTMLElement)?.setPointerCapture?.(e.pointerId)
  }

  // Handle pointer move - drag
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !dragStart.current) return
    e.stopPropagation()

    const deltaX = e.point.x - dragStart.current.x
    const deltaY = e.point.y - dragStart.current.y

    updateArtboard(artboard.id, {
      position: [
        dragStart.current.artboardX + deltaX,
        dragStart.current.artboardY + deltaY,
      ],
    })
  }

  // Handle pointer up - end drag
  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setIsDragging(false)
    dragStart.current = null
    ;(e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId)
  }

  // Scale factor to display artboard in world units
  const scaleFactor = 0.1
  const displayWidth = width * scaleFactor
  const displayHeight = height * scaleFactor

  return (
    <group
      ref={groupRef}
      position={[artboard.position[0], artboard.position[1], 0]}
    >
      {/* Artboard label (HTML overlay) */}
      <Html
        position={[-displayWidth / 2, displayHeight / 2 + 3, 0]}
        style={{
          transform: "translate(0, -100%)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div
          className={`text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${
            isSelected ? "text-blue-500" : "text-muted-foreground"
          }`}
        >
          {artboard.name}
        </div>
      </Html>

      {/* Clickable/draggable artboard plane */}
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        scale={[displayWidth, displayHeight, 1]}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={renderTarget.texture} />
      </mesh>

      {/* Selection outline - blue border */}
      {isSelected && (
        <lineSegments
          scale={[displayWidth, displayHeight, 1]}
          position={[0, 0, 0.1]}
        >
          <edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} />
          <lineBasicMaterial color="#3b82f6" linewidth={2} />
        </lineSegments>
      )}

      {/* Non-selected border - subtle */}
      {!isSelected && (
        <lineSegments
          scale={[displayWidth, displayHeight, 1]}
          position={[0, 0, 0.1]}
        >
          <edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} />
          <lineBasicMaterial color="#666666" linewidth={1} />
        </lineSegments>
      )}

      {/* Selection handles */}
      {isSelected && (
        <SelectionHandles width={displayWidth} height={displayHeight} />
      )}

      {/* Portal for artboard content - renders to the FBO scene */}
      {createPortal(
        <ArtboardContent artboard={artboard} />,
        artboardScene
      )}
    </group>
  )
}

// Selection handles component
function SelectionHandles({
  width,
  height,
}: {
  width: number
  height: number
}) {
  const handleSize = 3
  const handleColor = "#3b82f6"

  // Corner positions
  const corners = [
    { x: -width / 2, y: height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
  ]

  // Edge midpoints
  const edges = [
    { x: 0, y: height / 2 },
    { x: 0, y: -height / 2 },
    { x: -width / 2, y: 0 },
    { x: width / 2, y: 0 },
  ]

  return (
    <group position={[0, 0, 0.2]}>
      {/* Corner handles */}
      {corners.map((pos, i) => (
        <group key={`corner-${i}`} position={[pos.x, pos.y, 0]}>
          <mesh>
            <planeGeometry args={[handleSize, handleSize]} />
            <meshBasicMaterial color={handleColor} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[handleSize - 1.5, handleSize - 1.5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}

      {/* Edge handles */}
      {edges.map((pos, i) => (
        <group key={`edge-${i}`} position={[pos.x, pos.y, 0]}>
          <mesh>
            <planeGeometry args={[handleSize * 0.8, handleSize * 0.8]} />
            <meshBasicMaterial color={handleColor} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[handleSize * 0.8 - 1.2, handleSize * 0.8 - 1.2]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Artboard content rendered to FBO
function ArtboardContent({ artboard }: { artboard: Artboard }) {
  const { width, height } = artboard.size
  const selectedLayerId = useCanvasStore((state) => state.editor.selectedLayerId)

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
        .map((layer, index) => (
          <LayerPlaceholder
            key={layer.id}
            layer={layer}
            artboard={artboard}
            zIndex={index}
            isSelected={layer.id === selectedLayerId}
          />
        ))}
    </group>
  )
}

// Placeholder for layer rendering
function LayerPlaceholder({
  layer,
  artboard,
  zIndex,
  isSelected,
}: {
  layer: Artboard["layers"][0]
  artboard: Artboard
  zIndex: number
  isSelected: boolean
}) {
  const transform = layer.transform

  // Position based on transform
  const x = transform.x * 2
  const y = transform.y * 2

  // Layer type colors
  const typeColors = {
    "3d": "#a855f7",
    media: "#22c55e",
    shader: "#f97316",
    text: "#3b82f6",
  }

  const color = typeColors[layer.type]

  return (
    <group
      position={[x, y, zIndex * 0.1]}
      rotation={[0, 0, (transform.rotation * Math.PI) / 180]}
      scale={[transform.scale, transform.scale, 1]}
    >
      {/* Layer placeholder */}
      <mesh>
        <planeGeometry args={[150, 150]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={layer.opacity * 0.3}
        />
      </mesh>

      {/* Border - highlighted when selected */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(150, 150)]} />
        <lineBasicMaterial
          color={isSelected ? "#ffffff" : color}
          opacity={isSelected ? 1 : 0.5}
          transparent
        />
      </lineSegments>

      {/* Selection indicator */}
      {isSelected && (
        <lineSegments position={[0, 0, 0.05]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(160, 160)]} />
          <lineBasicMaterial color="#3b82f6" />
        </lineSegments>
      )}
    </group>
  )
}
