"use client"

import { useRef, useMemo, useCallback } from "react"
import Moveable from "react-moveable"
import { useCanvasStore } from "@/lib/store"
import { useCanvasCoordinates } from "@/lib/use-canvas-coordinates"
import type { Artboard, Layer } from "@/lib/types"

interface LayerMoveableProps {
  artboard: Artboard
  layerIds: string[]
  canvasElement: HTMLCanvasElement
}

const SCALE_FACTOR = 1.0

/**
 * Get the base dimensions for a layer type (before scale is applied)
 */
function getLayerBaseDimensions(
  layer: Layer,
  artboard: Artboard
): { width: number; height: number } {
  switch (layer.type) {
    case "3d":
      return { width: 150, height: 150 }
    case "text":
      return { width: 200, height: 60 }
    case "shader":
      return { width: artboard.size.width, height: artboard.size.height }
    case "media":
      return {
        width: artboard.size.width * 0.8,
        height: artboard.size.height * 0.8,
      }
    default:
      return { width: 100, height: 100 }
  }
}

/**
 * Calculate bounding box for multiple layers
 */
function calculateBoundingBox(
  layers: Layer[],
  artboard: Artboard
): {
  centerX: number
  centerY: number
  width: number
  height: number
  minX: number
  minY: number
} {
  if (layers.length === 0) {
    return { centerX: 0, centerY: 0, width: 0, height: 0, minX: 0, minY: 0 }
  }

  let minX = Infinity,
    maxX = -Infinity
  let minY = Infinity,
    maxY = -Infinity

  layers.forEach((layer) => {
    const { x, y, scale } = layer.transform
    const baseDims = getLayerBaseDimensions(layer, artboard)

    // Layer dimensions in world units
    const halfW = (baseDims.width * scale * SCALE_FACTOR) / 2
    const halfH = (baseDims.height * scale * SCALE_FACTOR) / 2

    // Layer center in world units (relative to artboard center)
    const worldX =
      (x / 100) * artboard.size.width * SCALE_FACTOR
    const worldY =
      (y / 100) * artboard.size.height * SCALE_FACTOR

    // TODO: Account for rotation when calculating bounds
    minX = Math.min(minX, worldX - halfW)
    maxX = Math.max(maxX, worldX + halfW)
    minY = Math.min(minY, worldY - halfH)
    maxY = Math.max(maxY, worldY + halfH)
  })

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
    minX,
    minY,
  }
}

/**
 * Moveable component for layer transform operations.
 * Supports drag, resize, and rotate (single selection only).
 * For multi-selection, shows a bounding box around all selected layers.
 */
