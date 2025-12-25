"use client"

import type { Layer, Artboard } from "@/lib/types"
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

  switch (layer.type) {
    case "text":
      return (
        <LayerText
          layer={layer}
          artboardWidth={width}
          artboardHeight={height}
          zIndex={zIndex}
          isSelected={isSelected}
        />
      )
    case "3d":
      return (
        <Layer3D
          layer={layer}
          artboardWidth={width}
          artboardHeight={height}
          zIndex={zIndex}
          isSelected={isSelected}
        />
      )
    case "media":
      return (
        <LayerMedia
          layer={layer}
          artboardWidth={width}
          artboardHeight={height}
          zIndex={zIndex}
          isSelected={isSelected}
        />
      )
    case "shader":
      return (
        <LayerShader
          layer={layer}
          artboardWidth={width}
          artboardHeight={height}
          zIndex={zIndex}
          isSelected={isSelected}
        />
      )
    default:
      return null
  }
}

export { LayerText } from "./layer-text"
export { Layer3D } from "./layer-3d"
export { LayerMedia } from "./layer-media"
export { LayerShader } from "./layer-shader"
