import { ref, computed, onMounted, onUnmounted } from 'vue'

export type BreakpointTier = 'mobile' | 'tablet' | 'desktop'

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1200,
} as const

export const getTier = (width: number): BreakpointTier => {
  if (width < BREAKPOINTS.tablet) return 'mobile'
  if (width < BREAKPOINTS.desktop) return 'tablet'
  return 'desktop'
}

export const isTouchDevice = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(pointer: coarse)').matches
}

/**
 * Reactive viewport tier based on window width (not user agent).
 */
export default () => {
  const width = ref(typeof window === 'undefined' ? BREAKPOINTS.desktop : window.innerWidth)
  const height = ref(typeof window === 'undefined' ? BREAKPOINTS.desktop : window.innerHeight)
  const isTouch = ref(isTouchDevice())

  const update = () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
    isTouch.value = isTouchDevice()
  }

  onMounted(() => window.addEventListener('resize', update, { passive: true }))
  onUnmounted(() => window.removeEventListener('resize', update))

  // Compact touch landscape needs the same reachable dock as phone portrait.
  const tier = computed(() => isTouch.value && width.value < 1000 && height.value < 500
    ? 'mobile'
    : getTier(width.value))

  return { width, height, tier, isTouch }
}
