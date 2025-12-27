import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import {
  CanvasState,
  CanvasSettings,
  Artboard,
  Layer,
  LayerType,
  CameraState,
  DEFAULT_CANVAS_STATE,
  DEFAULT_ARTBOARD,
  DEFAULT_EFFECT_SETTINGS,
  DEFAULT_LAYER_TRANSFORM,
  DEFAULT_3D_SETTINGS,
  DEFAULT_MEDIA_SETTINGS,
  DEFAULT_SHADER_SETTINGS,
  DEFAULT_TEXT_SETTINGS,
  Layer3D,
  LayerMedia,
  LayerShader,
  LayerText,
} from "./types"

// History for undo/redo
interface HistoryState {
  past: CanvasState[]
  future: CanvasState[]
}

const MAX_HISTORY = 50

// ID generators
let artboardCounter = 0
let layerCounter = 0

function generateArtboardId(): string {
  artboardCounter++
  return `artboard_${Date.now()}_${artboardCounter}_${Math.random().toString(36).substr(2, 9)}`
}

function generateLayerId(): string {
  layerCounter++
  return `layer_${Date.now()}_${layerCounter}_${Math.random().toString(36).substr(2, 9)}`
}

// Factory functions for creating layers
function createLayer3D(settings?: Partial<Layer3D["settings"]>): Layer3D {
  return {
    id: generateLayerId(),
    type: "3d",
    name: "3D Object",
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    transform: { ...DEFAULT_LAYER_TRANSFORM },
    settings: { ...DEFAULT_3D_SETTINGS, ...settings },
  }
}

function createLayerMedia(settings?: Partial<LayerMedia["settings"]>): LayerMedia {
  return {
    id: generateLayerId(),
    type: "media",
    name: "Media",
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    transform: { ...DEFAULT_LAYER_TRANSFORM },
    settings: { ...DEFAULT_MEDIA_SETTINGS, ...settings },
  }
}

function createLayerShader(settings?: Partial<LayerShader["settings"]>): LayerShader {
  return {
    id: generateLayerId(),
    type: "shader",
    name: "Shader",
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    transform: { ...DEFAULT_LAYER_TRANSFORM },
    settings: { ...DEFAULT_SHADER_SETTINGS, ...settings },
  }
}

function createLayerText(settings?: Partial<LayerText["settings"]>): LayerText {
  return {
    id: generateLayerId(),
    type: "text",
    name: "Text",
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    transform: { ...DEFAULT_LAYER_TRANSFORM },
    settings: { ...DEFAULT_TEXT_SETTINGS, ...settings },
  }
}

function createLayer(type: LayerType): Layer {
  switch (type) {
    case "3d":
      return createLayer3D()
    case "media":
      return createLayerMedia()
    case "shader":
      return createLayerShader()
    case "text":
      return createLayerText()
  }
}

interface CanvasStore extends CanvasState {
  // History state
  _history: HistoryState

  // Clipboard state for copy/paste (supports multiple layers)
  _clipboard: Layer[]

  // Camera actions
  setCamera: (camera: Partial<CameraState>) => void
  pan: (deltaX: number, deltaY: number) => void
  zoom: (delta: number, centerX?: number, centerY?: number) => void
  resetCamera: () => void

  // Artboard actions
  addArtboard: (position?: [number, number]) => string
  deleteArtboard: (id: string) => void
  updateArtboard: (id: string, updates: Partial<Omit<Artboard, "id" | "layers">>) => void
  selectArtboard: (id: string | null) => void
  duplicateArtboard: (id: string) => void

