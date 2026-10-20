import type { PPTElement, Slide, SlideTransition } from '@/types/slides'
import { createTransition } from '../configs/transitions.ts'
import { ACCELERATION_EASINGS } from './transitionEngine.ts'
import { runTextMorph } from './textMorph.ts'

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

export { ACCELERATION_EASINGS }

/** Keynote's Magic Move defaults (Duration 2 s, Ease In & Ease Out, fade unmatched, by object). */
export const DEFAULT_MAGIC_MOVE: SlideTransition = createTransition('apple:magic-move')

/**
 * Play Magic Move from `fromSlide` (whose transition is Magic Move) to `toSlide`
 * with the Web Animations API. In the player, word and character matching morph
 * text token by token; the editor preview animates whole objects.
 */
export const runMagicMoveTransition = (
  fromSlide: Slide | undefined,
  toSlide: Slide | undefined,
  options?: {
    mode?: 'screen' | 'editor'
  }
): Promise<void> => {
  if (!fromSlide || !toSlide) return Promise.resolve()

  const mode = options?.mode || 'screen'
  const config: SlideTransition = { ...DEFAULT_MAGIC_MOVE, ...(fromSlide.transition ?? {}) }
  const easing = ACCELERATION_EASINGS[config.acceleration ?? 'easeInOut']
  const fadeUnmatched = config.unmatchedBehavior !== 'instant'
  const granularity = config.textMatchMode ?? 'object'

  const analysis = analyzeSlideTransitionMatches(fromSlide, toSlide)
  const running: Promise<unknown>[] = []

  const wrapperSelector = (elId: string) => mode === 'editor' ? `#editable-element-${elId}` : `#screen-element-${elId}`
  const findTargetDomNode = (elId: string): HTMLElement | null => {
    if (mode === 'editor') return document.querySelector(`#editable-element-${elId}`) as HTMLElement | null
    return document.querySelector(`.slide-item.current #screen-element-${elId} [class^=base-element-]`) as HTMLElement | null
  }

  // 1. Matched objects travel from their previous geometry to the new one.
  for (const pair of analysis.matchedPairs) {
    const targetNode = findTargetDomNode(pair.toElement.id)
    if (!targetNode) continue

    const textLike = pair.fromElement.type === 'text' && pair.toElement.type === 'text'
    if (textLike && granularity !== 'object' && mode === 'screen') {
      const fromWrapper = document.querySelector(`.slide-item.last ${wrapperSelector(pair.fromElement.id)}`) as HTMLElement | null
      const toWrapper = document.querySelector(`.slide-item.current ${wrapperSelector(pair.toElement.id)}`) as HTMLElement | null
      if (fromWrapper && toWrapper) {
        running.push(runTextMorph({ fromWrapper, toWrapper, granularity, duration: config.duration, easing, fadeUnmatched }))
        continue
      }
    }

    const { dx, dy, scaleX, scaleY, dRotate, fromOpacity, toOpacity } = pair.deltas
    const finalRotate = getElementRotate(pair.toElement)
    const startTransform = mode === 'editor'
      ? `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY}) rotate(${dRotate}deg)`
      : `translate(${dx}px, ${dy}px) rotate(${finalRotate + dRotate}deg) scale(${scaleX}, ${scaleY})`
    const endTransform = mode === 'editor'
      ? 'translate(0px, 0px) scale(1, 1) rotate(0deg)'
      : `translate(0px, 0px) rotate(${finalRotate}deg) scale(1, 1)`

    targetNode.style.transformOrigin = 'center center'
    running.push(targetNode.animate(
      [{ transform: startTransform, opacity: fromOpacity }, { transform: endTransform, opacity: toOpacity }],
      { duration: config.duration, easing, fill: 'none' }
    ).finished)
  }

  // 2. Objects only on the new slide dissolve in (or appear at once).
  if (fadeUnmatched) {
    for (const incomingEl of analysis.unmatchedIncoming) {
      const targetNode = findTargetDomNode(incomingEl.id)
      if (!targetNode) continue
      running.push(targetNode.animate(
        [{ opacity: 0 }, { opacity: getElementOpacity(incomingEl) }],
        { duration: Math.round(config.duration * 0.75), easing: 'ease-out', fill: 'none' }
      ).finished)
    }
  }

  return Promise.allSettled(running).then(() => undefined)
}
