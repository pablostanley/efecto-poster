"use client"

import { Button } from "@/components/ui/button"
import {
  IceCream,
  Plus,
  Cube,
  Image as ImageIcon,
  TextT,
  Sparkle,
  FrameCorners,
  Export,
  CaretDown,
} from "@phosphor-icons/react"
import { useCanvasStore, useSelectedArtboard } from "@/lib/store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export function HeaderToolbar() {
  const addArtboard = useCanvasStore((state) => state.addArtboard)
  const addLayer = useCanvasStore((state) => state.addLayer)
  const selectedArtboard = useSelectedArtboard()

  const handleAddLayer = (type: "3d" | "media" | "shader" | "text") => {
    if (selectedArtboard) {
      addLayer(selectedArtboard.id, type)
    }
  }

  return (
    <header className="h-12 border-b flex items-center px-2 bg-card shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 border-r h-full">
        <IceCream className="w-5 h-5" weight="fill" />
        <span className="text-sm font-semibold tracking-tight">efecto</span>
      </div>

      {/* Insert Tools */}
      <div className="flex items-center gap-1 px-2">
        {/* Insert Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 h-8">
              <Plus className="w-4 h-4" />
              Insert
              <CaretDown className="w-3 h-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => addArtboard([200, 0])}>
              <FrameCorners className="w-4 h-4 mr-2" />
              Artboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleAddLayer("3d")}
              disabled={!selectedArtboard}
            >
              <Cube className="w-4 h-4 mr-2" />
              3D Object
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAddLayer("media")}
              disabled={!selectedArtboard}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Image / Video
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAddLayer("shader")}
              disabled={!selectedArtboard}
            >
              <Sparkle className="w-4 h-4 mr-2" />
              Shader
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAddLayer("text")}
              disabled={!selectedArtboard}
            >
              <TextT className="w-4 h-4 mr-2" />
              Text
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick add buttons */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8"
          onClick={() => handleAddLayer("3d")}
          disabled={!selectedArtboard}
        >
          <Cube className="w-4 h-4" />
          3D
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8"
          onClick={() => handleAddLayer("media")}
          disabled={!selectedArtboard}
        >
          <ImageIcon className="w-4 h-4" />
          Media
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8"
          onClick={() => handleAddLayer("text")}
          disabled={!selectedArtboard}
        >
          <TextT className="w-4 h-4" />
          Text
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8"
          onClick={() => handleAddLayer("shader")}
          disabled={!selectedArtboard}
        >
          <Sparkle className="w-4 h-4" />
          Shader
        </Button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Project name (center) */}
      <div className="absolute left-1/2 -translate-x-1/2 text-sm text-muted-foreground">
        Untitled Project
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 px-2">
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Export className="w-4 h-4" />
          Export
        </Button>
      </div>
    </header>
  )
}