export function LayerMoveable({
  artboard,
  layerIds,
  canvasElement,
}: LayerMoveableProps) {
  const targetRef = useRef<HTMLDivElement>(null)
  const { worldToScreen, screenDeltaToWorld, zoom } =
    useCanvasCoordinates(canvasElement)

  const updateLayer = useCanvasStore((state) => state.updateLayer)
  const saveToHistory = useCanvasStore((state) => state._saveToHistory)

  // Get selected layers
  const selectedLayers = useMemo(
    () => artboard.layers.filter((l) => layerIds.includes(l.id)),
    [artboard.layers, layerIds]
  )

  // Store initial positions/scales for transforms
  const initialState = useRef<
    Map<string, { x: number; y: number; scale: number; rotation: number }>
  >(new Map())
  const initialBounds = useRef<{ width: number; height: number } | null>(null)

  // Calculate bounding box
  const bounds = useMemo(
    () => calculateBoundingBox(selectedLayers, artboard),
    [selectedLayers, artboard]
  )

  // For single selection, get the layer directly
  const singleLayer = selectedLayers.length === 1 ? selectedLayers[0] : null

  if (selectedLayers.length === 0) return null

  // Calculate screen position
  // Bounds center is relative to artboard center, so add artboard position
  const worldCenterX = artboard.position[0] + bounds.centerX
  const worldCenterY = artboard.position[1] + bounds.centerY
  const screenPos = worldToScreen(worldCenterX, worldCenterY)

  // Calculate screen dimensions
  const screenWidth = bounds.width * zoom
  const screenHeight = bounds.height * zoom

  // For single selection, apply rotation to the target
  const rotation = singleLayer ? singleLayer.transform.rotation : 0

  // Save initial state before transforms
  const saveInitialState = useCallback(() => {
    saveToHistory()
    initialState.current = new Map(
      selectedLayers.map((l) => [
        l.id,
        {
          x: l.transform.x,
          y: l.transform.y,
          scale: l.transform.scale,
          rotation: l.transform.rotation,
        },
      ])
    )
    initialBounds.current = { width: screenWidth, height: screenHeight }
  }, [selectedLayers, screenWidth, screenHeight, saveToHistory])

  return (
    <>
      {/* Ghost target div - positioned at selection bounds */}
      <div
        ref={targetRef}
        className="layer-moveable-target"
        style={{
          position: "absolute",
          left: screenPos.x - screenWidth / 2,
          top: screenPos.y - screenHeight / 2,
          width: screenWidth,
          height: screenHeight,
          pointerEvents: "none",
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center center",
        }}
      />

      <Moveable
        target={targetRef}
        draggable={true}
        resizable={true}
        rotatable={selectedLayers.length === 1}
        renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
        throttleDrag={0}
        throttleResize={0}
        throttleRotate={0}
        rotationPosition="top"
        // Drag handlers
        onDragStart={saveInitialState}
        onDrag={({ beforeTranslate }) => {
          // Convert screen delta to world delta
          const worldDelta = screenDeltaToWorld(
            beforeTranslate[0],
            beforeTranslate[1]
          )

          // Convert world delta to percentage of artboard
          const percentDeltaX =
            (worldDelta.x / (artboard.size.width * SCALE_FACTOR)) * 100
          const percentDeltaY =
            (worldDelta.y / (artboard.size.height * SCALE_FACTOR)) * 100

          // Update each selected layer
          selectedLayers.forEach((layer) => {
            const initial = initialState.current.get(layer.id)
            if (!initial) return

            updateLayer(artboard.id, layer.id, {
              transform: {
                ...layer.transform,
                x: initial.x + percentDeltaX,
                y: initial.y + percentDeltaY,
              },
            })
          })
        }}
        onDragEnd={() => {
          initialState.current.clear()
        }}
        // Resize handlers
        onResizeStart={saveInitialState}
        onResize={({ width: newWidth, height: newHeight }) => {
          if (!initialBounds.current) return

          // Calculate scale ratio from the resize
          const scaleRatioX = newWidth / initialBounds.current.width
          const scaleRatioY = newHeight / initialBounds.current.height
          // Use average for uniform scaling
          const scaleRatio = (scaleRatioX + scaleRatioY) / 2

          // Update each selected layer's scale
          selectedLayers.forEach((layer) => {
            const initial = initialState.current.get(layer.id)
            if (!initial) return

            const newScale = Math.max(0.1, initial.scale * scaleRatio)
            updateLayer(artboard.id, layer.id, {
              transform: {
                ...layer.transform,
                scale: newScale,
              },
            })
          })
        }}
        onResizeEnd={() => {
          initialState.current.clear()
          initialBounds.current = null
        }}
        // Rotate handlers (single selection only)
        onRotateStart={saveInitialState}
        onRotate={({ beforeRotate }) => {
          if (selectedLayers.length !== 1) return
          const layer = selectedLayers[0]
          const initial = initialState.current.get(layer.id)
          if (!initial) return

          updateLayer(artboard.id, layer.id, {
            transform: {
              ...layer.transform,
              rotation: beforeRotate,
            },
          })
        }}
        onRotateEnd={() => {
          initialState.current.clear()
        }}
      />
    </>
  )
}
