"use client"

import { forwardRef, useMemo } from "react"
import { Effect, BlendFunction } from "postprocessing"
import { Uniform, Vector2, Vector4 } from "three"
import type { AsciiPostFXSettings, ColorPalette } from "@/lib/types"

const fragmentShader = `
uniform float cellSize;
uniform bool invert;
uniform bool colorMode;
uniform int asciiStyle;
uniform bool charRotation;

// PostFX uniforms
uniform float time;
uniform vec2 resolution;
uniform vec2 mousePos;
uniform vec4 contentBounds; // x, y, width, height (normalized 0-1)
uniform vec3 backgroundColor; // Background color from theme

// Tier 1 uniforms
uniform float scanlineIntensity;
uniform float scanlineCount;
uniform float targetFPS;
uniform float jitterIntensity;
uniform float jitterSpeed;
uniform bool mouseGlowEnabled;
uniform float mouseGlowRadius;
uniform float mouseGlowIntensity;
uniform float vignetteIntensity;
uniform float vignetteRadius;
uniform int colorPalette;

// Tier 2 uniforms
uniform float curvature;
uniform float aberrationStrength;
uniform float noiseIntensity;
uniform float noiseScale;
uniform float noiseSpeed;
uniform float waveAmplitude;
uniform float waveFrequency;
uniform float waveSpeed;
uniform float glitchIntensity;
uniform float glitchFrequency;
uniform float brightnessAdjust;
uniform float contrastAdjust;

// =======================
// HELPER FUNCTIONS
// =======================

// Pseudo-random function
float random(vec2 st) {
  return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
}

// 2D Noise function
float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// RGB to HSL conversion
vec3 rgb2hsl(vec3 rgb) {
  float maxVal = max(max(rgb.r, rgb.g), rgb.b);
  float minVal = min(min(rgb.r, rgb.g), rgb.b);
  float delta = maxVal - minVal;

  float h = 0.0;
  float s = 0.0;
  float l = (maxVal + minVal) * 0.5;

  if (delta > 0.0001) {
    s = delta / (1.0 - abs(2.0 * l - 1.0));

    if (maxVal == rgb.r) {
      h = mod((rgb.g - rgb.b) / delta, 6.0);
    } else if (maxVal == rgb.g) {
      h = (rgb.b - rgb.r) / delta + 2.0;
    } else {
      h = (rgb.r - rgb.g) / delta + 4.0;
    }
    h = h / 6.0;
  }

  return vec3(h, s, l);
}

// HSL to RGB conversion
vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;

  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
  float m = l - c * 0.5;

  vec3 rgb = vec3(0.0);

  if (h < 1.0/6.0) {
    rgb = vec3(c, x, 0.0);
  } else if (h < 2.0/6.0) {
    rgb = vec3(x, c, 0.0);
  } else if (h < 3.0/6.0) {
    rgb = vec3(0.0, c, x);
  } else if (h < 4.0/6.0) {
    rgb = vec3(0.0, x, c);
  } else if (h < 5.0/6.0) {
    rgb = vec3(x, 0.0, c);
  } else {
    rgb = vec3(c, 0.0, x);
  }

  return rgb + m;
}

// Apply color palette
vec3 applyColorPalette(vec3 color, float brightness, int palette) {
  if (palette == 0) return color; // Original

  vec3 paletteColor = color;

  if (palette == 1) { // Green phosphor
    paletteColor = vec3(0.0, brightness, 0.0) * 1.5;
  } else if (palette == 2) { // Amber
    paletteColor = vec3(brightness * 1.2, brightness * 0.7, 0.0);
  } else if (palette == 3) { // Cyan
    paletteColor = vec3(0.0, brightness * 0.9, brightness);
  } else if (palette == 4) { // Blue
    paletteColor = vec3(0.0, 0.0, brightness);
  }

  return paletteColor;
}

// Sobel edge detection for rotation
vec2 getGradient(vec2 uv, vec2 cellCount) {
  vec2 offset = 1.0 / cellCount;

  // Sample 3x3 neighborhood
  float tl = dot(texture(inputBuffer, uv + vec2(-offset.x, -offset.y)).rgb, vec3(0.299, 0.587, 0.114));
  float t  = dot(texture(inputBuffer, uv + vec2(0.0, -offset.y)).rgb, vec3(0.299, 0.587, 0.114));
  float tr = dot(texture(inputBuffer, uv + vec2(offset.x, -offset.y)).rgb, vec3(0.299, 0.587, 0.114));
  float l  = dot(texture(inputBuffer, uv + vec2(-offset.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float r  = dot(texture(inputBuffer, uv + vec2(offset.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float bl = dot(texture(inputBuffer, uv + vec2(-offset.x, offset.y)).rgb, vec3(0.299, 0.587, 0.114));
  float b  = dot(texture(inputBuffer, uv + vec2(0.0, offset.y)).rgb, vec3(0.299, 0.587, 0.114));
  float br = dot(texture(inputBuffer, uv + vec2(offset.x, offset.y)).rgb, vec3(0.299, 0.587, 0.114));

  // Sobel operator
  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;

  return vec2(gx, gy);
}

// Rotate point around center
vec2 rotatePoint(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  p -= 0.5;
  p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  p += 0.5;
  return p;
}

// Different character patterns based on style
// Using 5x7 grid for richer character shapes
float getChar(float brightness, vec2 p, int style) {
  vec2 grid = floor(p * vec2(5.0, 7.0));
  float val = 0.0;

  if (style == 0) {
    // Standard: . : = * o O 0 8 @ █ (10 levels)
    if (brightness < 0.1) {
      val = 0.0; // space
    } else if (brightness < 0.2) {
      // Period: single dot
      val = (grid.x == 2.0 && grid.y == 5.0) ? 1.0 : 0.0;
    } else if (brightness < 0.3) {
      // Colon: two dots
      val = (grid.x == 2.0 && (grid.y == 2.0 || grid.y == 4.0)) ? 1.0 : 0.0;
    } else if (brightness < 0.4) {
      // Equals: two lines
      val = (grid.y == 2.0 || grid.y == 4.0) && (grid.x >= 1.0 && grid.x <= 3.0) ? 1.0 : 0.0;
    } else if (brightness < 0.5) {
      // Asterisk: center + diagonals
      bool center = (grid.x == 2.0 && grid.y == 3.0);
      bool vert = (grid.x == 2.0 && (grid.y >= 2.0 && grid.y <= 4.0));
      bool horiz = (grid.y == 3.0 && (grid.x >= 1.0 && grid.x <= 3.0));
      bool diag1 = ((grid.x == 1.0 && grid.y == 2.0) || (grid.x == 3.0 && grid.y == 4.0));
      bool diag2 = ((grid.x == 1.0 && grid.y == 4.0) || (grid.x == 3.0 && grid.y == 2.0));
      val = (center || vert || horiz || diag1 || diag2) ? 1.0 : 0.0;
    } else if (brightness < 0.6) {
      // lowercase o: small circle
      bool outline = ((grid.y == 2.0 || grid.y == 4.0) && (grid.x >= 1.0 && grid.x <= 3.0)) ||
                     ((grid.x == 1.0 || grid.x == 3.0) && grid.y == 3.0);
      val = outline ? 1.0 : 0.0;
    } else if (brightness < 0.7) {
      // Uppercase O: larger circle
      bool outline = ((grid.y == 1.0 || grid.y == 5.0) && (grid.x >= 1.0 && grid.x <= 3.0)) ||
                     ((grid.x == 0.0 || grid.x == 4.0) && (grid.y >= 2.0 && grid.y <= 4.0)) ||
                     ((grid.x == 1.0 || grid.x == 3.0) && (grid.y >= 1.0 && grid.y <= 5.0));
      val = outline ? 1.0 : 0.0;
    } else if (brightness < 0.8) {
      // Zero: circle with diagonal
      bool outline = ((grid.y == 1.0 || grid.y == 5.0) && (grid.x >= 1.0 && grid.x <= 3.0)) ||
                     ((grid.x == 0.0 || grid.x == 4.0) && (grid.y >= 2.0 && grid.y <= 4.0)) ||
                     ((grid.x == 1.0 || grid.x == 3.0) && (grid.y >= 1.0 && grid.y <= 5.0));
      bool diag = abs(grid.x - 2.0) == abs(grid.y - 3.0) && grid.x >= 1.0 && grid.x <= 3.0;
      val = (outline || diag) ? 1.0 : 0.0;
    } else if (brightness < 0.9) {
      // 8: two stacked circles
      bool top = ((grid.y == 1.0 || grid.y == 3.0) && (grid.x >= 1.0 && grid.x <= 3.0)) ||
                 ((grid.x == 1.0 || grid.x == 3.0) && grid.y == 2.0);
      bool bot = ((grid.y == 3.0 || grid.y == 5.0) && (grid.x >= 1.0 && grid.x <= 3.0)) ||
                 ((grid.x == 1.0 || grid.x == 3.0) && grid.y == 4.0);
      val = (top || bot) ? 1.0 : 0.0;
    } else {
      // Full block
      val = 1.0;
    }
  } else if (style == 1) {
    // Dense: ░ ▒ ▓ █ with fine gradation (8 levels)
    if (brightness < 0.125) {
      val = 0.0;
    } else if (brightness < 0.25) {
      // Light shade: 25% filled
      val = (mod(grid.x + grid.y, 2.0) == 0.0) ? 0.5 : 0.0;
    } else if (brightness < 0.375) {
      // Light-medium: 40% filled
      val = (mod(grid.x, 2.0) == 0.0 || mod(grid.y, 2.0) == 0.0) ? 0.6 : 0.0;
    } else if (brightness < 0.5) {
      // Medium: 50% filled
      val = (mod(grid.x + grid.y, 2.0) == 0.0) ? 1.0 : 0.0;
    } else if (brightness < 0.625) {
      // Medium-dark: 60% filled
      val = (mod(grid.x, 2.0) == 0.0 || mod(grid.y, 2.0) == 0.0) ? 1.0 : 0.3;
    } else if (brightness < 0.75) {
      // Dark: 75% filled
      val = (mod(grid.x + grid.y, 2.0) == 0.0) ? 1.0 : 0.7;
    } else if (brightness < 0.875) {
      // Very dark: 90% filled
      val = (mod(grid.x, 2.0) == 0.0 || mod(grid.y, 2.0) == 0.0) ? 1.0 : 0.85;
    } else {
      // Full
      val = 1.0;
    }
  } else if (style == 2) {
    // Minimal: ' . - + x * # (7 clean levels)
    if (brightness < 0.14) {
      val = 0.0;
    } else if (brightness < 0.28) {
      // Apostrophe
      val = (grid.x == 2.0 && grid.y == 1.0) ? 1.0 : 0.0;
    } else if (brightness < 0.42) {
      // Period
      val = (grid.x == 2.0 && grid.y == 5.0) ? 1.0 : 0.0;
    } else if (brightness < 0.56) {
      // Dash
      val = (grid.y == 3.0 && grid.x >= 1.0 && grid.x <= 3.0) ? 1.0 : 0.0;
    } else if (brightness < 0.70) {
      // Plus
      bool vert = (grid.x == 2.0 && grid.y >= 2.0 && grid.y <= 4.0);
      bool horiz = (grid.y == 3.0 && grid.x >= 1.0 && grid.x <= 3.0);
      val = (vert || horiz) ? 1.0 : 0.0;
    } else if (brightness < 0.84) {
      // X
      bool diag1 = abs(grid.x - 2.0) == abs(grid.y - 3.0) && grid.y >= 2.0 && grid.y <= 4.0;
      val = diag1 ? 1.0 : 0.0;
    } else {
      // Hash
      bool vert = (grid.x == 1.0 || grid.x == 3.0);
      bool horiz = (grid.y == 2.0 || grid.y == 4.0);
      val = (vert || horiz) ? 1.0 : 0.0;
    }
  } else if (style == 3) {
    // Blocks: ▁ ▂ ▃ ▄ ▅ ▆ ▇ █ (true block progression, 8 levels)
    float fillHeight = brightness * 7.0;
    val = (grid.y >= (6.0 - fillHeight)) ? 1.0 : 0.0;
  } else if (style == 4) {
    // Braille: high-detail 2x4 dot matrix (8 levels)
    vec2 dotGrid = floor(p * vec2(2.0, 4.0));

    if (brightness < 0.125) {
      val = 0.0;
    } else if (brightness < 0.25) {
      // Bottom row
      val = (dotGrid.y == 3.0) ? 1.0 : 0.0;
    } else if (brightness < 0.375) {
      // Bottom two rows
      val = (dotGrid.y >= 2.0) ? 1.0 : 0.0;
    } else if (brightness < 0.5) {
      // Bottom three rows
      val = (dotGrid.y >= 1.0) ? 1.0 : 0.0;
    } else if (brightness < 0.625) {
      // All but top left
      val = (dotGrid.y >= 1.0 || dotGrid.x == 1.0) ? 1.0 : 0.0;
    } else if (brightness < 0.75) {
      // All dots
      val = 1.0;
    } else if (brightness < 0.875) {
      // Dense fill
      val = (mod(grid.x + grid.y, 2.0) < 1.5) ? 1.0 : 0.7;
    } else {
      // Solid
      val = 1.0;
    }
  } else if (style == 5) {
    // Technical: . - / | \\ + x # (8 geometric levels)
    if (brightness < 0.125) {
      val = 0.0;
    } else if (brightness < 0.25) {
      // Dot
      val = (grid.x == 2.0 && grid.y == 3.0) ? 1.0 : 0.0;
    } else if (brightness < 0.375) {
      // Dash
      val = (grid.y == 3.0 && grid.x >= 1.0 && grid.x <= 3.0) ? 1.0 : 0.0;
    } else if (brightness < 0.5) {
      // Forward slash
      bool diag = (int(grid.x) + int(grid.y) == 5 || int(grid.x) + int(grid.y) == 6);
      val = diag ? 1.0 : 0.0;
    } else if (brightness < 0.625) {
      // Pipe
      val = (grid.x == 2.0) ? 1.0 : 0.0;
    } else if (brightness < 0.75) {
      // Backslash
      bool diag = abs(grid.x - grid.y / 1.4) < 0.7 && grid.x >= 1.0 && grid.x <= 3.0;
      val = diag ? 1.0 : 0.0;
    } else if (brightness < 0.875) {
      // Plus
      bool cross = (grid.x == 2.0 || grid.y == 3.0);
      val = cross ? 1.0 : 0.0;
    } else {
      // Hash
      bool vert = (grid.x == 1.0 || grid.x == 3.0);
      bool horiz = (grid.y == 2.0 || grid.y == 4.0);
      val = (vert || horiz) ? 1.0 : 0.0;
    }
  } else if (style == 6) {
    // Matrix: 7-segment display 0-9 (10 levels)
    bool top = (grid.y == 0.0 && grid.x >= 1.0 && grid.x <= 3.0);
    bool topLeft = (grid.x == 1.0 && grid.y >= 0.0 && grid.y <= 3.0);
    bool topRight = (grid.x == 3.0 && grid.y >= 0.0 && grid.y <= 3.0);
    bool middle = (grid.y == 3.0 && grid.x >= 1.0 && grid.x <= 3.0);
    bool botLeft = (grid.x == 1.0 && grid.y >= 3.0 && grid.y <= 6.0);
    bool botRight = (grid.x == 3.0 && grid.y >= 3.0 && grid.y <= 6.0);
    bool bottom = (grid.y == 6.0 && grid.x >= 1.0 && grid.x <= 3.0);

    if (brightness < 0.1) {
      val = 0.0; // blank
    } else if (brightness < 0.2) {
      val = (topRight || botRight) ? 1.0 : 0.0; // 1
    } else if (brightness < 0.3) {
      val = (top || topRight || middle || botLeft || bottom) ? 1.0 : 0.0; // 2
    } else if (brightness < 0.4) {
      val = (top || topRight || middle || botRight || bottom) ? 1.0 : 0.0; // 3
    } else if (brightness < 0.5) {
      val = (topLeft || middle || topRight || botRight) ? 1.0 : 0.0; // 4
    } else if (brightness < 0.6) {
      val = (top || topLeft || middle || botRight || bottom) ? 1.0 : 0.0; // 5
    } else if (brightness < 0.7) {
      val = (top || topLeft || middle || botLeft || botRight || bottom) ? 1.0 : 0.0; // 6
    } else if (brightness < 0.8) {
      val = (top || topRight || botRight) ? 1.0 : 0.0; // 7
    } else if (brightness < 0.9) {
      val = (top || topLeft || topRight || middle || botLeft || botRight || bottom) ? 1.0 : 0.0; // 8
    } else {
      val = (top || topLeft || topRight || middle || botRight || bottom) ? 1.0 : 0.0; // 9
    }
  } else if (style == 7) {
    // Hatching: progressive crosshatching density (6 levels)
    float angle1 = grid.x - grid.y * 1.0; // diagonal /
    float angle2 = grid.x + grid.y * 1.0; // diagonal \\

    if (brightness < 0.16) {
      val = 0.0;
    } else if (brightness < 0.33) {
      // Sparse diagonal lines /
      val = (mod(angle1, 3.0) < 0.5) ? 1.0 : 0.0;
    } else if (brightness < 0.5) {
      // Medium diagonal lines /
      val = (mod(angle1, 2.0) < 0.5) ? 1.0 : 0.0;
    } else if (brightness < 0.66) {
      // Cross-hatch: both diagonals
      bool diag1 = mod(angle1, 2.0) < 0.5;
      bool diag2 = mod(angle2, 2.0) < 0.5;
      val = (diag1 || diag2) ? 1.0 : 0.0;
    } else if (brightness < 0.83) {
      // Dense cross-hatch
      bool diag1 = mod(angle1, 1.5) < 0.5;
      bool diag2 = mod(angle2, 1.5) < 0.5;
      val = (diag1 || diag2) ? 1.0 : 0.2;
    } else {
      // Very dense
      bool diag1 = mod(angle1, 1.0) < 0.6;
      bool diag2 = mod(angle2, 1.0) < 0.6;
      val = (diag1 || diag2) ? 1.0 : 0.5;
    }
  }

  return val;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 workingUV = uv;

  // ===========================
  // TIER 2: PRE-PROCESSING
  // ===========================

  // Screen curvature
  if (curvature > 0.0) {
    vec2 centered = workingUV * 2.0 - 1.0;
    float dist = dot(centered, centered);
    centered *= 1.0 + curvature * dist;
    workingUV = centered * 0.5 + 0.5;

    // Black out edges if out of bounds
    if (workingUV.x < 0.0 || workingUV.x > 1.0 || workingUV.y < 0.0 || workingUV.y > 1.0) {
      outputColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
  }

  // Wave distortion
  if (waveAmplitude > 0.0) {
    workingUV.x += sin(workingUV.y * waveFrequency + time * waveSpeed) * waveAmplitude;
    workingUV.y += cos(workingUV.x * waveFrequency + time * waveSpeed) * waveAmplitude * 0.5;
  }

  // ===========================
  // CORE ASCII RENDERING
  // ===========================

  vec2 res = resolution;
  vec2 cellCount = res / cellSize;
  vec2 cellCoord = floor(workingUV * cellCount);

  // Frame rate control
  if (targetFPS > 0.0) {
    float frameTime = 1.0 / targetFPS;
    float frameIndex = floor(time / frameTime);
    cellCoord = floor(workingUV * cellCount) + vec2(random(vec2(frameIndex)) * 0.5);
  }

  vec2 cellUV = (cellCoord + 0.5) / cellCount;

  // Chromatic aberration
  vec4 cellColor;
  if (aberrationStrength > 0.0) {
    float r = texture(inputBuffer, cellUV + vec2(aberrationStrength, 0.0)).r;
    float g = texture(inputBuffer, cellUV).g;
    float b = texture(inputBuffer, cellUV - vec2(aberrationStrength, 0.0)).b;
    cellColor = vec4(r, g, b, 1.0);
  } else {
    cellColor = texture(inputBuffer, cellUV);
  }

  // Calculate brightness
  float brightness = dot(cellColor.rgb, vec3(0.299, 0.587, 0.114));

  // Contrast and brightness adjustment
  brightness = (brightness - 0.5) * contrastAdjust + 0.5 + brightnessAdjust;
  brightness = clamp(brightness, 0.0, 1.0);

  // Time-based noise
  if (noiseIntensity > 0.0) {
    float noiseVal = noise(workingUV * noiseScale * 100.0 + time * noiseSpeed);
    brightness = mix(brightness, noiseVal, noiseIntensity);
  }

  // Jitter/fuzzy effect
  if (jitterIntensity > 0.0) {
    float jitter = random(cellCoord + floor(time * jitterSpeed) * 0.1) - 0.5;
    brightness += jitter * jitterIntensity;
    brightness = clamp(brightness, 0.0, 1.0);
  }

  // RGB Glitch
  if (glitchIntensity > 0.0 && glitchFrequency > 0.0) {
    float glitchTrigger = random(vec2(time * glitchFrequency));
    if (glitchTrigger > 0.9) {
      float glitchOffset = (random(cellCoord + time) - 0.5) * glitchIntensity;
      cellColor.r = texture(inputBuffer, cellUV + vec2(glitchOffset, 0.0)).r;
      cellColor.b = texture(inputBuffer, cellUV - vec2(glitchOffset, 0.0)).b;
    }
  }

  if (invert) {
    brightness = 1.0 - brightness;
  }

  // Get local UV within the cell
  vec2 localUV = fract(workingUV * cellCount);

  // Apply character rotation based on edge detection
  if (charRotation) {
    vec2 gradient = getGradient(cellUV, cellCount);
    float angle = atan(gradient.y, gradient.x);
    float edgeStrength = length(gradient);

    // Only rotate if edge is strong enough
    if (edgeStrength > 0.1) {
      localUV = rotatePoint(localUV, angle);
    }
  }

  float charValue = getChar(brightness, localUV, asciiStyle);

  // ===========================
  // TIER 1: POST-PROCESSING
  // ===========================

  vec3 finalColor;

  if (colorMode) {
    finalColor = cellColor.rgb * charValue;
  } else {
    finalColor = vec3(brightness * charValue);
  }

  // Color palette
  finalColor = applyColorPalette(finalColor, brightness, colorPalette);

  // Mouse glow
  if (mouseGlowEnabled && mouseGlowRadius > 0.0) {
    vec2 pixelPos = workingUV * res;
    float dist = distance(pixelPos, mousePos);
    float glow = 1.0 - smoothstep(0.0, mouseGlowRadius, dist);
    glow = pow(glow, 2.0);
    finalColor *= 1.0 + glow * mouseGlowIntensity;
  }

  // Scanlines
  if (scanlineIntensity > 0.0) {
    float scanline = sin(workingUV.y * scanlineCount * 3.14159) * 0.5 + 0.5;
    finalColor *= 1.0 - scanlineIntensity * (1.0 - scanline);
  }

  // Vignette
  if (vignetteIntensity > 0.0) {
    vec2 centered = workingUV - 0.5;
    float dist = length(centered) / 0.707; // Normalize to corner distance
    float vignette = smoothstep(vignetteRadius, vignetteRadius - 0.5, dist);
    finalColor *= mix(1.0, vignette, vignetteIntensity);
  }

  // Content bounds masking - check if pixel is outside content area
  vec2 boundsMin = contentBounds.xy;
  vec2 boundsMax = contentBounds.xy + contentBounds.zw;
  bool outsideBounds = workingUV.x < boundsMin.x || workingUV.x > boundsMax.x ||
                       workingUV.y < boundsMin.y || workingUV.y > boundsMax.y;

  if (outsideBounds) {
    // Outside content area - use theme background color
    outputColor = vec4(backgroundColor, 1.0);
  } else {
    outputColor = vec4(finalColor, cellColor.a);
  }
}
`

