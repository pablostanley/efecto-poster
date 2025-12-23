"use client"

import { Canvas } from "@react-three/fiber"
import { Suspense, useCallback, useEffect, useRef } from "react"
import { CanvasCamera } from "./canvas-camera"
import { CanvasGrid } from "./canvas-grid"
import { ArtboardRenderer } from "../artboard/artboard-renderer"
import { useCanvasStore, useArtboards } from "@/lib/store"

export function InfiniteCanvas() {
  const artboards = useArtboards()
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className="w-full h-full bg-neutral-950">
      <Canvas
        orthographic
        camera={{
          position: [0, 0, 100],
          zoom: 0.5,
          near: 0.1,
          far: 10000,
        }}
        gl={{
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
        }}
        dpr={[1, 2]}
      >
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
