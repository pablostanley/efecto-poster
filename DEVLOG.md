# Efecto Poster - Development Log

Development notes, decisions, fixes, and roadmap for the efecto-poster project.

---

## Project Vision

Transform Efecto from a single-poster effects tool into an infinite canvas design application where:
- Everything is a layer (3D models, shaders, images, text)
- Multiple artboards/posters live on the same canvas
- Effects (ASCII, dither) are applied per-artboard, not globally
- Users can pan/zoom around the canvas like Figma/FigJam
- Full 3D/WebGL capabilities preserved

---

## Completed Features

### Core Infrastructure
- [x] Infinite canvas with orthographic camera
- [x] Pan (middle mouse, spacebar+drag) and zoom (scroll wheel)
- [x] Background grid
- [x] Zustand state management with undo/redo history

### Artboard System
- [x] FBO (Frame Buffer Object) per artboard for isolated rendering
- [x] Per-artboard effects (ASCII, dither, halftone, sinewarp)
- [x] Artboard selection and resize handles
- [x] Artboard dragging/repositioning
- [x] Artboard name editing (double-click)
- [x] Artboard duplication
- [x] Artboard export to PNG

### Layer System
- [x] Four layer types: 3D, Media, Shader, Text
- [x] Layer visibility and lock toggles
- [x] Layer reordering (drag-and-drop in panel)
- [x] Layer copy/paste between artboards
- [x] Layer duplication
- [x] Layer transforms (position, scale, rotation)

### UI/UX
- [x] Left panel: Layers list with artboard tree
- [x] Right panel: Inspector for selected item properties
- [x] Header toolbar with zoom controls
- [x] Bottom toolbar
- [x] Right-click context menus
- [x] Keyboard shortcuts (see CLAUDE.md)
- [x] Marquee selection (basic)

---

## Recent Fixes (December 2024)

### Canvas Zoom/Scale System Fix

**Problem**: Artboards appeared tiny at default zoom, handles were gigantic, zoom gestures were too fast.

**Root Cause**:
- `scaleFactor` was 0.1 (1 artboard pixel = 0.1 world units)
- `DEFAULT_CAMERA.zoom` was 0.1
- Combined effect: 1920px artboard displayed at ~19px on screen

**Solution**:
1. Changed `scaleFactor` from 0.1 to **1.0** in `artboard-renderer.tsx`
   - Now 1 artboard pixel = 1 world unit
   - At zoom 1.0, 1 artboard pixel = 1 screen pixel

2. Changed `DEFAULT_CAMERA.zoom` from 0.1 to **0.5** in `types.ts`
   - Default view shows artboard at 50% size (fits nicely in viewport)

3. Fixed handle size calculation in `layer-handles.tsx`:
   ```typescript
   const handleSize = HANDLE_SIZE_PX / canvasZoom  // 8px constant on screen
   ```

4. Made zoom gestures smoother in `canvas-camera.tsx`:
   ```typescript
   // Proportional zoom based on deltaY
   const clampedDelta = Math.max(-50, Math.min(50, e.deltaY))
   const zoomMultiplier = 1 - clampedDelta * 0.005
   ```

**Files Modified**:
- `src/lib/types.ts` - DEFAULT_CAMERA.zoom
- `src/components/artboard/artboard-renderer.tsx` - scaleFactor
- `src/components/layers/layer-handles.tsx` - handle size calc
- `src/components/canvas/canvas-camera.tsx` - smooth zoom
- `src/components/canvas/infinite-canvas.tsx` - marquee scaleFactor

---

### Selection/Deselection UX Fix

**Problem**: Hard to deselect layers, click vs drag detection was broken.

**Issues Fixed**:

1. **Click vs Drag Threshold**
   - Added 5px screen pixel threshold in `marquee-selection-handler.tsx`
   - Marquee only shows after crossing threshold
   - Single clicks properly trigger deselection

2. **Hit-Test Areas Too Large**
   - Reduced from 15-50% to 8-25% of artboard dimensions
   - Now easier to click "outside" a layer to deselect

   | Layer Type | Before | After |
   |------------|--------|-------|
   | Default | 15% | 8% |
   | Text | 25% x 10% | 12% x 5% |
   | Shader | 50% | 25% |
   | 3D | 20% | 10% |
   | Media | 40% | 20% |

3. **Explicit Layer Deselection**
   - Click on artboard (not on layer) → `selectLayer(null)` called
   - Click on artboard border → deselects layer
   - Click on empty canvas → deselects everything

**Files Modified**:
- `src/components/canvas/marquee-selection-handler.tsx`
- `src/components/artboard/artboard-renderer.tsx`

---

### Layer Handles Outside FBO

**Problem**: Layer selection handles were rendered inside the FBO, so ASCII/dither effects were applied to them (green ASCII text on handles).

**Solution**: Moved `SelectedLayerHandles` component to render in the main scene at z=10, outside the FBO portal.

```typescript
// In artboard-renderer.tsx
<group position={[artboard.position[0], artboard.position[1], 0]}>
  {/* FBO content via portal */}
  {createPortal(<ArtboardContent />, artboardScene)}

  {/* Handles rendered OUTSIDE FBO in main scene */}
  <SelectedLayerHandles artboard={artboard} scaleFactor={scaleFactor} />
</group>
```

---

### Layer Selection Fix

**Problem**: Clicking a layer selected the artboard instead.

**Solution**: Updated `selectLayer` in store to also set `selectedArtboardId`:

```typescript
selectLayer: (layerId) =>
  set((state) => {
    let artboardId = state.editor.selectedArtboardId
    if (layerId) {
      const artboardWithLayer = state.artboards.find((a) =>
        a.layers.some((l) => l.id === layerId)
      )
      if (artboardWithLayer) {
        artboardId = artboardWithLayer.id
      }
    }
    return {
      editor: { ...state.editor, selectedArtboardId: artboardId, selectedLayerId: layerId },
    }
  }),
```

