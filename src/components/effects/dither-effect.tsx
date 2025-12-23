/**
 * Dithering Effect Wrapper Component
 *
 * This component automatically selects between WebGPU and Canvas 2D implementations
 * based on browser support. WebGPU is preferred when available, with Canvas 2D
 * as a fallback for browsers like Firefox that don't support WebGPU.
 */

'use client'

import { useEffect, useState } from 'react'
import type { DitherEffectSettings } from '@/lib/types'
import { isWebGPUSupported } from '@/lib/webgpu-utils'
import { DitherEffectWebGPU } from './dither-effect-webgpu'
import { DitherEffectCanvas } from './dither-effect-canvas'

interface DitherEffectProps {
  settings: DitherEffectSettings
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  contentBounds?: any
}

/**
 * Dithering Effect with automatic WebGPU/Canvas fallback
 *
 * Checks for WebGPU support and renders the appropriate implementation.
 * - WebGPU: Used on Chrome, Edge, Safari (with support)
 * - Canvas 2D: Fallback for Firefox and other browsers without WebGPU
 */
export function DitherEffect({ settings, onCanvasReady, contentBounds }: DitherEffectProps) {
  const [renderMode, setRenderMode] = useState<'loading' | 'webgpu' | 'canvas'>('loading')

  useEffect(() => {
    let mounted = true

    isWebGPUSupported().then((supported) => {
      if (!mounted) return

      if (supported) {
        console.log('[DitherEffect] Using WebGPU renderer')
        setRenderMode('webgpu')
      } else {
        console.log('[DitherEffect] WebGPU not supported, using Canvas 2D fallback')
        setRenderMode('canvas')
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  // Show nothing while checking support
  if (renderMode === 'loading') {
    return null
  }

  // Use WebGPU when available
  if (renderMode === 'webgpu') {
    return (
      <DitherEffectWebGPU
        settings={settings}
        onCanvasReady={onCanvasReady}
        contentBounds={contentBounds}
      />
    )
  }

  // Fall back to Canvas 2D
  return (
    <DitherEffectCanvas
      settings={settings}
      onCanvasReady={onCanvasReady}
    />
  )
}
