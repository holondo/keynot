import { onBeforeUnmount, watch, type WatchSource } from 'vue'

/**
 * Hierarchical back navigation that mirrors the Android back stack.
 *
 * Every open layer (sheet, submenu level, dialog, drawer, popover, slideshow)
 * pushes one history entry. The browser/system back button pops the most
 * recently opened layer only, so back walks out of the UI one level at a time
 * before it ever leaves the app. Closing a layer from the UI consumes its
 * history entry, so the stack and the history never drift apart.
 */
interface BackEntry {
  onBack: () => void
  /** Set when the entry was consumed by a popstate rather than by the UI. */
  popped: boolean
}

const stack: BackEntry[] = []
let listening = false
// Entries released by the UI are dropped with one batched history.go(-n).
let pendingReleases = 0
let flushScheduled = false
// While that traversal runs, new pushState calls must wait or the traversal would eat them.
let traversing = false
let deferredPushes = 0

const flushDeferredPushes = () => {
  traversing = false
  while (deferredPushes > 0) {
    deferredPushes--
    history.pushState({ keynotBack: true }, '')
  }
}

const handlePopState = () => {
  if (traversing) {
    flushDeferredPushes()
    return
  }
  const entry = stack.pop()
  if (!entry) return
  entry.popped = true
  entry.onBack()
}

const ensureListener = () => {
  if (listening || typeof window === 'undefined') return
  window.addEventListener('popstate', handlePopState)
  listening = true
}

const writeHistoryEntry = () => {
  if (traversing || pendingReleases > 0) deferredPushes++
  else history.pushState({ keynotBack: true }, '')
}

const push = (onBack: () => void): BackEntry => {
  ensureListener()
  const entry: BackEntry = { onBack, popped: false }
  stack.push(entry)
  writeHistoryEntry()
  return entry
}

const flushReleases = () => {
  flushScheduled = false
  let count = pendingReleases
  pendingReleases = 0
  // A push and a release in the same tick cancel out without touching history.
  const cancelled = Math.min(count, deferredPushes)
  count -= cancelled
  deferredPushes -= cancelled
  if (!count) return flushDeferredPushes()
  traversing = true
  history.go(-count)
}

const release = (entry: BackEntry) => {
  const index = stack.indexOf(entry)
  if (index === -1 || entry.popped) return
  stack.splice(index, 1)
  // Our history entries are interchangeable, so dropping any one is one step back.
  pendingReleases++
  if (!flushScheduled) {
    flushScheduled = true
    queueMicrotask(flushReleases)
  }
}

/** Number of layers currently registered; useful for tests and debugging. */
export const backStackDepth = () => stack.length
if (import.meta.env?.DEV && typeof window !== 'undefined') (window as any).__keynotBackDepth = backStackDepth

/**
 * Keeps `depth` history entries alive for one component. Each back press
 * calls `onBack` once; the component is expected to reduce its depth in
 * response (close a level), which keeps both sides in sync.
 */
export const useBackDepth = (depth: WatchSource<number>, onBack: () => void) => {
  const entries: BackEntry[] = []
  const sync = (target: number) => {
    // Entries consumed by popstate are already gone from the stack.
    for (let i = entries.length - 1; i >= 0; i--) if (entries[i].popped) entries.splice(i, 1)
    while (entries.length < target) entries.push(push(onBack))
    while (entries.length > target) release(entries.pop()!)
  }
  watch(depth, value => sync(Math.max(0, value)), { immediate: true, flush: 'post' })
  onBeforeUnmount(() => sync(0))
}

/** One back entry while `isOpen` is true; back calls `close`. */
export const useBackHandler = (isOpen: WatchSource<boolean>, close: () => void) => {
  useBackDepth(() => {
    const value = typeof isOpen === 'function' ? isOpen() : isOpen.value
    return value ? 1 : 0
  }, close)
}
