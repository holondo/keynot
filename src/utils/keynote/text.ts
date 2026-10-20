import {
  concatBytes,
  encodeProtoBytesField,
  extractReferenceId,
  firstBytes,
  firstVarint,
  rebuildMessage,
  replaceProtoField,
  scanProtoFields,
} from './codec.ts'
import { characterStyleCss, type CharacterStyle, type StyleResolver } from './styles.ts'

export const OBJECT_REPLACEMENT_CHARACTER = '\uFFFC'
export const LINE_SEPARATOR = '\u2028'
export const PARAGRAPH_SEPARATOR = '\u2029'

const isParagraphBreak = (char: string) => char === '\n' || char === PARAGRAPH_SEPARATOR

/** Paragraphs of native text: Keynote separates them with U+2029 or "\n". */
export const splitParagraphs = (text: string) => text.split(/\n|\u2029/)

/** The separator a storage already uses, so edited text keeps it. */
export const paragraphSeparatorOf = (text: string) => text.includes(PARAGRAPH_SEPARATOR) ? PARAGRAPH_SEPARATOR : '\n'

/** Text shown to the user: attachment anchors are not visible characters. */
export const visibleNativeText = (text: string) => text.split(OBJECT_REPLACEMENT_CHARACTER).join('')

const segmentHtml = (segment: string) => visibleNativeText(segment).split(LINE_SEPARATOR).map(escapeHtml).join('<br>')

/** Character positions where an attribute table entry starts, with its referenced object. */
const readAttributeRuns = (storage: Uint8Array, fieldNumber: number): { index: number; objectId: number | null }[] => {
  const table = firstBytes(storage, fieldNumber)
  if (!table) return []
  return (readTableEntries(table) ?? [])
    .map(entry => ({ index: entry.index, objectId: extractReferenceId(firstBytes(entry.bytes, 2)) }))
    .sort((a, b) => a.index - b.index)
}

const runAt = <T extends { index: number }>(runs: T[], position: number): T | undefined => {
  let found: T | undefined
  for (const run of runs) {
    if (run.index > position) break
    found = run
  }
  return found
}

export interface StyledTextResult {
  html: string
  /** Style of the first character, for the element defaults and size estimates. */
  firstStyle: CharacterStyle
}

/**
 * Render a TSWP.StorageArchive as editor HTML: one <p> per paragraph with its
 * paragraph style's alignment, and one <span> per character-style run. The visible
 * text is exactly the native text (see htmlToNativeText), so unedited content
 * exports unchanged.
 */
export const nativeStorageToHtml = (
  storage: Uint8Array,
  text: string,
  styles: StyleResolver,
  scale: number,
  fallback: CharacterStyle
): StyledTextResult => {
  const paragraphRuns = readAttributeRuns(storage, 5)
  const characterRuns = readAttributeRuns(storage, 8)
  let firstStyle: CharacterStyle | undefined
  const paragraphs = splitParagraphs(text)
  let start = 0
  const html = paragraphs.map(paragraph => {
    const paragraphStart = start
    start += paragraph.length + 1
    const paragraphStyle = styles.paragraph(runAt(paragraphRuns, paragraphStart)?.objectId ?? null)
    const alignment = paragraphStyle.alignment && paragraphStyle.alignment !== 'left' ? ` style="text-align: ${paragraphStyle.alignment};"` : ''
    const boundaries = [0, ...characterRuns.map(run => run.index - paragraphStart).filter(offset => offset > 0 && offset < paragraph.length), paragraph.length]
    const spans: string[] = []
    for (let index = 0; index + 1 < boundaries.length; index++) {
      const segment = paragraph.slice(boundaries[index], boundaries[index + 1])
      if (!segment) continue
      const characterStyle = styles.character(runAt(characterRuns, paragraphStart + boundaries[index])?.objectId ?? null)
      const style = { ...fallback, ...paragraphStyle.character, ...characterStyle }
      firstStyle ??= style
      const css = characterStyleCss(style, scale)
      spans.push(css ? `<span style="${css};">${segmentHtml(segment)}</span>` : segmentHtml(segment))
    }
    return `<p${alignment}>${spans.join('')}</p>`
  }).join('')
  return { html, firstStyle: firstStyle ?? { ...fallback, ...styles.paragraph(paragraphRuns[0]?.objectId ?? null).character } }
}

export const decodeHtmlEntities = (text: string): string => text
  .replace(/&nbsp;/g, '\u00a0')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, '\'')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&amp;/g, '&')

/**
 * Convert the editor's rich-text HTML back to TSWP storage text: one "\n" between
 * paragraphs, U+2028 for line breaks inside a paragraph. Nothing is trimmed, so an
 * unedited element reproduces its native text exactly.
 */
export const htmlToNativeText = (html: string, separator = '\n'): string => {
  const withBreaks = html.replace(/<br\s*\/?>/gi, LINE_SEPARATOR)
  const paragraphs = Array.from(withBreaks.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi), match => match[1])
  const source = paragraphs.length ? paragraphs : [withBreaks]
  return source.map(paragraph => decodeHtmlEntities(paragraph.replace(/<[^>]+>/g, ''))).join(separator)
}

