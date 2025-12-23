"use client"

import { X, Upload, File, FileVideo, Image as ImageIcon, Cube } from "@phosphor-icons/react"
import type { UploadedFile, UploadFileType } from "@/lib/types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"

interface UploadTileButtonProps {
  type: UploadFileType
  accept: string
  onFileSelect: (file: File) => void
}

export function UploadTileButton({ type, accept, onFileSelect }: UploadTileButtonProps) {
  const labels: Record<UploadFileType, string> = {
    model: "Upload 3D model",
    svg: "Upload SVG",
    video: "Upload video",
    image: "Upload image",
    media: "Upload media",
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
      // Reset input value to allow re-uploading the same file
      e.target.value = ""
    }
  }

  return (
    <label className="w-full h-9 rounded-md border border-border hover:border-muted-foreground bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer flex items-center justify-center gap-2 group">
      <input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="sr-only"
        aria-label={labels[type]}
      />
      <Upload className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden="true" />
      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
        Upload
      </span>
    </label>
  )
}

interface UploadedTileProps {
  upload: UploadedFile
  onSelect: () => void
  onDelete: () => void
  isSelected: boolean
  aspectRatio?: "square" | "video"
}

export function UploadedTile({ upload, onSelect, onDelete, isSelected, aspectRatio = "square" }: UploadedTileProps) {
  const getFileIcon = (type: UploadFileType) => {
    switch (type) {
      case "model":
        return <Cube className="w-8 h-8" />
      case "svg":
        return <File className="w-8 h-8" />
      case "video":
        return <FileVideo className="w-8 h-8" />
      case "image":
        return <ImageIcon className="w-8 h-8" />
      case "media":
        return <FileVideo className="w-8 h-8" />
    }
  }

  const getThumbnail = () => {
    if (upload.thumbnail) {
      if (upload.type === "video" || upload.type === "image" || upload.type === "media") {
        return (
          <img
            src={upload.thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        )
      } else if (upload.type === "svg") {
        return (
          <img
            src={upload.thumbnail}
            alt=""
            className="w-full h-full object-contain p-2"
          />
        )
      }
    }

    // Fallback to icon
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground" aria-hidden="true">
        {getFileIcon(upload.type)}
      </div>
    )
  }

  const aspectClass = aspectRatio === "video" ? "aspect-video" : "aspect-square"

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onSelect()
    }
  }

  return (
    <TooltipProvider delayDuration={2000}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            aria-pressed={isSelected}
            aria-label={upload.filename}
            className={`relative ${aspectClass} rounded-md overflow-hidden border-2 transition-all flex items-center justify-center group cursor-pointer ${
              isSelected
                ? "border-foreground"
                : "border-transparent hover:border-muted-foreground/50"
            }`}
          >
            {getThumbnail()}

            {/* Upload badge */}
            <div className="absolute top-1 left-1 bg-background/80 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-1" aria-hidden="true">
              <Upload className="w-2.5 h-2.5 text-muted-foreground" />
            </div>

            {/* Not persisted warning */}
            {!upload.persisted && (
              <div className="absolute bottom-1 left-1 right-1 bg-destructive/80 backdrop-blur-sm rounded px-1.5 py-0.5" role="status">
                <span className="text-[9px] text-destructive-foreground font-medium">
                  Won't persist
                </span>
              </div>
            )}

            {/* Delete button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="absolute top-1 right-1 bg-background/80 hover:bg-destructive hover:text-destructive-foreground backdrop-blur-sm rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Delete ${upload.filename}`}
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>

            {/* Filename overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
              <span className="text-xs text-foreground line-clamp-1 text-center">
                {upload.filename}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm space-y-1">
            <p className="font-medium">{upload.filename}</p>
            <p className="text-muted-foreground">
              {(upload.size / 1024).toFixed(1)} KB
            </p>
            {!upload.persisted && (
              <p className="text-destructive text-xs">
                File too large - won't persist after refresh
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
