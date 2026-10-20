/**
 * Magic Move "By Word" and "By Character": matched text objects morph token by
 * token. Both texts are cloned into the incoming slide, split into word or
 * grapheme spans with Intl.Segmenter, paired by longest common subsequence, and
 * each pair travels from its old to its new position. Unpaired tokens dissolve.
 */

export type TextMorphGranularity = 'word' | 'character'

interface Token {
  text: string
  span: HTMLElement
}

/** Intl.Segmenter (ES2022), declared locally because the project targets an older lib. */
interface Segmenter {
  segment: (text: string) => Iterable<{ segment: string }>
}
type SegmenterConstructor = new (locale: string | undefined, options: { granularity: 'word' | 'grapheme' }) => Segmenter

const segmenterFor = (granularity: TextMorphGranularity): Segmenter | null => {
  const constructor = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter
  return constructor ? new constructor(undefined, { granularity: granularity === 'word' ? 'word' : 'grapheme' }) : null
}

const splitText = (text: string, granularity: TextMorphGranularity): string[] => {
  const segmenter = segmenterFor(granularity)
  if (segmenter) return Array.from(segmenter.segment(text), part => part.segment)
  return granularity === 'word' ? text.split(/(\s+)/).filter(Boolean) : Array.from(text)
}

/** Replace every text node under `root` with inline-block spans, one per token. */
const tokenize = (root: HTMLElement, granularity: TextMorphGranularity): Token[] => {
  const tokens: Token[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) textNodes.push(node as Text)
  for (const node of textNodes) {
    const fragment = document.createDocumentFragment()
    for (const part of splitText(node.data, granularity)) {
      const span = document.createElement('span')
      span.textContent = part
      span.style.display = 'inline-block'
      span.style.whiteSpace = 'pre'
      fragment.appendChild(span)
      if (part.trim()) tokens.push({ text: part, span })
    }
    node.replaceWith(fragment)
  }
  return tokens
}

/** Index pairs of the longest common subsequence of two token lists. */
export const matchTokens = (from: string[], to: string[]): [number, number][] => {
  const rows = from.length
  const cols = to.length
  const table = Array.from({ length: rows + 1 }, () => new Uint32Array(cols + 1))
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      table[i][j] = from[i] === to[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }
  const pairs: [number, number][] = []
  for (let i = 0, j = 0; i < rows && j < cols;) {
    if (from[i] === to[j]) pairs.push([i++, j++])
    else if (table[i + 1][j] >= table[i][j + 1]) i++
    else j++
  }
  return pairs
}

export interface TextMorphOptions {
  /** The outgoing object's positioned wrapper (from the previous slide). */
  fromWrapper: HTMLElement
  /** The incoming object's positioned wrapper (on the slide being shown). */
  toWrapper: HTMLElement
  granularity: TextMorphGranularity
  duration: number
  easing: string
  /** Fade tokens that have no partner. */
  fadeUnmatched: boolean
}

/** Run the morph; resolves after the clones are removed and the real text is shown again. */
export const runTextMorph = async ({ fromWrapper, toWrapper, granularity, duration, easing, fadeUnmatched }: TextMorphOptions): Promise<void> => {
  const container = toWrapper.parentElement
  if (!container) return
  const fromClone = fromWrapper.cloneNode(true) as HTMLElement
  const toClone = toWrapper.cloneNode(true) as HTMLElement
  for (const clone of [fromClone, toClone]) {
    clone.removeAttribute('id')
    clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'))
    clone.style.pointerEvents = 'none'
    clone.style.visibility = 'visible'
    clone.setAttribute('aria-hidden', 'true')
  }
  const fromTokens = tokenize(fromClone, granularity)
  const toTokens = tokenize(toClone, granularity)
  container.append(fromClone, toClone)
  const previousOpacity = toWrapper.style.opacity
  toWrapper.style.opacity = '0'

  // Screen pixels per local unit: the slide is drawn with a CSS scale.
  const scale = toClone.getBoundingClientRect().width / Math.max(toClone.offsetWidth, 1) || 1
  const pairs = matchTokens(fromTokens.map(token => token.text), toTokens.map(token => token.text))
  const pairedFrom = new Set(pairs.map(([from]) => from))
  const pairedTo = new Set(pairs.map(([, to]) => to))
  const timing: KeyframeAnimationOptions = { duration, easing, fill: 'both' }
  const animations: Animation[] = []

  for (const [fromIndex, toIndex] of pairs) {
    const a = fromTokens[fromIndex].span.getBoundingClientRect()
    const b = toTokens[toIndex].span.getBoundingClientRect()
    const dx = (a.left - b.left) / scale
    const dy = (a.top - b.top) / scale
    const sx = b.width ? a.width / b.width : 1
    const sy = b.height ? a.height / b.height : 1
    const span = toTokens[toIndex].span
    span.style.transformOrigin = '0 0'
    animations.push(span.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transform: 'none' }], timing))
    fromTokens[fromIndex].span.style.visibility = 'hidden'
  }
  fromTokens.forEach((token, index) => {
    if (pairedFrom.has(index)) return
    if (fadeUnmatched) animations.push(token.span.animate([{ opacity: 1 }, { opacity: 0 }], timing))
    else token.span.style.visibility = 'hidden'
  })
  toTokens.forEach((token, index) => {
    if (pairedTo.has(index)) return
    if (fadeUnmatched) animations.push(token.span.animate([{ opacity: 0 }, { opacity: 1 }], timing))
  })
  // Non-text parts of the outgoing object (fill, outline) dissolve away.
  animations.push(fromClone.animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], timing))

  try {
    await Promise.all(animations.map(animation => animation.finished))
  }
  catch {
    // Cancelled: clean up below.
  }
  finally {
    fromClone.remove()
    toClone.remove()
    toWrapper.style.opacity = previousOpacity
  }
}
