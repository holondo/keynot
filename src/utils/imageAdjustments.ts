import type {
  ImageElementFilters,
  ImageElementFilterKeys,
  PPTImageElement,
  ImageElementClip,
} from '@/types/slides'

/**
 * Filter keys that are relative to a 100% baseline in CSS
 * E.g., slider value 0 is normal (100% in CSS).
 * Slider value +20 -> 120% in CSS.
 * Slider value -30 -> 70% in CSS.
 */
const RELATIVE_100_FILTERS: ImageElementFilterKeys[] = [
  'brightness',
  'contrast',
  'saturate',
]

/**
 * Format an ImageElementFilters object into a clean, browser-compatible CSS filter string
 */
export function formatCSSFilter(filters?: ImageElementFilters): string {
  if (!filters) return ''
  const parts: string[] = []
  const keys = Object.keys(filters) as ImageElementFilterKeys[]

  for (const key of keys) {
    const rawVal = filters[key]
    if (rawVal === undefined || rawVal === '') continue

    // Normalize units and ensure valid CSS format
    if (key === 'blur') {
      const num = parseFloat(rawVal)
      if (!isNaN(num) && num > 0) parts.push(`blur(${num}px)`)
    } else if (key === 'hue-rotate') {
      const num = parseFloat(rawVal)
      if (!isNaN(num) && num !== 0) parts.push(`hue-rotate(${num}deg)`)
    } else {
      // Standard percentage-based filter (brightness, contrast, saturate, opacity, grayscale, sepia, invert)
      const num = parseFloat(rawVal)
      if (!isNaN(num)) {
        // Skip 100% default for relative filters if desired, or output directly
        parts.push(`${key}(${num}%)`)
      }
    }
  }

  return parts.join(' ')
}

/**
 * Converts user slider value (e.g. -100 to 100) to stored CSS filter value string
 */
export function createFilterValue(filterKey: ImageElementFilterKeys, sliderValue: number): string {
  if (filterKey === 'blur') {
    return `${Math.max(0, sliderValue)}px`
  }

  if (filterKey === 'hue-rotate') {
    return `${sliderValue}deg`
  }

  if (RELATIVE_100_FILTERS.includes(filterKey)) {
    // 0 on slider -> 100% in CSS
    // +20 on slider -> 120% in CSS
    // -20 on slider -> 80% in CSS
    const cssPercent = Math.max(0, 100 + sliderValue)
    return `${cssPercent}%`
  }

  // Opacity, grayscale, sepia, invert (0 to 100%)
  return `${sliderValue}%`
}

/**
 * Parses a stored CSS filter value (e.g. "120%", "5px") back to the slider representation
 */
export function parseFilterSliderValue(filterKey: ImageElementFilterKeys, rawValue?: string): number {
  if (rawValue === undefined || rawValue === '') {
    if (filterKey === 'opacity') return 100
    return 0
  }

  const num = parseFloat(rawValue)
  if (isNaN(num)) {
    if (filterKey === 'opacity') return 100
    return 0
  }

  if (RELATIVE_100_FILTERS.includes(filterKey)) {
    // 100% in CSS -> 0 on slider
    // 120% in CSS -> +20 on slider
    // 70% in CSS -> -30 on slider
    return num - 100
  }

  return num
}

/**
 * Computes Keynote's Auto-Enhance preset:
 * Gives crisp contrast (+15%), slightly brighter exposure (+5%), and vibrant saturation (+10%).
 */
export function getAutoEnhanceFilters(currentFilters?: ImageElementFilters): ImageElementFilters {
  return {
    ...(currentFilters || {}),
    contrast: '115%',
    brightness: '105%',
    saturate: '110%',
  }
}

/**
 * Calculates the restored geometry of a masked image to revert it to its exact original frame
 */
export function calculateResetMask(imageElement: PPTImageElement): {
  width: number
  height: number
  left: number
  top: number
  clip: undefined
} {
  if (!imageElement.clip || !imageElement.clip.range) {
    return {
      width: imageElement.width,
      height: imageElement.height,
      left: imageElement.left,
      top: imageElement.top,
      clip: undefined,
    }
  }

  const [start, end] = imageElement.clip.range
  const widthScale = (end[0] - start[0]) / 100
  const heightScale = (end[1] - start[1]) / 100

  // Prevent divide by zero
  const safeWidthScale = widthScale > 0 ? widthScale : 1
  const safeHeightScale = heightScale > 0 ? heightScale : 1

  const restoredWidth = imageElement.width / safeWidthScale
  const restoredHeight = imageElement.height / safeHeightScale
  const restoredLeft = imageElement.left - (start[0] / 100) * restoredWidth
  const restoredTop = imageElement.top - (start[1] / 100) * restoredHeight

  return {
    width: Math.round(restoredWidth),
    height: Math.round(restoredHeight),
    left: Math.round(restoredLeft),
    top: Math.round(restoredTop),
    clip: undefined,
  }
}

/**
 * Creates a shape mask for an image (e.g. ellipse, rounded, star, heart)
 */
export function createShapeMask(shapeKey: string, ratio?: number): ImageElementClip {
  return {
    shape: shapeKey,
    range: [[0, 0], [100, 100]],
  }
}