// Module-level variables to track current settings
let _cellSize = 8
let _invert = false
let _colorMode = true
let _asciiStyle = 0
let _charRotation = false
let _time = 0
let _resolution = new Vector2(1920, 1080)
let _mousePos = new Vector2(0, 0)
let _contentBounds = new Vector4(0, 0, 1, 1) // Default: full canvas
let _backgroundColor = { r: 0.1, g: 0.1, b: 0.1 } // Default dark background
let _postfx: AsciiPostFXSettings = {
  preset: "none",
  scanlineIntensity: 0,
  scanlineCount: 200,
  targetFPS: 0,
  jitterIntensity: 0,
  jitterSpeed: 1,
  mouseGlowEnabled: false,
  mouseGlowRadius: 200,
  mouseGlowIntensity: 1.5,
  vignetteIntensity: 0,
  vignetteRadius: 0.8,
  colorPalette: "original",
  curvature: 0,
  aberrationStrength: 0,
  noiseIntensity: 0,
  noiseScale: 1,
  noiseSpeed: 1,
  waveAmplitude: 0,
  waveFrequency: 10,
  waveSpeed: 1,
  glitchIntensity: 0,
  glitchFrequency: 0,
  brightnessAdjust: 0,
  contrastAdjust: 1,
}

const paletteMap: Record<ColorPalette, number> = {
  original: 0,
  green: 1,
  amber: 2,
  cyan: 3,
  blue: 4,
}

