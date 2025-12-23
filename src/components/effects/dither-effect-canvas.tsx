/**
 * Canvas 2D Dithering Effect Component (Fallback)
 *
 * This component provides a fallback for browsers without WebGPU support (like Firefox).
 * It uses the same CPU-based error diffusion dithering as the WebGPU version,
 * but renders to a regular Canvas 2D context instead.
 */

'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { DitherEffectSettings } from '@/lib/types'
import { SimpleDitheringEffectCanvas, type DitheringConfig } from '@/lib/effects/dithering-canvas'

interface DitherEffectCanvasProps {
  settings: DitherEffectSettings
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
}

/**
 * Canvas 2D Dithering Effect (Fallback for non-WebGPU browsers)
 *
 * This effect processes the Three.js render output using CPU-based error diffusion
 * and renders to a Canvas 2D overlay.
 */
export function DitherEffectCanvas({ settings, onCanvasReady }: DitherEffectCanvasProps) {
  const { gl, size } = useThree()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const effectRef = useRef<SimpleDitheringEffectCanvas | null>(null)

  // Create canvas overlay and effect
  useEffect(() => {
    // Create Canvas 2D overlay
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.pointerEvents = 'none'

    canvasRef.current = canvas

    // Get 2D context
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      console.error('Failed to get Canvas 2D context')
      return
    }

    ctxRef.current = ctx

    // Create dithering effect
    effectRef.current = new SimpleDitheringEffectCanvas()

    // Add canvas to DOM
    const glCanvas = gl.domElement
    const parent = glCanvas.parentElement
    if (parent) {
      parent.appendChild(canvas)
      parent.style.position = 'relative'
    }

    // Notify parent that canvas is ready
    onCanvasReady?.(canvas)

    return () => {
      // Notify parent that canvas is being removed
      onCanvasReady?.(null)

      effectRef.current = null
      if (canvas.parentElement) {
        canvas.parentElement.removeChild(canvas)
      }
    }
  }, [gl, size, onCanvasReady])

  // Update canvas size when window resizes
  useEffect(() => {
    if (!canvasRef.current) return

    canvasRef.current.width = size.width
    canvasRef.current.height = size.height
  }, [size])

  // Render dithering effect every frame
  useFrame(() => {
    if (!effectRef.current || !ctxRef.current || !canvasRef.current) {
      return
    }

    try {
      const config: DitheringConfig = {
        pattern: settings.pattern,
        pixelation: settings.pixelation,
        color1: settings.color1,
        color2: settings.color2,
        brightness: settings.brightness,
        contrast: settings.contrast,
        threshold: settings.threshold,
      }

      // Render dithering effect
      effectRef.current.render(gl.domElement, ctxRef.current, canvasRef.current, config)
    } catch (error) {
      console.error('Error rendering dithering effect:', error)
    }
  })

  // Hide the Three.js canvas when using canvas overlay
  useEffect(() => {
    if (gl.domElement) {
      gl.domElement.style.opacity = '0'
    }

    return () => {
      if (gl.domElement) {
        gl.domElement.style.opacity = '1'
      }
    }
  }, [gl])

  return null // This component doesn't render React elements, it manages Canvas 2D rendering
}