// --- TSWP attribute tables -------------------------------------------------

/** Tables indexed by paragraph start. */
export const PARAGRAPH_TABLE_FIELDS = new Set([5, 6, 7, 12, 14, 24, 28])
/** Tables indexed by character position that can be remapped safely. */
export const CHARACTER_TABLE_FIELDS = new Set([8, 17, 19, 20, 23, 27])
/** Every other attribute table anchors objects (attachments, fields, footnotes, ...). */
export const STORAGE_NON_TABLE_FIELDS = new Set([1, 2, 3, 4, 10])

export const paragraphStarts = (text: string): number[] => {
  const starts = [0]
  for (let index = 0; index < text.length; index++) if (isParagraphBreak(text[index])) starts.push(index + 1)
  return starts
}

export interface TableEntry {
  index: number
  bytes: Uint8Array
}

export const readTableEntries = (table: Uint8Array): TableEntry[] | null => {
  const entries: TableEntry[] = []
  for (const field of scanProtoFields(table)) {
    if (field.fieldNumber !== 1 || !field.bytes) return null
    const index = firstVarint(field.bytes, 1)
    if (index === undefined) return null
    entries.push({ index, bytes: field.bytes })
  }
  return entries
}

export const writeTableEntries = (entries: TableEntry[]): Uint8Array => concatBytes(entries.map(entry => {
  const indexField = scanProtoFields(entry.bytes).find(field => field.fieldNumber === 1)!
  return encodeProtoBytesField(1, replaceProtoField(entry.bytes, indexField, entry.index))
}))

/**
 * Replace the text of a TSWP.StorageArchive and remap its style tables so every
 * paragraph keeps its paragraph style and character runs stay inside the text.
 * Returns null when the storage anchors objects the remap cannot move safely.
 */
export const patchStorageText = (payload: Uint8Array, oldText: string, newText: string): Uint8Array | null => {
  if (oldText.includes(OBJECT_REPLACEMENT_CHARACTER)) return null
  const fields = scanProtoFields(payload)
  for (const field of fields) {
    if (STORAGE_NON_TABLE_FIELDS.has(field.fieldNumber)) continue
    if (PARAGRAPH_TABLE_FIELDS.has(field.fieldNumber) || CHARACTER_TABLE_FIELDS.has(field.fieldNumber)) continue
    if (field.bytes && readTableEntries(field.bytes)?.length) return null
  }

  const oldStarts = paragraphStarts(oldText)
  const newStarts = paragraphStarts(newText)
  const paragraphOf = (starts: number[], index: number) => {
    let paragraph = 0
    while (paragraph + 1 < starts.length && starts[paragraph + 1] <= index) paragraph++
    return paragraph
  }
  const paragraphLength = (text: string, starts: number[], paragraph: number) =>
    (paragraph + 1 < starts.length ? starts[paragraph + 1] - 1 : text.length) - starts[paragraph]
  const mapIndex = (index: number): number | null => {
    const paragraph = paragraphOf(oldStarts, index)
    if (paragraph >= newStarts.length) return null
    const offset = Math.min(index - oldStarts[paragraph], paragraphLength(newText, newStarts, paragraph))
    return newStarts[paragraph] + offset
  }

  const remapTable = (fieldNumber: number, table: Uint8Array): Uint8Array | null => {
    const entries = readTableEntries(table)
    if (!entries) return null
    if (!entries.length) return table
    const perParagraph = PARAGRAPH_TABLE_FIELDS.has(fieldNumber)
      && entries.length === oldStarts.length
      && entries.every((entry, index) => entry.index === oldStarts[index])
    let next: TableEntry[]
    if (perParagraph) {
      next = newStarts.map((start, paragraph) => ({
        index: start,
        bytes: entries[Math.min(paragraph, entries.length - 1)].bytes,
      }))
    }
    else {
      const mapped = new Map<number, TableEntry>()
      for (const entry of entries) {
        const index = entry.index === 0 ? 0 : mapIndex(entry.index)
        if (index === null || (index > 0 && index >= newText.length)) continue
        mapped.set(index, { index, bytes: entry.bytes })
      }
      next = Array.from(mapped.values()).sort((a, b) => a.index - b.index)
    }
    return writeTableEntries(next)
  }

  let textWritten = false
  let failed = false
  const result = rebuildMessage(payload, field => {
    if (field.fieldNumber === 3) {
      if (textWritten) return null
      textWritten = true
      return encodeProtoBytesField(3, new TextEncoder().encode(newText))
    }
    if (!field.bytes || STORAGE_NON_TABLE_FIELDS.has(field.fieldNumber)) return undefined
    const remapped = remapTable(field.fieldNumber, field.bytes)
    if (!remapped) {
      failed = true
      return undefined
    }
    return encodeProtoBytesField(field.fieldNumber, remapped)
  }, [])
  if (failed) return null
  return textWritten ? result : concatBytes([result, encodeProtoBytesField(3, new TextEncoder().encode(newText))])
}

export const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
