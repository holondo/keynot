import type { PPTElement, Slide, SlideTransitionConfig } from '@/types/slides'

export interface MatchedElementPair {
  continuityId: string
  matchReason: 'continuityId' | 'name' | 'heuristic'
  fromElement: PPTElement
  toElement: PPTElement
  deltas: {
    dx: number
    dy: number
    scaleX: number
    scaleY: number
    dRotate: number
    fromOpacity: number
    toOpacity: number
  }
}

export interface SlideMatchAnalysis {
  matchedPairs: MatchedElementPair[]
  unmatchedOutgoing: PPTElement[]
  unmatchedIncoming: PPTElement[]
}

const getElementHeight = (el: PPTElement): number => {
  if (el.type === 'line') {
    return Math.max(Math.abs(el.end[1] - el.start[1]), el.width || 4)
  }
  return el.height || 40
}

const getElementRotate = (el: PPTElement): number => {
  if (el.type === 'line') return 0
  return el.rotate || 0
}

const getElementOpacity = (el: PPTElement): number => {
  if ('opacity' in el && typeof el.opacity === 'number') return el.opacity
  return 1
}

const stripHtml = (html: string | undefined): string => {
  if (!html || typeof html !== 'string') return ''
  return html.replace(/<[^>]+>/g, '').trim()
}

export const getElementDisplayLabel = (el: PPTElement | undefined, index?: number): string => {
  if (!el) return 'Object'
  if (el.name && typeof el.name === 'string' && el.name.trim()) return el.name.trim()
  if (el.type === 'text' && typeof el.content === 'string') {
    const text = stripHtml(el.content)
    if (text) return text.length > 26 ? `${text.slice(0, 26)}…` : text
  }
  if (el.type === 'shape' && typeof el.text?.content === 'string') {
    const text = stripHtml(el.text.content)
    if (text) return `Shape: ${text.length > 20 ? `${text.slice(0, 20)}…` : text}`
  }
  const typeStr = typeof el.type === 'string' && el.type ? el.type : 'object'
  const typeLabel = typeStr.charAt(0).toUpperCase() + typeStr.slice(1)
  const idStr = typeof el.id === 'string' ? el.id : String(el.id || '')
  return index !== undefined ? `${typeLabel} #${index + 1}` : `${typeLabel} (${idStr.slice(0, 5)})`
}

/**
 * Deterministic element matching between two slides for Object Transition (Magic Move):
 * 1. Exact `continuityId` match (primary)
 * 2. Exact `name` + `type` match (secondary)
 * 3. Identical plain-text content for text/shape elements (heuristic fallback)
 */
export const analyzeSlideTransitionMatches = (
  fromSlide: Slide | undefined,
  toSlide: Slide | undefined
): SlideMatchAnalysis => {
  const fromElements = fromSlide?.elements || []
  const toElements = toSlide?.elements || []

  if (!fromSlide || !toSlide) {
    return {
      matchedPairs: [],
      unmatchedOutgoing: fromElements,
      unmatchedIncoming: toElements,
    }
  }

  const matchedFromIds = new Set<string>()
  const matchedToIds = new Set<string>()
  const matchedPairs: MatchedElementPair[] = []

  const createPair = (
    fromEl: PPTElement,
    toEl: PPTElement,
    matchReason: 'continuityId' | 'name' | 'heuristic'
  ): MatchedElementPair => {
    const fromW = Math.max(fromEl.width || 1, 1)
    const fromH = Math.max(getElementHeight(fromEl), 1)
    const toW = Math.max(toEl.width || 1, 1)
    const toH = Math.max(getElementHeight(toEl), 1)

    const fromCenterX = fromEl.left + fromW / 2
    const fromCenterY = fromEl.top + fromH / 2
    const toCenterX = toEl.left + toW / 2
    const toCenterY = toEl.top + toH / 2

    return {
      continuityId: toEl.continuityId || fromEl.continuityId || toEl.id,
      matchReason,
      fromElement: fromEl,
      toElement: toEl,
      deltas: {
        dx: fromCenterX - toCenterX,
        dy: fromCenterY - toCenterY,
        scaleX: fromW / toW,
        scaleY: fromH / toH,
        dRotate: getElementRotate(fromEl) - getElementRotate(toEl),
        fromOpacity: getElementOpacity(fromEl),
        toOpacity: getElementOpacity(toEl),
      },
    }
  }

  // Pass 1: Match by explicit continuityId (or id)
  for (const toEl of toElements) {
    const toContId = toEl.continuityId || toEl.id
    const fromEl = fromElements.find(
      candidate => !matchedFromIds.has(candidate.id) && (candidate.continuityId || candidate.id) === toContId
    )
    if (fromEl) {
      matchedFromIds.add(fromEl.id)
      matchedToIds.add(toEl.id)
      matchedPairs.push(createPair(fromEl, toEl, 'continuityId'))
    }
  }

  // Pass 2: Match by identical non-empty element name & same type
  for (const toEl of toElements) {
    if (matchedToIds.has(toEl.id) || !toEl.name?.trim()) continue
    const fromEl = fromElements.find(
      candidate =>
        !matchedFromIds.has(candidate.id) &&
        candidate.type === toEl.type &&
        candidate.name?.trim() === toEl.name?.trim()
    )
    if (fromEl) {
      matchedFromIds.add(fromEl.id)
      matchedToIds.add(toEl.id)
      matchedPairs.push(createPair(fromEl, toEl, 'name'))
    }
  }

  // Pass 3: Heuristic match for text elements with identical non-empty text
  for (const toEl of toElements) {
    if (matchedToIds.has(toEl.id) || toEl.type !== 'text') continue
    const toText = stripHtml(toEl.content)
    if (!toText) continue
    const fromEl = fromElements.find(
      candidate =>
        !matchedFromIds.has(candidate.id) &&
        candidate.type === 'text' &&
        stripHtml(candidate.content) === toText
    )
    if (fromEl) {
      matchedFromIds.add(fromEl.id)
      matchedToIds.add(toEl.id)
      matchedPairs.push(createPair(fromEl, toEl, 'heuristic'))
    }
  }

  const unmatchedOutgoing = fromElements.filter(el => !matchedFromIds.has(el.id))
  const unmatchedIncoming = toElements.filter(el => !matchedToIds.has(el.id))

  return {
    matchedPairs,
    unmatchedOutgoing,
    unmatchedIncoming,
  }
}

