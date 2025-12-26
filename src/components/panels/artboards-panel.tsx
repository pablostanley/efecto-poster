"use client"

import { Button } from "@/components/ui/button"
import {
  FrameCorners,
  Plus,
  Trash,
  Copy,
  Eye,
  EyeSlash,
  CaretDown,
  CaretRight,
  Cube,
  Image as ImageIcon,
  TextT,
  Sparkle,
} from "@phosphor-icons/react"
import { useCanvasStore, useSelectedArtboard } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Artboard as ArtboardType, LayerType } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"

export function ArtboardsPanel() {
  const artboards = useCanvasStore((state) => state.artboards)
  const selectedArtboardId = useCanvasStore((state) => state.editor.selectedArtboardId)
  const selectArtboard = useCanvasStore((state) => state.selectArtboard)
  const addArtboard = useCanvasStore((state) => state.addArtboard)
  const deleteArtboard = useCanvasStore((state) => state.deleteArtboard)
  const duplicateArtboard = useCanvasStore((state) => state.duplicateArtboard)

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium">Artboards</h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => addArtboard([Math.random() * 400 - 200, Math.random() * 400 - 200])}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-1">
        {artboards.map((artboard) => (
          <ArtboardItem
            key={artboard.id}
            artboard={artboard}
            isSelected={artboard.id === selectedArtboardId}
            onSelect={() => selectArtboard(artboard.id)}
            onDelete={() => deleteArtboard(artboard.id)}
            onDuplicate={() => duplicateArtboard(artboard.id)}
          />
        ))}

        {artboards.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No artboards yet.
            <br />
            Click + to create one.
          </div>
        )}
      </div>
    </div>
  )
}

function ArtboardItem({
  artboard,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  artboard: ArtboardType
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const addLayer = useCanvasStore((state) => state.addLayer)
  const deleteLayer = useCanvasStore((state) => state.deleteLayer)
  const selectLayer = useCanvasStore((state) => state.selectLayer)
  const selectedLayerIds = useCanvasStore((state) => state.editor.selectedLayerIds)
  const toggleLayerVisibility = useCanvasStore((state) => state.toggleLayerVisibility)

  const layerIcons = {
    "3d": Cube,
    media: ImageIcon,
    shader: Sparkle,
    text: TextT,
  }

  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        isSelected ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"
      )}
    >
      {/* Artboard header */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 cursor-pointer"
        onClick={onSelect}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className="p-0.5 hover:bg-muted rounded"
        >
          {isExpanded ? (
            <CaretDown className="w-3 h-3" />
          ) : (
            <CaretRight className="w-3 h-3" />
          )}
        </button>

        <FrameCorners className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm flex-1 truncate">{artboard.name}</span>

        <span className="text-xs text-muted-foreground">
          {artboard.size.width}×{artboard.size.height}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">Artboard menu</span>
              ...
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Layers list */}
      {isExpanded && isSelected && (
        <div className="pl-4 pr-2 pb-2 space-y-0.5">
          {artboard.layers.map((layer) => {
            const Icon = layerIcons[layer.type]
            return (
              <div
                key={layer.id}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded text-sm cursor-pointer",
                  selectedLayerIds.includes(layer.id)
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  selectLayer(layer.id)
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="flex-1 truncate">{layer.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleLayerVisibility(artboard.id, layer.id)
                  }}
                  className="p-0.5 hover:bg-muted rounded opacity-60 hover:opacity-100"
                >
                  {layer.visible ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeSlash className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )
          })}

          {/* Add layer button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 justify-start text-muted-foreground"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Layer
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => addLayer(artboard.id, "3d")}>
                <Cube className="w-4 h-4 mr-2" />
                3D Object
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addLayer(artboard.id, "media")}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Media
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addLayer(artboard.id, "shader")}>
                <Sparkle className="w-4 h-4 mr-2" />
                Shader
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addLayer(artboard.id, "text")}>
                <TextT className="w-4 h-4 mr-2" />
                Text
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
