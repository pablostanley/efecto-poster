"use client"

import { useRef, useEffect, useState } from "react"
import { ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"
import type { LayerMedia as LayerMediaType } from "@/lib/types"

interface LayerMediaProps {
  layer: LayerMediaType
  artboardWidth: number
  artboardHeight: number
  zIndex: number
  isSelected: boolean
  onClick?: (e: ThreeEvent<MouseEvent>) => void
}

export function LayerMedia({
  layer,
  artboardWidth,
  artboardHeight,
  zIndex,
  isSelected,
  onClick,
}: LayerMediaProps) {
  const { transform, settings, opacity } = layer
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Position based on transform (percentage of artboard)
  const x = (transform.x / 100) * artboardWidth
  const y = (transform.y / 100) * artboardHeight

  // Load texture based on media type
  useEffect(() => {
    if (!settings.mediaUrl) return

    if (settings.mediaType === "video") {
      // Create video element
      const video = document.createElement("video")
      video.src = settings.mediaUrl
      video.crossOrigin = "anonymous"
      video.loop = true
      video.muted = true
      video.playsInline = true
      video.playbackRate = settings.playbackSpeed
      video.play()

      videoRef.current = video

      const videoTexture = new THREE.VideoTexture(video)
      videoTexture.minFilter = THREE.LinearFilter
      videoTexture.magFilter = THREE.LinearFilter
      setTexture(videoTexture)

      return () => {
        video.pause()
        video.src = ""
        videoTexture.dispose()
      }
    } else {
      // Load image texture
      const loader = new THREE.TextureLoader()
      loader.load(
        settings.mediaUrl,
        (tex) => {
          tex.minFilter = THREE.LinearFilter
          tex.magFilter = THREE.LinearFilter
          setTexture(tex)
        },
        undefined,
        (error) => {
          console.error("Error loading image:", error)
        }
      )
    }
  }, [settings.mediaUrl, settings.mediaType, settings.playbackSpeed])

  // Update video playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = settings.playbackSpeed
    }
  }, [settings.playbackSpeed])

  // Calculate aspect ratio and sizing
  let displayWidth = artboardWidth * 0.8
  let displayHeight = artboardHeight * 0.8

  if (texture?.image) {
    const imgWidth = texture.image.videoWidth || texture.image.width || displayWidth
    const imgHeight = texture.image.videoHeight || texture.image.height || displayHeight
    const aspectRatio = imgWidth / imgHeight

    if (settings.objectFit === "cover") {
      // Cover: scale to fill, maintaining aspect ratio
      const containerAspect = displayWidth / displayHeight
      if (aspectRatio > containerAspect) {
        displayHeight = displayWidth / aspectRatio
      } else {
        displayWidth = displayHeight * aspectRatio
      }
    } else if (settings.objectFit === "contain") {
      // Contain: fit within bounds, maintaining aspect ratio
      const containerAspect = displayWidth / displayHeight
      if (aspectRatio > containerAspect) {
        displayHeight = displayWidth / aspectRatio
      } else {
        displayWidth = displayHeight * aspectRatio
      }
    }
    // "fill" uses the default dimensions
  }

  // Apply flip transformations
  const scaleX = settings.flipHorizontal ? -1 : 1
  const scaleY = settings.flipVertical ? -1 : 1

  return (
    <group
      position={[x, y, zIndex * 0.1]}
      rotation={[0, 0, (transform.rotation * Math.PI) / 180]}
      scale={[transform.scale * scaleX, transform.scale * scaleY, 1]}
      onClick={onClick}
    >
      {texture ? (
        <mesh>
          <planeGeometry args={[displayWidth, displayHeight]} />
          <meshBasicMaterial
            map={texture}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : (
        // Loading placeholder
        <mesh>
          <planeGeometry args={[displayWidth, displayHeight]} />
          <meshBasicMaterial color="#333333" transparent opacity={0.5} />
        </mesh>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <lineSegments position={[0, 0, 0.05]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(displayWidth + 4, displayHeight + 4)]} />
          <lineBasicMaterial color="#3b82f6" />
        </lineSegments>
      )}
    </group>
  )
}
