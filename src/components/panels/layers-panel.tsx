"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  FrameCorners,
  Cube,
  Image as ImageIcon,
  TextT,
  Sparkle,
  Eye,
  EyeSlash,
  LockSimple,
  LockSimpleOpen,
  CaretDown,
  CaretRight,
  MagnifyingGlass,
  DotsThree,
  Trash,
  Copy,
} from "@phosphor-icons/react"
import { useCanvasStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Artboard as ArtboardType, Layer } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

type TabType = "layers" | "assets"

export function LayersPanel() {
  const [activeTab, setActiveTab] = useState<TabType>("layers")
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b shrink-0">
        <button
          onClick={() => setActiveTab("layers")}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "layers"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Layers
        </button>
        <button
          onClick={() => setActiveTab("assets")}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "assets"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Assets
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b shrink-0">
        <div className="relative">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "layers" ? (
          <LayerTreeContent searchQuery={searchQuery} />
        ) : (
          <AssetsContent />
        )}
      </div>
    </div>
  )
}

function LayerTreeContent({ searchQuery }: { searchQuery: string }) {
  const artboards = useCanvasStore((state) => state.artboards)
  const selectedArtboardId = useCanvasStore((state) => state.editor.selectedArtboardId)
  const selectedLayerId = useCanvasStore((state) => state.editor.selectedLayerId)

  const filteredArtboards = artboards.filter((artboard) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    if (artboard.name.toLowerCase().includes(query)) return true
    return artboard.layers.some((layer) =>
      layer.name.toLowerCase().includes(query)
    )
  })

  return (
    <div className="py-1">
      {filteredArtboards.map((artboard) => (
        <ArtboardTreeItem
          key={artboard.id}
          artboard={artboard}
          isSelected={artboard.id === selectedArtboardId}
          selectedLayerId={selectedLayerId}
          searchQuery={searchQuery}
        />
      ))}

      {filteredArtboards.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {searchQuery ? "No results found" : "No artboards yet"}
        </div>
      )}
    </div>
  )
}

function ArtboardTreeItem({
  artboard,
  isSelected,
  selectedLayerId,
  searchQuery,
}: {
  artboard: ArtboardType
  isSelected: boolean
  selectedLayerId: string | null
  searchQuery: string
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const selectArtboard = useCanvasStore((state) => state.selectArtboard)
  const deleteArtboard = useCanvasStore((state) => state.deleteArtboard)
  const duplicateArtboard = useCanvasStore((state) => state.duplicateArtboard)

  const filteredLayers = artboard.layers.filter((layer) => {
    if (!searchQuery) return true
    return layer.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div>
      {/* Artboard row */}
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-muted/50",
          isSelected && "bg-primary/10"
        )}
        onClick={() => selectArtboard(artboard.id)}
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

        <FrameCorners className="w-4 h-4 text-blue-500" />
        <span className="flex-1 text-sm truncate">{artboard.name}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <DotsThree className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => duplicateArtboard(artboard.id)}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => deleteArtboard(artboard.id)}
              className="text-destructive"
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Layers */}
      {isExpanded && (
        <div className="ml-4">
          {filteredLayers.map((layer) => (
            <LayerTreeItem
              key={layer.id}
              layer={layer}
              artboardId={artboard.id}
              isSelected={layer.id === selectedLayerId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const layerIcons = {
  "3d": Cube,
  media: ImageIcon,
  shader: Sparkle,
  text: TextT,
}

const layerColors = {
  "3d": "text-purple-500",
  media: "text-green-500",
  shader: "text-orange-500",
  text: "text-blue-500",
}

function LayerTreeItem({
  layer,
  artboardId,
  isSelected,
}: {
  layer: Layer
  artboardId: string
  isSelected: boolean
}) {
  const selectLayer = useCanvasStore((state) => state.selectLayer)
  const deleteLayer = useCanvasStore((state) => state.deleteLayer)
  const duplicateLayer = useCanvasStore((state) => state.duplicateLayer)
  const toggleLayerVisibility = useCanvasStore((state) => state.toggleLayerVisibility)
  const toggleLayerLock = useCanvasStore((state) => state.toggleLayerLock)

  const Icon = layerIcons[layer.type]

  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-muted/50 rounded-sm mx-1",
        isSelected && "bg-primary text-primary-foreground"
      )}
      onClick={() => selectLayer(layer.id)}
    >
      <Icon className={cn("w-4 h-4", !isSelected && layerColors[layer.type])} />
      <span className="flex-1 text-sm truncate">{layer.name}</span>

      {/* Visibility toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleLayerVisibility(artboardId, layer.id)
        }}
        className={cn(
          "p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted",
          !layer.visible && "opacity-100"
        )}
      >
        {layer.visible ? (
          <Eye className="w-3.5 h-3.5" />
        ) : (
          <EyeSlash className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Lock toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleLayerLock(artboardId, layer.id)
        }}
        className={cn(
          "p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted",
          layer.locked && "opacity-100"
        )}
      >
        {layer.locked ? (
          <LockSimple className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <LockSimpleOpen className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <DotsThree className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => duplicateLayer(artboardId, layer.id)}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => deleteLayer(artboardId, layer.id)}
            className="text-destructive"
          >
            <Trash className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function AssetsContent() {
  return (
    <div className="p-4 text-center text-muted-foreground text-sm">
      <p>Asset library coming soon</p>
      <p className="text-xs mt-1">Drag & drop images and models here</p>
    </div>
  )
}
