"use client"

import { useRef, useMemo, useState, useEffect, useCallback } from "react"
import { useFrame, useThree, createPortal, ThreeEvent } from "@react-three/fiber"
import { useFBO, Html } from "@react-three/drei"
import * as THREE from "three"
import type { Artboard, EffectSettings } from "@/lib/types"
import { useCanvasStore } from "@/lib/store"
import { LayerRenderer } from "@/components/layers"
import { ArtboardEffect } from "./artboard-effect"
import { SelectionHandles } from "@/components/canvas/selection-handles"
import { LayerHandles } from "@/components/layers/layer-handles"

interface ArtboardRendererProps {
  artboard: Artboard
}

export function ArtboardRenderer({ artboard }: ArtboardRendererProps) {
  const { gl, camera } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)

  const selectedArtboardId = useCanvasStore((state) => state.editor.selectedArtboardId)
  const selectedLayerIds = useCanvasStore((state) => state.editor.selectedLayerIds)
  const selectArtboard = useCanvasStore((state) => state.selectArtboard)
  const updateArtboard = useCanvasStore((state) => state.updateArtboard)
  const saveToHistory = useCanvasStore((state) => state._saveToHistory)
  const toggleSelection = useCanvasStore((state) => state.toggleSelection)

  const isSelected = selectedArtboardId === artboard.id
  const { width, height } = artboard.size

  // Scale factor to display artboard in world units (used throughout)
  // 1.0 means 1 artboard pixel = 1 world unit, so at zoom 1.0, 1 artboard pixel = 1 screen pixel
  const scaleFactor = 1.0

  // Drag state for artboard moving
  const [isDragging, setIsDragging] = useState(false)

  // Edit state for artboard name
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingNameValue, setEditingNameValue] = useState(artboard.name)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const dragStartScreen = useRef<{ x: number; y: number } | null>(null)
  const artboardStartPos = useRef<{ x: number; y: number } | null>(null)

  // Create a render target (FBO) for this artboard
  const renderTarget = useFBO(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    stencilBuffer: false,
    depthBuffer: true,
  })

  // Create a separate scene for this artboard's content
  const artboardScene = useMemo(() => new THREE.Scene(), [])
  const artboardCamera = useMemo(() => {
    const cam = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      0.1,
      1000
    )
    cam.position.z = 500
    return cam
  }, [width, height])

  // Render the artboard content to the FBO
  useFrame(({ gl }) => {
    const bgColor = new THREE.Color(artboard.backgroundColor)
    gl.setClearColor(bgColor)
    gl.setRenderTarget(renderTarget)
    gl.clear()
    gl.render(artboardScene, artboardCamera)
    gl.setRenderTarget(null)
  })

  // Register export function
  const registerExporter = useCanvasStore((state) => state.registerExporter)
  const unregisterExporter = useCanvasStore((state) => state.unregisterExporter)

  useEffect(() => {
    const exportArtboard = async (): Promise<Blob | null> => {
      // Create a render target at full artboard resolution
      const exportTarget = new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      })

      // Render the base content to a fresh FBO
      const bgColor = new THREE.Color(artboard.backgroundColor)
      gl.setClearColor(bgColor)
      gl.setRenderTarget(exportTarget)
      gl.clear()
      gl.render(artboardScene, artboardCamera)

      // If we have an effect, apply it
      if (artboard.effect.enabled && meshRef.current?.material) {
        // Create a scene with just a plane and the effect material
        const effectScene = new THREE.Scene()
        const effectCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10)
        effectCamera.position.z = 1

        // Clone the material and update the input texture
        const mat = meshRef.current.material as THREE.ShaderMaterial
        if (mat.uniforms?.tInput) {
          mat.uniforms.tInput.value = exportTarget.texture
        }

        const effectPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          meshRef.current.material
        )
        effectScene.add(effectPlane)

        // Create final render target
        const finalTarget = new THREE.WebGLRenderTarget(width, height, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
          type: THREE.UnsignedByteType,
        })

        gl.setRenderTarget(finalTarget)
        gl.clear()
        gl.render(effectScene, effectCamera)

        // Read pixels from final target
        const pixels = new Uint8Array(width * height * 4)
        gl.readRenderTargetPixels(finalTarget, 0, 0, width, height, pixels)

        // Restore the original texture reference
        if (mat.uniforms?.tInput) {
          mat.uniforms.tInput.value = renderTarget.texture
        }

        // Cleanup
        finalTarget.dispose()
        exportTarget.dispose()
        effectPlane.geometry.dispose()

        gl.setRenderTarget(null)

        // Flip pixels vertically (WebGL renders upside down)
        const flippedPixels = new Uint8Array(width * height * 4)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = ((height - 1 - y) * width + x) * 4
            const dstIdx = (y * width + x) * 4
            flippedPixels[dstIdx] = pixels[srcIdx]
            flippedPixels[dstIdx + 1] = pixels[srcIdx + 1]
            flippedPixels[dstIdx + 2] = pixels[srcIdx + 2]
            flippedPixels[dstIdx + 3] = pixels[srcIdx + 3]
          }
        }

        // Convert to canvas and then blob
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")!
        const imageData = ctx.createImageData(width, height)
        imageData.data.set(flippedPixels)
        ctx.putImageData(imageData, 0, 0)

        return new Promise((resolve) => {
          canvas.toBlob((blob) => resolve(blob), "image/png")
        })
      } else {
        // No effect - export the raw render target
        const pixels = new Uint8Array(width * height * 4)
        gl.readRenderTargetPixels(exportTarget, 0, 0, width, height, pixels)

        exportTarget.dispose()
        gl.setRenderTarget(null)

        // Flip pixels vertically
        const flippedPixels = new Uint8Array(width * height * 4)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = ((height - 1 - y) * width + x) * 4
            const dstIdx = (y * width + x) * 4
            flippedPixels[dstIdx] = pixels[srcIdx]
            flippedPixels[dstIdx + 1] = pixels[srcIdx + 1]
            flippedPixels[dstIdx + 2] = pixels[srcIdx + 2]
            flippedPixels[dstIdx + 3] = pixels[srcIdx + 3]
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")!
        const imageData = ctx.createImageData(width, height)
        imageData.data.set(flippedPixels)
        ctx.putImageData(imageData, 0, 0)

        return new Promise((resolve) => {
          canvas.toBlob((blob) => resolve(blob), "image/png")
        })
      }
    }

    registerExporter(artboard.id, exportArtboard)
    return () => unregisterExporter(artboard.id)
  }, [artboard.id, artboard.effect, artboard.backgroundColor, width, height, gl, artboardScene, artboardCamera, registerExporter, unregisterExporter, renderTarget.texture])

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const rect = gl.domElement.getBoundingClientRect()
    const x = ((screenX - rect.left) / rect.width) * 2 - 1
    const y = -((screenY - rect.top) / rect.height) * 2 + 1

    const vec = new THREE.Vector3(x, y, 0)
    vec.unproject(camera)

    return { x: vec.x, y: vec.y }
  }, [camera, gl])

  // Get selectLayer and updateLayer from store
  const selectLayer = useCanvasStore((state) => state.selectLayer)
  const updateLayer = useCanvasStore((state) => state.updateLayer)

  // Layer drag state
  const [isDraggingLayer, setIsDraggingLayer] = useState(false)
  const draggingLayerRef = useRef<string | null>(null)
  const layerDragStartScreen = useRef<{ x: number; y: number } | null>(null)
  const layerStartPos = useRef<{ x: number; y: number } | null>(null)

  // Hit-test layers to find which one was clicked
  const hitTestLayers = useCallback((localX: number, localY: number) => {
    // localX, localY are in artboard pixel coordinates (0,0 = center)
    // Layer transforms use a similar system: x=0,y=0 is center
    // The formula in layers is: position = (transform.x / 100) * artboardWidth
    // So transform.x = 0 → position 0 (center)
    // And localX = 0 → center
    // We need to convert localX to the same scale as transform.x

    // Convert click position to transform-equivalent coordinates
    // If localX = 0 (center), clickX should be 0
    // If localX = width/2 (right edge), clickX should be 50
    const clickX = (localX / width) * 100
    const clickY = (localY / height) * 100

    // Check layers in reverse order (top layer first)
    const visibleLayers = artboard.layers.filter((l) => l.visible)
    for (let i = visibleLayers.length - 1; i >= 0; i--) {
      const layer = visibleLayers[i]
      const { x, y, scale } = layer.transform

      // Calculate layer bounds based on layer type
      // These values represent the hit area as percentage of artboard dimensions
      // Keep these tight to make it easy to click outside and deselect
      let baseWidthPercent = 8   // Default for most layers
      let baseHeightPercent = 8

      if (layer.type === "text") {
        // Text layers - moderate size
        baseWidthPercent = 12
        baseHeightPercent = 5
      } else if (layer.type === "shader") {
        // Shader fills the artboard - but use smaller hit area for selection
        // Users can click anywhere in the visible shader area
        baseWidthPercent = 25
        baseHeightPercent = 25
      } else if (layer.type === "3d") {
        // 3D objects - moderate hit area
        baseWidthPercent = 10
        baseHeightPercent = 10
      } else if (layer.type === "media") {
        // Media - moderate hit area
        baseWidthPercent = 20
        baseHeightPercent = 20
      }

      // Apply scale to hit area
      const hitWidth = baseWidthPercent * scale
      const hitHeight = baseHeightPercent * scale
      const halfWidth = hitWidth / 2
      const halfHeight = hitHeight / 2

      const minX = x - halfWidth
      const maxX = x + halfWidth
      const minY = y - halfHeight
      const maxY = y + halfHeight

      if (
        clickX >= minX &&
        clickX <= maxX &&
        clickY >= minY &&
        clickY <= maxY
      ) {
        return layer
      }
    }
    return null
  }, [artboard.layers, width, height])

  // Handle pointer down - start selection/drag
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()

    const isShiftKey = e.nativeEvent.shiftKey
    const isMetaKey = e.nativeEvent.metaKey || e.nativeEvent.ctrlKey

    // Get click position in artboard-local coordinates
    // e.point is in world coordinates, need to convert to artboard-local
    const worldX = e.point.x - artboard.position[0]
    const worldY = e.point.y - artboard.position[1]

    // Convert from display coordinates (scaled by 0.1) to artboard pixel coordinates
    const localX = worldX / scaleFactor
    const localY = worldY / scaleFactor

    // Hit-test layers
    const hitLayer = hitTestLayers(localX, localY)

    if (hitLayer) {
      // Handle selection based on modifier keys
      if (isShiftKey || isMetaKey) {
        // Shift/Cmd+click: toggle selection (add or remove)
        toggleSelection(hitLayer.id)
      } else {
        // Normal click: replace selection
        selectLayer(hitLayer.id)
      }

      // Start layer drag if not locked and layer is now selected
      const isNowSelected = isShiftKey || isMetaKey
        ? !selectedLayerIds.includes(hitLayer.id) // Will be toggled
        : true // Always selected after normal click

      if (!hitLayer.locked && isNowSelected) {
        setIsDraggingLayer(true)
        draggingLayerRef.current = hitLayer.id
        layerDragStartScreen.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
        layerStartPos.current = { x: hitLayer.transform.x, y: hitLayer.transform.y }
        gl.domElement.style.cursor = "grabbing"
      }
      return
    }

    // No layer hit - select artboard and deselect any layer, then start drag
    selectLayer(null)  // Explicitly deselect layer
    selectArtboard(artboard.id)
    setIsDragging(true)
    dragStartScreen.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
    artboardStartPos.current = { x: artboard.position[0], y: artboard.position[1] }
    gl.domElement.style.cursor = "grabbing"
  }

  // Window-level mouse move for artboard dragging
  useEffect(() => {
    if (!isDragging || !dragStartScreen.current || !artboardStartPos.current) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartScreen.current || !artboardStartPos.current) return

      const currentWorld = screenToWorld(e.clientX, e.clientY)
      const startWorld = screenToWorld(dragStartScreen.current.x, dragStartScreen.current.y)

      const deltaX = currentWorld.x - startWorld.x
      const deltaY = currentWorld.y - startWorld.y

      updateArtboard(artboard.id, {
        position: [
          artboardStartPos.current.x + deltaX,
          artboardStartPos.current.y + deltaY,
        ],
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      dragStartScreen.current = null
      artboardStartPos.current = null
      gl.domElement.style.cursor = "default"
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, screenToWorld, gl, updateArtboard, artboard.id])

  // Window-level mouse move for layer dragging
  useEffect(() => {
    if (!isDraggingLayer || !layerDragStartScreen.current || !layerStartPos.current || !draggingLayerRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!layerDragStartScreen.current || !layerStartPos.current || !draggingLayerRef.current) return

      const currentWorld = screenToWorld(e.clientX, e.clientY)
      const startWorld = screenToWorld(layerDragStartScreen.current.x, layerDragStartScreen.current.y)

      const deltaX = currentWorld.x - startWorld.x
      const deltaY = currentWorld.y - startWorld.y

      // Convert from display coordinates to artboard pixel coordinates, then to percentage
      const artboardDeltaX = deltaX / scaleFactor
      const artboardDeltaY = deltaY / scaleFactor

      const deltaXPercent = (artboardDeltaX / width) * 100
      const deltaYPercent = (artboardDeltaY / height) * 100

      // Find the layer to get its current transform
      const layer = artboard.layers.find((l) => l.id === draggingLayerRef.current)
      if (layer) {
        updateLayer(artboard.id, draggingLayerRef.current, {
          transform: {
            ...layer.transform,
            x: layerStartPos.current.x + deltaXPercent,
            y: layerStartPos.current.y + deltaYPercent,
          },
        })
      }
    }

    const handleMouseUp = () => {
      setIsDraggingLayer(false)
      draggingLayerRef.current = null
      layerDragStartScreen.current = null
      layerStartPos.current = null
      gl.domElement.style.cursor = "default"
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDraggingLayer, screenToWorld, gl, updateLayer, artboard.id, artboard.layers, width, height, scaleFactor])

  // Display dimensions
  const displayWidth = width * scaleFactor
  const displayHeight = height * scaleFactor

  return (
    <group
      ref={groupRef}
      position={[artboard.position[0], artboard.position[1], 0]}
    >
      {/* Artboard label (HTML overlay) - clickable to select, double-click to edit */}
      <Html
        position={[-displayWidth / 2, displayHeight / 2 + 3, 0]}
        style={{
          transform: "translate(0, -100%)",
          pointerEvents: "auto",
          userSelect: "none",
        }}
      >
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={editingNameValue}
            onChange={(e) => setEditingNameValue(e.target.value)}
            onBlur={() => {
              if (editingNameValue.trim()) {
                updateArtboard(artboard.id, { name: editingNameValue.trim() })
              }
              setIsEditingName(false)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (editingNameValue.trim()) {
                  updateArtboard(artboard.id, { name: editingNameValue.trim() })
                }
                setIsEditingName(false)
              } else if (e.key === "Escape") {
                setEditingNameValue(artboard.name)
                setIsEditingName(false)
              }
            }}
            className="text-xs font-medium px-1.5 py-0.5 rounded bg-background border border-primary outline-none min-w-[60px]"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation()
              selectArtboard(artboard.id)
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditingNameValue(artboard.name)
              setIsEditingName(true)
            }}
            className={`text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap cursor-pointer hover:bg-muted/50 ${
              isSelected ? "text-blue-500" : "text-muted-foreground"
            }`}
          >
            {artboard.name}
          </div>
        )}
      </Html>

      {/* Clickable/draggable artboard plane with effects */}
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        scale={[displayWidth, displayHeight, 1]}
      >
        <planeGeometry args={[1, 1]} />
        <ArtboardEffect
          inputTexture={renderTarget.texture}
          effect={artboard.effect}
          width={width}
          height={height}
        />
      </mesh>

      {/* Clickable border frame - invisible but captures clicks on the border area */}
      {/* Clicking border deselects any selected layer and selects the artboard */}
      {/* Top edge */}
      <mesh
        position={[0, displayHeight / 2, 0.05]}
        onPointerDown={(e) => {
          e.stopPropagation()
          selectLayer(null)
          selectArtboard(artboard.id)
        }}
      >
        <planeGeometry args={[displayWidth + 4, 4]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Bottom edge */}
      <mesh
        position={[0, -displayHeight / 2, 0.05]}
        onPointerDown={(e) => {
          e.stopPropagation()
          selectLayer(null)
          selectArtboard(artboard.id)
        }}
      >
        <planeGeometry args={[displayWidth + 4, 4]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Left edge */}
      <mesh
        position={[-displayWidth / 2, 0, 0.05]}
        onPointerDown={(e) => {
          e.stopPropagation()
          selectLayer(null)
          selectArtboard(artboard.id)
        }}
      >
        <planeGeometry args={[4, displayHeight]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Right edge */}
      <mesh
        position={[displayWidth / 2, 0, 0.05]}
        onPointerDown={(e) => {
          e.stopPropagation()
          selectLayer(null)
          selectArtboard(artboard.id)
        }}
      >
        <planeGeometry args={[4, displayHeight]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Non-selected border - subtle */}
      {!isSelected && (
        <lineSegments
          scale={[displayWidth, displayHeight, 1]}
          position={[0, 0, 0.1]}
        >
          <edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} />
          <lineBasicMaterial color="#666666" linewidth={1} />
        </lineSegments>
      )}

      {/* Selection handles (includes border) - only show when artboard is selected but NO layer is selected */}
      <SelectionHandles
        width={displayWidth}
        height={displayHeight}
        position={[0, 0, 0]}
        isSelected={isSelected && selectedLayerIds.length === 0}
        onResizeStart={() => saveToHistory()}
        onResize={(deltaWidth, deltaHeight) => {
          // Convert from display coordinates back to pixel dimensions
          const pixelDeltaWidth = deltaWidth / scaleFactor
          const pixelDeltaHeight = deltaHeight / scaleFactor

          const newWidth = Math.max(100, artboard.size.width + pixelDeltaWidth)
          const newHeight = Math.max(100, artboard.size.height + pixelDeltaHeight)

          updateArtboard(artboard.id, {
            size: {
              width: Math.round(newWidth),
              height: Math.round(newHeight),
            },
          })
        }}
      />

      {/* Layer handles - rendered OUTSIDE FBO so effects don't apply */}
      <SelectedLayerHandles artboard={artboard} scaleFactor={scaleFactor} />

      {/* Portal for artboard content - renders to the FBO scene */}
      {createPortal(
        <ArtboardContent artboard={artboard} />,
        artboardScene
      )}
    </group>
  )
}

