import { create } from "zustand"
import {
  CanvasState,
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
  updateLayer: (artboardId: string, layerId: string, updates: Partial<Omit<Layer, "id" | "type">>) => void
  selectLayer: (layerId: string | null) => void
  reorderLayers: (artboardId: string, fromIndex: number, toIndex: number) => void
  duplicateLayer: (artboardId: string, layerId: string) => void
  toggleLayerVisibility: (artboardId: string, layerId: string) => void
  toggleLayerLock: (artboardId: string, layerId: string) => void

  // Editor actions
  setTool: (tool: "select" | "pan" | "zoom") => void

  // Persistence
  loadState: (state: Partial<CanvasState>) => void
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  ...DEFAULT_CANVAS_STATE,

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
          selectedLayerId:
            state.editor.selectedArtboardId === id ? null : state.editor.selectedLayerId,
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
      editor: { ...state.editor, selectedArtboardId: id, selectedLayerId: null },
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
      editor: { ...state.editor, selectedLayerId: layer.id },
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
        selectedLayerId:
          state.editor.selectedLayerId === layerId ? null : state.editor.selectedLayerId,
      },
    })),

  updateLayer: (artboardId, layerId, updates) =>
    set((state) => ({
      artboards: state.artboards.map((a) =>
        a.id === artboardId
          ? {
              ...a,
              layers: a.layers.map((l) =>
                l.id === layerId ? { ...l, ...updates } : l
              ),
            }
          : a
      ),
    })),

  selectLayer: (layerId) =>
    set((state) => ({
      editor: { ...state.editor, selectedLayerId: layerId },
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
    }

    set((state) => ({
      artboards: state.artboards.map((a) => {
        if (a.id !== artboardId) return a
        const index = a.layers.findIndex((l) => l.id === layerId)
        const newLayers = [...a.layers]
        newLayers.splice(index + 1, 0, newLayer)
        return { ...a, layers: newLayers }
      }),
      editor: { ...state.editor, selectedLayerId: newLayer.id },
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

  // Editor actions
  setTool: (tool) =>
    set((state) => ({
      editor: { ...state.editor, tool },
    })),

  // Persistence
  loadState: (state) =>
    set((prev) => ({
      ...prev,
      ...state,
    })),
}))

// Selector hooks for performance
export const useCamera = () => useCanvasStore((state) => state.camera)
export const useArtboards = () => useCanvasStore((state) => state.artboards)
export const useEditor = () => useCanvasStore((state) => state.editor)
export const useSelectedArtboard = () => {
  const artboards = useCanvasStore((state) => state.artboards)
  const selectedId = useCanvasStore((state) => state.editor.selectedArtboardId)
  return artboards.find((a) => a.id === selectedId) ?? null
}
export const useSelectedLayer = () => {
  const artboards = useCanvasStore((state) => state.artboards)
  const selectedArtboardId = useCanvasStore((state) => state.editor.selectedArtboardId)
  const selectedLayerId = useCanvasStore((state) => state.editor.selectedLayerId)
  const artboard = artboards.find((a) => a.id === selectedArtboardId)
  return artboard?.layers.find((l) => l.id === selectedLayerId) ?? null
}
