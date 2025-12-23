"use client"

import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface GridCellProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isSelected?: boolean
  children: ReactNode
  /** Optional background style (for materials, etc.) */
  background?: string
  /** Aspect ratio: square (default), video (16:9) */
  aspect?: "square" | "video"
}

/**
 * Reusable grid cell component for consistent UI across all grids.
 * Used for: models, shapes, SVGs, videos, images, materials, etc.
 */
export const GridCell = forwardRef<HTMLButtonElement, GridCellProps>(
  ({ isSelected = false, children, background, aspect = "square", className, style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "rounded-md border-2 overflow-hidden transition-all cursor-pointer",
          aspect === "square" ? "aspect-square" : "aspect-video",
          isSelected
            ? "border-foreground"
            : "border-transparent hover:border-muted-foreground/50",
          className
        )}
        style={{
          background,
          ...style,
        }}
        aria-pressed={isSelected}
        {...props}
      >
        {children}
      </button>
    )
  }
)

GridCell.displayName = "GridCell"

interface GridCellIconProps extends Omit<GridCellProps, "children"> {
  icon: ReactNode
}

/**
 * Grid cell variant for displaying icons (SVGs, actions)
 */
export const GridCellIcon = forwardRef<HTMLButtonElement, GridCellIconProps>(
  ({ icon, isSelected = false, className, ...props }, ref) => {
    return (
      <GridCell
        ref={ref}
        isSelected={isSelected}
        className={cn(
          "flex items-center justify-center bg-muted/30",
          isSelected && "bg-accent",
          className
        )}
        {...props}
      >
        <span className={cn(
          "transition-colors",
          isSelected ? "text-foreground" : "text-muted-foreground"
        )}>
          {icon}
        </span>
      </GridCell>
    )
  }
)

GridCellIcon.displayName = "GridCellIcon"

interface GridCellActionProps extends Omit<GridCellProps, "children" | "isSelected"> {
  icon: ReactNode
  /** Whether to use dashed border (for "add" actions) */
  dashed?: boolean
}

/**
 * Grid cell variant for action buttons (search, add, etc.)
 */
export const GridCellAction = forwardRef<HTMLButtonElement, GridCellActionProps>(
  ({ icon, dashed = false, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "aspect-square rounded-md overflow-hidden transition-all flex items-center justify-center cursor-pointer",
          "bg-muted/30 hover:bg-muted/50",
          dashed
            ? "border-2 border-dashed border-border hover:border-muted-foreground"
            : "border-2 border-transparent hover:border-muted-foreground/50",
          className
        )}
        {...props}
      >
        <span className="text-muted-foreground">{icon}</span>
      </button>
    )
  }
)

GridCellAction.displayName = "GridCellAction"

interface PresetButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isSelected?: boolean
  children: ReactNode
}

/**
 * Reusable preset button with consistent hover/selected states.
 * Used for: shader presets, color presets, effect presets, etc.
 */
export const PresetButton = forwardRef<HTMLButtonElement, PresetButtonProps>(
  ({ isSelected = false, children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "h-7 px-2 text-sm rounded-md border transition-all cursor-pointer",
          "hover:bg-accent hover:text-accent-foreground",
          isSelected
            ? "border-foreground bg-accent text-accent-foreground"
            : "border-input bg-background",
          className
        )}
        aria-pressed={isSelected}
        {...props}
      >
        {children}
      </button>
    )
  }
)

PresetButton.displayName = "PresetButton"

interface ToggleButtonGroupProps {
  children: ReactNode
  className?: string
}

/**
 * Container for toggle button groups
 */
export function ToggleButtonGroup({ children, className }: ToggleButtonGroupProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {children}
    </div>
  )
}

/**
 * Grid container with consistent column layout
 */
export function GridContainer({
  children,
  columns = 5,
  gap = "gap-1.5",
  className
}: {
  children: ReactNode
  columns?: 4 | 5 | 6
  gap?: string
  className?: string
}) {
  const colsClass = {
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  }[columns]

  return (
    <div className={cn("grid", colsClass, gap, className)}>
      {children}
    </div>
  )
}
