"use client"

import { useRef, useState } from "react"
import { ThreeEvent } from "@react-three/fiber"
import type { Layer, Artboard } from "@/lib/types"
import { useCanvasStore } from "@/lib/store"
import { LayerText } from "./layer-text"
import { Layer3D } from "./layer-3d"
import { LayerMedia } from "./layer-media"
import { LayerShader } from "./layer-shader"

interface LayerRendererProps {
  layer: Layer
  artboard: Artboard
  zIndex: number
  isSelected: boolean
}

export function LayerRenderer({
  layer,
  artboard,
  zIndex,
  isSelected,
}: LayerRendererProps) {
  const { width, height } = artboard.size
  const selectLayer = useCanvasStore((state) => state.selectLayer)
  const updateLayer = useCanvasStore((state) => state.updateLayer)

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragStart = useRef<{
    pointerX: number
    pointerY: number
    layerX: number
    layerY: number
  } | null>(null)

  // Handle layer click/pointer down
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (isResizing) return // Don't start drag if resizing
    e.stopPropagation()
    selectLayer(layer.id)

    // Start drag if not locked
    if (!layer.locked) {
      setIsDragging(true)
      dragStart.current = {
        pointerX: e.point.x,
        pointerY: e.point.y,
        layerX: layer.transform.x,
        layerY: layer.transform.y,
      }
    }
  }

  // Handle drag move
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !dragStart.current || layer.locked || isResizing) return
    e.stopPropagation()

    // Calculate delta in artboard coordinates
    // Since artboard is scaled by 0.1 when displayed, we need to scale back
    const scaleFactor = 0.1
    const deltaX = (e.point.x - dragStart.current.pointerX) / scaleFactor
    const deltaY = (e.point.y - dragStart.current.pointerY) / scaleFactor

    // Convert to percentage of artboard
    const deltaXPercent = (deltaX / width) * 100
    const deltaYPercent = (deltaY / height) * 100

    updateLayer(artboard.id, layer.id, {
      transform: {
        ...layer.transform,
        x: dragStart.current.layerX + deltaXPercent,
        y: dragStart.current.layerY + deltaYPercent,
      },
    })
  }

  // Handle drag end
  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setIsDragging(false)
    dragStart.current = null
  }

  // Handle resize
  const handleResize = (deltaScale: number) => {
    if (layer.locked) return
    const newScale = Math.max(0.1, layer.transform.scale + deltaScale)
    updateLayer(artboard.id, layer.id, {
      transform: {
        ...layer.transform,
        scale: newScale,
      },
    })
  }

  // Common props for all layer types
  const commonProps = {
    artboardWidth: width,
    artboardHeight: height,
    zIndex,
    isSelected,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onResize: handleResize,
    onResizeStart: () => setIsResizing(true),
    onResizeEnd: () => setIsResizing(false),
  }

  switch (layer.type) {
    case "text":
      return <LayerText layer={layer} {...commonProps} />
    case "3d":
      return <Layer3D layer={layer} {...commonProps} />
    case "media":
      return <LayerMedia layer={layer} {...commonProps} />
    case "shader":
      return <LayerShader layer={layer} {...commonProps} />
    default:
      return null
  }
}

export { LayerText } from "./layer-text"
export { Layer3D } from "./layer-3d"
export { LayerMedia } from "./layer-media"
export { LayerShader } from "./layer-shader"
