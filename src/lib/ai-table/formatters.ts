import { format, parse, isValid } from 'date-fns'
import type { OutputType } from './output-types'

// ============================================================================
// Value Parsing Functions
// ============================================================================

/**
 * Parse a multi-select value from JSON string to array
 */
export function parseMultiSelectValue(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Parse a date value from string
 */
export function parseDateValue(value: string | null): Date | null {
  if (!value) return null
  
  // Try common date formats
  const formats = [
    'yyyy-MM-dd', // 2024-01-15
    'MM/dd/yyyy', // 01/15/2024
    'dd/MM/yyyy', // 15/01/2024
    'MMM dd, yyyy', // Jan 15, 2024
    'MMMM dd, yyyy', // January 15, 2024
  ]
  
  for (const dateFormat of formats) {
    try {
      const parsed = parse(value, dateFormat, new Date())
      if (isValid(parsed)) {
        return parsed
      }
    } catch {
      // Try next format
    }
  }
  
  // Try ISO format as fallback
  const date = new Date(value)
  return isValid(date) ? date : null
}

// ============================================================================
// Value Formatting Functions
// ============================================================================

/**
 * Format a date value according to specified format
 */
export function formatDateValue(
  value: string | null,
  dateFormat: string = 'YYYY-MM-DD',
): string {
  if (!value) return ''
  
  const date = parseDateValue(value)
  if (!date) return value // Return as-is if can't parse
  
  // Map custom formats to date-fns formats
  const formatMap: Record<string, string> = {
    'YYYY-MM-DD': 'yyyy-MM-dd',
    'MM/DD/YYYY': 'MM/dd/yyyy',
    'DD/MM/YYYY': 'dd/MM/yyyy',
    'MMM DD, YYYY': 'MMM dd, yyyy',
    'MMMM DD, YYYY': 'MMMM dd, yyyy',
  }
  
  const dateFnsFormat = formatMap[dateFormat] || formatMap['YYYY-MM-DD']
  
  try {
    return format(date, dateFnsFormat)
  } catch {
    return value
  }
}

/**
 * Get a display-friendly value based on output type
 */
export function getDisplayValue(
  value: string | null,
  outputType: OutputType,
  config?: any,
): string | string[] {
  if (!value) return outputType === 'multi_select' ? [] : ''
  
  switch (outputType) {
    case 'multi_select':
      return parseMultiSelectValue(value)
    
    case 'date':
      return formatDateValue(value, config?.dateFormat)
    
    case 'text':
    case 'long_text':
    case 'single_select':
    default:
      return value
  }
}

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

