"use client"

import { Canvas } from "@react-three/fiber"
import { Suspense, useRef } from "react"
import { CanvasCamera } from "./canvas-camera"
import { CanvasGrid } from "./canvas-grid"
import { ArtboardRenderer } from "../artboard/artboard-renderer"
import { useCanvasStore, useArtboards, useCanvasSettings } from "@/lib/store"

export function InfiniteCanvas() {
  const artboards = useArtboards()
  const canvasSettings = useCanvasSettings()
  const containerRef = useRef<HTMLDivElement>(null)
  const selectArtboard = useCanvasStore((state) => state.selectArtboard)

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ backgroundColor: canvasSettings.backgroundColor }}
    >
      <Canvas
        orthographic
        camera={{
          position: [0, 0, 100],
          zoom: 1,
          near: 0.1,
          far: 10000,
        }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
        }}
        dpr={[1, 2]}
        style={{ touchAction: "none" }}
        onPointerMissed={() => {
          // Deselect when clicking empty space
          selectArtboard(null)
        }}
      >
        <color attach="background" args={[canvasSettings.backgroundColor]} />
        <Suspense fallback={null}>
          <CanvasCamera />
          <CanvasGrid />

          {/* Render all artboards */}
          {artboards.map((artboard) => (
            <ArtboardRenderer key={artboard.id} artboard={artboard} />
          ))}
        </Suspense>
      </Canvas>
    </div>
  )
}
