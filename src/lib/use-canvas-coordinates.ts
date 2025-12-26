"use client"

import { useCallback, useMemo } from "react"
import { useCanvasStore } from "./store"

/**
 * Hook for converting between world coordinates and screen coordinates.
 * Essential for positioning HTML overlays to match Three.js world positions.
 */
export function useCanvasCoordinates(canvasElement: HTMLCanvasElement | null) {
  const camera = useCanvasStore((state) => state.camera)

  /**
   * Convert world coordinates to screen coordinates
   * For orthographic camera:
   * screenX = (worldX - cameraX) * zoom + viewportWidth/2
   * screenY = viewportHeight/2 - (worldY - cameraY) * zoom (Y flipped)
   */
  const worldToScreen = useCallback(
    (worldX: number, worldY: number) => {
      if (!canvasElement) return { x: 0, y: 0 }

      const rect = canvasElement.getBoundingClientRect()

      const screenX =
        (worldX - camera.position[0]) * camera.zoom + rect.width / 2
      const screenY =
        rect.height / 2 - (worldY - camera.position[1]) * camera.zoom

      return { x: screenX, y: screenY }
    },
    [camera.position, camera.zoom, canvasElement]
  )

  /**
   * Convert screen coordinates to world coordinates
   * Inverse of worldToScreen
   */
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      if (!canvasElement) return { x: 0, y: 0 }

      const rect = canvasElement.getBoundingClientRect()

      const worldX =
        (screenX - rect.width / 2) / camera.zoom + camera.position[0]
      const worldY =
        camera.position[1] - (screenY - rect.height / 2) / camera.zoom

      return { x: worldX, y: worldY }
    },
    [camera.position, camera.zoom, canvasElement]
  )

  /**
   * Convert a screen-space delta (e.g., from drag) to world-space delta
   */
  const screenDeltaToWorld = useCallback(
    (deltaX: number, deltaY: number) => {
      return {
        x: deltaX / camera.zoom,
        y: -deltaY / camera.zoom, // Y is flipped
      }
    },
    [camera.zoom]
  )

  /**
   * Convert world dimensions to screen dimensions
   */
  const worldSizeToScreen = useCallback(
    (width: number, height: number) => {
      return {
        width: width * camera.zoom,
        height: height * camera.zoom,
      }
    },
    [camera.zoom]
  )

  /**
   * Convert screen dimensions to world dimensions
   */
  const screenSizeToWorld = useCallback(
    (width: number, height: number) => {
      return {
        width: width / camera.zoom,
        height: height / camera.zoom,
      }
    },
    [camera.zoom]
  )

  return useMemo(
    () => ({
      worldToScreen,
      screenToWorld,
      screenDeltaToWorld,
      worldSizeToScreen,
      screenSizeToWorld,
      zoom: camera.zoom,
      cameraPosition: camera.position,
    }),
    [
      worldToScreen,
      screenToWorld,
      screenDeltaToWorld,
      worldSizeToScreen,
      screenSizeToWorld,
      camera.zoom,
      camera.position,
    ]
  )
}
