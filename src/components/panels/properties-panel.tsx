"use client"

import { useSelectedArtboard, useSelectedLayer, useCanvasStore } from "@/lib/store"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import type { EffectType, Layer } from "@/lib/types"

export function PropertiesPanel() {
  const selectedArtboard = useSelectedArtboard()
  const selectedLayer = useSelectedLayer()

  if (!selectedArtboard) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Select an artboard to view properties
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Artboard Properties */}
      <ArtboardProperties artboard={selectedArtboard} />

      <Separator />

      {/* Layer Properties */}
      {selectedLayer ? (
        <LayerProperties layer={selectedLayer} artboardId={selectedArtboard.id} />
      ) : (
        <div className="text-center text-muted-foreground text-sm py-4">
          Select a layer to edit
        </div>
      )}

      <Separator />

      {/* Effect Settings */}
      <EffectProperties artboard={selectedArtboard} />
    </div>
  )
}

function ArtboardProperties({ artboard }: { artboard: ReturnType<typeof useSelectedArtboard> }) {
  const updateArtboard = useCanvasStore((state) => state.updateArtboard)

  if (!artboard) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Artboard</h3>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Width</Label>
          <div className="text-sm font-mono">{artboard.size.width}px</div>
        </div>
        <div>
          <Label className="text-xs">Height</Label>
          <div className="text-sm font-mono">{artboard.size.height}px</div>
        </div>
      </div>

      <div>
        <Label className="text-xs">Background</Label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="color"
            value={artboard.backgroundColor}
            onChange={(e) =>
              updateArtboard(artboard.id, { backgroundColor: e.target.value })
            }
            className="w-8 h-8 rounded border cursor-pointer"
          />
          <span className="text-sm font-mono">{artboard.backgroundColor}</span>
        </div>
      </div>
    </div>
  )
}

function LayerProperties({
  layer,
  artboardId,
}: {
  layer: Layer
  artboardId: string
}) {
  const updateLayer = useCanvasStore((state) => state.updateLayer)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Layer: {layer.name}</h3>

      <div>
        <Label className="text-xs">Opacity</Label>
        <div className="flex items-center gap-2">
          <Slider
            value={[layer.opacity * 100]}
            onValueChange={([value]) =>
              updateLayer(artboardId, layer.id, { opacity: value / 100 })
            }
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-xs font-mono w-10 text-right">
            {Math.round(layer.opacity * 100)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">X Position</Label>
          <Slider
            value={[layer.transform.x]}
            onValueChange={([value]) =>
              updateLayer(artboardId, layer.id, {
                transform: { ...layer.transform, x: value },
              })
            }
            min={-100}
            max={100}
            step={1}
          />
        </div>
        <div>
          <Label className="text-xs">Y Position</Label>
          <Slider
            value={[layer.transform.y]}
            onValueChange={([value]) =>
              updateLayer(artboardId, layer.id, {
                transform: { ...layer.transform, y: value },
              })
            }
            min={-100}
            max={100}
            step={1}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Scale</Label>
        <div className="flex items-center gap-2">
          <Slider
            value={[layer.transform.scale * 100]}
            onValueChange={([value]) =>
              updateLayer(artboardId, layer.id, {
                transform: { ...layer.transform, scale: value / 100 },
              })
            }
            min={10}
            max={200}
            step={1}
            className="flex-1"
          />
          <span className="text-xs font-mono w-10 text-right">
            {Math.round(layer.transform.scale * 100)}%
          </span>
        </div>
      </div>

      <div>
        <Label className="text-xs">Rotation</Label>
        <div className="flex items-center gap-2">
          <Slider
            value={[layer.transform.rotation]}
            onValueChange={([value]) =>
              updateLayer(artboardId, layer.id, {
                transform: { ...layer.transform, rotation: value },
              })
            }
            min={-180}
            max={180}
            step={1}
            className="flex-1"
          />
          <span className="text-xs font-mono w-10 text-right">
            {Math.round(layer.transform.rotation)}°
          </span>
        </div>
      </div>
    </div>
  )
}

function EffectProperties({ artboard }: { artboard: ReturnType<typeof useSelectedArtboard> }) {
  const updateArtboard = useCanvasStore((state) => state.updateArtboard)

  if (!artboard) return null

  const { effect } = artboard

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Effects</h3>
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
            <Label className="text-xs">Effect Type</Label>
            <Select
              value={effect.type}
              onValueChange={(type: EffectType) =>
                updateArtboard(artboard.id, {
                  effect: { ...effect, type },
                })
              }
            >
              <SelectTrigger className="h-8">
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
            <AsciiEffectProperties
              settings={effect.ascii}
              onChange={(ascii) =>
                updateArtboard(artboard.id, {
                  effect: { ...effect, ascii: { ...effect.ascii, ...ascii } },
                })
              }
            />
          )}

          {effect.type === "dither" && (
            <DitherEffectProperties
              settings={effect.dither}
              onChange={(dither) =>
                updateArtboard(artboard.id, {
                  effect: { ...effect, dither: { ...effect.dither, ...dither } },
                })
              }
            />
          )}
        </>
      )}
    </div>
  )
}

function AsciiEffectProperties({
  settings,
  onChange,
}: {
  settings: ReturnType<typeof useSelectedArtboard>["effect"]["ascii"]
  onChange: (settings: Partial<typeof settings>) => void
}) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs">Cell Size</Label>
        <Slider
          value={[settings.cellSize]}
          onValueChange={([value]) => onChange({ cellSize: value })}
          min={4}
          max={32}
          step={1}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Color Mode</Label>
        <Switch
          checked={settings.color}
          onCheckedChange={(color) => onChange({ color })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Invert</Label>
        <Switch
          checked={settings.invert}
          onCheckedChange={(invert) => onChange({ invert })}
        />
      </div>
    </div>
  )
}

function DitherEffectProperties({
  settings,
  onChange,
}: {
  settings: ReturnType<typeof useSelectedArtboard>["effect"]["dither"]
  onChange: (settings: Partial<typeof settings>) => void
}) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs">Pixel Size</Label>
        <Slider
          value={[settings.pixelSize]}
          onValueChange={([value]) => onChange({ pixelSize: value })}
          min={1}
          max={16}
          step={1}
        />
      </div>
      <div>
        <Label className="text-xs">Algorithm</Label>
        <Select
          value={settings.algorithm}
          onValueChange={(algorithm: typeof settings.algorithm) =>
            onChange({ algorithm })
          }
        >
          <SelectTrigger className="h-8">
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
    </div>
  )
}