  // Layer actions
  addLayer: (artboardId: string, type: LayerType) => string | null
  deleteLayer: (artboardId: string, layerId: string) => void
  deleteLayers: (artboardId: string, layerIds: string[]) => void
  updateLayer: (artboardId: string, layerId: string, updates: Partial<Omit<Layer, "id" | "type">>) => void
  updateLayers: (artboardId: string, layerIds: string[], updates: Partial<Omit<Layer, "id" | "type">>) => void
  reorderLayers: (artboardId: string, fromIndex: number, toIndex: number) => void
  duplicateLayer: (artboardId: string, layerId: string) => void
  duplicateLayers: (artboardId: string, layerIds: string[]) => void
  toggleLayerVisibility: (artboardId: string, layerId: string) => void
  toggleLayerLock: (artboardId: string, layerId: string) => void
  copyLayer: (artboardId: string, layerId: string) => void
  copyLayers: (artboardId: string, layerIds: string[]) => void
  pasteLayer: (artboardId: string) => string | null
  pasteLayers: (artboardId: string) => string[]

  // Selection actions
  selectLayer: (layerId: string | null) => void
  selectLayers: (layerIds: string[]) => void
  addToSelection: (layerId: string) => void
  removeFromSelection: (layerId: string) => void
  toggleSelection: (layerId: string) => void
  selectAllLayers: (artboardId: string) => void
  clearSelection: () => void

  // Editor actions
  setTool: (tool: "select" | "pan" | "zoom") => void

  // Canvas settings actions
  updateCanvasSettings: (settings: Partial<CanvasSettings>) => void

  // History actions
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  _saveToHistory: () => void

  // Persistence
  loadState: (state: Partial<CanvasState>) => void

  // Export registry - artboards register their export functions
  _exportRegistry: Map<string, () => Promise<Blob | null>>
  registerExporter: (artboardId: string, exporter: () => Promise<Blob | null>) => void
  unregisterExporter: (artboardId: string) => void
  exportArtboard: (artboardId: string) => Promise<Blob | null>
}

// Helper to extract just the canvas state (without history and actions)
function getCanvasStateSnapshot(state: CanvasStore): CanvasState {
  return {
    camera: state.camera,
    artboards: JSON.parse(JSON.stringify(state.artboards)), // Deep clone
    editor: state.editor,
    canvas: state.canvas,
  }
}

