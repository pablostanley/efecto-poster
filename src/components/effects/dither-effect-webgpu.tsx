/**
 * WebGPU Dithering Effect Component
 *
 * This component integrates TypeGPU dithering with React Three Fiber.
 * It captures the Three.js render output and processes it using WebGPU.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { DitherEffectSettings } from '@/lib/types'
import { isWebGPUSupported } from '@/lib/webgpu-utils'
import { SimpleDitheringEffect, type DitheringConfig } from '@/lib/effects/dithering-webgpu-simple'

interface DitherEffectWebGPUProps {
  settings: DitherEffectSettings
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  contentBounds?: any // TODO: Implement content bounds masking in WebGPU shader
}

/**
 * WebGPU Dithering Effect
 *
 * This effect processes the Three.js render output using WebGPU compute shaders
 * to apply various dithering algorithms (Bayer, Floyd-Steinberg, Atkinson).
 */
export function DitherEffectWebGPU({ settings, onCanvasReady, contentBounds }: DitherEffectWebGPUProps) {
  const { gl, size } = useThree()
  const [webgpuSupported, setWebgpuSupported] = useState<boolean>(false)
  const [device, setDevice] = useState<GPUDevice | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const contextRef = useRef<GPUCanvasContext | null>(null)
  const effectRef = useRef<SimpleDitheringEffect | null>(null)

  // Check WebGPU support and initialize
  useEffect(() => {
    let mounted = true

    isWebGPUSupported().then(async (supported) => {
      if (!mounted) return
      setWebgpuSupported(supported)

      if (supported) {
        try {
          const adapter = await navigator.gpu.requestAdapter()
          if (!adapter) throw new Error('No GPU adapter found')

          const gpuDevice = await adapter.requestDevice()
          if (mounted) {
            setDevice(gpuDevice)
            console.log('WebGPU device initialized for dithering effect')
          }
        } catch (error) {
          console.error('Failed to initialize WebGPU:', error)
        }
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  // Create WebGPU canvas overlay and effect
  useEffect(() => {
    if (!webgpuSupported || !device) return

    // Create WebGPU canvas that overlays the Three.js canvas
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

    // Get WebGPU context
    const context = canvas.getContext('webgpu')
    if (!context) {
      console.error('Failed to get WebGPU context')
      return
    }

    // Configure context
    const format = navigator.gpu.getPreferredCanvasFormat()
    context.configure({
      device,
      format,
      alphaMode: 'premultiplied',
    })

    contextRef.current = context

    // Create dithering effect
    effectRef.current = new SimpleDitheringEffect(device)

    // Add canvas to DOM
    const glCanvas = gl.domElement
    const parent = glCanvas.parentElement
    if (parent) {
      parent.appendChild(canvas)
      parent.style.position = 'relative'
    }

    // Notify parent that WebGPU canvas is ready
    onCanvasReady?.(canvas)

    return () => {
      // Notify parent that WebGPU canvas is being removed
      onCanvasReady?.(null)

      if (effectRef.current) {
        effectRef.current.destroy()
        effectRef.current = null
      }
      if (canvas.parentElement) {
        canvas.parentElement.removeChild(canvas)
      }
    }
  }, [webgpuSupported, device, gl, size, onCanvasReady])

  // Update canvas size when window resizes
  useEffect(() => {
    if (!canvasRef.current) return

    canvasRef.current.width = size.width
    canvasRef.current.height = size.height
  }, [size])

  // Render dithering effect every frame
  useFrame(() => {
    if (!effectRef.current || !contextRef.current) {
      return
    }

    try {
      // Apply WebGPU dithering effect directly from WebGL canvas
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
      effectRef.current.render(gl.domElement, contextRef.current, config)
    } catch (error) {
      console.error('Error rendering dithering effect:', error)
    }
  })

  // Hide the Three.js canvas when using WebGPU overlay
  useEffect(() => {
    if (webgpuSupported && device && gl.domElement) {
      gl.domElement.style.opacity = '0'
    }

    return () => {
      if (gl.domElement) {
        gl.domElement.style.opacity = '1'
      }
    }
  }, [webgpuSupported, device, gl])

  if (!webgpuSupported) {
    return null // Fallback to WebGL or show compatibility message
  }

  return null // This component doesn't render React elements, it manages WebGPU rendering
}
