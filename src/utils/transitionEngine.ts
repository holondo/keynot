import type { Slide, SlideTransition, TurningMode } from '@/types/slides'
import { canonicalTransitionEffect, getTransitionDefinition, type TransitionEngine } from '../configs/transitions.ts'

/**
 * Slide transitions for the player, with Web Animations.
 *
 * A transition belongs to the slide being left (Keynote semantics). The outgoing
 * and incoming slide layers are animated together; Magic Move is played by
 * `runMagicMoveTransition` instead because it animates objects, not layers.
 */

export const ACCELERATION_EASINGS: Record<string, string> = {
  easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
  easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
  constant: 'linear',
}

/** Unit vector of where the incoming slide starts, per Keynote direction constant. */
const DIRECTION_VECTORS: Record<number, [number, number]> = {
  11: [-1, 0],
  12: [1, 0],
  13: [0, -1],
  14: [0, 1],
}

type Frames = Keyframe[]

interface LayerPlan {
  outgoing?: Frames
  incoming?: Frames
  /** The outgoing layer is drawn above the incoming one (it moves away to reveal). */
  outgoingOnTop?: boolean
  outgoingOrigin?: string
  incomingOrigin?: string
  /** Colour shown between the layers (Fade Through Color). */
  backdrop?: string
}

const translate = ([x, y]: [number, number], amount: number) => `translate(${x * amount}%, ${y * amount}%)`

