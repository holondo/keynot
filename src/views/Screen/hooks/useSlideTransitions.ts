import { nextTick, watch, type Ref } from 'vue'
import type { Slide } from '@/types/slides'
import { getTransitionDefinition } from '@/configs/transitions'
import { playSlideTransition } from '@/utils/transitionEngine'
import { runMagicMoveTransition } from '@/utils/magicMove'

/**
 * Plays the Keynote transition of the slide being left when the show advances
 * one slide forward. Going back or jumping changes slides at once, as in Keynote.
 *
 * Slide layers are the `.slide-item[data-index]` children of `root`.
 * `objectTransitions` is false where slides are drawn as thumbnails (no object
 * DOM), so Magic Move falls back to a dissolve.
 */
export default (
  root: Ref<HTMLElement | null>,
  slides: Ref<Slide[]>,
  slideIndex: Ref<number>,
  options: { objectTransitions: boolean } = { objectTransitions: true }
) => {
  const layer = (index: number) => root.value?.querySelector(`.slide-item[data-index="${index}"]`) as HTMLElement | null

  watch(slideIndex, async (newIndex, oldIndex) => {
    // Finish whatever is still running so layers start from their resting state.
    root.value?.querySelectorAll<HTMLElement>('.slide-item').forEach(item => item.getAnimations({ subtree: true }).forEach(animation => animation.finish()))
    if (oldIndex === undefined || newIndex !== oldIndex + 1) return
    const outgoingSlide = slides.value[oldIndex]
    const transition = outgoingSlide?.transition
    if (!transition || transition.effect === 'none') return

    await nextTick()
    const incoming = layer(newIndex)
    if (!incoming) return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const definition = getTransitionDefinition(transition.effect)
    if (definition.engine === 'magicMove' && options.objectTransitions && !reducedMotion) {
      await runMagicMoveTransition(outgoingSlide, slides.value[newIndex], { mode: 'screen' })
      return
    }
    await playSlideTransition({
      outgoing: layer(oldIndex),
      incoming,
      transition: definition.engine === 'magicMove' ? { ...transition, effect: 'apple:dissolve' } : transition,
      reducedMotion,
    })
  }, { flush: 'post' })
}
