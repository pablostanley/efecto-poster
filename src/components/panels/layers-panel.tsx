"use client"

import { useState, useRef } from "react"
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
  DotsSixVertical,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
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
  const selectedLayerIds = useCanvasStore((state) => state.editor.selectedLayerIds)

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
          selectedLayerIds={selectedLayerIds}
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
  selectedLayerIds,
  searchQuery,
}: {
  artboard: ArtboardType
  isSelected: boolean
  selectedLayerIds: string[]
  searchQuery: string
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const selectArtboard = useCanvasStore((state) => state.selectArtboard)
  const deleteArtboard = useCanvasStore((state) => state.deleteArtboard)
  const duplicateArtboard = useCanvasStore((state) => state.duplicateArtboard)
  const pasteLayer = useCanvasStore((state) => state.pasteLayer)
  const reorderLayers = useCanvasStore((state) => state.reorderLayers)
  const saveToHistory = useCanvasStore((state) => state._saveToHistory)
  const clipboard = useCanvasStore((state) => state._clipboard)

  const filteredLayers = artboard.layers.filter((layer) => {
    if (!searchQuery) return true
    return layer.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (index: number) => {
    if (draggedIndex === null) return
    setDropTargetIndex(index)
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && dropTargetIndex !== null && draggedIndex !== dropTargetIndex) {
      saveToHistory()
      reorderLayers(artboard.id, draggedIndex, dropTargetIndex)
    }
    setDraggedIndex(null)
    setDropTargetIndex(null)
  }

  const handlePaste = () => {
    saveToHistory()
    pasteLayer(artboard.id)
  }

  const handleDuplicate = () => {
    saveToHistory()
    duplicateArtboard(artboard.id)
  }

  const handleDelete = () => {
    saveToHistory()
    deleteArtboard(artboard.id)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
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
                <DropdownMenuItem onClick={handlePaste} disabled={clipboard.length === 0}>
                  Paste Layer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
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
              {filteredLayers.map((layer, index) => (
                <LayerTreeItem
                  key={layer.id}
                  layer={layer}
                  artboardId={artboard.id}
                  index={index}
                  isSelected={selectedLayerIds.includes(layer.id)}
                  isDragging={draggedIndex === index}
                  isDropTarget={dropTargetIndex === index && draggedIndex !== index}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={() => handleDragOver(index)}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handlePaste} disabled={clipboard.length === 0}>
          Paste Layer
          <ContextMenuShortcut>Cmd+V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDuplicate}>
          <Copy className="w-4 h-4 mr-2" />
          Duplicate Artboard
          <ContextMenuShortcut>Cmd+D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} className="text-destructive">
          <Trash className="w-4 h-4 mr-2" />
          Delete Artboard
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
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
  index,
  isSelected,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  layer: Layer
  artboardId: string
  index: number
  isSelected: boolean
  isDragging: boolean
  isDropTarget: boolean
  onDragStart: () => void
  onDragOver: () => void
  onDragEnd: () => void
}) {
  const selectLayer = useCanvasStore((state) => state.selectLayer)
  const toggleSelection = useCanvasStore((state) => state.toggleSelection)
  const deleteLayer = useCanvasStore((state) => state.deleteLayer)
  const duplicateLayer = useCanvasStore((state) => state.duplicateLayer)
  const copyLayer = useCanvasStore((state) => state.copyLayer)
  const pasteLayer = useCanvasStore((state) => state.pasteLayer)
  const toggleLayerVisibility = useCanvasStore((state) => state.toggleLayerVisibility)
  const toggleLayerLock = useCanvasStore((state) => state.toggleLayerLock)
  const saveToHistory = useCanvasStore((state) => state._saveToHistory)
  const clipboard = useCanvasStore((state) => state._clipboard)

  const Icon = layerIcons[layer.type]

  const handleCopy = () => {
    copyLayer(artboardId, layer.id)
  }

  const handlePaste = () => {
    saveToHistory()
    pasteLayer(artboardId)
  }

  const handleDuplicate = () => {
    saveToHistory()
    duplicateLayer(artboardId, layer.id)
  }

  const handleDelete = () => {
    saveToHistory()
    deleteLayer(artboardId, layer.id)
  }

  const handleToggleVisibility = () => {
    saveToHistory()
    toggleLayerVisibility(artboardId, layer.id)
  }

  const handleToggleLock = () => {
    saveToHistory()
    toggleLayerLock(artboardId, layer.id)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move"
            onDragStart()
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = "move"
            onDragOver()
          }}
          onDragEnd={onDragEnd}
          onDrop={(e) => {
            e.preventDefault()
            onDragEnd()
          }}
          className={cn(
            "group flex items-center gap-1 px-1 py-1 cursor-pointer hover:bg-muted/50 rounded-sm mx-1 transition-all",
            isSelected && "bg-primary text-primary-foreground",
            isDragging && "opacity-50",
            isDropTarget && "border-t-2 border-primary"
          )}
          onClick={(e) => {
            if (e.shiftKey || e.metaKey || e.ctrlKey) {
              // Shift/Cmd+click: toggle selection
              toggleSelection(layer.id)
            } else {
              // Normal click: replace selection
              selectLayer(layer.id)
            }
          }}
        >
          {/* Drag handle */}
          <DotsSixVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
          <Icon className={cn("w-4 h-4 shrink-0", !isSelected && layerColors[layer.type])} />
          <span className="flex-1 text-sm truncate">{layer.name}</span>

          {/* Visibility toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggleVisibility()
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
              handleToggleLock()
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
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePaste} disabled={clipboard.length === 0}>
                Paste
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleVisibility}>
                {layer.visible ? "Hide" : "Show"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleLock}>
                {layer.locked ? "Unlock" : "Lock"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleCopy}>
          <Copy className="w-4 h-4 mr-2" />
          Copy
          <ContextMenuShortcut>Cmd+C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handlePaste} disabled={clipboard.length === 0}>
          Paste
          <ContextMenuShortcut>Cmd+V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDuplicate}>
          Duplicate
          <ContextMenuShortcut>Cmd+D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleToggleVisibility}>
          {layer.visible ? (
            <>
              <EyeSlash className="w-4 h-4 mr-2" />
              Hide
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Show
            </>
          )}
          <ContextMenuShortcut>H</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleToggleLock}>
          {layer.locked ? (
            <>
              <LockSimpleOpen className="w-4 h-4 mr-2" />
              Unlock
            </>
          ) : (
            <>
              <LockSimple className="w-4 h-4 mr-2" />
              Lock
            </>
          )}
          <ContextMenuShortcut>L</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} className="text-destructive">
          <Trash className="w-4 h-4 mr-2" />
          Delete
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
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
