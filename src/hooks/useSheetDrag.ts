import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

/**
 * Native-feeling drag for sheets and drawers, shared by every touch surface.
 *
 * - Drag the grabber/header along `axis` towards `dismissDirection` to close.
 *   A flick (velocity) closes even after a short distance, like iOS/Android sheets.
 * - With `detents`, a vertical sheet can be resized: it follows the finger and
 *   snaps to the nearest detent (fractions of the viewport height).
 * - Dragging the wrong way rubber-bands instead of stopping dead.
 *
 * Only the handle starts a drag (touch-action: none there), so content inside
 * the sheet keeps native scrolling.
 */
interface SheetDragOptions {
  surface: Ref<HTMLElement | null>
  handle: Ref<HTMLElement | null>
  axis?: 'x' | 'y'
  /** +1: dismiss by dragging down/right. -1: up/left. */
  dismissDirection?: 1 | -1
  /** Resizable heights as fractions of the viewport height, ascending (y axis only). */
  detents?: number[]
  initialDetent?: number
  /** 'none' for dedicated handles; 'pan-y' lets a whole drawer keep vertical scrolling. */
  touchAction?: 'none' | 'pan-y' | 'pan-x'
  onDismiss: () => void
}

const FLICK_VELOCITY = 0.55 // px per ms
const DISMISS_FRACTION = 0.3
const DRAG_SLOP = 4
const SNAP_MS = 260
const EASE = 'cubic-bezier(.2, .8, .2, 1)'

const rubberBand = (distance: number, size: number) => (size * distance * 0.55) / (size + 0.55 * Math.abs(distance))

