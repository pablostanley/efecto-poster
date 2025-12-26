"use client"

import { useEffect, useCallback, useRef } from "react"
import { useCanvasStore } from "./store"

export function useKeyboardShortcuts() {
  const selectedArtboardId = useCanvasStore((state) => state.editor.selectedArtboardId)
  const selectedLayerIds = useCanvasStore((state) => state.editor.selectedLayerIds)
  const artboards = useCanvasStore((state) => state.artboards)
  const currentTool = useCanvasStore((state) => state.editor.tool)

  // Track the tool before spacebar was pressed for hold-to-pan
  const previousToolRef = useRef<"select" | "pan" | "zoom" | null>(null)
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
  const selectArtboard = useCanvasStore((state) => state.selectArtboard)
  const selectLayer = useCanvasStore((state) => state.selectLayer)
  const selectAllLayers = useCanvasStore((state) => state.selectAllLayers)
  const clearSelection = useCanvasStore((state) => state.clearSelection)
  const updateLayer = useCanvasStore((state) => state.updateLayer)
  const updateLayers = useCanvasStore((state) => state.updateLayers)
  const undo = useCanvasStore((state) => state.undo)
  const redo = useCanvasStore((state) => state.redo)
  const saveToHistory = useCanvasStore((state) => state._saveToHistory)
  const zoom = useCanvasStore((state) => state.camera.zoom)
  const setCamera = useCanvasStore((state) => state.setCamera)
  const resetCamera = useCanvasStore((state) => state.resetCamera)
  const setTool = useCanvasStore((state) => state.setTool)

  // Get the selected layers
  const selectedArtboard = artboards.find((a) => a.id === selectedArtboardId)
  const selectedLayers = selectedArtboard?.layers.filter((l) => selectedLayerIds.includes(l.id)) ?? []
  const hasSelectedLayers = selectedLayerIds.length > 0

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

      // Delete key - delete selected layers or artboard
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        saveToHistory()

        if (hasSelectedLayers && selectedArtboardId) {
          // Delete all selected layers
          deleteLayers(selectedArtboardId, selectedLayerIds)
        } else if (selectedArtboardId && !hasSelectedLayers) {
          deleteArtboard(selectedArtboardId)
        }
        return
      }

      // Escape - deselect layers first, then artboard
      if (e.key === "Escape") {
        e.preventDefault()
        if (hasSelectedLayers) {
          clearSelection()
        } else if (selectedArtboardId) {
          selectArtboard(null)
        }
        return
      }

      // Cmd+D - duplicate
      if (isMeta && e.key === "d") {
        e.preventDefault()
        saveToHistory()

        if (hasSelectedLayers && selectedArtboardId) {
          // Duplicate all selected layers
          duplicateLayers(selectedArtboardId, selectedLayerIds)
        } else if (selectedArtboardId && !hasSelectedLayers) {
          duplicateArtboard(selectedArtboardId)
        }
        return
      }

      // Cmd+C - copy layers
      if (isMeta && e.key === "c") {
        e.preventDefault()
        if (hasSelectedLayers && selectedArtboardId) {
          copyLayers(selectedArtboardId, selectedLayerIds)
        }
        return
      }

      // Cmd+X - cut layers (copy + delete)
      if (isMeta && e.key === "x") {
        e.preventDefault()
        if (hasSelectedLayers && selectedArtboardId) {
          saveToHistory()
          copyLayers(selectedArtboardId, selectedLayerIds)
          deleteLayers(selectedArtboardId, selectedLayerIds)
        }
        return
      }

      // Cmd+V - paste layers
      if (isMeta && e.key === "v") {
        e.preventDefault()
        if (selectedArtboardId) {
          saveToHistory()
          pasteLayers(selectedArtboardId)
        }
        return
      }

      // Arrow keys - move all selected layers
      if (
        (e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight") &&
        hasSelectedLayers &&
        selectedArtboardId
      ) {
        // Check if any unlocked layers are selected
        const unlockedLayers = selectedLayers.filter((l) => !l.locked)
        if (unlockedLayers.length === 0) return

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

        // Move all unlocked selected layers
        unlockedLayers.forEach((layer) => {
          updateLayer(selectedArtboardId, layer.id, {
            transform: {
              ...layer.transform,
              x: layer.transform.x + deltaX,
              y: layer.transform.y + deltaY,
            },
          })
        })
        return
      }

      // Cmd+A - select all layers in artboard
      if (isMeta && e.key === "a") {
        e.preventDefault()

        if (selectedArtboardId) {
          // Select all layers in current artboard
          selectAllLayers(selectedArtboardId)
        } else if (artboards.length > 0) {
          // Select first artboard if none selected
          selectArtboard(artboards[0].id)
        }
        return
      }

      // H - toggle visibility for all selected layers
      if (e.key === "h" && hasSelectedLayers && selectedArtboardId) {
        e.preventDefault()
        saveToHistory()
        // Toggle based on first layer's state
        const firstLayer = selectedLayers[0]
        const newVisibility = !firstLayer.visible
        selectedLayers.forEach((layer) => {
          updateLayer(selectedArtboardId, layer.id, {
            visible: newVisibility,
          })
        })
        return
      }

      // L - toggle lock for all selected layers
      if (e.key === "l" && hasSelectedLayers && selectedArtboardId) {
        e.preventDefault()
        saveToHistory()
        // Toggle based on first layer's state
        const firstLayer = selectedLayers[0]
        const newLocked = !firstLayer.locked
        selectedLayers.forEach((layer) => {
          updateLayer(selectedArtboardId, layer.id, {
            locked: newLocked,
          })
        })
        return
      }

      // Zoom shortcuts
      const zoomLevels = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]
      const currentZoom = zoom

      // + or = to zoom in
      if (e.key === "+" || e.key === "=") {
        e.preventDefault()
        const nextLevel = zoomLevels.find((level) => level > currentZoom) || zoomLevels[zoomLevels.length - 1]
        setCamera({ zoom: nextLevel })
        return
      }

      // - to zoom out
      if (e.key === "-") {
        e.preventDefault()
        const prevLevel = [...zoomLevels].reverse().find((level) => level < currentZoom) || zoomLevels[0]
        setCamera({ zoom: prevLevel })
        return
      }

      // 0 to reset zoom to 100%
      if (e.key === "0" && !isMeta) {
        e.preventDefault()
        setCamera({ zoom: 1 })
        return
      }

      // 1 to fit to canvas
      if (e.key === "1" && !isMeta) {
        e.preventDefault()
        resetCamera()
        return
      }

      // Tool shortcuts
      // V - select tool
      if (e.key === "v" && !isMeta) {
        e.preventDefault()
        setTool("select")
        return
      }

      // Space - pan tool (hold-to-pan)
      if (e.key === " " && !isMeta && !e.repeat) {
        e.preventDefault()
        // Save current tool before switching to pan
        if (currentTool !== "pan") {
          previousToolRef.current = currentTool
        }
        setTool("pan")
        return
      }

      // Z - zoom tool
      if (e.key === "z" && !isMeta) {
        e.preventDefault()
        setTool("zoom")
        return
      }
    },
    [
      selectedArtboardId,
      selectedLayerIds,
      selectedLayers,
      hasSelectedLayers,
      artboards,
      deleteLayer,
      deleteLayers,
      deleteArtboard,
      duplicateLayer,
      duplicateLayers,
      duplicateArtboard,
      copyLayer,
      copyLayers,
      pasteLayer,
      pasteLayers,
      selectArtboard,
      selectLayer,
      selectAllLayers,
      clearSelection,
      updateLayer,
      updateLayers,
      undo,
      redo,
      saveToHistory,
      zoom,
      setCamera,
      resetCamera,
      setTool,
      currentTool,
    ]
  )

  // Handle keyup for hold-to-pan
  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      // Release space - restore previous tool
      if (e.key === " " && previousToolRef.current !== null) {
        e.preventDefault()
        setTool(previousToolRef.current)
        previousToolRef.current = null
      }
    },
    [setTool]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])
}
