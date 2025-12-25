"use client"

import { useState, useRef } from "react"
import { ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"

interface LayerHandlesProps {
  width: number
  height: number
  isSelected: boolean
  onResize?: (deltaScale: number, corner: string) => void
  onResizeStart?: () => void
  onResizeEnd?: () => void
}

type HandlePosition = "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r"

export function LayerHandles({
  width,
  height,
  isSelected,
  onResize,
  onResizeStart,
  onResizeEnd,
}: LayerHandlesProps) {
  const [activeHandle, setActiveHandle] = useState<HandlePosition | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  if (!isSelected) return null

  const handleSize = 8
  const handleColor = "#3b82f6"

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
    onResizeStart?.()
  }

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!activeHandle || !dragStart.current) return
    e.stopPropagation()

    const deltaX = e.point.x - dragStart.current.x
    const deltaY = e.point.y - dragStart.current.y

    // Calculate scale change based on handle position and drag direction
    let deltaScale = 0
    switch (activeHandle) {
      case "br":
      case "tr":
        deltaScale = deltaX / width
        break
      case "bl":
      case "tl":
        deltaScale = -deltaX / width
        break
      case "r":
        deltaScale = deltaX / width
        break
      case "l":
        deltaScale = -deltaX / width
        break
      case "t":
        deltaScale = deltaY / height
        break
      case "b":
        deltaScale = -deltaY / height
        break
    }

    onResize?.(deltaScale, activeHandle)
    dragStart.current = { x: e.point.x, y: e.point.y }
  }

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setActiveHandle(null)
    dragStart.current = null
    onResizeEnd?.()
  }

  return (
    <group position={[0, 0, 0.5]}>
      {/* Selection border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
        <lineBasicMaterial color={handleColor} />
      </lineSegments>

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
          {/* Handle background */}
          <mesh>
            <planeGeometry args={[handleSize, handleSize]} />
            <meshBasicMaterial color={handleColor} />
          </mesh>
          {/* Handle inner (white) */}
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[handleSize - 2, handleSize - 2]} />
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
          {/* Handle background */}
          <mesh>
            <planeGeometry args={[handleSize * 0.75, handleSize * 0.75]} />
            <meshBasicMaterial color={handleColor} />
          </mesh>
          {/* Handle inner (white) */}
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[handleSize * 0.75 - 2, handleSize * 0.75 - 2]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