export const DEFAULT_TRANSITION_CONFIG: Required<SlideTransitionConfig> = {
  duration: 900,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  unmatchedBehavior: 'fade',
  textMatchMode: 'object',
}

/**
 * Execute Web Animations API (WAAPI) Object Transition (Magic Move) on the target DOM container.
 * Supports both Screen player (`#screen-element-${id} [class^=base-element-]`)
 * and Editor canvas preview (`#editable-element-${id}`).
 */
export const runMagicMoveTransition = (
  fromSlide: Slide | undefined,
  toSlide: Slide | undefined,
  options?: {
    mode?: 'screen' | 'editor'
    containerEl?: HTMLElement | null
  }
): Animation[] => {
  if (!fromSlide || !toSlide) return []

  const mode = options?.mode || 'screen'
  const config: Required<SlideTransitionConfig> = {
    ...DEFAULT_TRANSITION_CONFIG,
    ...(toSlide.transitionConfig || {}),
  }

  const analysis = analyzeSlideTransitionMatches(fromSlide, toSlide)
  const activeAnimations: Animation[] = []

  const findTargetDomNode = (elId: string): HTMLElement | null => {
    if (mode === 'editor') {
      return document.querySelector(`#editable-element-${elId}`) as HTMLElement | null
    }
    return document.querySelector(`#screen-element-${elId} [class^=base-element-]`) as HTMLElement | null
  }

  // 1. Animate matched pairs from previous slide geometry to current slide geometry
  for (const pair of analysis.matchedPairs) {
    const targetNode = findTargetDomNode(pair.toElement.id)
    if (!targetNode) continue

    const { dx, dy, scaleX, scaleY, dRotate, fromOpacity, toOpacity } = pair.deltas
    const finalRotate = getElementRotate(pair.toElement)

    const startTransform =
      mode === 'editor'
        ? `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY}) rotate(${dRotate}deg)`
        : `translate(${dx}px, ${dy}px) rotate(${finalRotate + dRotate}deg) scale(${scaleX}, ${scaleY})`

    const endTransform =
      mode === 'editor'
        ? 'translate(0px, 0px) scale(1, 1) rotate(0deg)'
        : `translate(0px, 0px) rotate(${finalRotate}deg) scale(1, 1)`

    targetNode.style.transformOrigin = 'center center'
    const anim = targetNode.animate(
      [
        {
          transform: startTransform,
          opacity: fromOpacity,
        },
        {
          transform: endTransform,
          opacity: toOpacity,
        },
      ],
      {
        duration: config.duration,
        easing: config.easing,
        fill: 'none',
      }
    )
    activeAnimations.push(anim)
  }

  // 2. Handle unmatched incoming elements according to unmatchedBehavior
  if (config.unmatchedBehavior === 'fade') {
    for (const incomingEl of analysis.unmatchedIncoming) {
      const targetNode = findTargetDomNode(incomingEl.id)
      if (!targetNode) continue
      const toOpacity = getElementOpacity(incomingEl)
      const anim = targetNode.animate(
        [
          { opacity: 0 },
          { opacity: toOpacity },
        ],
        {
          duration: Math.round(config.duration * 0.75),
          easing: 'ease-out',
          fill: 'none',
        }
      )
      activeAnimations.push(anim)
    }
  }

  return activeAnimations
}
