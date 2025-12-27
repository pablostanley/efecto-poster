"use client"

import { useRef, useCallback } from "react"
import Moveable from "react-moveable"
import { useCanvasStore, useArtboards } from "@/lib/store"
import { useCanvasCoordinates } from "@/lib/use-canvas-coordinates"

interface ArtboardMoveableProps {
  artboardId: string
  canvasElement: HTMLCanvasElement
}

const SCALE_FACTOR = 1.0 // 1 artboard pixel = 1 world unit

/**
 * Moveable component for artboard resize operations.
 * Renders a ghost target div at the artboard's screen position
 * with react-moveable attached for resize handles.
 */
export function ArtboardMoveable({
  artboardId,
  canvasElement,
}: ArtboardMoveableProps) {
  const targetRef = useRef<HTMLDivElement>(null)
  const { worldToScreen, zoom } = useCanvasCoordinates(canvasElement)

  const artboards = useArtboards()
  const artboard = artboards.find((a) => a.id === artboardId)
  const updateArtboard = useCanvasStore((state) => state.updateArtboard)
  const saveToHistory = useCanvasStore((state) => state._saveToHistory)

  // Track original size for resize calculations
  const originalSize = useRef<{ width: number; height: number } | null>(null)

  if (!artboard) return null

  const { width, height } = artboard.size

  // Calculate screen position (center of artboard)
  const screenPos = worldToScreen(artboard.position[0], artboard.position[1])

  // Calculate screen dimensions
  const screenWidth = width * SCALE_FACTOR * zoom
  const screenHeight = height * SCALE_FACTOR * zoom

  return (
    <>
      {/* Ghost target div - positioned at artboard location */}
      <div
        ref={targetRef}
        className="artboard-moveable-target"
        style={{
          position: "absolute",
          left: screenPos.x - screenWidth / 2,
          top: screenPos.y - screenHeight / 2,
          width: screenWidth,
          height: screenHeight,
          pointerEvents: "none",
          // Debug border (remove in production)
          // border: "1px dashed red",
        }}
      />

      <Moveable
        target={targetRef}
        resizable={true}
        draggable={false} // Artboard dragging handled by existing Three.js system
        renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
        edge={false}
        keepRatio={false}
        throttleResize={0}
        onResizeStart={() => {
          saveToHistory()
          originalSize.current = { width, height }
        }}
        onResize={({ width: newScreenWidth, height: newScreenHeight }) => {
          if (!originalSize.current) return

          // Convert screen size to world/pixel size
          const newWidth = Math.max(100, Math.round(newScreenWidth / zoom / SCALE_FACTOR))
          const newHeight = Math.max(100, Math.round(newScreenHeight / zoom / SCALE_FACTOR))

          updateArtboard(artboardId, {
            size: { width: newWidth, height: newHeight },
          })
        }}
        onResizeEnd={() => {
          originalSize.current = null
        }}
      />
    </>
  )
}
