"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface MarqueeSelectionHandlerProps {
  enabled: boolean
  onSelectionEnd: (bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }) => void
}

export function MarqueeSelectionHandler({
  enabled,
  onSelectionEnd,
}: MarqueeSelectionHandlerProps) {
  const { gl, camera } = useThree()
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null)
  const meshRef = useRef<THREE.Mesh>(null)

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

  // Handle mouse down
  useEffect(() => {
    if (!enabled) return

    const handleMouseDown = (e: MouseEvent) => {
      // Only start marquee on left click with no modifiers on the canvas itself
      if (e.button !== 0 || e.target !== gl.domElement) return

      const worldPoint = screenToWorld(e.clientX, e.clientY)
      setStartPoint(worldPoint)
      setCurrentPoint(worldPoint)
      setIsSelecting(true)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isSelecting) return
      const worldPoint = screenToWorld(e.clientX, e.clientY)
      setCurrentPoint(worldPoint)
    }

    const handleMouseUp = () => {
      if (!isSelecting || !startPoint || !currentPoint) {
        setIsSelecting(false)
        return
      }

      // Calculate selection bounds
      const minX = Math.min(startPoint.x, currentPoint.x)
      const maxX = Math.max(startPoint.x, currentPoint.x)
      const minY = Math.min(startPoint.y, currentPoint.y)
      const maxY = Math.max(startPoint.y, currentPoint.y)

      // Only trigger selection if the marquee has some size
      const width = maxX - minX
      const height = maxY - minY

      if (width > 5 || height > 5) {
        onSelectionEnd({ minX, maxX, minY, maxY })
      }

      setIsSelecting(false)
      setStartPoint(null)
      setCurrentPoint(null)
    }

    window.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [enabled, isSelecting, startPoint, currentPoint, screenToWorld, gl, onSelectionEnd])

  // Don't render if not selecting
  if (!isSelecting || !startPoint || !currentPoint) return null

  // Calculate marquee dimensions
  const width = Math.abs(currentPoint.x - startPoint.x)
  const height = Math.abs(currentPoint.y - startPoint.y)
  const centerX = (startPoint.x + currentPoint.x) / 2
  const centerY = (startPoint.y + currentPoint.y) / 2

  return (
    <mesh ref={meshRef} position={[centerX, centerY, 100]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        color="#3b82f6"
        transparent
        opacity={0.1}
        side={THREE.DoubleSide}
      />
      {/* Border */}
      <lineSegments position={[0, 0, 0.01]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
        <lineBasicMaterial color="#3b82f6" linewidth={1} />
      </lineSegments>
    </mesh>
  )
}