class AsciiEffectImpl extends Effect {
  constructor({ cellSize = 8, invert = false, color = true, style = 0, charRotation = false, postfx, resolution, mousePos, contentBounds, backgroundColor }: {
    cellSize?: number
    invert?: boolean
    color?: boolean
    style?: number
    charRotation?: boolean
    postfx?: AsciiPostFXSettings
    resolution?: Vector2
    mousePos?: Vector2
    contentBounds?: Vector4
    backgroundColor?: { r: number; g: number; b: number }
  } = {}) {
    super("AsciiEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ["cellSize", new Uniform(cellSize)],
        ["invert", new Uniform(invert)],
        ["colorMode", new Uniform(color)],
        ["asciiStyle", new Uniform(style)],
        ["charRotation", new Uniform(charRotation)],
        ["time", new Uniform(0)],
        ["resolution", new Uniform(resolution || new Vector2(1920, 1080))],
        ["mousePos", new Uniform(mousePos || new Vector2(0, 0))],
        ["contentBounds", new Uniform(contentBounds || new Vector4(0, 0, 1, 1))],
        ["backgroundColor", new Uniform(backgroundColor ? [backgroundColor.r, backgroundColor.g, backgroundColor.b] : [0.1, 0.1, 0.1])],
        // Tier 1
        ["scanlineIntensity", new Uniform(postfx?.scanlineIntensity || 0)],
        ["scanlineCount", new Uniform(postfx?.scanlineCount || 200)],
        ["targetFPS", new Uniform(postfx?.targetFPS || 0)],
        ["jitterIntensity", new Uniform(postfx?.jitterIntensity || 0)],
        ["jitterSpeed", new Uniform(postfx?.jitterSpeed || 1)],
        ["mouseGlowEnabled", new Uniform(postfx?.mouseGlowEnabled || false)],
        ["mouseGlowRadius", new Uniform(postfx?.mouseGlowRadius || 200)],
        ["mouseGlowIntensity", new Uniform(postfx?.mouseGlowIntensity || 1.5)],
        ["vignetteIntensity", new Uniform(postfx?.vignetteIntensity || 0)],
        ["vignetteRadius", new Uniform(postfx?.vignetteRadius || 0.8)],
        ["colorPalette", new Uniform(paletteMap[postfx?.colorPalette || "original"])],
        // Tier 2
        ["curvature", new Uniform(postfx?.curvature || 0)],
        ["aberrationStrength", new Uniform(postfx?.aberrationStrength || 0)],
        ["noiseIntensity", new Uniform(postfx?.noiseIntensity || 0)],
        ["noiseScale", new Uniform(postfx?.noiseScale || 1)],
        ["noiseSpeed", new Uniform(postfx?.noiseSpeed || 1)],
        ["waveAmplitude", new Uniform(postfx?.waveAmplitude || 0)],
        ["waveFrequency", new Uniform(postfx?.waveFrequency || 10)],
        ["waveSpeed", new Uniform(postfx?.waveSpeed || 1)],
        ["glitchIntensity", new Uniform(postfx?.glitchIntensity || 0)],
        ["glitchFrequency", new Uniform(postfx?.glitchFrequency || 0)],
        ["brightnessAdjust", new Uniform(postfx?.brightnessAdjust || 0)],
        ["contrastAdjust", new Uniform(postfx?.contrastAdjust || 1)],
      ]),
    })

    _cellSize = cellSize
    _invert = invert
    _colorMode = color
    _asciiStyle = style
    _charRotation = charRotation
    if (postfx) _postfx = postfx
    if (resolution) _resolution = resolution
    if (mousePos) _mousePos = mousePos
    if (contentBounds) _contentBounds = contentBounds
    if (backgroundColor) _backgroundColor = backgroundColor
  }

  update(renderer: any, inputBuffer: any, deltaTime?: number) {
    // Update time
    if (deltaTime) {
      _time += deltaTime
      this.uniforms.get("time")!.value = _time
    }

    // Update core uniforms
    this.uniforms.get("cellSize")!.value = _cellSize
    this.uniforms.get("invert")!.value = _invert
    this.uniforms.get("colorMode")!.value = _colorMode
    this.uniforms.get("asciiStyle")!.value = _asciiStyle
    this.uniforms.get("charRotation")!.value = _charRotation
    this.uniforms.get("resolution")!.value = _resolution
    this.uniforms.get("mousePos")!.value = _mousePos
    this.uniforms.get("contentBounds")!.value = _contentBounds
    this.uniforms.get("backgroundColor")!.value = [_backgroundColor.r, _backgroundColor.g, _backgroundColor.b]

    // Update PostFX uniforms - Tier 1
    this.uniforms.get("scanlineIntensity")!.value = _postfx.scanlineIntensity
    this.uniforms.get("scanlineCount")!.value = _postfx.scanlineCount
    this.uniforms.get("targetFPS")!.value = _postfx.targetFPS
    this.uniforms.get("jitterIntensity")!.value = _postfx.jitterIntensity
    this.uniforms.get("jitterSpeed")!.value = _postfx.jitterSpeed
    this.uniforms.get("mouseGlowEnabled")!.value = _postfx.mouseGlowEnabled
    this.uniforms.get("mouseGlowRadius")!.value = _postfx.mouseGlowRadius
    this.uniforms.get("mouseGlowIntensity")!.value = _postfx.mouseGlowIntensity
    this.uniforms.get("vignetteIntensity")!.value = _postfx.vignetteIntensity
    this.uniforms.get("vignetteRadius")!.value = _postfx.vignetteRadius
    this.uniforms.get("colorPalette")!.value = paletteMap[_postfx.colorPalette]

    // Update PostFX uniforms - Tier 2
    this.uniforms.get("curvature")!.value = _postfx.curvature
    this.uniforms.get("aberrationStrength")!.value = _postfx.aberrationStrength
    this.uniforms.get("noiseIntensity")!.value = _postfx.noiseIntensity
    this.uniforms.get("noiseScale")!.value = _postfx.noiseScale
    this.uniforms.get("noiseSpeed")!.value = _postfx.noiseSpeed
    this.uniforms.get("waveAmplitude")!.value = _postfx.waveAmplitude
    this.uniforms.get("waveFrequency")!.value = _postfx.waveFrequency
    this.uniforms.get("waveSpeed")!.value = _postfx.waveSpeed
    this.uniforms.get("glitchIntensity")!.value = _postfx.glitchIntensity
    this.uniforms.get("glitchFrequency")!.value = _postfx.glitchFrequency
    this.uniforms.get("brightnessAdjust")!.value = _postfx.brightnessAdjust
    this.uniforms.get("contrastAdjust")!.value = _postfx.contrastAdjust
  }
}

