"use client"

import { useThree, useFrame } from "@react-three/fiber"
import { useEffect, useRef, useCallback } from "react"
import { OrthographicCamera, Vector3 } from "three"
import { useCanvasStore } from "@/lib/store"

export function CanvasCamera() {
  const { camera, gl } = useThree()
  const storeCamera = useCanvasStore((state) => state.camera)
  const setCamera = useCanvasStore((state) => state.setCamera)
  const tool = useCanvasStore((state) => state.editor.tool)

  const isDragging = useRef(false)
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
      const newZoom = Math.max(0.01, Math.min(10, storeCamera.zoom * zoomFactor))

      setCamera({ zoom: newZoom })
    },
    [storeCamera.zoom, setCamera]
  )

  // Handle mouse down for pan
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      // Pan with middle mouse, or left mouse when space is pressed or pan tool active
      if (e.button === 1 || (e.button === 0 && (isSpacePressed.current || tool === "pan"))) {
        isDragging.current = true
        lastPointer.current = { x: e.clientX, y: e.clientY }
        gl.domElement.style.cursor = "grabbing"
      }
    },
    [gl, tool]
  )

  // Handle mouse move for pan
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return

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
    isDragging.current = false
    gl.domElement.style.cursor = isSpacePressed.current || tool === "pan" ? "grab" : "default"
  }, [gl, tool])

  // Handle keyboard for spacebar pan
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "Space" && !isSpacePressed.current) {
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
        if (!isDragging.current) {
          gl.domElement.style.cursor = "default"
        }
      }
    },
    [gl]
  )

  // Set up event listeners
  useEffect(() => {
    const canvas = gl.domElement

    canvas.addEventListener("wheel", handleWheel, { passive: false })
    canvas.addEventListener("mousedown", handleMouseDown)
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
