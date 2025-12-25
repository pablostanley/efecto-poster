"use client"

import { useEffect } from "react"
import { InfiniteCanvas } from "@/components/canvas/infinite-canvas"
import { ToolBar } from "@/components/panels/toolbar"
import { LayersPanel } from "@/components/panels/layers-panel"
import { InspectorPanel } from "@/components/panels/inspector-panel"
import { HeaderToolbar } from "@/components/panels/header-toolbar"
import { useCanvasStore } from "@/lib/store"
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts"

export default function Home() {
  const addArtboard = useCanvasStore((state) => state.addArtboard)
  const artboards = useCanvasStore((state) => state.artboards)

  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  // Create initial artboard on mount
  useEffect(() => {
    if (artboards.length === 0) {
      addArtboard([0, 0])
    }
  }, [])

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      {/* Header Toolbar */}
      <HeaderToolbar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Layers */}
        <aside className="w-60 border-r bg-card flex flex-col shrink-0">
          <LayersPanel />
        </aside>

        {/* Canvas */}
        <main className="flex-1 min-w-0 bg-muted/30">
          <InfiniteCanvas />
        </main>

        {/* Right Panel - Inspector */}
        <aside className="w-72 border-l bg-card flex flex-col shrink-0">
          <InspectorPanel />
        </aside>
      </div>

      {/* Bottom Toolbar */}
      <ToolBar />
    </div>
  )
}
