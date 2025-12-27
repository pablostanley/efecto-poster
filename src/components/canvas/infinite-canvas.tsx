"use client"

import { Canvas, ThreeEvent, useThree } from "@react-three/fiber"
import { Suspense, useRef, useState, useCallback, useEffect } from "react"
import * as THREE from "three"
import { CanvasCamera } from "./canvas-camera"
import { CanvasGrid } from "./canvas-grid"
import { CanvasContextMenu } from "./canvas-context-menu"
import { MarqueeSelectionHandler } from "./marquee-selection-handler"
import { MoveableOverlay } from "./moveable-overlay"
import { ArtboardRenderer } from "../artboard/artboard-renderer"
import { useCanvasStore, useArtboards, useCanvasSettings } from "@/lib/store"

/**
 * Helper component to extract the canvas DOM element from R3F context.
 * Must be rendered inside Canvas.
 */
function CanvasRefExtractor({
  onRef,
}: {
  onRef: (element: HTMLCanvasElement) => void
}) {
  const { gl } = useThree()
  useEffect(() => {
    onRef(gl.domElement)
  }, [gl, onRef])
  return null
}

interface ContextMenuState {
  x: number
  y: number
  type: "layer" | "artboard" | null
}

export function InfiniteCanvas() {
  const artboards = useArtboards()
  const canvasSettings = useCanvasSettings()
  const containerRef = useRef<HTMLDivElement>(null)
  const selectArtboard = useCanvasStore((state) => state.selectArtboard)
  const selectLayer = useCanvasStore((state) => state.selectLayer)
  const selectLayers = useCanvasStore((state) => state.selectLayers)
  const selectedArtboardId = useCanvasStore((state) => state.editor.selectedArtboardId)
  const selectedLayerIds = useCanvasStore((state) => state.editor.selectedLayerIds)
  const tool = useCanvasStore((state) => state.editor.tool)

  // Canvas element for coordinate conversions in moveable overlay
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()

    // Determine what type of context menu to show based on selection
    let menuType: "layer" | "artboard" | null = null

    if (selectedLayerIds.length > 0) {
      menuType = "layer"
    } else if (selectedArtboardId) {
      menuType = "artboard"
    }

    if (menuType) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: menuType,
      })
    }
  }, [selectedArtboardId, selectedLayerIds])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Handle selection of artboards from marquee
  const handleMarqueeSelection = useCallback((bounds: { minX: number; maxX: number; minY: number; maxY: number }) => {
    // Find artboards within the selection bounds
    const scaleFactor = 1.0 // Same as in artboard-renderer

    for (const artboard of artboards) {
      const artboardX = artboard.position[0]
      const artboardY = artboard.position[1]
      const halfWidth = (artboard.size.width * scaleFactor) / 2
      const halfHeight = (artboard.size.height * scaleFactor) / 2

      const artboardMinX = artboardX - halfWidth
      const artboardMaxX = artboardX + halfWidth
      const artboardMinY = artboardY - halfHeight
      const artboardMaxY = artboardY + halfHeight

      // Check if artboard intersects with selection
      const intersects = !(
        artboardMaxX < bounds.minX ||
        artboardMinX > bounds.maxX ||
        artboardMaxY < bounds.minY ||
        artboardMinY > bounds.maxY
      )

      if (intersects) {
        selectArtboard(artboard.id)
        selectLayer(null)
        return // Select first intersecting artboard
      }
    }

    // No artboard found - deselect all
    selectArtboard(null)
    selectLayer(null)
  }, [artboards, selectArtboard, selectLayer])

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ backgroundColor: canvasSettings.backgroundColor }}
      onContextMenu={handleContextMenu}
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
          // Deselect when clicking empty space (only fires on quick clicks)
          selectArtboard(null)
          selectLayer(null)
          handleCloseContextMenu()
        }}
      >
        {/* Extract canvas DOM element for moveable overlay */}
        <CanvasRefExtractor onRef={setCanvasElement} />

        <color attach="background" args={[canvasSettings.backgroundColor]} />
        <Suspense fallback={null}>
          <CanvasCamera />
          <CanvasGrid />

          {/* Marquee selection handler */}
          <MarqueeSelectionHandler
            enabled={tool === "select"}
            onSelectionEnd={handleMarqueeSelection}
          />

          {/* Render all artboards */}
          {artboards.map((artboard) => (
            <ArtboardRenderer key={artboard.id} artboard={artboard} />
          ))}
        </Suspense>
      </Canvas>

      {/* Moveable overlay for selection/transform handles (HTML-based, zoom-invariant) */}
      <MoveableOverlay canvasElement={canvasElement} />

      {/* Context Menu overlay */}
      <CanvasContextMenu contextMenu={contextMenu} onClose={handleCloseContextMenu} />
    </div>
  )
}
