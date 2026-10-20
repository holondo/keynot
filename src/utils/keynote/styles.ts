import {
  extractReferenceId,
  firstBytes,
  firstString,
  firstVarint,
  readFloat32LE,
  scanProtoFields,
} from './codec.ts'
import type { NativeIndex } from './document.ts'

/**
 * Keynote text styles: TSWP.ParagraphStyleArchive (2022) and
 * TSWP.CharacterStyleArchive (2021). Both wrap a TSS.StyleArchive whose `parent`
 * (field 3) supplies every property the style itself does not set.
 */

export interface CharacterStyle {
  /** Points, in Keynote slide coordinates. */
  fontSize?: number
  /** PostScript name, e.g. "HelveticaNeue-Bold". */
  fontName?: string
  color?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  allCaps?: boolean
}

export type TextAlignment = 'left' | 'right' | 'center' | 'justify'

export interface ParagraphStyle {
  character: CharacterStyle
  alignment?: TextAlignment
}

const STYLE_TYPES = { characterStyle: 2021, paragraphStyle: 2022 } as const

/** NSTextAlignment order used by TSWP: left, right, center, justified, natural. */
const ALIGNMENTS: Record<number, TextAlignment> = { 0: 'left', 1: 'right', 2: 'center', 3: 'justify', 4: 'left' }

const firstFloat = (message: Uint8Array | undefined, fieldNumber: number): number | undefined => {
  const field = message ? scanProtoFields(message).find(item => item.fieldNumber === fieldNumber && item.fixed32 !== undefined) : undefined
  return field?.fixed32 !== undefined ? readFloat32LE(field.fixed32) : undefined
}

const firstBool = (message: Uint8Array | undefined, fieldNumber: number): boolean | undefined => {
  const value = firstVarint(message, fieldNumber)
  return value === undefined ? undefined : value !== 0
}

const channel = (value: number | undefined) => Math.round(Math.min(1, Math.max(0, value ?? 0)) * 255)

/** TSP.Color as a CSS colour; CMYK and grey models are converted to RGB. */
export const readColor = (color: Uint8Array | undefined): string | undefined => {
  if (!color) return undefined
  const model = firstVarint(color, 1) ?? 1
  const alpha = firstFloat(color, 6) ?? 1
  let rgb: [number, number, number]
  if (model === 2) {
    const [c, m, y, k] = [7, 8, 9, 10].map(field => firstFloat(color, field) ?? 0)
    rgb = [(1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k)].map(value => channel(value)) as [number, number, number]
  }
  else if (model === 3) {
    const white = channel(firstFloat(color, 11))
    rgb = [white, white, white]
  }
  else {
    rgb = [channel(firstFloat(color, 3)), channel(firstFloat(color, 4)), channel(firstFloat(color, 5))]
  }
  return alpha >= 1 ? `rgb(${rgb.join(', ')})` : `rgba(${rgb.join(', ')}, ${Math.round(alpha * 1000) / 1000})`
}

/** TSWP.CharacterStylePropertiesArchive: only the properties that are set. */
const readCharacterProperties = (properties: Uint8Array | undefined): CharacterStyle => {
  if (!properties) return {}
  const style: CharacterStyle = {}
  const bold = firstBool(properties, 1)
  if (bold !== undefined) style.bold = bold
  const italic = firstBool(properties, 2)
  if (italic !== undefined) style.italic = italic
  const fontSize = firstFloat(properties, 3)
  if (fontSize !== undefined && fontSize > 0) style.fontSize = fontSize
  if (!firstBool(properties, 4)) {
    const fontName = firstString(properties, 5)
    if (fontName) style.fontName = fontName
  }
  if (!firstBool(properties, 6)) {
    const color = readColor(firstBytes(properties, 7))
    if (color) style.color = color
  }
  const underline = firstVarint(properties, 11)
  if (underline !== undefined) style.underline = underline !== 0
  const strikethrough = firstVarint(properties, 12)
  if (strikethrough !== undefined) style.strikethrough = strikethrough !== 0
  const capitalization = firstVarint(properties, 13)
  if (capitalization !== undefined) style.allCaps = capitalization === 1
  return style
}

export interface StyleResolver {
  paragraph: (styleId: number | null) => ParagraphStyle
  character: (styleId: number | null) => CharacterStyle
}

