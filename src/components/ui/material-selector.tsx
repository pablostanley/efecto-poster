"use client"

import { useMemo } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MATERIAL_PRESETS, type MaterialType, type MaterialCategory } from "@/lib/types"
import { GridCell, GridContainer } from "./grid-cell"
import { SectionLabel } from "./control-row"

interface MaterialSelectorProps {
  value: MaterialType
  onChange: (material: MaterialType) => void
  showCategories?: boolean
  showOriginal?: boolean // Show "Original" option (for GLTF models)
}

const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  basic: "Basic",
  metallic: "Metallic",
  dynamic: "Dynamic",
  glass: "Glass",
}

const CATEGORY_ORDER: MaterialCategory[] = ["basic", "metallic", "glass", "dynamic"]

// Color swatches for material preview
const MATERIAL_COLORS: Partial<Record<MaterialType, string>> = {
  // Original
  original: "repeating-conic-gradient(#808080 0% 25%, #606060 0% 50%) 50% / 8px 8px",
  // Basic (5)
  standard: "#808080",
  matte: "#606060",
  clay: "#d4a373",
  plastic: "#ffffff",
  velvet: "#4a3f55",
  // Metallic (5)
  chrome: "linear-gradient(135deg, #ffffff 0%, #c0c0c0 50%, #808080 100%)",
  silver: "linear-gradient(135deg, #f0f0f0 0%, #c0c0c0 50%, #a0a0a0 100%)",
  gold: "linear-gradient(135deg, #ffd700 0%, #d4af37 50%, #b8860b 100%)",
  copper: "linear-gradient(135deg, #ffd7be 0%, #b87333 50%, #8b4513 100%)",
  brushed: "linear-gradient(135deg, #e0e0e0 0%, #a0a0a0 50%, #606060 100%)",
  // Dynamic (5)
  holographic: "linear-gradient(135deg, #ff00ff 0%, #00ffff 50%, #ffff00 100%)",
  rainbow: "linear-gradient(135deg, #ff0000, #ff8000, #ffff00, #00ff00, #0080ff, #8000ff)",
  iridescent: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 50%, #f093fb 100%)",
  neon: "linear-gradient(135deg, #00ff88 0%, #00ffff 50%, #ff00ff 100%)",
  gradientAnimated: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  // Glass (5)
  glassClear: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)",
  glassFrosted: "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(200,200,200,0.4) 100%)",
  glassColored: "linear-gradient(135deg, rgba(78,205,196,0.5) 0%, rgba(78,205,196,0.2) 100%)",
  glassCrystal: "linear-gradient(135deg, rgba(200,220,255,0.4) 0%, rgba(255,255,255,0.2) 100%)",
  glassDiamond: "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(200,220,255,0.3) 50%, rgba(255,200,220,0.2) 100%)",
}

export function MaterialSelector({ value, onChange, showCategories = true, showOriginal = false }: MaterialSelectorProps) {
  const materialsByCategory = useMemo(() => {
    const grouped: Record<MaterialCategory, { type: MaterialType; name: string }[]> = {
      basic: [],
      metallic: [],
      dynamic: [],
      glass: [],
    }

    Object.entries(MATERIAL_PRESETS).forEach(([type, preset]) => {
      // Skip "original" - we handle it separately
      if (type === "original") return
      grouped[preset.category].push({ type: type as MaterialType, name: preset.name })
    })

    return grouped
  }, [])

  if (!showCategories) {
    // Flat grid of all materials
    const allMaterials = Object.entries(MATERIAL_PRESETS).map(([type, preset]) => ({
      type: type as MaterialType,
      name: preset.name
    }))

    return (
      <TooltipProvider delayDuration={300}>
        <GridContainer columns={6} gap="gap-1">
          {allMaterials.map(({ type, name }) => (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <GridCell
                  onClick={() => onChange(type)}
                  isSelected={value === type}
                  background={MATERIAL_COLORS[type] || "#808080"}
                  aria-label={name}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-sm">{name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </GridContainer>
      </TooltipProvider>
    )
  }

  return (
    <div className="space-y-3">
      <TooltipProvider delayDuration={300}>
        {/* Original option - shown only for GLTF models */}
        {showOriginal && (
          <div className="space-y-1.5">
            <SectionLabel>Model</SectionLabel>
            <GridContainer columns={5}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <GridCell
                    onClick={() => onChange("original")}
                    isSelected={value === "original"}
                    background={MATERIAL_COLORS.original}
                    aria-label="Original"
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm">Original</p>
                </TooltipContent>
              </Tooltip>
            </GridContainer>
          </div>
        )}

        {CATEGORY_ORDER.map((category) => {
          const materials = materialsByCategory[category]
          if (materials.length === 0) return null

          return (
            <div key={category} className="space-y-1.5">
              <SectionLabel>{CATEGORY_LABELS[category]}</SectionLabel>
              <GridContainer columns={5}>
                {materials.map(({ type, name }) => (
                  <Tooltip key={type}>
                    <TooltipTrigger asChild>
                      <GridCell
                        onClick={() => onChange(type)}
                        isSelected={value === type}
                        background={MATERIAL_COLORS[type] || "#808080"}
                        aria-label={name}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-sm">{name}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </GridContainer>
            </div>
          )
        })}
      </TooltipProvider>
    </div>
  )
}

// Compact version for inline use
export function MaterialSelectorCompact({ value, onChange }: Omit<MaterialSelectorProps, "showCategories">) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex gap-1 flex-wrap">
        {Object.entries(MATERIAL_PRESETS).map(([type, preset]) => (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <GridCell
                onClick={() => onChange(type as MaterialType)}
                isSelected={value === type}
                background={MATERIAL_COLORS[type as MaterialType] || "#808080"}
                aria-label={preset.name}
                className="w-6 h-6 aspect-auto"
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-sm">{preset.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
