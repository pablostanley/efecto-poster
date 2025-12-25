"use client"

import { useThree } from "@react-three/fiber"
import { useEffect, useRef, useCallback } from "react"
import { OrthographicCamera } from "three"
import { useCanvasStore } from "@/lib/store"

export function CanvasCamera() {
  const { camera, gl } = useThree()
  const storeCamera = useCanvasStore((state) => state.camera)
  const setCamera = useCanvasStore((state) => state.setCamera)
  const tool = useCanvasStore((state) => state.editor.tool)

  const isPanning = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const isSpacePressed = useRef(false)

  // Sync camera with store
  useEffect(() => {
    if (camera instanceof OrthographicCamera) {
      camera.position.set(
        storeCamera.position[0],
        storeCamera.position[1],
        storeCamera.position[2]
      )
      camera.zoom = storeCamera.zoom
      camera.updateProjectionMatrix()
    }
  }, [camera, storeCamera])

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(10, storeCamera.zoom * zoomFactor))

      setCamera({ zoom: newZoom })
    },
    [storeCamera.zoom, setCamera]
  )

  // Handle mouse down for pan
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      // Only pan with:
      // - Middle mouse button (button 1)
      // - Left click + space pressed
      // - Left click when pan tool is active
      const shouldPan =
        e.button === 1 ||
        (e.button === 0 && isSpacePressed.current) ||
        (e.button === 0 && tool === "pan")

      if (shouldPan) {
        e.preventDefault()
        e.stopPropagation()
        isPanning.current = true
        lastPointer.current = { x: e.clientX, y: e.clientY }
        gl.domElement.style.cursor = "grabbing"
      }
    },
    [gl, tool]
  )

  // Handle mouse move for pan
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isPanning.current) return

      const deltaX = e.clientX - lastPointer.current.x
      const deltaY = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }

      // Convert screen pixels to world units based on zoom
      const worldDeltaX = -deltaX / storeCamera.zoom
      const worldDeltaY = deltaY / storeCamera.zoom

      setCamera({
        position: [
          storeCamera.position[0] + worldDeltaX,
          storeCamera.position[1] + worldDeltaY,
          storeCamera.position[2],
        ],
      })
    },
    [storeCamera, setCamera]
  )

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    isPanning.current = false
    gl.domElement.style.cursor = isSpacePressed.current || tool === "pan" ? "grab" : "default"
  }, [gl, tool])

  // Handle keyboard for spacebar pan
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "Space" && !isSpacePressed.current) {
        e.preventDefault()
        isSpacePressed.current = true
        gl.domElement.style.cursor = "grab"
      }
    },
    [gl]
  )

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressed.current = false
        if (!isPanning.current) {
          gl.domElement.style.cursor = "default"
        }
      }
    },
    [gl]
  )

  // Update cursor based on tool
  useEffect(() => {
    if (!isPanning.current && !isSpacePressed.current) {
      gl.domElement.style.cursor = tool === "pan" ? "grab" : "default"
    }
  }, [tool, gl])

  // Set up event listeners
  useEffect(() => {
    const canvas = gl.domElement

    canvas.addEventListener("wheel", handleWheel, { passive: false })
    // Use capture phase for mousedown to handle pan before R3F events
    canvas.addEventListener("mousedown", handleMouseDown, { capture: false })
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      canvas.removeEventListener("wheel", handleWheel)
      canvas.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [gl, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown, handleKeyUp])

  return null
}