export const useCanvasStore = create<CanvasStore>()(
  subscribeWithSelector((set, get) => ({
  ...DEFAULT_CANVAS_STATE,

  // History state
  _history: { past: [], future: [] },

  // Clipboard state (array for multi-selection)
  _clipboard: [],

  // Save current state to history (called before mutations)
  _saveToHistory: () => {
    const state = get()
    const snapshot = getCanvasStateSnapshot(state)
    set((s) => ({
      _history: {
        past: [...s._history.past.slice(-MAX_HISTORY + 1), snapshot],
        future: [], // Clear future on new action
      },
    }))
  },

  // Undo
  undo: () => {
    const state = get()
    if (state._history.past.length === 0) return

    const previous = state._history.past[state._history.past.length - 1]
    const currentSnapshot = getCanvasStateSnapshot(state)

    set({
      ...previous,
      _history: {
        past: state._history.past.slice(0, -1),
        future: [currentSnapshot, ...state._history.future],
      },
    })
  },

  // Redo
  redo: () => {
    const state = get()
    if (state._history.future.length === 0) return

    const next = state._history.future[0]
    const currentSnapshot = getCanvasStateSnapshot(state)

    set({
      ...next,
      _history: {
        past: [...state._history.past, currentSnapshot],
        future: state._history.future.slice(1),
      },
    })
  },

  // Check if undo/redo are available
  canUndo: () => get()._history.past.length > 0,
  canRedo: () => get()._history.future.length > 0,

  // Camera actions
  setCamera: (camera) =>
    set((state) => ({
      camera: { ...state.camera, ...camera },
    })),

  pan: (deltaX, deltaY) =>
    set((state) => ({
      camera: {
        ...state.camera,
        position: [
          state.camera.position[0] + deltaX,
          state.camera.position[1] + deltaY,
          state.camera.position[2],
        ],
      },
    })),

  zoom: (delta, _centerX, _centerY) =>
    set((state) => {
      const newZoom = Math.max(0.01, Math.min(10, state.camera.zoom * (1 + delta)))
      return {
        camera: {
          ...state.camera,
          zoom: newZoom,
        },
      }
    }),

  resetCamera: () =>
    set({
      camera: { ...DEFAULT_CANVAS_STATE.camera },
    }),

  // Artboard actions
  addArtboard: (position = [0, 0]) => {
    const id = generateArtboardId()
    const artboardCount = get().artboards.length
    const newArtboard: Artboard = {
      ...DEFAULT_ARTBOARD,
      id,
      name: `Artboard ${artboardCount + 1}`,
      position,
      effect: { ...DEFAULT_EFFECT_SETTINGS },
    }
    set((state) => ({
      artboards: [...state.artboards, newArtboard],
      editor: { ...state.editor, selectedArtboardId: id },
    }))
    return id
  },

  deleteArtboard: (id) =>
    set((state) => {
      const newArtboards = state.artboards.filter((a) => a.id !== id)
      const selectedId =
        state.editor.selectedArtboardId === id
          ? newArtboards[newArtboards.length - 1]?.id ?? null
          : state.editor.selectedArtboardId
      return {
        artboards: newArtboards,
        editor: {
          ...state.editor,
          selectedArtboardId: selectedId,
          selectedLayerIds:
            state.editor.selectedArtboardId === id ? [] : state.editor.selectedLayerIds,
        },
      }
    }),

  updateArtboard: (id, updates) =>
    set((state) => ({
      artboards: state.artboards.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  selectArtboard: (id) =>
    set((state) => ({
      editor: { ...state.editor, selectedArtboardId: id, selectedLayerIds: [] },
    })),

  duplicateArtboard: (id) => {
    const artboard = get().artboards.find((a) => a.id === id)
    if (!artboard) return

    const newId = generateArtboardId()
    const newArtboard: Artboard = {
      ...artboard,
      id: newId,
      name: `${artboard.name} copy`,
      position: [artboard.position[0] + 100, artboard.position[1] + 100],
      layers: artboard.layers.map((layer) => ({
        ...layer,
        id: generateLayerId(),
      })),
    }

    set((state) => ({
      artboards: [...state.artboards, newArtboard],
      editor: { ...state.editor, selectedArtboardId: newId },
    }))
  },

  // Layer actions
  addLayer: (artboardId, type) => {
    const layer = createLayer(type)
    set((state) => ({
      artboards: state.artboards.map((a) =>
        a.id === artboardId
          ? { ...a, layers: [...a.layers, layer] }
          : a
      ),
      editor: { ...state.editor, selectedLayerIds: [layer.id] },
    }))
    return layer.id
  },

  deleteLayer: (artboardId, layerId) =>
    set((state) => ({
      artboards: state.artboards.map((a) =>
        a.id === artboardId
          ? { ...a, layers: a.layers.filter((l) => l.id !== layerId) }
          : a
      ),
      editor: {
        ...state.editor,
        selectedLayerIds: state.editor.selectedLayerIds.filter((id) => id !== layerId),
      },
    })),

  deleteLayers: (artboardId, layerIds) =>
    set((state) => ({
      artboards: state.artboards.map((a) =>
        a.id === artboardId
          ? { ...a, layers: a.layers.filter((l) => !layerIds.includes(l.id)) }
          : a
      ),
      editor: {
        ...state.editor,
        selectedLayerIds: state.editor.selectedLayerIds.filter((id) => !layerIds.includes(id)),
      },
    })),

  updateLayer: (artboardId, layerId, updates) =>
    set((state) => ({
      artboards: state.artboards.map((a) =>
        a.id === artboardId
          ? {
              ...a,
              layers: a.layers.map((l) =>
                l.id === layerId ? { ...l, ...updates } as typeof l : l
              ),
            }
          : a
      ),
    })),

  updateLayers: (artboardId, layerIds, updates) =>
    set((state) => ({
      artboards: state.artboards.map((a) =>
        a.id === artboardId
          ? {
              ...a,
              layers: a.layers.map((l) =>
                layerIds.includes(l.id) ? { ...l, ...updates } as typeof l : l
              ),
            }
          : a
      ),
    })),

  // Selection actions
  selectLayer: (layerId) =>
    set((state) => {
      // Find which artboard contains this layer and select it too
      let artboardId = state.editor.selectedArtboardId
      if (layerId) {
        const artboardWithLayer = state.artboards.find((a) =>
          a.layers.some((l) => l.id === layerId)
        )
        if (artboardWithLayer) {
          artboardId = artboardWithLayer.id
        }
      }
      return {
        editor: {
          ...state.editor,
          selectedArtboardId: artboardId,
          selectedLayerIds: layerId ? [layerId] : [],
        },
      }
    }),

  selectLayers: (layerIds) =>
    set((state) => {
      // Find which artboard contains these layers (assume all from same artboard)
      let artboardId = state.editor.selectedArtboardId
      if (layerIds.length > 0) {
        const artboardWithLayer = state.artboards.find((a) =>
          a.layers.some((l) => l.id === layerIds[0])
        )
        if (artboardWithLayer) {
          artboardId = artboardWithLayer.id
        }
      }
      return {
        editor: {
          ...state.editor,
          selectedArtboardId: artboardId,
          selectedLayerIds: layerIds,
        },
      }
    }),

  addToSelection: (layerId) =>
    set((state) => {
      // Find which artboard contains this layer
      const artboardWithLayer = state.artboards.find((a) =>
        a.layers.some((l) => l.id === layerId)
      )
      // Only allow multi-select within same artboard
      if (artboardWithLayer && artboardWithLayer.id !== state.editor.selectedArtboardId) {
        // Different artboard - replace selection
        return {
          editor: {
            ...state.editor,
            selectedArtboardId: artboardWithLayer.id,
            selectedLayerIds: [layerId],
          },
        }
      }
      // Same artboard - add to selection if not already selected
      if (state.editor.selectedLayerIds.includes(layerId)) {
        return state // Already selected
      }
      return {
        editor: {
          ...state.editor,
          selectedLayerIds: [...state.editor.selectedLayerIds, layerId],
        },
      }
    }),

  removeFromSelection: (layerId) =>
    set((state) => ({
      editor: {
        ...state.editor,
        selectedLayerIds: state.editor.selectedLayerIds.filter((id) => id !== layerId),
      },
    })),

  toggleSelection: (layerId) =>
    set((state) => {
      const isSelected = state.editor.selectedLayerIds.includes(layerId)
      if (isSelected) {
        // Remove from selection
        return {
          editor: {
            ...state.editor,
            selectedLayerIds: state.editor.selectedLayerIds.filter((id) => id !== layerId),
          },
        }
      } else {
        // Add to selection (check artboard first)
        const artboardWithLayer = state.artboards.find((a) =>
          a.layers.some((l) => l.id === layerId)
        )
        if (artboardWithLayer && artboardWithLayer.id !== state.editor.selectedArtboardId) {
          // Different artboard - replace selection
          return {
            editor: {
              ...state.editor,
              selectedArtboardId: artboardWithLayer.id,
              selectedLayerIds: [layerId],
            },
          }
        }
        return {
          editor: {
            ...state.editor,
            selectedLayerIds: [...state.editor.selectedLayerIds, layerId],
          },
        }
      }
    }),

  selectAllLayers: (artboardId) =>
    set((state) => {
      const artboard = state.artboards.find((a) => a.id === artboardId)
      if (!artboard) return state
      return {
        editor: {
          ...state.editor,
          selectedArtboardId: artboardId,
          selectedLayerIds: artboard.layers.map((l) => l.id),
        },
      }
    }),

  clearSelection: () =>
    set((state) => ({
      editor: {
        ...state.editor,
        selectedLayerIds: [],
      },
    })),

  reorderLayers: (artboardId, fromIndex, toIndex) =>
    set((state) => ({
      artboards: state.artboards.map((a) => {
        if (a.id !== artboardId) return a
        if (fromIndex === toIndex) return a
        const newLayers = [...a.layers]
        const [removed] = newLayers.splice(fromIndex, 1)
        newLayers.splice(toIndex, 0, removed)
        return { ...a, layers: newLayers }
      }),
    })),

  duplicateLayer: (artboardId, layerId) => {
    const artboard = get().artboards.find((a) => a.id === artboardId)
    const layer = artboard?.layers.find((l) => l.id === layerId)
    if (!layer) return

    const newLayer: Layer = {
      ...layer,
      id: generateLayerId(),
      name: `${layer.name} copy`,
      transform: {
        ...layer.transform,
        x: layer.transform.x + 5,
        y: layer.transform.y - 5,
      },
    }

    set((state) => ({
      artboards: state.artboards.map((a) => {
        if (a.id !== artboardId) return a
        const index = a.layers.findIndex((l) => l.id === layerId)
        const newLayers = [...a.layers]
        newLayers.splice(index + 1, 0, newLayer)
        return { ...a, layers: newLayers }
      }),
      editor: { ...state.editor, selectedLayerIds: [newLayer.id] },
    }))
  },

  duplicateLayers: (artboardId, layerIds) => {
    const artboard = get().artboards.find((a) => a.id === artboardId)
    if (!artboard) return

    const newLayerIds: string[] = []
    const layersToDuplicate = artboard.layers.filter((l) => layerIds.includes(l.id))

    const newLayers: Layer[] = layersToDuplicate.map((layer, index) => {
      const newId = generateLayerId()
      newLayerIds.push(newId)
      return {
        ...JSON.parse(JSON.stringify(layer)),
        id: newId,
        name: `${layer.name} copy`,
        transform: {
          ...layer.transform,
          x: layer.transform.x + 5,
          y: layer.transform.y - 5,
        },
      }
    })

    set((state) => ({
      artboards: state.artboards.map((a) => {
        if (a.id !== artboardId) return a
        return { ...a, layers: [...a.layers, ...newLayers] }
      }),
      editor: { ...state.editor, selectedLayerIds: newLayerIds },
    }))
  },

  toggleLayerVisibility: (artboardId, layerId) =>
    set((state) => ({
      artboards: state.artboards.map((a) =>
        a.id === artboardId
          ? {
              ...a,
              layers: a.layers.map((l) =>
                l.id === layerId ? { ...l, visible: !l.visible } : l
              ),
            }
          : a
      ),
    })),

  toggleLayerLock: (artboardId, layerId) =>
    set((state) => ({
      artboards: state.artboards.map((a) =>
        a.id === artboardId
          ? {
              ...a,
              layers: a.layers.map((l) =>
                l.id === layerId ? { ...l, locked: !l.locked } : l
              ),
            }
          : a
      ),
    })),

  copyLayer: (artboardId, layerId) => {
    const artboard = get().artboards.find((a) => a.id === artboardId)
    const layer = artboard?.layers.find((l) => l.id === layerId)
    if (!layer) return

    // Deep clone the layer for clipboard (as array for consistency)
    set({ _clipboard: [JSON.parse(JSON.stringify(layer))] })
  },

  copyLayers: (artboardId, layerIds) => {
    const artboard = get().artboards.find((a) => a.id === artboardId)
    if (!artboard) return

    const layersToCopy = artboard.layers.filter((l) => layerIds.includes(l.id))
    if (layersToCopy.length === 0) return

    // Deep clone all layers for clipboard
    set({ _clipboard: JSON.parse(JSON.stringify(layersToCopy)) })
  },

  pasteLayer: (artboardId) => {
    const clipboard = get()._clipboard
    if (!clipboard || clipboard.length === 0) return null

    // Paste first layer from clipboard (for backwards compatibility)
    const layer = clipboard[0]
    const newLayer: Layer = {
      ...JSON.parse(JSON.stringify(layer)),
      id: generateLayerId(),
      name: `${layer.name} copy`,
      transform: {
        ...layer.transform,
        x: layer.transform.x + 10,
        y: layer.transform.y - 10,
      },
    }

    set((state) => ({
      artboards: state.artboards.map((a) =>
        a.id === artboardId
          ? { ...a, layers: [...a.layers, newLayer] }
          : a
      ),
      editor: { ...state.editor, selectedLayerIds: [newLayer.id] },
    }))

    return newLayer.id
  },

  pasteLayers: (artboardId) => {
    const clipboard = get()._clipboard
    if (!clipboard || clipboard.length === 0) return []

    const newLayerIds: string[] = []
    const newLayers: Layer[] = clipboard.map((layer) => {
      const newId = generateLayerId()
      newLayerIds.push(newId)
      return {
        ...JSON.parse(JSON.stringify(layer)),
        id: newId,
        name: `${layer.name} copy`,
        transform: {
          ...layer.transform,
          x: layer.transform.x + 10,
          y: layer.transform.y - 10,
        },
      }
    })

    set((state) => ({
      artboards: state.artboards.map((a) =>
        a.id === artboardId
          ? { ...a, layers: [...a.layers, ...newLayers] }
          : a
      ),
      editor: { ...state.editor, selectedLayerIds: newLayerIds },
    }))

    return newLayerIds
  },

  // Editor actions
  setTool: (tool) =>
    set((state) => ({
      editor: { ...state.editor, tool },
    })),

  // Canvas settings actions
  updateCanvasSettings: (settings) =>
    set((state) => ({
      canvas: { ...state.canvas, ...settings },
    })),

  // Persistence
  loadState: (state) =>
    set((prev) => ({
      ...prev,
      ...state,
    })),

  // Export registry
  _exportRegistry: new Map(),

  registerExporter: (artboardId, exporter) => {
    get()._exportRegistry.set(artboardId, exporter)
  },

  unregisterExporter: (artboardId) => {
    get()._exportRegistry.delete(artboardId)
  },

  exportArtboard: async (artboardId) => {
    const exporter = get()._exportRegistry.get(artboardId)
    if (!exporter) {
      console.warn(`No exporter registered for artboard ${artboardId}`)
      return null
    }
    return exporter()
  },
})))

// Selector hooks for performance
export const useCamera = () => useCanvasStore((state) => state.camera)
export const useArtboards = () => useCanvasStore((state) => state.artboards)
export const useEditor = () => useCanvasStore((state) => state.editor)
export const useCanvasSettings = () => useCanvasStore((state) => state.canvas)
export const useSelectedArtboard = () => {
  const artboards = useCanvasStore((state) => state.artboards)
  const selectedId = useCanvasStore((state) => state.editor.selectedArtboardId)
  return artboards.find((a) => a.id === selectedId) ?? null
}
// Returns first selected layer (for backwards compatibility and single-selection UI)
export const useSelectedLayer = () => {
  const artboards = useCanvasStore((state) => state.artboards)
  const selectedArtboardId = useCanvasStore((state) => state.editor.selectedArtboardId)
  const selectedLayerIds = useCanvasStore((state) => state.editor.selectedLayerIds)
  const artboard = artboards.find((a) => a.id === selectedArtboardId)
  if (!artboard || selectedLayerIds.length === 0) return null
  return artboard.layers.find((l) => l.id === selectedLayerIds[0]) ?? null
}
// Returns all selected layers
export const useSelectedLayers = () => {
  const artboards = useCanvasStore((state) => state.artboards)
  const selectedArtboardId = useCanvasStore((state) => state.editor.selectedArtboardId)
  const selectedLayerIds = useCanvasStore((state) => state.editor.selectedLayerIds)
  const artboard = artboards.find((a) => a.id === selectedArtboardId)
  if (!artboard || selectedLayerIds.length === 0) return []
  return artboard.layers.filter((l) => selectedLayerIds.includes(l.id))
}
// Returns selected layer IDs
export const useSelectedLayerIds = () => useCanvasStore((state) => state.editor.selectedLayerIds)
// Check if a specific layer is selected
export const useIsLayerSelected = (layerId: string) =>
  useCanvasStore((state) => state.editor.selectedLayerIds.includes(layerId))