---

## Known Issues / Technical Debt

### TypeScript Errors in Incomplete Features
Several components have type errors due to incomplete implementation:
- `material-selector.tsx` - Missing MATERIAL_PRESETS, MaterialType exports
- `model-library.tsx` - Missing LibraryModel, model-library-data
- `upload-tile.tsx` - Missing UploadedFile, UploadFileType
- Various missing modules (dithering-canvas, webgpu-utils)

These are stub files created to allow the dev server to run. They need proper implementation.

### Layer Hit Testing
Current hit areas are fixed percentages. Ideally should calculate actual rendered bounds, but this is complex for different layer types.

### Video Export
Not yet implemented. Need to capture frames and encode to video.

---

## Roadmap / Next Steps

### High Priority
- [x] **Shift+click multi-select** - Select multiple layers/artboards ✅
- [ ] **Fit to view** - Zoom to selected artboard (double-click artboard name?)
- [ ] **Transform handles** - Rotation handle, proper corner resize

### Medium Priority
- [ ] **Artboard templates/presets** - Common sizes (Instagram, Twitter, etc.)
- [ ] **Grid snapping** - Snap to grid when moving layers/artboards
- [ ] **Rulers** - Show rulers along canvas edges

### Lower Priority
- [ ] **Align/distribute tools** - Align selected items
- [ ] **Video export** - Export artboard as video
- [ ] **Batch export** - Export multiple artboards at once
- [ ] **Layer effects** - Drop shadow, blur, etc. per layer

### Technical Improvements
- [ ] Fix remaining TypeScript errors
- [ ] Implement proper hit testing with actual layer bounds
- [ ] Add loading states for media/models
- [ ] Performance optimization for many artboards

---

## Architecture Decisions

### Why FBO per Artboard?
Each artboard has its own render target (FBO) so effects can be applied independently. This allows different ASCII/dither settings per artboard without multiple WebGL contexts.

### Why Orthographic Camera?
Perspective cameras don't work well for 2D canvas navigation. Orthographic gives us pixel-perfect zoom and pan like Figma.

### Why Zustand?
Simpler than Redux, works well with R3F's render loop. The `subscribeWithSelector` middleware allows efficient re-renders.

### Why scaleFactor = 1.0?
Simplest mental model: 1 artboard pixel = 1 world unit. At zoom 1.0, display is 1:1 with screen pixels.

---

## File Organization

```
src/
├── app/
│   ├── page.tsx           # Main entry, keyboard shortcuts
│   └── layout.tsx
├── components/
│   ├── canvas/            # Infinite canvas infrastructure
│   │   ├── infinite-canvas.tsx
│   │   ├── canvas-camera.tsx
│   │   ├── canvas-grid.tsx
│   │   ├── selection-handles.tsx
│   │   └── marquee-selection-handler.tsx
│   ├── artboard/          # Artboard rendering
│   │   ├── artboard-renderer.tsx   # FBO + effects
│   │   └── artboard-effect.tsx     # Effect material switching
│   ├── layers/            # Layer renderers
│   │   ├── layer-renderer.tsx      # Type router
│   │   ├── layer-3d.tsx
│   │   ├── layer-media.tsx
│   │   ├── layer-shader.tsx
│   │   ├── layer-text.tsx
│   │   └── layer-handles.tsx
│   ├── effects/           # Post-processing effects
│   │   ├── ascii-effect.tsx
│   │   ├── dither-effect.tsx
│   │   ├── halftone-effect.tsx
│   │   └── sine-warp-effect.tsx
│   ├── panels/            # UI panels
│   │   ├── layers-panel.tsx
│   │   ├── inspector-panel.tsx
│   │   ├── header-toolbar.tsx
│   │   └── toolbar.tsx
│   └── ui/                # shadcn components
├── lib/
│   ├── types.ts           # Type definitions + defaults
│   ├── store.ts           # Zustand store
│   ├── use-keyboard-shortcuts.ts
│   └── utils.ts
└── public/
    └── assets/            # Sample models, videos
```

---

## Session Notes

### December 25, 2024 (Session 2)
- **Implemented full multi-selection system**:
  - Changed `selectedLayerId: string | null` → `selectedLayerIds: string[]`
  - Added selection actions: `selectLayers`, `addToSelection`, `removeFromSelection`, `toggleSelection`, `selectAllLayers`, `clearSelection`
  - Added batch operations: `deleteLayers`, `duplicateLayers`, `copyLayers`, `pasteLayers`, `updateLayers`
  - Shift+click and Cmd+click toggle selection in canvas and layer panel
  - All keyboard shortcuts work with multiple layers (delete, duplicate, copy/paste, arrow keys, H/L)
  - Cmd+A selects all layers in current artboard
  - Layer handles show for all selected layers
  - Context menus show count and operate on all selected
  - Clipboard supports multiple layers
- **Multi-selection inspector panel**:
  - Shows layer count and type summary in header ("3 layers selected", "1 3d, 2 text")
  - Align tools: left, center, right, top, middle, bottom
  - Position offset controls for batch moving (ΔX, ΔY)
  - Shared properties with "Mixed" indicator (opacity, visibility, lock)
  - Selection info list showing all selected layers

### December 25, 2024 (Session 1)
- Fixed canvas zoom/scale system (scaleFactor 0.1→1.0, zoom 0.1→0.5)
- Fixed click vs drag threshold for marquee selection
- Reduced layer hit-test areas for easier deselection
- Added explicit selectLayer(null) calls for deselection
- Created CLAUDE.md and DEVLOG.md documentation