export const AsciiEffect = forwardRef<
  any,
  {
    style?: string
    cellSize?: number
    invert?: boolean
    color?: boolean
    charRotation?: boolean
    postfx?: AsciiPostFXSettings
    resolution?: Vector2
    mousePos?: Vector2
    contentBounds?: Vector4
    backgroundColor?: { r: number; g: number; b: number }
  }
>(({ style = "standard", cellSize = 8, invert = false, color = true, charRotation = false, postfx, resolution, mousePos, contentBounds, backgroundColor }, ref) => {
  const styleMap: { [key: string]: number } = {
    standard: 0,
    dense: 1,
    minimal: 2,
    blocks: 3,
    braille: 4,
    technical: 5,
    matrix: 6,
    hatching: 7,
  }
  const styleNum = styleMap[style] || 0

  _cellSize = cellSize
  _invert = invert
  _colorMode = color
  _asciiStyle = styleNum
  _charRotation = charRotation
  if (postfx) _postfx = postfx
  if (resolution) _resolution = resolution
  if (mousePos) _mousePos = mousePos
  if (contentBounds) _contentBounds = contentBounds
  if (backgroundColor) _backgroundColor = backgroundColor

  const effect = useMemo(() => new AsciiEffectImpl({
    cellSize,
    invert,
    color,
    style: styleNum,
    charRotation,
    postfx,
    resolution,
    mousePos,
    contentBounds,
    backgroundColor
  }), [])

  return <primitive ref={ref} object={effect} dispose={null} />
})

AsciiEffect.displayName = "AsciiEffect"
