// ========================================
// LAYER TYPES
// ========================================

export type LayerType = "3d" | "media" | "shader" | "text"
export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten"

export interface LayerTransform {
  x: number      // percentage of artboard width
  y: number      // percentage of artboard height
  scale: number  // 0-2 scale factor
  rotation: number // degrees
}

export interface LayerBase {
  id: string
  type: LayerType
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  transform: LayerTransform
}

// 3D Layer Settings
export interface Layer3DSettings {
  modelType: "shape" | "gltf" | "svg"
  shape: "torus" | "sphere" | "box" | "cone" | "torusKnot" | "icosahedron" | "octahedron" | "tetrahedron" | "dodecahedron" | "capsule" | "cylinder"
  modelUrl: string
  svgUrl: string
  materialType: "default" | "toon" | "phong" | "standard" | "glass" | "glossy" | "silver" | "gold" | "iridescent"
  color: string
  bgColor: string
  objectRotationY: number
  autoRotate: boolean
  autoRotateSpeed: number
  scale: number
  wireframe: boolean
  cameraPosition: [number, number, number]
  cameraTarget: [number, number, number]
  cameraZoom: number
}

// Media Layer Settings
export interface LayerMediaSettings {
  mediaUrl: string
  mediaType: "video" | "image" | "gif"
  objectFit: "cover" | "contain" | "fill"
  playbackSpeed: number
  flipHorizontal: boolean
  flipVertical: boolean
}

// Shader Layer Settings
export type ShaderType = "meshGradient" | "dotGrid" | "voronoi" | "liquidMetal" | "chrome" | "pulsar" | "blackHole" | "glass" | "spiral" | "particles" | "fireworks"

export interface LayerShaderSettings {
  type: ShaderType
  speed: number
  // Shader-specific settings would be defined here
}

// Text Layer Settings
export interface LayerTextSettings {
  content: string
  fontFamily: string
  fontSize: number  // viewport percentage
  fontWeight: number
  color: string
  letterSpacing: number
  lineHeight: number
  textAlign: "left" | "center" | "right"
}

// Union type for layer settings
export type LayerSettings = Layer3DSettings | LayerMediaSettings | LayerShaderSettings | LayerTextSettings

// Specific layer types
export interface Layer3D extends LayerBase {
  type: "3d"
  settings: Layer3DSettings
}

export interface LayerMedia extends LayerBase {
  type: "media"
  settings: LayerMediaSettings
}

export interface LayerShader extends LayerBase {
  type: "shader"
  settings: LayerShaderSettings
}

export interface LayerText extends LayerBase {
  type: "text"
  settings: LayerTextSettings
}

export type Layer = Layer3D | LayerMedia | LayerShader | LayerText

// ========================================
// EFFECT TYPES
// ========================================

export type EffectType = "ascii" | "dither" | "halftone" | "sinewarp"

export interface AsciiSettings {
  characters: string
  fontSize: number
  cellSize: number
  invert: boolean
  color: boolean
  inkColor: string
  paperColor: string
  fontFamily: string
  fontWeight: number
  lineHeight: number
  contrast: number
  slant: number
  slantCharacters: number
  jitter: number
  jitterSpeed: number
  vignette: number
  noise: number
  noiseSpeed: number
}

export interface DitherSettings {
  algorithm: "floydSteinberg" | "atkinson" | "jarvisJudiceNinke" | "stucki" | "burkes" | "sierra" | "ordered2x2" | "ordered4x4" | "ordered8x8" | "clustered" | "bayer"
  pixelSize: number
  color1: string
  color2: string
  contrast: number
  brightness: number
  colorLevels: number
  colorful: boolean
  frameBlending: number
}

export interface HalftoneSettings {
  dotSize: number
  spacing: number
  angle: number
  colorMode: "mono" | "color"
}

export interface SinewarpSettings {
  amplitude: number
  frequency: number
  speed: number
  direction: "horizontal" | "vertical" | "both"
}

export interface EffectSettings {
  enabled: boolean
  type: EffectType
  ascii: AsciiSettings
  dither: DitherSettings
  halftone: HalftoneSettings
  sinewarp: SinewarpSettings
}

// ========================================
// ARTBOARD TYPES
// ========================================

