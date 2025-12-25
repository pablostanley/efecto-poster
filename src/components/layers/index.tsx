"use client"

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

  // Handle layer click to select
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    selectLayer(layer.id)
  }

  // Common props for all layer types
  const commonProps = {
    artboardWidth: width,
    artboardHeight: height,
    zIndex,
    isSelected,
    onClick: handleClick,
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
