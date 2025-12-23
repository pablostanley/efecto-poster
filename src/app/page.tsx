"use client"

import { useEffect } from "react"
import { InfiniteCanvas } from "@/components/canvas/infinite-canvas"
import { ToolBar } from "@/components/panels/toolbar"
import { ArtboardsPanel } from "@/components/panels/artboards-panel"
import { PropertiesPanel } from "@/components/panels/properties-panel"
import { useCanvasStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Plus, IceCream } from "@phosphor-icons/react"

export default function Home() {
  const addArtboard = useCanvasStore((state) => state.addArtboard)
  const artboards = useCanvasStore((state) => state.artboards)

  // Create initial artboard on mount
  useEffect(() => {
    if (artboards.length === 0) {
      addArtboard([0, 0])
    }
  }, [])

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
            <IceCream className="w-4 h-4" weight="fill" />
            efecto poster
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => addArtboard([200, 0])}
          >
            <Plus className="w-4 h-4 mr-1" />
            New Artboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Artboards */}
        <aside className="w-64 border-r bg-card/50 overflow-y-auto shrink-0">
          <ArtboardsPanel />
        </aside>

        {/* Canvas */}
        <main className="flex-1 min-w-0">
          <InfiniteCanvas />
        </main>

        {/* Right Panel - Properties */}
        <aside className="w-72 border-l bg-card/50 overflow-y-auto shrink-0">
          <PropertiesPanel />
        </aside>
      </div>

      {/* Toolbar */}
      <ToolBar />
    </div>
  )
}