export interface Artboard {
  id: string
  name: string
  position: [number, number]  // Canvas position in world units
  size: { width: number; height: number }  // Pixel dimensions
  backgroundColor: string
  layers: Layer[]
  effect: EffectSettings
}

// ========================================
// CANVAS STATE
// ========================================

export interface CameraState {
  position: [number, number, number]
  zoom: number
}

export interface EditorState {
  selectedArtboardId: string | null
  selectedLayerId: string | null
  tool: "select" | "pan" | "zoom"
}

export interface CanvasState {
  camera: CameraState
  artboards: Artboard[]
  editor: EditorState
}

// ========================================
// DEFAULTS
// ========================================

export const DEFAULT_LAYER_TRANSFORM: LayerTransform = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
}

export const DEFAULT_3D_SETTINGS: Layer3DSettings = {
  modelType: "shape",
  shape: "torus",
  modelUrl: "",
  svgUrl: "",
  materialType: "default",
  color: "#ffffff",
  bgColor: "#000000",
  objectRotationY: 0,
  autoRotate: true,
  autoRotateSpeed: 1,
  scale: 1,
  wireframe: false,
  cameraPosition: [0, 0, 5],
  cameraTarget: [0, 0, 0],
  cameraZoom: 1,
}

export const DEFAULT_MEDIA_SETTINGS: LayerMediaSettings = {
  mediaUrl: "/assets/videos/beach-sunset.mp4",
  mediaType: "video",
  objectFit: "cover",
  playbackSpeed: 1,
  flipHorizontal: false,
  flipVertical: false,
}

export const DEFAULT_SHADER_SETTINGS: LayerShaderSettings = {
  type: "meshGradient",
  speed: 1,
}

export const DEFAULT_TEXT_SETTINGS: LayerTextSettings = {
  content: "Hello",
  fontFamily: "Inter",
  fontSize: 10,
  fontWeight: 400,
  color: "#ffffff",
  letterSpacing: 0,
  lineHeight: 1.2,
  textAlign: "center",
}

export const DEFAULT_ASCII_SETTINGS: AsciiSettings = {
  characters: " .-:=+*#%@",
  fontSize: 12,
  cellSize: 8,
  invert: false,
  color: false,
  inkColor: "#00ff00",
  paperColor: "#000000",
  fontFamily: "monospace",
  fontWeight: 400,
  lineHeight: 1,
  contrast: 1,
  slant: 0,
  slantCharacters: 400,
  jitter: 0,
  jitterSpeed: 2,
  vignette: 0,
  noise: 0,
  noiseSpeed: 2,
}

export const DEFAULT_DITHER_SETTINGS: DitherSettings = {
  algorithm: "floydSteinberg",
  pixelSize: 4,
  color1: "#000000",
  color2: "#ffffff",
  contrast: 1,
  brightness: 0,
  colorLevels: 2,
  colorful: false,
  frameBlending: 0,
}

export const DEFAULT_HALFTONE_SETTINGS: HalftoneSettings = {
  dotSize: 4,
  spacing: 8,
  angle: 45,
  colorMode: "mono",
}

export const DEFAULT_SINEWARP_SETTINGS: SinewarpSettings = {
  amplitude: 0.1,
  frequency: 10,
  speed: 1,
  direction: "horizontal",
}

export const DEFAULT_EFFECT_SETTINGS: EffectSettings = {
  enabled: true,
  type: "ascii",
  ascii: DEFAULT_ASCII_SETTINGS,
  dither: DEFAULT_DITHER_SETTINGS,
  halftone: DEFAULT_HALFTONE_SETTINGS,
  sinewarp: DEFAULT_SINEWARP_SETTINGS,
}

export const DEFAULT_ARTBOARD: Omit<Artboard, "id"> = {
  name: "Artboard 1",
  position: [0, 0],
  size: { width: 1920, height: 1080 },
  backgroundColor: "#000000",
  layers: [],
  effect: DEFAULT_EFFECT_SETTINGS,
}

export const DEFAULT_CAMERA: CameraState = {
  position: [0, 0, 100],
  zoom: 0.1,
}

export const DEFAULT_EDITOR: EditorState = {
  selectedArtboardId: null,
  selectedLayerId: null,
  tool: "select",
}

export const DEFAULT_CANVAS_STATE: CanvasState = {
  camera: DEFAULT_CAMERA,
  artboards: [],
  editor: DEFAULT_EDITOR,
}
