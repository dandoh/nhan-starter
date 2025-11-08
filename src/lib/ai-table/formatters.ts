/**
 * Badge color utilities for output type rendering
 * Used by output-type-registry.tsx
 */

// ============================================================================
// Badge Color Generation
// ============================================================================

/**
 * Simple string hash function to generate consistent numbers from strings
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Generate a consistent color based on string value using theme-aware oklch colors
 * Returns an object with background and text colors that work with both light and dark themes
 */
export function getBadgeColors(value: string): {
  backgroundColor: string
  textColor: string
  borderColor: string
} {
  const hash = hashString(value)
  
  // Generate hue from hash (0-360)
  const hue = hash % 360
  
  // Use oklch color format to match theme system
  // Values optimized for both light and dark themes
  const chroma = 0.15 // Moderate chroma (saturation)
  const lightness = 0.92 // Light background for badges
  const textLightness = 0.35 // Dark text for contrast
  const borderLightness = 0.82 // Slightly darker border
  
  return {
    backgroundColor: `oklch(${lightness} ${chroma} ${hue})`,
    textColor: `oklch(${textLightness} ${chroma} ${hue})`,
    borderColor: `oklch(${borderLightness} ${chroma} ${hue})`,
  }
}

