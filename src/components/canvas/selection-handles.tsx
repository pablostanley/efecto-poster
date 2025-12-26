"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { useThree, ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"

interface SelectionHandlesProps {
  width: number
  height: number
  position: [number, number, number]
  isSelected: boolean
  onResizeStart?: () => void
  onResize?: (deltaWidth: number, deltaHeight: number) => void
  onResizeEnd?: () => void
}

type HandlePosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top"
  | "bottom"
  | "left"
  | "right"

const HANDLE_SIZE = 8
const BORDER_COLOR = "#3b82f6"
const HANDLE_COLOR = "#ffffff"

export function SelectionHandles({
  width,
  height,
  position,
  isSelected,
  onResizeStart,
  onResize,
  onResizeEnd,
}: SelectionHandlesProps) {
  const { gl, camera } = useThree()
  const [draggingHandle, setDraggingHandle] = useState<HandlePosition | null>(null)
  const dragStartScreen = useRef<{ x: number; y: number } | null>(null)
  const originalSize = useRef<{ width: number; height: number } | null>(null)

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((screenX - rect.left) / rect.width) * 2 - 1
      const y = -((screenY - rect.top) / rect.height) * 2 + 1

      const vec = new THREE.Vector3(x, y, 0)
      vec.unproject(camera)

      return { x: vec.x, y: vec.y }
    },
    [camera, gl]
  )

  // Handle resize drag
  useEffect(() => {
    if (!draggingHandle || !dragStartScreen.current || !originalSize.current) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartScreen.current || !originalSize.current) return

      const currentWorld = screenToWorld(e.clientX, e.clientY)
      const startWorld = screenToWorld(dragStartScreen.current.x, dragStartScreen.current.y)

      const deltaX = currentWorld.x - startWorld.x
      const deltaY = currentWorld.y - startWorld.y

      let deltaWidth = 0
      let deltaHeight = 0

      switch (draggingHandle) {
        case "top-right":
          deltaWidth = deltaX * 2
          deltaHeight = deltaY * 2
          break
        case "bottom-right":
          deltaWidth = deltaX * 2
          deltaHeight = -deltaY * 2
          break
        case "bottom-left":
          deltaWidth = -deltaX * 2
          deltaHeight = -deltaY * 2
          break
        case "top-left":
          deltaWidth = -deltaX * 2
          deltaHeight = deltaY * 2
          break
        case "right":
          deltaWidth = deltaX * 2
          break
        case "left":
          deltaWidth = -deltaX * 2
          break
        case "top":
          deltaHeight = deltaY * 2
          break
        case "bottom":
          deltaHeight = -deltaY * 2
          break
      }

      onResize?.(deltaWidth, deltaHeight)
    }

    const handleMouseUp = () => {
      setDraggingHandle(null)
      dragStartScreen.current = null
      originalSize.current = null
      gl.domElement.style.cursor = "default"
      onResizeEnd?.()
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [draggingHandle, screenToWorld, gl, onResize, onResizeEnd])

  if (!isSelected) return null

  const handlePointerDown = (handlePos: HandlePosition) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setDraggingHandle(handlePos)
    dragStartScreen.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
    originalSize.current = { width, height }
    onResizeStart?.()

    // Set cursor based on handle position
    const cursorMap: Record<HandlePosition, string> = {
      "top-left": "nwse-resize",
      "top-right": "nesw-resize",
      "bottom-left": "nesw-resize",
      "bottom-right": "nwse-resize",
      top: "ns-resize",
      bottom: "ns-resize",
      left: "ew-resize",
      right: "ew-resize",
    }
    gl.domElement.style.cursor = cursorMap[handlePos]
  }

  const halfWidth = width / 2
  const halfHeight = height / 2

  // Handle positions
  const handles: { pos: HandlePosition; x: number; y: number }[] = [
    { pos: "top-left", x: -halfWidth, y: halfHeight },
    { pos: "top-right", x: halfWidth, y: halfHeight },
    { pos: "bottom-left", x: -halfWidth, y: -halfHeight },
    { pos: "bottom-right", x: halfWidth, y: -halfHeight },
    { pos: "top", x: 0, y: halfHeight },
    { pos: "bottom", x: 0, y: -halfHeight },
    { pos: "left", x: -halfWidth, y: 0 },
    { pos: "right", x: halfWidth, y: 0 },
  ]

  return (
    <group position={position}>
      {/* Selection border */}
      <lineSegments position={[0, 0, 0.1]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
        <lineBasicMaterial color={BORDER_COLOR} linewidth={2} />
      </lineSegments>

      {/* Resize handles */}
      {handles.map(({ pos, x, y }) => (
        <mesh
          key={pos}
          position={[x, y, 0.2]}
          onPointerDown={handlePointerDown(pos)}
          onPointerOver={() => {
            if (!draggingHandle) {
              const cursorMap: Record<HandlePosition, string> = {
                "top-left": "nwse-resize",
                "top-right": "nesw-resize",
                "bottom-left": "nesw-resize",
                "bottom-right": "nwse-resize",
                top: "ns-resize",
                bottom: "ns-resize",
                left: "ew-resize",
                right: "ew-resize",
              }
              gl.domElement.style.cursor = cursorMap[pos]
            }
          }}
          onPointerOut={() => {
            if (!draggingHandle) {
              gl.domElement.style.cursor = "default"
            }
          }}
        >
          <circleGeometry args={[HANDLE_SIZE / 2, 16]} />
          <meshBasicMaterial color={HANDLE_COLOR} />
          {/* Handle border */}
          <lineLoop position={[0, 0, 0.01]}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={17}
                array={new Float32Array(
                  Array.from({ length: 17 }, (_, i) => {
                    const angle = (i / 16) * Math.PI * 2
                    return [
                      Math.cos(angle) * (HANDLE_SIZE / 2),
                      Math.sin(angle) * (HANDLE_SIZE / 2),
                      0,
                    ]
                  }).flat()
                )}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color={BORDER_COLOR} />
          </lineLoop>
        </mesh>
      ))}
    </group>
  )
}
