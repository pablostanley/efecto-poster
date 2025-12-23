"use client"

import { Button } from "@/components/ui/button"
import { Cursor, Hand, MagnifyingGlassPlus } from "@phosphor-icons/react"
import { useCanvasStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export function ToolBar() {
  const tool = useCanvasStore((state) => state.editor.tool)
  const setTool = useCanvasStore((state) => state.setTool)
  const zoom = useCanvasStore((state) => state.camera.zoom)
  const resetCamera = useCanvasStore((state) => state.resetCamera)

  const tools = [
    { id: "select" as const, icon: Cursor, label: "Select (V)" },
    { id: "pan" as const, icon: Hand, label: "Pan (Space)" },
    { id: "zoom" as const, icon: MagnifyingGlassPlus, label: "Zoom (Z)" },
  ]

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card border rounded-full px-2 py-1 shadow-lg">
      {tools.map(({ id, icon: Icon, label }) => (
        <Button
          key={id}
          variant={tool === id ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setTool(id)}
          className={cn(
            "rounded-full w-9 h-9 p-0",
            tool === id && "bg-primary text-primary-foreground"
          )}
          title={label}
        >
          <Icon className="w-4 h-4" />
        </Button>
      ))}

      <div className="w-px h-6 bg-border mx-1" />

      <div className="flex items-center gap-1 px-2">
        <span className="text-xs text-muted-foreground font-mono">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetCamera}
          className="text-xs h-6 px-2"
        >
          Reset
        </Button>
      </div>
    </div>
  )
}
