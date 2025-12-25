"use client"

import { useRef, useMemo, useState } from "react"
import { useFrame, useThree, createPortal, ThreeEvent } from "@react-three/fiber"
import { useFBO, Html } from "@react-three/drei"
import * as THREE from "three"
import type { Artboard } from "@/lib/types"
import { useCanvasStore } from "@/lib/store"
import { LayerRenderer } from "@/components/layers"
import { ArtboardEffect } from "./artboard-effect"

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

      {/* Clickable/draggable artboard plane with effects */}
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        scale={[displayWidth, displayHeight, 1]}
      >
        <planeGeometry args={[1, 1]} />
        <ArtboardEffect
          inputTexture={renderTarget.texture}
          effect={artboard.effect}
          width={width}
          height={height}
        />
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
        <SelectionHandles
          width={displayWidth}
          height={displayHeight}
          onResize={(deltaWidth, deltaHeight) => {
            // Convert from display coordinates back to pixel dimensions
            const pixelDeltaWidth = deltaWidth / scaleFactor
            const pixelDeltaHeight = deltaHeight / scaleFactor

            const newWidth = Math.max(100, artboard.size.width + pixelDeltaWidth)
            const newHeight = Math.max(100, artboard.size.height + pixelDeltaHeight)

            updateArtboard(artboard.id, {
              size: {
                width: Math.round(newWidth),
                height: Math.round(newHeight),
              },
            })
          }}
        />
      )}

      {/* Portal for artboard content - renders to the FBO scene */}
      {createPortal(
        <ArtboardContent artboard={artboard} />,
        artboardScene
      )}
    </group>
  )
}

// Selection handles component with resize functionality
type HandlePosition = "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r"

function SelectionHandles({
  width,
  height,
  onResize,
}: {
  width: number
  height: number
  onResize?: (deltaWidth: number, deltaHeight: number, handle: HandlePosition) => void
}) {
  const handleSize = 3
  const handleColor = "#3b82f6"
  const [activeHandle, setActiveHandle] = useState<HandlePosition | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  // Corner positions
  const corners: { pos: HandlePosition; x: number; y: number }[] = [
    { pos: "tl", x: -width / 2, y: height / 2 },
    { pos: "tr", x: width / 2, y: height / 2 },
    { pos: "bl", x: -width / 2, y: -height / 2 },
    { pos: "br", x: width / 2, y: -height / 2 },
  ]

  // Edge midpoints
  const edges: { pos: HandlePosition; x: number; y: number }[] = [
    { pos: "t", x: 0, y: height / 2 },
    { pos: "b", x: 0, y: -height / 2 },
    { pos: "l", x: -width / 2, y: 0 },
    { pos: "r", x: width / 2, y: 0 },
  ]

  const handlePointerDown = (e: ThreeEvent<PointerEvent>, pos: HandlePosition) => {
    e.stopPropagation()
    setActiveHandle(pos)
    dragStart.current = { x: e.point.x, y: e.point.y }
  }

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!activeHandle || !dragStart.current) return
    e.stopPropagation()

    const deltaX = e.point.x - dragStart.current.x
    const deltaY = e.point.y - dragStart.current.y

    // Calculate size changes based on handle position
    let deltaWidth = 0
    let deltaHeight = 0

    switch (activeHandle) {
      case "tr":
      case "br":
        deltaWidth = deltaX
        break
      case "tl":
      case "bl":
        deltaWidth = -deltaX
        break
      case "r":
        deltaWidth = deltaX
        break
      case "l":
        deltaWidth = -deltaX
        break
    }

    switch (activeHandle) {
      case "tl":
      case "tr":
        deltaHeight = deltaY
        break
      case "bl":
      case "br":
        deltaHeight = -deltaY
        break
      case "t":
        deltaHeight = deltaY
        break
      case "b":
        deltaHeight = -deltaY
        break
    }

    onResize?.(deltaWidth, deltaHeight, activeHandle)
    dragStart.current = { x: e.point.x, y: e.point.y }
  }

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setActiveHandle(null)
    dragStart.current = null
  }

  return (
    <group position={[0, 0, 0.2]}>
      {/* Corner handles */}
      {corners.map(({ pos, x, y }) => (
        <group
          key={pos}
          position={[x, y, 0]}
          onPointerDown={(e) => handlePointerDown(e, pos)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
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
      {edges.map(({ pos, x, y }) => (
        <group
          key={pos}
          position={[x, y, 0]}
          onPointerDown={(e) => handlePointerDown(e, pos)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
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
          <LayerRenderer
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

