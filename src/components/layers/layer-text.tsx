"use client"

import { Text } from "@react-three/drei"
import { ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"
import type { LayerText as LayerTextType } from "@/lib/types"
import { LayerHandles } from "./layer-handles"

interface LayerTextProps {
  layer: LayerTextType
  artboardWidth: number
  artboardHeight: number
  zIndex: number
  isSelected: boolean
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void
  onPointerUp?: (e: ThreeEvent<PointerEvent>) => void
  onResize?: (deltaScale: number, corner: string) => void
  onResizeStart?: () => void
  onResizeEnd?: () => void
}

export function LayerText({
  layer,
  artboardWidth,
  artboardHeight,
  zIndex,
  isSelected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onResize,
  onResizeStart,
  onResizeEnd,
}: LayerTextProps) {
  const { transform, settings, opacity } = layer

  // Position based on transform (percentage of artboard)
  const x = (transform.x / 100) * artboardWidth
  const y = (transform.y / 100) * artboardHeight

  // Calculate font size based on artboard height (percentage)
  const fontSize = (settings.fontSize / 100) * artboardHeight

  // Text anchor based on alignment
  const anchorX = settings.textAlign === "left" ? "left" : settings.textAlign === "right" ? "right" : "center"

  return (
    <group
      position={[x, y, zIndex * 0.1]}
      rotation={[0, 0, (transform.rotation * Math.PI) / 180]}
      scale={[transform.scale, transform.scale, 1]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <Text
        font="/fonts/Inter-Regular.woff"
        fontSize={fontSize}
        color={settings.color}
        anchorX={anchorX}
        anchorY="middle"
        textAlign={settings.textAlign}
        letterSpacing={settings.letterSpacing}
        lineHeight={settings.lineHeight}
        maxWidth={artboardWidth * 0.9}
        material-transparent
        material-opacity={opacity}
        material-depthWrite={false}
      >
        {settings.content}
      </Text>

      {/* Resize handles */}
      <LayerHandles
        width={fontSize * settings.content.length * 0.6}
        height={fontSize * 1.4}
        isSelected={isSelected}
        onResize={onResize}
        onResizeStart={onResizeStart}
        onResizeEnd={onResizeEnd}
      />
    </group>
  )
}
