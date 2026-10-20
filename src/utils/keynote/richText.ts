import { Parser } from 'htmlparser2'
import type { PPTElement } from '@/types/slides'

export interface RichStyle {
  fontName: string
  fontSize: number
  color: string
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
}
export interface RichRun { index: number; style: RichStyle }
export interface RichParagraph { index: number; alignment: string }

export const textFingerprint = (element: PPTElement): string | undefined => {
  const text = element.type === 'text' ? element : element.type === 'shape' ? element.text : undefined
  return text ? JSON.stringify([text.content, text.defaultFontName, text.defaultColor]) : undefined
}

export const appearanceFingerprint = (element: PPTElement): string => JSON.stringify({
  name: element.name, link: element.link?.type === 'web' ? element.link.target : undefined,
  fill: 'fill' in element ? element.fill : undefined, gradient: 'gradient' in element ? element.gradient : undefined,
  outline: 'outline' in element ? element.outline : undefined, opacity: 'opacity' in element ? element.opacity : undefined,
  shadow: 'shadow' in element ? element.shadow : undefined, lock: element.lock,
  flipH: 'flipH' in element ? element.flipH : undefined, flipV: 'flipV' in element ? element.flipV : undefined,
  path: element.type === 'shape' ? element.path : undefined, viewBox: element.type === 'shape' ? element.viewBox : undefined,
})

/** HTML tokenizer preserves nested marks and indexes runs in UTF-16, as TSWP does. */
export const parseRichText = (html: string, defaults: { fontName: string; color: string; fontSize?: number }, separator = '\u2029') => {
  let text = ''
  const runs: RichRun[] = []
  const paragraphs: RichParagraph[] = []
  const stack: { tag: string; style: RichStyle; alignment: string }[] = [{
    tag: '', style: { fontName: defaults.fontName.split(',')[0].trim(), fontSize: defaults.fontSize ?? 18, color: defaults.color, bold: false, italic: false, underline: false, strikethrough: false }, alignment: 'left',
  }]
  const append = (value: string) => {
    if (!value) return
    const style = stack[stack.length - 1].style
    if (!runs.length || JSON.stringify(runs[runs.length - 1].style) !== JSON.stringify(style)) runs.push({ index: text.length, style: { ...style } })
    text += value
  }
  const parser = new Parser({
    onopentag(tag, attrs) {
      const parent = stack[stack.length - 1]
      const style = { ...parent.style }
      const css = Object.fromEntries((attrs.style ?? '').split(';').map(item => item.split(/:(.*)/s).slice(0, 2).map(part => part.trim())).filter(parts => parts.length === 2))
      if (['b', 'strong'].includes(tag)) style.bold = true
      if (['i', 'em'].includes(tag)) style.italic = true
      if (tag === 'u') style.underline = true
      if (['s', 'strike', 'del'].includes(tag)) style.strikethrough = true
      if (css['font-family']) style.fontName = css['font-family'].split(',')[0].replace(/["']/g, '').trim()
      if (parseFloat(css['font-size']) > 0) style.fontSize = parseFloat(css['font-size'])
      if (css.color) style.color = css.color
      if (css['font-weight']) style.bold = css['font-weight'] === 'bold' || parseInt(css['font-weight']) >= 600
      if (css['font-style']) style.italic = css['font-style'] === 'italic'
      const decoration = css['text-decoration-line'] ?? css['text-decoration']
      if (decoration !== undefined) {
        style.underline = decoration.includes('underline'); style.strikethrough = decoration.includes('line-through')
      }
      const alignment = css['text-align'] ?? parent.alignment
      if (tag === 'p' || tag === 'li') {
        if (paragraphs.length) append(separator)
        paragraphs.push({ index: text.length, alignment })
      }
      stack.push({ tag, style, alignment })
      if (tag === 'br') append('\u2028')
    },
    ontext(value) {
      append(value)
    },
    onclosetag(tag) {
      const index = stack.map(item => item.tag).lastIndexOf(tag)
      if (index > 0) stack.splice(index)
    },
  }, { decodeEntities: true })
  parser.write(html)
  parser.end()
  if (!paragraphs.length) paragraphs.push({ index: 0, alignment: 'left' })
  if (!runs.length) runs.push({ index: 0, style: { ...stack[0].style } })
  return { text, runs, paragraphs }
}
