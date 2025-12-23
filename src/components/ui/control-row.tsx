"use client"

import { forwardRef, type ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

/**
 * Base row container with consistent min-height
 */
function ControlRowBase({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center min-h-[40px]", className)}>
      {children}
    </div>
  )
}

/**
 * Reusable slider row with label and value display
 * Used for numeric controls throughout the app
 */
interface SliderRowProps {
  label: string
  id?: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
  /** Format function for display value (e.g., v => `${v}%`) */
  format?: (value: number) => string
  /** Width of the label (default: 80px) */
  labelWidth?: string
  className?: string
  disabled?: boolean
}

export function SliderRow({
  label,
  id,
  min,
  max,
  step = 1,
  value,
  onChange,
  format,
  labelWidth = "min-w-[80px]",
  className,
  disabled,
}: SliderRowProps) {
  const displayValue = format ? format(value) : String(value)
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-")

  return (
    <ControlRowBase className={cn("gap-3", className)}>
      <Label htmlFor={inputId} className={cn("text-sm shrink-0", labelWidth)}>
        {label}
      </Label>
      <Slider
        id={inputId}
        className="flex-1"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        disabled={disabled}
      />
      <span className="text-sm text-muted-foreground min-w-[45px] text-right">
        {displayValue}
      </span>
    </ControlRowBase>
  )
}

/**
 * Reusable select row with label
 * Aligned with SliderRow (includes 45px spacer to match value display)
 */
interface SelectRowProps {
  label: string
  id?: string
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  /** Width of the label (default: 80px) */
  labelWidth?: string
  className?: string
  disabled?: boolean
}

export function SelectRow({
  label,
  id,
  value,
  onValueChange,
  options,
  labelWidth = "min-w-[80px]",
  className,
  disabled,
}: SelectRowProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-")

  return (
    <ControlRowBase className={cn("gap-3", className)}>
      <Label htmlFor={inputId} className={cn("text-sm shrink-0", labelWidth)}>
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={inputId} className="text-sm flex-1 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Spacer to align with SliderRow value display */}
      <span className="min-w-[45px]" />
    </ControlRowBase>
  )
}

/**
 * Reusable switch row with label
 * Used for boolean toggles throughout the app
 */
interface SwitchRowProps {
  label: string
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
  disabled?: boolean
}

export function SwitchRow({
  label,
  id,
  checked,
  onChange,
  className,
  disabled,
}: SwitchRowProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-")

  return (
    <ControlRowBase className={cn("justify-between", className)}>
      <Label htmlFor={inputId} className="text-sm">
        {label}
      </Label>
      <Switch
        id={inputId}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </ControlRowBase>
  )
}

/**
 * Reusable color input with color picker and hex text input
 * Used for color controls throughout the app
 */
interface ColorInputProps {
  label: string
  id?: string
  value: string
  onChange: (value: string) => void
  /** Width of the label (default: 80px) */
  labelWidth?: string
  className?: string
  placeholder?: string
}

export function ColorInput({
  label,
  id,
  value,
  onChange,
  labelWidth = "min-w-[80px]",
  className,
  placeholder = "#000000",
}: ColorInputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-")

  return (
    <ControlRowBase className={cn("gap-3", className)}>
      <Label htmlFor={inputId} className={cn("text-sm shrink-0", labelWidth)}>
        {label}
      </Label>
      <div className="relative flex-1">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded border-0 cursor-pointer p-0"
          aria-label={`${label} color picker`}
        />
        <Input
          id={inputId}
          value={value.toUpperCase()}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm pl-10 h-9 font-mono"
          placeholder={placeholder}
        />
      </div>
    </ControlRowBase>
  )
}

/**
 * Section label for grouping controls
 */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm text-muted-foreground">{children}</span>
  )
}
