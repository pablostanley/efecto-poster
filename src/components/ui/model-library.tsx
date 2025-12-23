"use client"

import { useState, useMemo, useRef, useEffect, memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { MagnifyingGlass, Cube } from "@phosphor-icons/react"
import { type LibraryModel, type Input3DSettings } from "@/lib/types"
import {
  CURATED_MODELS,
  MODEL_CATEGORIES,
  searchCuratedModels,
  type CuratedModel
} from "@/lib/model-library-data"
import { GridCell, GridCellAction, GridContainer } from "./grid-cell"
import { CachedThumbnail, StaticThumbnail, LoadingPlaceholder } from "./thumbnail-renderer"

interface ModelLibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (model: LibraryModel) => void
  currentShape?: Input3DSettings["shape"]
  currentModelUrl?: string
}

// Lazy thumbnail that only loads when visible within its scroll container
// Uses CachedThumbnail which renders to static images
const LazyThumbnail = memo(function LazyThumbnail({
  id,
  url,
  name,
  isShape,
  shape,
  scrollRoot
}: {
  id: string
  url: string
  name: string
  isShape: boolean
  shape?: string
  scrollRoot?: Element | null
}) {
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
        // Use the scroll container as root for accurate visibility detection
        root: scrollRoot || null
      }
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [scrollRoot])

  return (
    <div ref={containerRef} className="w-full h-full">
      {isVisible ? (
        <CachedThumbnail
          type={isShape ? "shape" : "model"}
          id={id}
          shape={shape}
          url={url}
          name={name}
        />
      ) : (
        <LoadingPlaceholder />
      )}
    </div>
  )
})


// Main search dialog for browsing all models
export function ModelLibraryDialog({
  open,
  onOpenChange,
  onSelect,
  currentShape,
  currentModelUrl
}: ModelLibraryDialogProps) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const inputRef = useRef<HTMLInputElement>(null)
  // Store scroll container in state to trigger re-render when ref becomes available
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null)

  // Focus search input when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure dialog is rendered
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setSearch("")
      setCategory("All")
    }
  }, [open])

  const filteredModels = useMemo(() => {
    return searchCuratedModels(search, category)
  }, [search, category])

  const isSelected = (model: CuratedModel) => {
    if (model.url.startsWith("shape:")) {
      return currentShape === model.url.replace("shape:", "")
    }
    return currentModelUrl === model.url
  }

  const handleSelect = (model: CuratedModel) => {
    const libraryModel: LibraryModel = {
      id: model.id,
      name: model.name,
      category: "objects",
      url: model.url,
      thumbnailUrl: model.thumbnail,
      author: model.author,
      license: model.license,
      tags: model.tags,
    }
    onSelect(libraryModel)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[90vw] h-[70vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">Model Library</DialogTitle>

        {/* Header: Search + Categories */}
        <div className="shrink-0 p-4 pb-3 space-y-3 overflow-hidden">
          {/* Search */}
          <div className="relative w-full">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              ref={inputRef}
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1 w-full"
            />
          </div>

          {/* Categories - horizontally scrollable */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4">
            {MODEL_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? "default" : "ghost"}
                size="sm"
                onClick={() => setCategory(cat)}
                className="text-sm h-7 px-3 shrink-0"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Results - fixed height container */}
        <div ref={setScrollContainer} className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 min-h-0">
          {filteredModels.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 pb-4 w-full">
              {filteredModels.map((model) => {
                const isBasicShape = model.url.startsWith("shape:")
                const shape = isBasicShape ? model.url.replace("shape:", "") : null

                return (
                  <GridCell
                    key={model.id}
                    onClick={() => handleSelect(model)}
                    isSelected={isSelected(model)}
                    title={model.name}
                    className="relative group bg-muted/30"
                  >
                    <LazyThumbnail
                      id={model.id}
                      url={model.url}
                      name={model.name}
                      isShape={isBasicShape}
                      shape={shape || undefined}
                      scrollRoot={scrollContainer}
                    />
                    {/* Name on hover */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-white font-medium line-clamp-1">
                        {model.name}
                      </span>
                    </div>
                  </GridCell>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Cube className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No models found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-2 border-t text-xs text-muted-foreground/60 text-center">
          {filteredModels.length} models • CC0/CC-BY License
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Inline shape grid with search trigger
// Shows only 9 shapes + search icon to fit in 2 rows of 5
const GRID_SHAPE_IDS = [
  "shape-torusKnot",
  "shape-torus",
  "shape-sphere",
  "shape-box",
  "shape-cone",
  "shape-cylinder",
  "shape-icosahedron",
  "shape-octahedron",
  "shape-dodecahedron",
]

export function ShapeGridWithSearch({
  value,
  onChange,
  onSearchClick,
  modelType
}: {
  value: Input3DSettings["shape"]
  onChange: (shape: Input3DSettings["shape"]) => void
  onSearchClick: () => void
  modelType: "shape" | "gltf" | "svg"
}) {
  // Only show 9 specific shapes to maintain 2 rows
  const basicShapes = CURATED_MODELS.filter(m => GRID_SHAPE_IDS.includes(m.id))

  return (
    <div className="space-y-2">
      {/* Search button */}
      <button
        onClick={onSearchClick}
        className="w-full h-9 rounded-md border border-border bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground transition-all flex items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <MagnifyingGlass className="w-3.5 h-3.5" />
        <span>Browse models</span>
      </button>

      {/* Shape grid - uses static thumbnails to avoid WebGL context exhaustion */}
      <GridContainer columns={5}>
        {basicShapes.map((model) => {
          const shape = model.url.replace("shape:", "") as Input3DSettings["shape"]
          // Only show as selected if modelType is "shape" AND this shape matches
          const isSelected = modelType === "shape" && value === shape
          return (
            <GridCell
              key={model.id}
              onClick={() => onChange(shape)}
              isSelected={isSelected}
              title={model.name}
            >
              <StaticThumbnail id={model.id} name={model.name} />
            </GridCell>
          )
        })}
        {/* Search cell at end of grid */}
        <GridCellAction
          onClick={onSearchClick}
          icon={<MagnifyingGlass className="w-4 h-4" />}
          dashed
          title="Browse models"
        />
      </GridContainer>
    </div>
  )
}
