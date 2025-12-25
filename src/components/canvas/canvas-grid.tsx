"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { useCanvasSettings } from "@/lib/store"

export function CanvasGrid() {
  const canvasSettings = useCanvasSettings()

  const dots = useMemo(() => {
    if (!canvasSettings.showGrid) return null

    const points: THREE.Vector3[] = []
    const range = 5000
    const spacing = canvasSettings.gridSize

    for (let x = -range; x <= range; x += spacing) {
      for (let y = -range; y <= range; y += spacing) {
        points.push(new THREE.Vector3(x, y, -0.1))
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.PointsMaterial({
      color: canvasSettings.gridColor,
      size: 2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.5,
    })

    return new THREE.Points(geometry, material)
  }, [canvasSettings.showGrid, canvasSettings.gridSize, canvasSettings.gridColor])

  if (!dots) return null

  return <primitive object={dots} renderOrder={-1} />
}
