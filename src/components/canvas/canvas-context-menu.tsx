"use client"

import { useEffect, useRef } from "react"
import { useCanvasStore, useSelectedArtboard } from "@/lib/store"
import {
  Copy,
  Trash,
  Eye,
  EyeSlash,
  Lock,
  LockOpen,
  ClipboardText,
  CopySimple,
} from "@phosphor-icons/react"

interface ContextMenuState {
  x: number
  y: number
  type: "layer" | "artboard" | null
}

interface CanvasContextMenuProps {
  contextMenu: ContextMenuState | null
  onClose: () => void
}

export function CanvasContextMenu({ contextMenu, onClose }: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const selectedArtboard = useSelectedArtboard()
  const selectedLayerIds = useCanvasStore((state) => state.editor.selectedLayerIds)
  const deleteLayer = useCanvasStore((state) => state.deleteLayer)
  const deleteLayers = useCanvasStore((state) => state.deleteLayers)
  const deleteArtboard = useCanvasStore((state) => state.deleteArtboard)
  const duplicateLayer = useCanvasStore((state) => state.duplicateLayer)
  const duplicateLayers = useCanvasStore((state) => state.duplicateLayers)
  const duplicateArtboard = useCanvasStore((state) => state.duplicateArtboard)
  const copyLayer = useCanvasStore((state) => state.copyLayer)
  const copyLayers = useCanvasStore((state) => state.copyLayers)
  const pasteLayer = useCanvasStore((state) => state.pasteLayer)
  const pasteLayers = useCanvasStore((state) => state.pasteLayers)
  const updateLayer = useCanvasStore((state) => state.updateLayer)
  const saveToHistory = useCanvasStore((state) => state._saveToHistory)
  const clipboard = useCanvasStore((state) => state._clipboard)

  // Find the selected layers
  const selectedLayers = selectedArtboard?.layers.filter((l) => selectedLayerIds.includes(l.id)) ?? []
  const hasMultipleSelected = selectedLayers.length > 1
  const firstSelectedLayer = selectedLayers[0]

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  if (!contextMenu) return null

  const handleCopy = () => {
    if (selectedArtboard && selectedLayerIds.length > 0) {
      copyLayers(selectedArtboard.id, selectedLayerIds)
    }
    onClose()
  }

  const handlePaste = () => {
    if (selectedArtboard) {
      saveToHistory()
      pasteLayers(selectedArtboard.id)
    }
    onClose()
  }

  const handleDuplicate = () => {
    saveToHistory()
    if (contextMenu.type === "layer" && selectedArtboard && selectedLayerIds.length > 0) {
      duplicateLayers(selectedArtboard.id, selectedLayerIds)
    } else if (contextMenu.type === "artboard" && selectedArtboard) {
      duplicateArtboard(selectedArtboard.id)
    }
    onClose()
  }

  const handleDelete = () => {
    saveToHistory()
    if (contextMenu.type === "layer" && selectedArtboard && selectedLayerIds.length > 0) {
      deleteLayers(selectedArtboard.id, selectedLayerIds)
    } else if (contextMenu.type === "artboard" && selectedArtboard) {
      deleteArtboard(selectedArtboard.id)
    }
    onClose()
  }

  const handleToggleVisibility = () => {
    if (selectedArtboard && selectedLayers.length > 0) {
      saveToHistory()
      const newVisibility = !firstSelectedLayer.visible
      selectedLayers.forEach((layer) => {
        updateLayer(selectedArtboard.id, layer.id, {
          visible: newVisibility,
        })
      })
    }
    onClose()
  }

  const handleToggleLock = () => {
    if (selectedArtboard && selectedLayers.length > 0) {
      saveToHistory()
      const newLocked = !firstSelectedLayer.locked
      selectedLayers.forEach((layer) => {
        updateLayer(selectedArtboard.id, layer.id, {
          locked: newLocked,
        })
      })
    }
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
      style={{
        left: contextMenu.x,
        top: contextMenu.y,
      }}
    >
      {contextMenu.type === "layer" && firstSelectedLayer && (
        <>
          {/* Layer-specific actions */}
          <button
            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={handleCopy}
          >
            <Copy className="size-4" />
            {hasMultipleSelected ? `Copy ${selectedLayers.length} Layers` : "Copy"}
            <span className="ml-auto text-xs text-muted-foreground">Cmd+C</span>
          </button>
          <button
            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            onClick={handlePaste}
            disabled={clipboard.length === 0}
          >
            <ClipboardText className="size-4" />
            Paste
            <span className="ml-auto text-xs text-muted-foreground">Cmd+V</span>
          </button>
          <button
            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={handleDuplicate}
          >
            <CopySimple className="size-4" />
            {hasMultipleSelected ? `Duplicate ${selectedLayers.length} Layers` : "Duplicate"}
            <span className="ml-auto text-xs text-muted-foreground">Cmd+D</span>
          </button>

          <div className="bg-border -mx-1 my-1 h-px" />

          <button
            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={handleToggleVisibility}
          >
            {firstSelectedLayer.visible ? (
              <>
                <EyeSlash className="size-4" />
                {hasMultipleSelected ? "Hide Layers" : "Hide Layer"}
              </>
            ) : (
              <>
                <Eye className="size-4" />
                {hasMultipleSelected ? "Show Layers" : "Show Layer"}
              </>
            )}
            <span className="ml-auto text-xs text-muted-foreground">H</span>
          </button>
          <button
            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={handleToggleLock}
          >
            {firstSelectedLayer.locked ? (
              <>
                <LockOpen className="size-4" />
                {hasMultipleSelected ? "Unlock Layers" : "Unlock Layer"}
              </>
            ) : (
              <>
                <Lock className="size-4" />
                {hasMultipleSelected ? "Lock Layers" : "Lock Layer"}
              </>
            )}
            <span className="ml-auto text-xs text-muted-foreground">L</span>
          </button>

          <div className="bg-border -mx-1 my-1 h-px" />

          <button
            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash className="size-4" />
            {hasMultipleSelected ? `Delete ${selectedLayers.length} Layers` : "Delete"}
            <span className="ml-auto text-xs text-muted-foreground">Del</span>
          </button>
        </>
      )}

      {contextMenu.type === "artboard" && (
        <>
          {/* Artboard-specific actions */}
          <button
            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            onClick={handlePaste}
            disabled={clipboard.length === 0}
          >
            <ClipboardText className="size-4" />
            Paste Layer
            <span className="ml-auto text-xs text-muted-foreground">Cmd+V</span>
          </button>
          <button
            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={handleDuplicate}
          >
            <CopySimple className="size-4" />
            Duplicate Artboard
            <span className="ml-auto text-xs text-muted-foreground">Cmd+D</span>
          </button>

          <div className="bg-border -mx-1 my-1 h-px" />

          <button
            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash className="size-4" />
            Delete Artboard
            <span className="ml-auto text-xs text-muted-foreground">Del</span>
          </button>
        </>
      )}
    </div>
  )
}
