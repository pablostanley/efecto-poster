"use client"

import { useMemo } from "react"
import { useThree } from "@react-three/fiber"
import * as THREE from "three"

interface CanvasGridProps {
  size?: number
  divisions?: number
  color?: string
  opacity?: number
}

export function CanvasGrid({
  size = 10000,
  divisions = 100,
  color = "#333333",
  opacity = 0.3,
}: CanvasGridProps) {
  const { camera } = useThree()

  const gridHelper = useMemo(() => {
    const grid = new THREE.GridHelper(size, divisions, color, color)
    grid.rotation.x = Math.PI / 2 // Rotate to XY plane
    grid.material.opacity = opacity
    grid.material.transparent = true
    grid.material.depthWrite = false
    grid.renderOrder = -1 // Render behind everything
    return grid
  }, [size, divisions, color, opacity])

  return <primitive object={gridHelper} />
}

// Dot pattern alternative for a cleaner look
export function CanvasDotGrid({
  spacing = 50,
  dotSize = 1.5,
  color = "#444444",
}: {
  spacing?: number
  dotSize?: number
  color?: string
}) {
  const dots = useMemo(() => {
    const points: THREE.Vector3[] = []
    const range = 5000

    for (let x = -range; x <= range; x += spacing) {
      for (let y = -range; y <= range; y += spacing) {
        points.push(new THREE.Vector3(x, y, 0))
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.PointsMaterial({
      color,
      size: dotSize,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.5,
    })

    return new THREE.Points(geometry, material)
  }, [spacing, dotSize, color])

  return <primitive object={dots} renderOrder={-1} />
}
