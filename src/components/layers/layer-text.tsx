"use client"

import { Text } from "@react-three/drei"
import * as THREE from "three"
import type { LayerText as LayerTextType } from "@/lib/types"

interface LayerTextProps {
  layer: LayerTextType
  artboardWidth: number
  artboardHeight: number
  zIndex: number
  isSelected: boolean
}

export function LayerText({
  layer,
  artboardWidth,
  artboardHeight,
  zIndex,
  isSelected,
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

      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[fontSize * settings.content.length * 0.6, fontSize * 1.2]} />
          <meshBasicMaterial
            color="#3b82f6"
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}
