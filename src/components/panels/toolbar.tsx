"use client"

import { Button } from "@/components/ui/button"
import { Cursor, Hand, MagnifyingGlassPlus, CaretDown } from "@phosphor-icons/react"
import { useCanvasStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ToolBar() {
  const tool = useCanvasStore((state) => state.editor.tool)
  const setTool = useCanvasStore((state) => state.setTool)
  const zoom = useCanvasStore((state) => state.camera.zoom)
  const resetCamera = useCanvasStore((state) => state.resetCamera)
  const setCamera = useCanvasStore((state) => state.setCamera)

  const tools = [
    { id: "select" as const, icon: Cursor, label: "Select (V)" },
    { id: "pan" as const, icon: Hand, label: "Pan (Space)" },
    { id: "zoom" as const, icon: MagnifyingGlassPlus, label: "Zoom (Z)" },
  ]

  const zoomLevels = [25, 50, 75, 100, 125, 150, 200, 300, 400]
  const currentZoomPercent = Math.round(zoom * 100)

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card border rounded-lg px-1.5 py-1 shadow-lg">
      {/* Tool buttons */}
      {tools.map(({ id, icon: Icon, label }) => (
        <Button
          key={id}
          variant="ghost"
          size="sm"
          onClick={() => setTool(id)}
          className={cn(
            "w-8 h-8 p-0",
            tool === id && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
          )}
          title={label}
        >
          <Icon className="w-4 h-4" />
        </Button>
      ))}

      <div className="w-px h-5 bg-border mx-1" />

      {/* Zoom dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 min-w-[70px]">
            <span className="text-xs font-mono">{currentZoomPercent}%</span>
            <CaretDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          {zoomLevels.map((level) => (
            <DropdownMenuItem
              key={level}
              onClick={() => setCamera({ zoom: level / 100 })}
              className={cn(
                "justify-center font-mono text-xs",
                currentZoomPercent === level && "bg-accent"
              )}
            >
              {level}%
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onClick={resetCamera}
            className="justify-center text-xs border-t mt-1 pt-1"
          >
            Fit to Canvas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
