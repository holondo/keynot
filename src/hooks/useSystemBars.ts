import { nextTick, onMounted, watch, type WatchSource } from 'vue'

/**
 * Integration with the system bars around the app:
 * the Android status bar and the desktop PWA title bar take the color of the top of the scene.
 * (Photo mode doesn't go fullscreen by itself: the browser's "exit fullscreen" notice was annoying.)
 *
 * The top of the scene is the full-bleed canvas while editing and black during a slideshow,
 * so the bars read as part of the app instead of a blue strip above it.
 */
const SLIDESHOW_COLOR = '#000000'

const themeColorMeta = () => {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  return meta
}

/** Resolves the color the user actually sees at the top edge of the editor. */
const sceneTopColor = () => {
  const probe = document.querySelector<HTMLElement>('.canvas') || document.querySelector<HTMLElement>('.keynot-editor') || document.body
  const color = getComputedStyle(probe).backgroundColor
  return color && color !== 'rgba(0, 0, 0, 0)' ? color : getComputedStyle(document.body).backgroundColor
}

export default (sources: { screening: WatchSource<boolean>; colorMode: WatchSource<unknown> }) => {
  const update = async (screening: boolean) => {
    await nextTick()
    // The theme attribute switches synchronously, but styles land a frame later.
    requestAnimationFrame(() => {
      themeColorMeta().content = screening ? SLIDESHOW_COLOR : sceneTopColor()
    })
  }
  let screeningNow = false
  watch(sources.screening, value => { screeningNow = value; update(value) })
  watch(sources.colorMode, () => update(screeningNow))
  onMounted(() => update(screeningNow))
  // "auto" color mode follows the OS without touching the store.
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => update(screeningNow))
}