export const createStyleResolver = (index: NativeIndex): StyleResolver => {
  const paragraphCache = new Map<number, ParagraphStyle>()
  const characterCache = new Map<number, CharacterStyle>()

  const resolveParagraph = (styleId: number | null, depth = 0): ParagraphStyle => {
    if (styleId === null || depth > 32) return { character: {} }
    const cached = paragraphCache.get(styleId)
    if (cached) return cached
    const record = index.objects.get(styleId)
    if (!record || record.type !== STYLE_TYPES.paragraphStyle) return { character: {} }
    const parent = resolveParagraph(extractReferenceId(firstBytes(firstBytes(record.data, 1), 3)), depth + 1)
    const alignment = firstVarint(firstBytes(record.data, 12), 1)
    const style: ParagraphStyle = {
      character: { ...parent.character, ...readCharacterProperties(firstBytes(record.data, 11)) },
      alignment: alignment !== undefined ? ALIGNMENTS[alignment] ?? parent.alignment : parent.alignment,
    }
    paragraphCache.set(styleId, style)
    return style
  }

  const resolveCharacter = (styleId: number | null, depth = 0): CharacterStyle => {
    if (styleId === null || depth > 32) return {}
    const cached = characterCache.get(styleId)
    if (cached) return cached
    const record = index.objects.get(styleId)
    if (!record || record.type !== STYLE_TYPES.characterStyle) return {}
    const parent = resolveCharacter(extractReferenceId(firstBytes(firstBytes(record.data, 1), 3)), depth + 1)
    const style = { ...parent, ...readCharacterProperties(firstBytes(record.data, 11)) }
    characterCache.set(styleId, style)
    return style
  }

  return {
    paragraph: styleId => resolveParagraph(styleId),
    character: styleId => resolveCharacter(styleId),
  }
}

const WEIGHT_SUFFIXES: [RegExp, number][] = [
  [/thin|hairline/i, 100],
  [/ultralight|extralight/i, 200],
  [/light/i, 300],
  [/medium/i, 500],
  [/semibold|demibold/i, 600],
  [/extrabold|ultrabold|heavy/i, 800],
  [/black/i, 900],
  [/bold/i, 700],
]

/**
 * CSS font for a PostScript name: "HelveticaNeue-LightItalic" becomes the family
 * "Helvetica Neue" at weight 300, italic. Fonts the browser lacks fall back to the
 * generic family that matches the original classification.
 */
export const cssFontFromPostScript = (postScriptName: string): { family: string; weight?: number; italic?: boolean } => {
  const [base, variant = ''] = postScriptName.split('-')
  const family = base
    .replace(/MT$|PS$|Std$|Pro$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()
  const weight = WEIGHT_SUFFIXES.find(([pattern]) => pattern.test(variant))?.[1]
  const italic = /italic|oblique/i.test(variant) || undefined
  const generic = /serif|times|georgia|garamond|baskerville|didot|palatino|charter|caslon|bodoni/i.test(family) && !/sans/i.test(family)
    ? 'serif'
    : /mono|courier|menlo/i.test(family) ? 'monospace' : 'sans-serif'
  return { family: `${family}, ${generic}`, weight, italic }
}

/**
 * Inline CSS for a resolved character style, scaled from Keynote points to editor
 * pixels. Only declarations the editor's text marks understand are emitted.
 */
export const characterStyleCss = (style: CharacterStyle, scale: number): string => {
  const declarations: string[] = []
  const font = style.fontName ? cssFontFromPostScript(style.fontName) : undefined
  if (style.fontSize) declarations.push(`font-size: ${Math.round(style.fontSize * scale * 100) / 100}px`)
  if (style.color) declarations.push(`color: ${style.color}`)
  if (font) declarations.push(`font-family: ${font.family}`)
  if (style.bold ?? (font?.weight !== undefined && font.weight >= 700)) declarations.push('font-weight: bold')
  if (style.italic ?? font?.italic) declarations.push('font-style: italic')
  if (style.underline) declarations.push('text-decoration-line: underline')
  if (style.strikethrough) declarations.push('text-decoration-line: line-through')
  if (style.allCaps) declarations.push('text-transform: uppercase')
  return declarations.join('; ')
}