export default (options: SheetDragOptions) => {
  const axis = options.axis || 'y'
  const direction = options.dismissDirection || 1
  const detents = options.detents || []
  const detentIndex = ref(Math.min(options.initialDetent ?? 0, Math.max(0, detents.length - 1)))
  const dragging = ref(false)

  let pointerId = -1
  let start = 0
  let startSize = 0
  let lastPos = 0
  let lastTime = 0
  let velocity = 0
  let moved = false

  const pos = (event: PointerEvent) => (axis === 'y' ? event.clientY : event.clientX)
  const viewport = () => (axis === 'y' ? window.innerHeight : window.innerWidth)
  const surfaceSize = () => {
    const rect = options.surface.value!.getBoundingClientRect()
    return axis === 'y' ? rect.height : rect.width
  }
  // Detents are fractions of the room the surface really has: its positioned container,
  // minus its own CSS max-height. Recomputed live, so a collapsing URL bar or rotation
  // never leaves a stale pixel height that pokes under the dock.
  const room = () => {
    const el = options.surface.value
    const container = el?.offsetParent as HTMLElement | null
    const available = container ? container.clientHeight : window.innerHeight
    const maxHeight = el ? parseFloat(getComputedStyle(el).maxHeight) : NaN
    return Number.isFinite(maxHeight) ? Math.min(available, maxHeight / Math.max(...detents, 1)) : available
  }
  const detentPx = (index: number) => Math.round(detents[index] * room())

  const setTransition = (on: boolean) => {
    const el = options.surface.value
    if (el) el.style.transition = on ? `transform ${SNAP_MS}ms ${EASE}, height ${SNAP_MS}ms ${EASE}` : 'none'
  }
  const setOffset = (offset: number) => {
    const el = options.surface.value
    if (el) el.style.transform = offset ? `translate${axis.toUpperCase()}(${offset}px)` : ''
  }
  const setHeight = (height: number | null) => {
    const el = options.surface.value
    if (el) el.style.height = height === null ? '' : `${height}px`
  }

  const applyDetent = () => {
    if (!detents.length || !options.surface.value) return
    // Never taller than the content needs: a short menu stays short.
    const natural = options.surface.value.scrollHeight
    setHeight(Math.min(detentPx(detentIndex.value), Math.max(natural, detentPx(0))))
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !options.surface.value) return
    // Buttons inside the header (back/close) keep working as taps.
    if ((event.target as HTMLElement).closest('button:not([data-sheet-handle])')) return
    pointerId = event.pointerId
    start = lastPos = pos(event)
    lastTime = event.timeStamp
    startSize = surfaceSize()
    velocity = 0
    moved = false
    ;(event.currentTarget as HTMLElement).setPointerCapture(pointerId)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return
    const current = pos(event)
    const delta = (current - start) * direction // > 0 means towards dismissal
    if (!moved && Math.abs(delta) < DRAG_SLOP) return
    if (!moved) { moved = true; dragging.value = true; setTransition(false) }
    const dt = Math.max(1, event.timeStamp - lastTime)
    velocity = 0.8 * ((current - lastPos) * direction / dt) + 0.2 * velocity
    lastPos = current
    lastTime = event.timeStamp

    if (detents.length && axis === 'y') {
      const max = detentPx(detents.length - 1)
      const min = detentPx(0)
      const wanted = startSize - delta
      if (wanted > max) setHeight(max + rubberBand(wanted - max, viewport()))
      else if (wanted >= min) { setHeight(wanted); setOffset(0) }
      else { setHeight(min); setOffset((min - wanted) * direction) }
      return
    }
    setOffset(delta > 0 ? delta * direction : rubberBand(delta, viewport()) * direction)
  }

  const finish = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return
    pointerId = -1
    if (!moved) return
    dragging.value = false
    setTransition(true)
    const delta = (pos(event) - start) * direction
    const size = surfaceSize()

    if (detents.length && axis === 'y') {
      const height = startSize - delta
      const min = detentPx(0)
      const shouldDismiss = (height < min && (min - height > min * DISMISS_FRACTION || velocity > FLICK_VELOCITY)) ||
        (detentIndex.value === 0 && velocity > FLICK_VELOCITY * 1.4)
      if (shouldDismiss) return dismiss()
      // Project the release point a little along the flick, then snap to the nearest detent.
      const projected = height - velocity * 180
      let nearest = 0
      detents.forEach((_, index) => {
        if (Math.abs(detentPx(index) - projected) < Math.abs(detentPx(nearest) - projected)) nearest = index
      })
      detentIndex.value = nearest
      setOffset(0)
      applyDetent()
      return
    }
    if (delta > size * DISMISS_FRACTION || velocity > FLICK_VELOCITY) return dismiss()
    setOffset(0)
  }

  const dismiss = () => {
    setTransition(true)
    setOffset(direction * (surfaceSize() + 24))
    window.setTimeout(() => {
      // Already off-screen: skip the component's own leave animation, it would jump back first.
      if (options.surface.value) options.surface.value.dataset.sheetDismissed = ''
      options.onDismiss()
    }, SNAP_MS - 40)
  }

  const reset = () => {
    // Clear inline styles so CSS enter/leave transitions keep working.
    if (options.surface.value) {
      options.surface.value.style.transition = ''
      delete options.surface.value.dataset.sheetDismissed
    }
    setOffset(0)
    if (!detents.length) setHeight(null)
    detentIndex.value = Math.min(options.initialDetent ?? 0, Math.max(0, detents.length - 1))
  }

  const bind = (el: HTMLElement | null, previous?: HTMLElement | null) => {
    if (previous) {
      previous.removeEventListener('pointerdown', onPointerDown)
      previous.removeEventListener('pointermove', onPointerMove)
      previous.removeEventListener('pointerup', finish)
      previous.removeEventListener('pointercancel', finish)
    }
    if (!el) return
    el.style.touchAction = options.touchAction || 'none'
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', finish)
    el.addEventListener('pointercancel', finish)
  }
  watch(options.handle, (el, previous) => bind(el, previous), { immediate: true, flush: 'post' })
  const onResize = () => { if (!dragging.value && options.surface.value?.style.height) applyDetent() }
  window.addEventListener('resize', onResize, { passive: true })
  window.visualViewport?.addEventListener('resize', onResize, { passive: true })
  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    window.visualViewport?.removeEventListener('resize', onResize)
  })
  watch(options.surface, el => { if (el) { reset(); applyDetent() } }, { flush: 'post' })
  onBeforeUnmount(() => bind(null, options.handle.value))

  return { detentIndex, dragging, reset, applyDetent }
}
