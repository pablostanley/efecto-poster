"use client"

import { useCanvasStore, useArtboards, useSelectedArtboard } from "@/lib/store"
import { ArtboardMoveable } from "./artboard-moveable"
import { LayerMoveable } from "./layer-moveable"

interface MoveableOverlayProps {
  canvasElement: HTMLCanvasElement | null
}

/**
 * HTML overlay container for react-moveable selection/transform handles.
 * Renders as a sibling to the R3F Canvas (not inside it).
 * Positions are calculated using worldToScreen coordinate conversion.
 */
export function MoveableOverlay({ canvasElement }: MoveableOverlayProps) {
  const selectedArtboardId = useCanvasStore(
    (state) => state.editor.selectedArtboardId
  )
  const selectedLayerIds = useCanvasStore(
    (state) => state.editor.selectedLayerIds
  )
  const selectedArtboard = useSelectedArtboard()

  // Don't render if no canvas element yet
  if (!canvasElement) return null

  // Determine what to show:
  // - If layers are selected: show LayerMoveable
  // - If only artboard is selected (no layers): show ArtboardMoveable
  const showArtboardHandles =
    selectedArtboardId && selectedLayerIds.length === 0
  const showLayerHandles =
    selectedArtboardId && selectedLayerIds.length > 0 && selectedArtboard

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 10 }}
    >
      {/* Artboard resize handles */}
      {showArtboardHandles && (
        <ArtboardMoveable
          artboardId={selectedArtboardId}
          canvasElement={canvasElement}
        />
      )}

      {/* Layer transform handles */}
      {showLayerHandles && (
        <LayerMoveable
          artboard={selectedArtboard}
          layerIds={selectedLayerIds}
          canvasElement={canvasElement}
        />
      )}
    </div>
  )
}
