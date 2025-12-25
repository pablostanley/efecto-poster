"use client"

import { useEffect, useCallback } from "react"
import { useCanvasStore } from "./store"

export function useKeyboardShortcuts() {
  const selectedArtboardId = useCanvasStore((state) => state.editor.selectedArtboardId)
  const selectedLayerId = useCanvasStore((state) => state.editor.selectedLayerId)
  const artboards = useCanvasStore((state) => state.artboards)
  const deleteLayer = useCanvasStore((state) => state.deleteLayer)
  const deleteArtboard = useCanvasStore((state) => state.deleteArtboard)
  const duplicateLayer = useCanvasStore((state) => state.duplicateLayer)
  const duplicateArtboard = useCanvasStore((state) => state.duplicateArtboard)
  const selectArtboard = useCanvasStore((state) => state.selectArtboard)
  const selectLayer = useCanvasStore((state) => state.selectLayer)
  const updateLayer = useCanvasStore((state) => state.updateLayer)
  const undo = useCanvasStore((state) => state.undo)
  const redo = useCanvasStore((state) => state.redo)
  const saveToHistory = useCanvasStore((state) => state._saveToHistory)

  // Get the selected layer
  const selectedArtboard = artboards.find((a) => a.id === selectedArtboardId)
  const selectedLayer = selectedArtboard?.layers.find((l) => l.id === selectedLayerId)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      const isMeta = e.metaKey || e.ctrlKey
      const isShift = e.shiftKey

      // Cmd+Z - Undo
      if (isMeta && e.key === "z" && !isShift) {
        e.preventDefault()
        undo()
        return
      }

      // Cmd+Shift+Z or Cmd+Y - Redo
      if ((isMeta && e.key === "z" && isShift) || (isMeta && e.key === "y")) {
        e.preventDefault()
        redo()
        return
      }

      // Delete key - delete selected layer or artboard
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        saveToHistory()

        if (selectedLayerId && selectedArtboardId) {
          deleteLayer(selectedArtboardId, selectedLayerId)
        } else if (selectedArtboardId && !selectedLayerId) {
          deleteArtboard(selectedArtboardId)
        }
        return
      }

      // Escape - deselect all
      if (e.key === "Escape") {
        e.preventDefault()
        if (selectedLayerId) {
          selectLayer(null)
        } else if (selectedArtboardId) {
          selectArtboard(null)
        }
        return
      }

      // Cmd+D - duplicate
      if (isMeta && e.key === "d") {
        e.preventDefault()
        saveToHistory()

        if (selectedLayerId && selectedArtboardId) {
          duplicateLayer(selectedArtboardId, selectedLayerId)
        } else if (selectedArtboardId && !selectedLayerId) {
          duplicateArtboard(selectedArtboardId)
        }
        return
      }

      // Arrow keys - move selected layer
      if (
        (e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight") &&
        selectedLayer &&
        selectedArtboardId &&
        !selectedLayer.locked
      ) {
        e.preventDefault()

        const moveAmount = isShift ? 10 : 1 // Hold shift for larger moves
        let deltaX = 0
        let deltaY = 0

        switch (e.key) {
          case "ArrowUp":
            deltaY = moveAmount
            break
          case "ArrowDown":
            deltaY = -moveAmount
            break
          case "ArrowLeft":
            deltaX = -moveAmount
            break
          case "ArrowRight":
            deltaX = moveAmount
            break
        }

        updateLayer(selectedArtboardId, selectedLayerId!, {
          transform: {
            ...selectedLayer.transform,
            x: selectedLayer.transform.x + deltaX,
            y: selectedLayer.transform.y + deltaY,
          },
        })
        return
      }

      // Cmd+A - select all (select first artboard if none selected)
      if (isMeta && e.key === "a") {
        e.preventDefault()

        if (artboards.length > 0 && !selectedArtboardId) {
          selectArtboard(artboards[0].id)
        }
        return
      }

      // H - toggle layer visibility
      if (e.key === "h" && selectedLayerId && selectedArtboardId && selectedLayer) {
        e.preventDefault()
        saveToHistory()
        updateLayer(selectedArtboardId, selectedLayerId, {
          visible: !selectedLayer.visible,
        })
        return
      }

      // L - toggle layer lock
      if (e.key === "l" && selectedLayerId && selectedArtboardId && selectedLayer) {
        e.preventDefault()
        saveToHistory()
        updateLayer(selectedArtboardId, selectedLayerId, {
          locked: !selectedLayer.locked,
        })
        return
      }
    },
    [
      selectedArtboardId,
      selectedLayerId,
      selectedLayer,
      artboards,
      deleteLayer,
      deleteArtboard,
      duplicateLayer,
      duplicateArtboard,
      selectArtboard,
      selectLayer,
      updateLayer,
      undo,
      redo,
      saveToHistory,
    ]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])
}
