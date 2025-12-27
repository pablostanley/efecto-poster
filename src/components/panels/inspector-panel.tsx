"use client"

import { useState } from "react"
import { useSelectedArtboard, useSelectedLayer, useSelectedLayers, useSelectedLayerIds, useCanvasStore, useCanvasSettings } from "@/lib/store"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  CaretDown,
  CaretRight,
  Plus,
  ArrowLineLeft,
  ArrowLineRight,
  ArrowsHorizontal,
  ArrowLineUp,
  ArrowLineDown,
  ArrowsVertical,
  ArrowsClockwise,
  FlipHorizontal,
  FlipVertical,
  LinkSimple,
  Eye,
  Minus,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  TextAlignJustify,
  Download,
  Image as ImageIcon,
} from "@phosphor-icons/react"
import type { EffectType, Layer } from "@/lib/types"

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  action?: React.ReactNode
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  action,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b">
      <div className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-muted/50 transition-colors">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {isOpen ? (
            <CaretDown className="w-3 h-3" />
          ) : (
            <CaretRight className="w-3 h-3" />
          )}
          <span className="text-sm font-medium">{title}</span>
        </button>
        {action}
      </div>
      {isOpen && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  )
}

export function InspectorPanel() {
  const selectedArtboard = useSelectedArtboard()
  const selectedLayer = useSelectedLayer()
  const selectedLayers = useSelectedLayers()
  const selectedLayerIds = useSelectedLayerIds()
  const hasMultipleSelected = selectedLayerIds.length > 1

  // No selection - show canvas options
  if (!selectedArtboard && selectedLayerIds.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b shrink-0">
          <h2 className="text-sm font-medium">Canvas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">File settings</p>
        </div>
        <CanvasInspector />
      </div>
    )
  }

  // Multi-selection header and inspector
  if (hasMultipleSelected && selectedArtboard) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b shrink-0">
          <h2 className="text-sm font-medium">{selectedLayerIds.length} layers selected</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {getLayerTypeSummary(selectedLayers)}
          </p>
        </div>
        <MultiLayerInspector layers={selectedLayers} artboardId={selectedArtboard.id} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Selection info header */}
      <div className="p-4 border-b shrink-0">
        <h2 className="text-sm font-medium">
          {selectedLayer ? selectedLayer.name : selectedArtboard?.name}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {selectedLayer ? `${selectedLayer.type} layer` : "Artboard"}
        </p>
      </div>

      {/* Properties */}
      {selectedLayer && selectedArtboard ? (
        <LayerInspector layer={selectedLayer} artboardId={selectedArtboard.id} />
      ) : selectedArtboard ? (
        <ArtboardInspector artboard={selectedArtboard} />
      ) : null}
    </div>
  )
}

// Helper to summarize layer types in selection
function getLayerTypeSummary(layers: Layer[]): string {
  const typeCounts: Record<string, number> = {}
  layers.forEach((layer) => {
    typeCounts[layer.type] = (typeCounts[layer.type] || 0) + 1
  })
  return Object.entries(typeCounts)
    .map(([type, count]) => `${count} ${type}`)
    .join(", ")
}