// Artboard content rendered to FBO
function ArtboardContent({ artboard }: { artboard: Artboard }) {
  const { width, height } = artboard.size
  const selectedLayerIds = useCanvasStore((state) => state.editor.selectedLayerIds)

  return (
    <group>
      {/* Background */}
      <mesh position={[0, 0, -10]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={artboard.backgroundColor} />
      </mesh>

      {/* Render layers */}
      {artboard.layers
        .filter((layer) => layer.visible)
        .map((layer, index) => (
          <LayerRenderer
            key={layer.id}
            layer={layer}
            artboard={artboard}
            zIndex={index}
            isSelected={selectedLayerIds.includes(layer.id)}
          />
        ))}
    </group>
  )
}

// Layer handles rendered OUTSIDE FBO so effects don't apply
function SelectedLayerHandles({ artboard, scaleFactor }: { artboard: Artboard; scaleFactor: number }) {
  const selectedLayerIds = useCanvasStore((state) => state.editor.selectedLayerIds)
  const updateLayer = useCanvasStore((state) => state.updateLayer)
  const saveToHistory = useCanvasStore((state) => state._saveToHistory)

  const { width, height } = artboard.size

  // Find selected layers in this artboard
  const selectedLayers = artboard.layers.filter(
    (l) => selectedLayerIds.includes(l.id) && l.visible
  )

  if (selectedLayers.length === 0) return null

  // Helper to calculate layer dimensions based on type
  const getLayerDimensions = (layer: typeof selectedLayers[0]) => {
    let layerWidth = 100
    let layerHeight = 100

    switch (layer.type) {
      case "3d":
        layerWidth = 150
        layerHeight = 150
        break
      case "text":
        layerWidth = 200
        layerHeight = 60
        break
      case "shader":
        layerWidth = width
        layerHeight = height
        break
      case "media":
        layerWidth = width * 0.8
        layerHeight = height * 0.8
        break
    }

    return {
      displayWidth: layerWidth * layer.transform.scale * scaleFactor,
      displayHeight: layerHeight * layer.transform.scale * scaleFactor,
    }
  }

  const handleResize = (layer: typeof selectedLayers[0]) => (deltaScale: number) => {
    if (layer.locked) return
    const newScale = Math.max(0.1, layer.transform.scale + deltaScale)
    updateLayer(artboard.id, layer.id, {
      transform: {
        ...layer.transform,
        scale: newScale,
      },
    })
  }

  return (
    <>
      {selectedLayers.map((layer, index) => {
        const layerX = (layer.transform.x / 100) * width * scaleFactor
        const layerY = (layer.transform.y / 100) * height * scaleFactor
        const { displayWidth, displayHeight } = getLayerDimensions(layer)

        return (
          <group
            key={layer.id}
            position={[layerX, layerY, 10 + index * 0.1]}
            rotation={[0, 0, (layer.transform.rotation * Math.PI) / 180]}
          >
            <LayerHandles
              width={displayWidth}
              height={displayHeight}
              isSelected={true}
              onResize={handleResize(layer)}
              onResizeStart={() => saveToHistory()}
              onResizeEnd={() => {}}
            />
          </group>
        )
      })}
    </>
  )
}