const plans: Record<Exclude<TransitionEngine, 'none' | 'magicMove'>, (direction: [number, number]) => LayerPlan> = {
  dissolve: () => ({ outgoing: [{ opacity: 1 }, { opacity: 0 }], incoming: [{ opacity: 0 }, { opacity: 1 }] }),
  fadeThroughColor: () => ({
    backdrop: '#000',
    outgoing: [{ opacity: 1 }, { opacity: 0, offset: 0.5 }, { opacity: 0 }],
    incoming: [{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }],
  }),
  push: direction => ({
    outgoing: [{ transform: translate(direction, 0) }, { transform: translate(direction, -100) }],
    incoming: [{ transform: translate(direction, 100) }, { transform: translate(direction, 0) }],
  }),
  moveIn: direction => ({ incoming: [{ transform: translate(direction, 100) }, { transform: translate(direction, 0) }] }),
  reveal: direction => ({ outgoingOnTop: true, outgoing: [{ transform: translate(direction, 0) }, { transform: translate(direction, -100) }] }),
  fadeAndMove: direction => ({
    outgoing: [{ opacity: 1 }, { opacity: 0 }],
    incoming: [{ opacity: 0, transform: translate(direction, 30) }, { opacity: 1, transform: translate(direction, 0) }],
  }),
  wipe: ([x, y]) => {
    const start = x > 0 ? 'inset(0 0 0 100%)' : x < 0 ? 'inset(0 100% 0 0)' : y > 0 ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)'
    return { incoming: [{ clipPath: start }, { clipPath: 'inset(0 0 0 0)' }] }
  },
  iris: () => ({ incoming: [{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }] }),
  grid: () => ({
    outgoing: [{ opacity: 1 }, { opacity: 0 }],
    incoming: [{ opacity: 0, transform: 'scale(0.94)' }, { opacity: 1, transform: 'scale(1)' }],
  }),
  cube: ([x, y]) => {
    const axis = x !== 0 ? 'Y' : 'X'
    const sign = (x !== 0 ? x : -y) > 0 ? 1 : -1
    const along = x !== 0 ? [x, 0] as [number, number] : [0, y] as [number, number]
    return {
      outgoingOrigin: x > 0 ? '100% 50%' : x < 0 ? '0% 50%' : y > 0 ? '50% 100%' : '50% 0%',
      incomingOrigin: x > 0 ? '0% 50%' : x < 0 ? '100% 50%' : y > 0 ? '50% 0%' : '50% 100%',
      outgoing: [{ transform: `${translate(along, 0)} rotate${axis}(0deg)` }, { transform: `${translate(along, -100)} rotate${axis}(${-90 * sign}deg)` }],
      incoming: [{ transform: `${translate(along, 100)} rotate${axis}(${90 * sign}deg)` }, { transform: `${translate(along, 0)} rotate${axis}(0deg)` }],
    }
  },
  flip: ([x]) => {
    const sign = x < 0 ? -1 : 1
    return {
      outgoing: [{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: `rotateY(${-90 * sign}deg)`, opacity: 1, offset: 0.5 }, { transform: `rotateY(${-90 * sign}deg)`, opacity: 0 }],
      incoming: [{ transform: `rotateY(${90 * sign}deg)`, opacity: 0 }, { transform: `rotateY(${90 * sign}deg)`, opacity: 1, offset: 0.5 }, { transform: 'rotateY(0deg)', opacity: 1 }],
    }
  },
  flop: () => ({
    outgoing: [{ transform: 'rotateX(0deg)', opacity: 1 }, { transform: 'rotateX(90deg)', opacity: 1, offset: 0.5 }, { transform: 'rotateX(90deg)', opacity: 0 }],
    incoming: [{ transform: 'rotateX(-90deg)', opacity: 0 }, { transform: 'rotateX(-90deg)', opacity: 1, offset: 0.5 }, { transform: 'rotateX(0deg)', opacity: 1 }],
  }),
  scale: () => ({
    outgoing: [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.6)', opacity: 0 }],
    incoming: [{ transform: 'scale(1.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
  }),
  revolve: () => ({
    incomingOrigin: '0% 50%',
    outgoingOrigin: '100% 50%',
    outgoing: [{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(90deg)', opacity: 0 }],
    incoming: [{ transform: 'rotateY(-90deg)', opacity: 0 }, { transform: 'rotateY(0deg)', opacity: 1 }],
  }),
  doorway: () => ({
    outgoing: [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.15)', opacity: 0 }],
    incoming: [{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
  }),
  twirl: () => ({
    outgoing: [{ transform: 'rotate(0deg) scale(1)', opacity: 1 }, { transform: 'rotate(180deg) scale(0)', opacity: 0 }],
    incoming: [{ transform: 'rotate(-180deg) scale(0)', opacity: 0 }, { transform: 'rotate(0deg) scale(1)', opacity: 1 }],
  }),
  fall: () => ({
    outgoingOnTop: true,
    outgoingOrigin: '50% 100%',
    outgoing: [{ transform: 'rotateX(0deg)', opacity: 1 }, { transform: 'rotateX(-75deg) translateY(20%)', opacity: 0 }],
  }),
  drop: () => ({
    incoming: [
      { transform: 'translateY(-100%)' },
      { transform: 'translateY(0)', offset: 0.6 },
      { transform: 'translateY(-8%)', offset: 0.75 },
      { transform: 'translateY(0)', offset: 0.88 },
      { transform: 'translateY(-2%)', offset: 0.94 },
      { transform: 'translateY(0)' },
    ],
  }),
  pivot: () => ({
    outgoingOnTop: true,
    outgoingOrigin: '0% 0%',
    outgoing: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(90deg)' }],
  }),
  swap: () => ({
    outgoing: [{ transform: 'translateX(0) scale(1)', opacity: 1 }, { transform: 'translateX(-55%) scale(0.8)', opacity: 1, offset: 0.5 }, { transform: 'translateX(0) scale(0.6)', opacity: 0 }],
    incoming: [{ transform: 'translateX(55%) scale(0.8)', opacity: 0.6 }, { transform: 'translateX(55%) scale(0.8)', opacity: 1, offset: 0.5 }, { transform: 'translateX(0) scale(1)', opacity: 1 }],
  }),
  switch: () => ({
    outgoing: [{ transform: 'translateX(0) rotateY(0deg)', opacity: 1 }, { transform: 'translateX(-30%) rotateY(-30deg)', opacity: 0 }],
    incoming: [{ transform: 'translateX(30%) rotateY(30deg)', opacity: 0 }, { transform: 'translateX(0) rotateY(0deg)', opacity: 1 }],
  }),
  objectPop: () => ({
    outgoing: [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 0 }],
    incoming: [{ transform: 'scale(0.8)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }],
  }),
  objectZoom: () => ({
    outgoing: [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(3)', opacity: 0 }],
    incoming: [{ transform: 'scale(0.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
  }),
  swing: () => ({
    incomingOrigin: '50% 0%',
    outgoing: [{ opacity: 1 }, { opacity: 0 }],
    incoming: [{ transform: 'rotateX(-90deg)', opacity: 0 }, { transform: 'rotateX(15deg)', opacity: 1, offset: 0.7 }, { transform: 'rotateX(0deg)', opacity: 1 }],
  }),
}

export interface PlayTransitionOptions {
  outgoing: HTMLElement | null
  incoming: HTMLElement
  transition: SlideTransition
  /** Respect prefers-reduced-motion: play a short dissolve instead. */
  reducedMotion?: boolean
}

/** Play a layer transition; resolves once both layers are back to their resting state. */
export const playSlideTransition = async ({ outgoing, incoming, transition, reducedMotion }: PlayTransitionOptions): Promise<void> => {
  const definition = getTransitionDefinition(transition.effect)
  if (definition.engine === 'none' || definition.engine === 'magicMove') return
  const engine = reducedMotion ? 'dissolve' : definition.engine
  const plan = plans[engine](DIRECTION_VECTORS[transition.direction ?? 12] ?? DIRECTION_VECTORS[12])
  const duration = reducedMotion ? Math.min(300, transition.duration) : transition.duration
  const easing = ACCELERATION_EASINGS[transition.acceleration ?? 'easeInOut']

  const container = incoming.parentElement
  const touched: { element: HTMLElement; properties: string[] }[] = []
  const style = (element: HTMLElement, values: Record<string, string>) => {
    touched.push({ element, properties: Object.keys(values) })
    for (const [property, value] of Object.entries(values)) element.style.setProperty(property, value)
  }
  if (container) style(container, { perspective: '2400px', ...(plan.backdrop ? { 'background-color': plan.backdrop } : {}) })
  if (outgoing) style(outgoing, { visibility: 'visible', 'z-index': plan.outgoingOnTop ? '3' : '1', 'backface-visibility': 'hidden', ...(plan.outgoingOrigin ? { 'transform-origin': plan.outgoingOrigin } : {}) })
  style(incoming, { 'z-index': '2', 'backface-visibility': 'hidden', ...(plan.incomingOrigin ? { 'transform-origin': plan.incomingOrigin } : {}) })

  const animations: Animation[] = []
  const timing: KeyframeAnimationOptions = { duration, easing: engine === 'drop' ? 'linear' : easing, fill: 'both' }
  if (outgoing && plan.outgoing) animations.push(outgoing.animate(plan.outgoing, timing))
  if (plan.incoming) animations.push(incoming.animate(plan.incoming, timing))
  try {
    await Promise.all(animations.map(animation => animation.finished))
  }
  catch {
    // A cancelled transition (the user advanced again) settles immediately.
  }
  finally {
    for (const animation of animations) animation.cancel()
    for (const { element, properties } of touched) for (const property of properties) element.style.removeProperty(property)
  }
}

/** PPTist-era transitions (stored on the incoming slide) as Keynote effects. */
const LEGACY_EFFECTS: Record<TurningMode, Pick<SlideTransition, 'effect' | 'direction'>> = {
  no: { effect: 'none' },
  fade: { effect: 'apple:dissolve' },
  slideX: { effect: 'apple:push', direction: 12 },
  slideY: { effect: 'apple:push', direction: 14 },
  slideX3D: { effect: 'apple:3D-cube', direction: 12 },
  slideY3D: { effect: 'apple:3D-cube', direction: 14 },
  rotate: { effect: 'apple:pivot' },
  scaleX: { effect: 'apple:doorway' },
  scaleY: { effect: 'apple:doorway' },
  scale: { effect: 'apple:scale' },
  scaleReverse: { effect: 'apple:scale' },
  random: { effect: 'apple:dissolve' },
  magicMove: { effect: 'apple:magic-move-implied-motion-path' },
}

/**
 * Convert PPTist-era transitions (`turningMode` on the slide being entered) to
 * Keynote transitions (`transition` on the slide being left). Slides that already
 * use `transition` are left as they are, so the conversion is idempotent.
 */
export const migrateLegacyTransitions = (slides: Slide[]): Slide[] => {
  const legacy = slides.some(slide => slide.turningMode !== undefined || slide.transitionConfig !== undefined)
  if (!legacy) return slides.some(slide => slide.transition && canonicalTransitionEffect(slide.transition.effect) !== slide.transition.effect)
    ? slides.map(slide => slide.transition ? { ...slide, transition: { ...slide.transition, effect: canonicalTransitionEffect(slide.transition.effect) } } : slide)
    : slides
  return slides.map((slide, index) => {
    const next = slides[index + 1]
    const rest: Slide = { ...slide }
    if (rest.transition) rest.transition = { ...rest.transition, effect: canonicalTransitionEffect(rest.transition.effect) }
    delete rest.turningMode
    delete rest.transitionConfig
    // Keynote's default is no transition, which also covers slides that never set one.
    if (slide.transition || !next?.turningMode || next.transition) return rest
    const mode = next.turningMode
    const config = next.transitionConfig ?? {}
    const mapped = LEGACY_EFFECTS[mode] ?? LEGACY_EFFECTS.fade
    const transition: SlideTransition = {
      effect: mapped.effect,
      duration: config.duration ?? (mode === 'magicMove' ? 900 : 500),
      startMode: config.startMode ?? 'click',
      delay: config.startDelayMs ?? 0,
      ...(mapped.direction ? { direction: mapped.direction } : {}),
      ...(mode === 'magicMove'
        ? {
          acceleration: config.acceleration ?? 'easeInOut',
          unmatchedBehavior: config.unmatchedBehavior ?? 'fade',
          textMatchMode: config.textMatchMode ?? 'object',
        }
        : {}),
    }
    return { ...rest, transition }
  })
}
