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
 * Generate a consistent HSL color based on string value
 * Returns an object with background and text colors
 */
export function getBadgeColors(value: string): {
  backgroundColor: string
  textColor: string
  borderColor: string
} {
  const hash = hashString(value)
  
  // Generate hue from hash (0-360)
  const hue = hash % 360
  
  // Use theme-aware saturation and lightness for better integration
  // Light mode: slightly desaturated, medium lightness
  // These values work well with both light and dark themes
  const saturation = 65 // Moderate saturation
  const lightness = 92 // Light background
  const textLightness = 35 // Dark text for contrast
  
  return {
    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    textColor: `hsl(${hue}, ${saturation}%, ${textLightness}%)`,
    borderColor: `hsl(${hue}, ${saturation}%, ${lightness - 10}%)`,
  }
}

