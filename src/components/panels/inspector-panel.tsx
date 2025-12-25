"use client"

import { useState } from "react"
import { useSelectedArtboard, useSelectedLayer, useCanvasStore, useCanvasSettings } from "@/lib/store"
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-muted/50 transition-colors"
      >
        {isOpen ? (
          <CaretDown className="w-3 h-3" />
        ) : (
          <CaretRight className="w-3 h-3" />
        )}
        <span className="text-sm font-medium flex-1 text-left">{title}</span>
        {action && (
          <div onClick={(e) => e.stopPropagation()}>{action}</div>
        )}
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  )
}

export function InspectorPanel() {
  const selectedArtboard = useSelectedArtboard()
  const selectedLayer = useSelectedLayer()

  // No selection - show canvas options
  if (!selectedArtboard && !selectedLayer) {
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

function ArtboardInspector({
  artboard,
}: {
  artboard: NonNullable<ReturnType<typeof useSelectedArtboard>>
}) {
  const updateArtboard = useCanvasStore((state) => state.updateArtboard)

  return (
    <>
      {/* Size */}
      <CollapsibleSection title="Size">
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
    </>
  )
}

// Alignment button component
function AlignButton({
  icon: Icon,
  active,
  onClick,
  title,
}: {
  icon: React.ElementType
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
      <CollapsibleSection title="Appearance">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Eye className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="number"
              value={Math.round(layer.opacity * 100)}
              onChange={(e) =>
                updateLayer(artboardId, layer.id, { opacity: (parseFloat(e.target.value) || 100) / 100 })
              }
              className="h-8 pl-7 pr-6 font-mono text-sm"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Visible</Label>
          <Switch
            checked={layer.visible}
            onCheckedChange={(visible) =>
              updateLayer(artboardId, layer.id, { visible })
            }
          />
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
                settings: { ...layer.settings, modelType: value },
              })
            }
          >
            <SelectTrigger className="h-8 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shape">Shape</SelectItem>
              <SelectItem value="uploaded">Custom Model</SelectItem>
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
                  settings: { ...layer.settings, shape: value },
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
      <CollapsibleSection title="Text Settings">
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

        <div>
          <Label className="text-xs text-muted-foreground">Font Size</Label>
          <div className="flex items-center gap-2 mt-1">
            <Slider
              value={[layer.settings.fontSize]}
              onValueChange={([value]) =>
                updateLayer(artboardId, layer.id, {
                  settings: { ...layer.settings, fontSize: value },
                })
              }
              min={8}
              max={200}
              step={1}
              className="flex-1"
            />
            <span className="text-xs font-mono w-10 text-right">
              {layer.settings.fontSize}px
            </span>
          </div>
        </div>

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
      </CollapsibleSection>
    )
  }

  if (layer.type === "shader") {
    return (
      <CollapsibleSection title="Shader Settings">
        <div>
          <Label className="text-xs text-muted-foreground">Preset</Label>
          <Select
            value={layer.settings.preset}
            onValueChange={(value) =>
              updateLayer(artboardId, layer.id, {
                settings: { ...layer.settings, preset: value },
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
                settings: { ...layer.settings, mediaType: value },
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
            value={layer.settings.fit}
            onValueChange={(value) =>
              updateLayer(artboardId, layer.id, {
                settings: { ...layer.settings, fit: value },
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