// Multi-layer inspector for batch editing
function MultiLayerInspector({
  layers,
  artboardId,
}: {
  layers: Layer[]
  artboardId: string
}) {
  const updateLayer = useCanvasStore((state) => state.updateLayer)
  const saveToHistory = useCanvasStore((state) => state._saveToHistory)

  // Check if all layers have the same value for a property
  const allSameVisibility = layers.every((l) => l.visible === layers[0].visible)
  const allSameLocked = layers.every((l) => l.locked === layers[0].locked)
  const allSameOpacity = layers.every((l) => l.opacity === layers[0].opacity)

  // Batch update all selected layers
  const updateAllLayers = (updates: Partial<Omit<Layer, "id" | "type">>) => {
    saveToHistory()
    layers.forEach((layer) => {
      updateLayer(artboardId, layer.id, updates)
    })
  }

  // Move all layers by delta
  const moveAllLayers = (deltaX: number, deltaY: number) => {
    saveToHistory()
    layers.forEach((layer) => {
      updateLayer(artboardId, layer.id, {
        transform: {
          ...layer.transform,
          x: layer.transform.x + deltaX,
          y: layer.transform.y + deltaY,
        },
      })
    })
  }

  return (
    <>
      {/* Alignment */}
      <CollapsibleSection title="Align & Distribute">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Align</Label>
          <div className="flex items-center gap-1 justify-between">
            <div className="flex items-center bg-muted/50 rounded p-0.5">
              <AlignButton
                icon={ArrowLineLeft}
                onClick={() => {
                  const minX = Math.min(...layers.map((l) => l.transform.x))
                  saveToHistory()
                  layers.forEach((layer) => {
                    updateLayer(artboardId, layer.id, {
                      transform: { ...layer.transform, x: minX },
                    })
                  })
                }}
                title="Align left edges"
              />
              <AlignButton
                icon={ArrowsHorizontal}
                onClick={() => {
                  const avgX = layers.reduce((sum, l) => sum + l.transform.x, 0) / layers.length
                  saveToHistory()
                  layers.forEach((layer) => {
                    updateLayer(artboardId, layer.id, {
                      transform: { ...layer.transform, x: avgX },
                    })
                  })
                }}
                title="Align centers horizontally"
              />
              <AlignButton
                icon={ArrowLineRight}
                onClick={() => {
                  const maxX = Math.max(...layers.map((l) => l.transform.x))
                  saveToHistory()
                  layers.forEach((layer) => {
                    updateLayer(artboardId, layer.id, {
                      transform: { ...layer.transform, x: maxX },
                    })
                  })
                }}
                title="Align right edges"
              />
            </div>
            <div className="flex items-center bg-muted/50 rounded p-0.5">
              <AlignButton
                icon={ArrowLineUp}
                onClick={() => {
                  const maxY = Math.max(...layers.map((l) => l.transform.y))
                  saveToHistory()
                  layers.forEach((layer) => {
                    updateLayer(artboardId, layer.id, {
                      transform: { ...layer.transform, y: maxY },
                    })
                  })
                }}
                title="Align top edges"
              />
              <AlignButton
                icon={ArrowsVertical}
                onClick={() => {
                  const avgY = layers.reduce((sum, l) => sum + l.transform.y, 0) / layers.length
                  saveToHistory()
                  layers.forEach((layer) => {
                    updateLayer(artboardId, layer.id, {
                      transform: { ...layer.transform, y: avgY },
                    })
                  })
                }}
                title="Align centers vertically"
              />
              <AlignButton
                icon={ArrowLineDown}
                onClick={() => {
                  const minY = Math.min(...layers.map((l) => l.transform.y))
                  saveToHistory()
                  layers.forEach((layer) => {
                    updateLayer(artboardId, layer.id, {
                      transform: { ...layer.transform, y: minY },
                    })
                  })
                }}
                title="Align bottom edges"
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Position offset */}
      <CollapsibleSection title="Position Offset">
        <p className="text-xs text-muted-foreground mb-2">
          Move all selected layers relative to their current position
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ΔX</span>
            <Input
              type="number"
              defaultValue={0}
              onBlur={(e) => {
                const delta = parseFloat(e.target.value) || 0
                if (delta !== 0) {
                  moveAllLayers(delta, 0)
                  e.target.value = "0"
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const delta = parseFloat((e.target as HTMLInputElement).value) || 0
                  if (delta !== 0) {
                    moveAllLayers(delta, 0)
                    ;(e.target as HTMLInputElement).value = "0"
                  }
                }
              }}
              className="h-8 pl-7 font-mono text-sm"
            />
          </div>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ΔY</span>
            <Input
              type="number"
              defaultValue={0}
              onBlur={(e) => {
                const delta = parseFloat(e.target.value) || 0
                if (delta !== 0) {
                  moveAllLayers(0, delta)
                  e.target.value = "0"
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const delta = parseFloat((e.target as HTMLInputElement).value) || 0
                  if (delta !== 0) {
                    moveAllLayers(0, delta)
                    ;(e.target as HTMLInputElement).value = "0"
                  }
                }
              }}
              className="h-8 pl-7 font-mono text-sm"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Appearance */}
      <CollapsibleSection title="Appearance">
        {/* Opacity - only show if all same or mixed indicator */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Opacity</span>
            <Input
              type="number"
              value={allSameOpacity ? Math.round(layers[0].opacity * 100) : ""}
              placeholder={!allSameOpacity ? "Mixed" : undefined}
              onChange={(e) => {
                const opacity = Math.min(100, Math.max(0, parseFloat(e.target.value) || 100)) / 100
                updateAllLayers({ opacity })
              }}
              className="h-8 pl-14 pr-6 font-mono text-sm text-right"
              min={0}
              max={100}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </div>

        {/* Visibility toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            Visible {!allSameVisibility && <span className="text-amber-500">(mixed)</span>}
          </Label>
          <Switch
            checked={allSameVisibility ? layers[0].visible : true}
            onCheckedChange={(visible) => updateAllLayers({ visible })}
          />
        </div>

        {/* Lock toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            Locked {!allSameLocked && <span className="text-amber-500">(mixed)</span>}
          </Label>
          <Switch
            checked={allSameLocked ? layers[0].locked : false}
            onCheckedChange={(locked) => updateAllLayers({ locked })}
          />
        </div>
      </CollapsibleSection>

      {/* Info */}
      <CollapsibleSection title="Selection Info" defaultOpen={false}>
        <div className="space-y-1 text-xs text-muted-foreground">
          {layers.map((layer) => (
            <div key={layer.id} className="flex items-center justify-between py-0.5">
              <span className="truncate">{layer.name}</span>
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{layer.type}</span>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </>
  )
}

function CanvasInspector() {
  const canvasSettings = useCanvasSettings()
  const updateCanvasSettings = useCanvasStore((state) => state.updateCanvasSettings)

  return (
    <>
      {/* Background */}
      <CollapsibleSection title="Background">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={canvasSettings.backgroundColor}
            onChange={(e) => updateCanvasSettings({ backgroundColor: e.target.value })}
            className="w-10 h-10 rounded border cursor-pointer"
          />
          <Input
            value={canvasSettings.backgroundColor}
            onChange={(e) => updateCanvasSettings({ backgroundColor: e.target.value })}
            className="h-8 font-mono text-sm flex-1"
          />
        </div>
      </CollapsibleSection>

      {/* Grid */}
      <CollapsibleSection title="Grid">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Show Grid</Label>
          <Switch
            checked={canvasSettings.showGrid}
            onCheckedChange={(showGrid) => updateCanvasSettings({ showGrid })}
          />
        </div>

        {canvasSettings.showGrid && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground">Grid Size</Label>
              <div className="flex items-center gap-2 mt-1">
                <Slider
                  value={[canvasSettings.gridSize]}
                  onValueChange={([value]) => updateCanvasSettings({ gridSize: value })}
                  min={10}
                  max={200}
                  step={10}
                  className="flex-1"
                />
                <span className="text-xs font-mono w-10 text-right">
                  {canvasSettings.gridSize}px
                </span>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Grid Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={canvasSettings.gridColor}
                  onChange={(e) => updateCanvasSettings({ gridColor: e.target.value })}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <Input
                  value={canvasSettings.gridColor}
                  onChange={(e) => updateCanvasSettings({ gridColor: e.target.value })}
                  className="h-8 font-mono text-sm flex-1"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Snap to Grid</Label>
          <Switch
            checked={canvasSettings.snapToGrid}
            onCheckedChange={(snapToGrid) => updateCanvasSettings({ snapToGrid })}
          />
        </div>
      </CollapsibleSection>
    </>
  )
}

// Artboard size presets
const SIZE_PRESETS = [
  { name: "Custom", width: 0, height: 0 },
  { name: "Instagram Post", width: 1080, height: 1080 },
  { name: "Instagram Story", width: 1080, height: 1920 },
  { name: "Twitter Post", width: 1200, height: 675 },
  { name: "Facebook Post", width: 1200, height: 630 },
  { name: "LinkedIn Post", width: 1200, height: 627 },
  { name: "YouTube Thumbnail", width: 1280, height: 720 },
  { name: "Desktop HD", width: 1920, height: 1080 },
  { name: "Desktop 4K", width: 3840, height: 2160 },
  { name: "Mobile", width: 375, height: 812 },
  { name: "Tablet", width: 768, height: 1024 },
]

function ArtboardInspector({
  artboard,
}: {
  artboard: NonNullable<ReturnType<typeof useSelectedArtboard>>
}) {
  const updateArtboard = useCanvasStore((state) => state.updateArtboard)

  // Find matching preset
  const currentPreset = SIZE_PRESETS.find(
    (p) => p.width === artboard.size.width && p.height === artboard.size.height
  )?.name || "Custom"

  const handlePresetChange = (presetName: string) => {
    const preset = SIZE_PRESETS.find((p) => p.name === presetName)
    if (preset && preset.width > 0) {
      updateArtboard(artboard.id, {
        size: { width: preset.width, height: preset.height },
      })
    }
  }

  return (
    <>
      {/* Size */}
      <CollapsibleSection title="Layout">
        {/* Size preset dropdown */}
        <div>
          <Label className="text-xs text-muted-foreground">Preset</Label>
          <Select value={currentPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="h-8 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZE_PRESETS.map((preset) => (
                <SelectItem key={preset.name} value={preset.name}>
                  {preset.name}
                  {preset.width > 0 && (
                    <span className="text-muted-foreground ml-2">
                      {preset.width}×{preset.height}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Width</Label>
            <Input
              type="number"
              value={artboard.size.width}
              onChange={(e) =>
                updateArtboard(artboard.id, {
                  size: { ...artboard.size, width: parseInt(e.target.value) || 800 },
                })
              }
              className="h-8 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Height</Label>
            <Input
              type="number"
              value={artboard.size.height}
              onChange={(e) =>
                updateArtboard(artboard.id, {
                  size: { ...artboard.size, height: parseInt(e.target.value) || 600 },
                })
              }
              className="h-8 mt-1"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <Label className="text-xs text-muted-foreground">Clip content</Label>
          <Switch
            checked={artboard.clipContent}
            onCheckedChange={(clipContent) =>
              updateArtboard(artboard.id, { clipContent })
            }
          />
        </div>
      </CollapsibleSection>

      {/* Background */}
      <CollapsibleSection title="Background">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={artboard.backgroundColor}
            onChange={(e) =>
              updateArtboard(artboard.id, { backgroundColor: e.target.value })
            }
            className="w-10 h-10 rounded border cursor-pointer"
          />
          <Input
            value={artboard.backgroundColor}
            onChange={(e) =>
              updateArtboard(artboard.id, { backgroundColor: e.target.value })
            }
            className="h-8 font-mono text-sm flex-1"
          />
        </div>
      </CollapsibleSection>

      {/* Effects */}
      <CollapsibleSection
        title="Effects"
        action={
          <button
            onClick={() =>
              updateArtboard(artboard.id, {
                effect: { ...artboard.effect, enabled: !artboard.effect.enabled },
              })
            }
            className="p-1 hover:bg-muted rounded"
          >
            <Plus className="w-4 h-4" />
          </button>
        }
      >
        <EffectProperties artboard={artboard} />
      </CollapsibleSection>

      {/* Export */}
      <CollapsibleSection
        title="Export"
        defaultOpen={false}
        action={
          <button className="p-1 hover:bg-muted rounded" title="Add export preset">
            <Plus className="w-4 h-4" />
          </button>
        }
      >
        <ExportSection artboard={artboard} />
      </CollapsibleSection>
    </>
  )
}

// Export section component
function ExportSection({
  artboard,
}: {
  artboard: NonNullable<ReturnType<typeof useSelectedArtboard>>
}) {
  const [exportScale, setExportScale] = useState(1)
  const [exportFormat, setExportFormat] = useState<"png" | "jpg" | "webp">("png")
  const [isExporting, setIsExporting] = useState(false)
  const exportArtboard = useCanvasStore((state) => state.exportArtboard)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Use the registered exporter for this artboard
      const blob = await exportArtboard(artboard.id)
      if (!blob) {
        console.error("Failed to export artboard")
        return
      }

      // If scale is not 1x, resize the image
      if (exportScale !== 1) {
        const img = new Image()
        const url = URL.createObjectURL(blob)
        img.src = url

        await new Promise((resolve) => {
          img.onload = resolve
        })

        const exportWidth = artboard.size.width * exportScale
        const exportHeight = artboard.size.height * exportScale

        const exportCanvas = document.createElement("canvas")
        exportCanvas.width = exportWidth
        exportCanvas.height = exportHeight
        const ctx = exportCanvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, exportWidth, exportHeight)

        URL.revokeObjectURL(url)

        const mimeType = exportFormat === "jpg" ? "image/jpeg" : exportFormat === "webp" ? "image/webp" : "image/png"
        exportCanvas.toBlob((scaledBlob) => {
          if (scaledBlob) {
            downloadBlob(scaledBlob)
          }
        }, mimeType, 0.95)
      } else {
        // Convert to correct format if needed
        if (exportFormat !== "png") {
          const img = new Image()
          const url = URL.createObjectURL(blob)
          img.src = url

          await new Promise((resolve) => {
            img.onload = resolve
          })

          const exportCanvas = document.createElement("canvas")
          exportCanvas.width = artboard.size.width
          exportCanvas.height = artboard.size.height
          const ctx = exportCanvas.getContext("2d")!
          ctx.drawImage(img, 0, 0)

          URL.revokeObjectURL(url)

          const mimeType = exportFormat === "jpg" ? "image/jpeg" : "image/webp"
          exportCanvas.toBlob((convertedBlob) => {
            if (convertedBlob) {
              downloadBlob(convertedBlob)
            }
          }, mimeType, 0.95)
        } else {
          downloadBlob(blob)
        }
      }
    } finally {
      setIsExporting(false)
    }
  }

  const downloadBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.download = `${artboard.name.replace(/\s+/g, "-").toLowerCase()}.${exportFormat}`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      {/* Export size */}
      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
        <ImageIcon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs flex-1">
          {Math.round(artboard.size.width * exportScale)} × {Math.round(artboard.size.height * exportScale)}
        </span>
        <span className="text-xs text-muted-foreground">{exportScale}x</span>
      </div>

      {/* Scale selector */}
      <div>
        <Label className="text-xs text-muted-foreground">Scale</Label>
        <Select
          value={String(exportScale)}
          onValueChange={(value) => setExportScale(parseFloat(value))}
        >
          <SelectTrigger className="h-8 mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.5">0.5x (Half)</SelectItem>
            <SelectItem value="1">1x (Original)</SelectItem>
            <SelectItem value="2">2x (Retina)</SelectItem>
            <SelectItem value="3">3x</SelectItem>
            <SelectItem value="4">4x</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Format selector */}
      <div>
        <Label className="text-xs text-muted-foreground">Format</Label>
        <Select
          value={exportFormat}
          onValueChange={(value) => setExportFormat(value as "png" | "jpg" | "webp")}
        >
          <SelectTrigger className="h-8 mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="jpg">JPG</SelectItem>
            <SelectItem value="webp">WebP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full h-9 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        {isExporting ? "Exporting..." : `Export ${artboard.name}`}
      </button>
    </div>
  )
}

// Alignment button component
function AlignButton({
  icon: Icon,
  active,
  onClick,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>
  active?: boolean
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded hover:bg-muted transition-colors",
        active && "bg-muted"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

// Fill row component (Framer-style)
function FillRow({
  color,
  opacity,
  visible,
  onChange,
  onToggleVisibility,
  onRemove,
}: {
  color: string
  opacity: number
  visible: boolean
  onChange: (color: string) => void
  onToggleVisibility: () => void
  onRemove: () => void
}) {
  // Convert hex to display format (without #)
  const hexValue = color.replace("#", "").toUpperCase()

  return (
    <div className="flex items-center gap-2">
      {/* Color swatch */}
      <div className="relative">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border cursor-pointer"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* Hex input */}
      <Input
        value={hexValue}
        onChange={(e) => {
          const val = e.target.value.replace("#", "")
          if (/^[0-9A-Fa-f]{0,6}$/.test(val)) {
            onChange(`#${val}`)
          }
        }}
        className="h-8 font-mono text-sm flex-1 uppercase"
        maxLength={6}
      />

      {/* Opacity */}
      <div className="relative w-16">
        <Input
          type="number"
          value={opacity}
          onChange={() => {}}
          className="h-8 pr-5 font-mono text-sm text-right"
          min={0}
          max={100}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
      </div>

      {/* Visibility toggle */}
      <button
        onClick={onToggleVisibility}
        className={cn("p-1 hover:bg-muted rounded", !visible && "opacity-50")}
        title={visible ? "Hide fill" : "Show fill"}
      >
        <Eye className="w-4 h-4" />
      </button>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
        title="Remove fill"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  )
}

function LayerInspector({
  layer,
  artboardId,
}: {
  layer: Layer
  artboardId: string
}) {
  const updateLayer = useCanvasStore((state) => state.updateLayer)

  return (
    <>
      {/* Position */}
      <CollapsibleSection title="Position">
        {/* Alignment buttons */}
        <div className="flex items-center gap-1 justify-between">
          <div className="flex items-center bg-muted/50 rounded p-0.5">
            <AlignButton
              icon={ArrowLineLeft}
              onClick={() => {}}
              title="Align left"
            />
            <AlignButton
              icon={ArrowsHorizontal}
              onClick={() => {}}
              title="Align center horizontally"
            />
            <AlignButton
              icon={ArrowLineRight}
              onClick={() => {}}
              title="Align right"
            />
          </div>
          <div className="flex items-center bg-muted/50 rounded p-0.5">
            <AlignButton
              icon={ArrowLineUp}
              onClick={() => {}}
              title="Align top"
            />
            <AlignButton
              icon={ArrowsVertical}
              onClick={() => {}}
              title="Align center vertically"
            />
            <AlignButton
              icon={ArrowLineDown}
              onClick={() => {}}
              title="Align bottom"
            />
          </div>
        </div>

        {/* X/Y inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">X</span>
            <Input
              type="number"
              value={layer.transform.x}
              onChange={(e) =>
                updateLayer(artboardId, layer.id, {
                  transform: { ...layer.transform, x: parseFloat(e.target.value) || 0 },
                })
              }
              className="h-8 pl-6 font-mono text-sm"
            />
          </div>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Y</span>
            <Input
              type="number"
              value={layer.transform.y}
              onChange={(e) =>
                updateLayer(artboardId, layer.id, {
                  transform: { ...layer.transform, y: parseFloat(e.target.value) || 0 },
                })
              }
              className="h-8 pl-6 font-mono text-sm"
            />
          </div>
        </div>

        {/* Rotation and flip */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <ArrowsClockwise className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="number"
              value={layer.transform.rotation}
              onChange={(e) =>
                updateLayer(artboardId, layer.id, {
                  transform: { ...layer.transform, rotation: parseFloat(e.target.value) || 0 },
                })
              }
              className="h-8 pl-7 pr-6 font-mono text-sm"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">°</span>
          </div>
          <div className="flex items-center bg-muted/50 rounded p-0.5">
            <AlignButton
              icon={FlipHorizontal}
              onClick={() => {}}
              title="Flip horizontal"
            />
            <AlignButton
              icon={FlipVertical}
              onClick={() => {}}
              title="Flip vertical"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Layout (Size) */}
      <CollapsibleSection title="Layout">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">W</span>
            <Input
              type="number"
              value={Math.round(layer.transform.scale * 100)}
              onChange={(e) =>
                updateLayer(artboardId, layer.id, {
                  transform: { ...layer.transform, scale: (parseFloat(e.target.value) || 100) / 100 },
                })
              }
              className="h-8 pl-7 font-mono text-sm"
            />
          </div>
          <button className="p-1 hover:bg-muted rounded" title="Link dimensions">
            <LinkSimple className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">H</span>
            <Input
              type="number"
              value={Math.round(layer.transform.scale * 100)}
              onChange={(e) =>
                updateLayer(artboardId, layer.id, {
                  transform: { ...layer.transform, scale: (parseFloat(e.target.value) || 100) / 100 },
                })
              }
              className="h-8 pl-7 font-mono text-sm"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Appearance */}
      <CollapsibleSection
        title="Appearance"
        action={
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateLayer(artboardId, layer.id, { visible: !layer.visible })}
              className={cn("p-1 hover:bg-muted rounded", !layer.visible && "opacity-50")}
              title={layer.visible ? "Hide" : "Show"}
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Opacity</span>
            <Input
              type="number"
              value={Math.round(layer.opacity * 100)}
              onChange={(e) =>
                updateLayer(artboardId, layer.id, { opacity: Math.min(100, Math.max(0, parseFloat(e.target.value) || 100)) / 100 })
              }
              className="h-8 pl-14 pr-6 font-mono text-sm text-right"
              min={0}
              max={100}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Radius</span>
            <Input
              type="number"
              value={0}
              onChange={() => {}}
              className="h-8 pl-14 font-mono text-sm text-right"
              min={0}
            />
          </div>
          <button className="p-1.5 hover:bg-muted rounded" title="Individual corners">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 6V4a2 2 0 012-2h2M10 2h2a2 2 0 012 2v2M14 10v2a2 2 0 01-2 2h-2M6 14H4a2 2 0 01-2-2v-2" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Locked</Label>
          <Switch
            checked={layer.locked}
            onCheckedChange={(locked) =>
              updateLayer(artboardId, layer.id, { locked })
            }
          />
        </div>
      </CollapsibleSection>

      {/* Fill */}
      <CollapsibleSection
        title="Fill"
        action={
          <button className="p-1 hover:bg-muted rounded" title="Add fill">
            <Plus className="w-4 h-4" />
          </button>
        }
      >
        <FillRow
          color={layer.type === "3d" ? layer.settings.color : layer.type === "text" ? layer.settings.color : "#ffffff"}
          opacity={100}
          visible={true}
          onChange={(color) => {
            if (layer.type === "3d" || layer.type === "text") {
              updateLayer(artboardId, layer.id, {
                settings: { ...layer.settings, color },
              })
            }
          }}
          onToggleVisibility={() => {}}
          onRemove={() => {}}
        />
      </CollapsibleSection>

      {/* Stroke */}
      <CollapsibleSection
        title="Stroke"
        defaultOpen={false}
        action={
          <button className="p-1 hover:bg-muted rounded" title="Add stroke">
            <Plus className="w-4 h-4" />
          </button>
        }
      >
        <p className="text-xs text-muted-foreground">No strokes added</p>
      </CollapsibleSection>

      {/* Effects */}
      <CollapsibleSection
        title="Effects"
        defaultOpen={false}
        action={
          <button className="p-1 hover:bg-muted rounded" title="Add effect">
            <Plus className="w-4 h-4" />
          </button>
        }
      >
        <p className="text-xs text-muted-foreground">No effects added</p>
      </CollapsibleSection>

      {/* Layer-specific settings */}
      <LayerTypeSettings layer={layer} artboardId={artboardId} />
    </>
  )
}

function LayerTypeSettings({
  layer,
  artboardId,
}: {
  layer: Layer
  artboardId: string
}) {
  const updateLayer = useCanvasStore((state) => state.updateLayer)

  if (layer.type === "3d") {
    return (
      <CollapsibleSection title="3D Settings">
        <div>
          <Label className="text-xs text-muted-foreground">Model</Label>
          <Select
            value={layer.settings.modelType}
            onValueChange={(value) =>
              updateLayer(artboardId, layer.id, {
                settings: { ...layer.settings, modelType: value as typeof layer.settings.modelType },
              })
            }
          >
            <SelectTrigger className="h-8 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shape">Shape</SelectItem>
              <SelectItem value="gltf">Custom Model</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {layer.settings.modelType === "shape" && (
          <div>
            <Label className="text-xs text-muted-foreground">Shape</Label>
            <Select
              value={layer.settings.shape}
              onValueChange={(value) =>
                updateLayer(artboardId, layer.id, {
                  settings: { ...layer.settings, shape: value as typeof layer.settings.shape },
                })
              }
            >
              <SelectTrigger className="h-8 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="torus">Torus</SelectItem>
                <SelectItem value="sphere">Sphere</SelectItem>
                <SelectItem value="box">Box</SelectItem>
                <SelectItem value="cone">Cone</SelectItem>
                <SelectItem value="torusKnot">Torus Knot</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-xs text-muted-foreground">Color</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={layer.settings.color}
              onChange={(e) =>
                updateLayer(artboardId, layer.id, {
                  settings: { ...layer.settings, color: e.target.value },
                })
              }
              className="w-8 h-8 rounded border cursor-pointer"
            />
            <Input
              value={layer.settings.color}
              onChange={(e) =>
                updateLayer(artboardId, layer.id, {
                  settings: { ...layer.settings, color: e.target.value },
                })
              }
              className="h-8 font-mono text-sm flex-1"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Auto Rotate</Label>
          <Switch
            checked={layer.settings.autoRotate}
            onCheckedChange={(autoRotate) =>
              updateLayer(artboardId, layer.id, {
                settings: { ...layer.settings, autoRotate },
              })
            }
          />
        </div>
      </CollapsibleSection>
    )
  }

  if (layer.type === "text") {
    return (
      <CollapsibleSection title="Typography">
        {/* Content */}
        <div>
          <Label className="text-xs text-muted-foreground">Content</Label>
          <Input
            value={layer.settings.content}
            onChange={(e) =>
              updateLayer(artboardId, layer.id, {
                settings: { ...layer.settings, content: e.target.value },
              })
            }
            className="h-8 mt-1"
          />
        </div>

        {/* Font Family */}
        <div>
          <Label className="text-xs text-muted-foreground">Font</Label>
          <Select
            value={layer.settings.fontFamily}
            onValueChange={(value) =>
              updateLayer(artboardId, layer.id, {
                settings: { ...layer.settings, fontFamily: value },
              })
            }
          >
            <SelectTrigger className="h-8 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Inter">Inter</SelectItem>
              <SelectItem value="Arial">Arial</SelectItem>
              <SelectItem value="Helvetica">Helvetica</SelectItem>
              <SelectItem value="Georgia">Georgia</SelectItem>
              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
              <SelectItem value="monospace">Monospace</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Weight + Size row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Weight</Label>
            <Select
              value={String(layer.settings.fontWeight)}
              onValueChange={(value) =>
                updateLayer(artboardId, layer.id, {
                  settings: { ...layer.settings, fontWeight: parseInt(value) },
                })
              }
            >
              <SelectTrigger className="h-8 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">Thin</SelectItem>
                <SelectItem value="200">Extra Light</SelectItem>
                <SelectItem value="300">Light</SelectItem>
                <SelectItem value="400">Regular</SelectItem>
                <SelectItem value="500">Medium</SelectItem>
                <SelectItem value="600">Semi Bold</SelectItem>
                <SelectItem value="700">Bold</SelectItem>
                <SelectItem value="800">Extra Bold</SelectItem>
                <SelectItem value="900">Black</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Size</Label>
            <div className="relative mt-1">
              <Input
                type="number"
                value={layer.settings.fontSize}
                onChange={(e) =>
                  updateLayer(artboardId, layer.id, {
                    settings: { ...layer.settings, fontSize: parseFloat(e.target.value) || 16 },
                  })
                }
                className="h-8 pr-8 font-mono text-sm"
                min={1}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">px</span>
            </div>
          </div>
        </div>

        {/* Letter Spacing + Line Height row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Letter</Label>
            <div className="relative mt-1">
              <Input
                type="number"
                value={layer.settings.letterSpacing}
                onChange={(e) =>
                  updateLayer(artboardId, layer.id, {
                    settings: { ...layer.settings, letterSpacing: parseFloat(e.target.value) || 0 },
                  })
                }
                className="h-8 pr-8 font-mono text-sm"
                step={0.1}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">em</span>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Line</Label>
            <div className="relative mt-1">
              <Input
                type="number"
                value={layer.settings.lineHeight}
                onChange={(e) =>
                  updateLayer(artboardId, layer.id, {
                    settings: { ...layer.settings, lineHeight: parseFloat(e.target.value) || 1.2 },
                  })
                }
                className="h-8 font-mono text-sm"
                step={0.1}
                min={0.5}
              />
            </div>
          </div>
        </div>

        {/* Text Alignment */}
        <div>
          <Label className="text-xs text-muted-foreground">Align</Label>
          <div className="flex items-center gap-1 mt-1 bg-muted/50 rounded p-0.5 w-fit">
            <AlignButton
              icon={TextAlignLeft}
              active={layer.settings.textAlign === "left"}
              onClick={() =>
                updateLayer(artboardId, layer.id, {
                  settings: { ...layer.settings, textAlign: "left" },
                })
              }
              title="Align left"
            />
            <AlignButton
              icon={TextAlignCenter}
              active={layer.settings.textAlign === "center"}
              onClick={() =>
                updateLayer(artboardId, layer.id, {
                  settings: { ...layer.settings, textAlign: "center" },
                })
              }
              title="Align center"
            />
            <AlignButton
              icon={TextAlignRight}
              active={layer.settings.textAlign === "right"}
              onClick={() =>
                updateLayer(artboardId, layer.id, {
                  settings: { ...layer.settings, textAlign: "right" },
                })
              }
              title="Align right"
            />
          </div>
        </div>
      </CollapsibleSection>
    )
  }

  if (layer.type === "shader") {
    return (
      <CollapsibleSection title="Shader Settings">
        <div>
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Select
            value={layer.settings.type}
            onValueChange={(value) =>
              updateLayer(artboardId, layer.id, {
                settings: { ...layer.settings, type: value as typeof layer.settings.type },
              })
            }
          >
            <SelectTrigger className="h-8 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="meshGradient">Mesh Gradient</SelectItem>
              <SelectItem value="liquidMetal">Liquid Metal</SelectItem>
              <SelectItem value="chrome">Chrome</SelectItem>
              <SelectItem value="glass">Glass</SelectItem>
              <SelectItem value="voronoi">Voronoi</SelectItem>
              <SelectItem value="particles">Particles</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CollapsibleSection>
    )
  }

  if (layer.type === "media") {
    return (
      <CollapsibleSection title="Media Settings">
        <div>
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Select
            value={layer.settings.mediaType}
            onValueChange={(value) =>
              updateLayer(artboardId, layer.id, {
                settings: { ...layer.settings, mediaType: value as typeof layer.settings.mediaType },
              })
            }
          >
            <SelectTrigger className="h-8 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Fit</Label>
          <Select
            value={layer.settings.objectFit}
            onValueChange={(value) =>
              updateLayer(artboardId, layer.id, {
                settings: { ...layer.settings, objectFit: value as typeof layer.settings.objectFit },
              })
            }
          >
            <SelectTrigger className="h-8 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cover</SelectItem>
              <SelectItem value="contain">Contain</SelectItem>
              <SelectItem value="fill">Fill</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CollapsibleSection>
    )
  }

  return null
}

function EffectProperties({
  artboard,
}: {
  artboard: NonNullable<ReturnType<typeof useSelectedArtboard>>
}) {
  const updateArtboard = useCanvasStore((state) => state.updateArtboard)
  const { effect } = artboard

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Enabled</Label>
        <Switch
          checked={effect.enabled}
          onCheckedChange={(enabled) =>
            updateArtboard(artboard.id, {
              effect: { ...effect, enabled },
            })
          }
        />
      </div>

      {effect.enabled && (
        <>
          <div>
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select
              value={effect.type}
              onValueChange={(type: EffectType) =>
                updateArtboard(artboard.id, {
                  effect: { ...effect, type },
                })
              }
            >
              <SelectTrigger className="h-8 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ascii">ASCII</SelectItem>
                <SelectItem value="dither">Dither</SelectItem>
                <SelectItem value="halftone">Halftone</SelectItem>
                <SelectItem value="sinewarp">Sine Warp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {effect.type === "ascii" && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Cell Size</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Slider
                    value={[effect.ascii.cellSize]}
                    onValueChange={([value]) =>
                      updateArtboard(artboard.id, {
                        effect: {
                          ...effect,
                          ascii: { ...effect.ascii, cellSize: value },
                        },
                      })
                    }
                    min={4}
                    max={32}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-8 text-right">
                    {effect.ascii.cellSize}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Color</Label>
                <Switch
                  checked={effect.ascii.color}
                  onCheckedChange={(color) =>
                    updateArtboard(artboard.id, {
                      effect: {
                        ...effect,
                        ascii: { ...effect.ascii, color },
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Invert</Label>
                <Switch
                  checked={effect.ascii.invert}
                  onCheckedChange={(invert) =>
                    updateArtboard(artboard.id, {
                      effect: {
                        ...effect,
                        ascii: { ...effect.ascii, invert },
                      },
                    })
                  }
                />
              </div>
            </>
          )}

          {effect.type === "dither" && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Pixel Size</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Slider
                    value={[effect.dither.pixelSize]}
                    onValueChange={([value]) =>
                      updateArtboard(artboard.id, {
                        effect: {
                          ...effect,
                          dither: { ...effect.dither, pixelSize: value },
                        },
                      })
                    }
                    min={1}
                    max={16}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-8 text-right">
                    {effect.dither.pixelSize}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Algorithm</Label>
                <Select
                  value={effect.dither.algorithm}
                  onValueChange={(algorithm: typeof effect.dither.algorithm) =>
                    updateArtboard(artboard.id, {
                      effect: {
                        ...effect,
                        dither: { ...effect.dither, algorithm },
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-8 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="floydSteinberg">Floyd-Steinberg</SelectItem>
                    <SelectItem value="atkinson">Atkinson</SelectItem>
                    <SelectItem value="ordered4x4">Ordered 4x4</SelectItem>
                    <SelectItem value="bayer">Bayer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
