import type { Slide } from '@/types/slides'
import {
  type IWAObjectRecord, concatBytes, encodeProtoBytesField as bytes, encodeProtoVarintField as integer,
  extractReferenceId, firstBytes, firstVarint, parseIWAObjects, rewriteIWAObjects, upsertProtoField,
} from './codec.ts'
import { IWA_TYPE, createNativeIndex, readSlideTree, readStorageText } from './document.ts'
import { encodeNativeRecord } from './creation.ts'
import { nativeColor, nativeFloat } from './objects.ts'
import { parseRichText, textFingerprint } from './richText.ts'
import { paragraphSeparatorOf, patchStorageText, readTableEntries } from './text.ts'
import { readPackedIds, replacePackedIds } from './references.ts'
import { createStyleResolver } from './styles.ts'

const ref = (field: number, id: number) => bytes(field, integer(1, id))
const string = (field: number, value: string) => bytes(field, new TextEncoder().encode(value))
const styleTable = (entries: { index: number; id: number }[]) => concatBytes(entries.map(entry => bytes(1, concatBytes([integer(1, entry.index), ref(2, entry.id)]))))

/** Write rich-text runs to native styles, preserving unrelated storage fields. */
export const writeNativeTextStyles = (slides: Slide[], streams: Map<string, Uint8Array>, objects: Map<number, IWAObjectRecord>, viewportSize: number) => {
  const metadata = [...objects.values()].find(record => record.type === IWA_TYPE.packageMetadata)
  if (!metadata) return 0
  let lastId = Math.max(firstVarint(metadata.data, 1) ?? 0, ...objects.keys())
  const scale = (readSlideTree(createNativeIndex(objects)).size?.width ?? 1920) / viewportSize
  const patches = new Map<number, Uint8Array>()
  const refs = new Map<number, number[]>()
  const appends = new Map<string, Uint8Array[]>()
  const styleCache = new Map<string, number>()
  const styles = createStyleResolver(createNativeIndex(objects))
  const createStyle = (type: number, payload: Uint8Array, base: IWAObjectRecord, references: number[]) => {
    const key = `${type}:${base.id}:${Array.from(payload)}`
    const existing = styleCache.get(key)
    if (existing) return existing
    const id = ++lastId
    const records = appends.get(base.sourceIwaPath) ?? []
    records.push(encodeNativeRecord(id, type, payload, base, references))
    appends.set(base.sourceIwaPath, records)
    styleCache.set(key, id)
    return id
  }
  let written = 0
  for (const slide of slides) {
    for (const element of slide.elements) {
      const text = element.type === 'text' ? element : element.type === 'shape' ? element.text : undefined
      const fingerprint = textFingerprint(element)
      if (!text || !element.sourceSnapshot || fingerprint === element.sourceSnapshot.richText) continue
      const storage = objects.get(Number(element.sourceTextStorageId))
      if (!storage) continue
      const baseFor = (field: number, type: number) => {
        const entry = readTableEntries(firstBytes(storage.data, field) ?? new Uint8Array())?.[0]
        const id = entry ? extractReferenceId(firstBytes(entry.bytes, 2)) : null
        return (id !== null ? objects.get(id) : undefined) ?? [...objects.values()].find(record => record.type === type)
      }
      const charBase = baseFor(8, 2021)
      const paraBase = baseFor(5, 2022)
      if (!charBase || !paraBase) continue
      const oldText = readStorageText(storage)
      const inheritedSize = styles.character(charBase.id).fontSize ?? styles.paragraph(paraBase.id).character.fontSize
      const rich = parseRichText(text.content, {
        fontName: text.defaultFontName, color: text.defaultColor,
        ...(element.sourceSnapshot.richText && inheritedSize ? { fontSize: inheritedSize / scale } : {}),
      }, paragraphSeparatorOf(oldText))
      let next = patchStorageText(storage.data, oldText, rich.text)
      if (!next) continue
      const sheetId = extractReferenceId(firstBytes(storage.data, 2))
      const styleSuper = (id: number) => concatBytes([ref(3, id), integer(4, 1), ...(sheetId !== null ? [ref(5, sheetId)] : [])])
      const charEntries = rich.runs.map(run => {
        const value = run.style
        const properties = concatBytes([
          integer(1, value.bold ? 1 : 0), integer(2, value.italic ? 1 : 0), nativeFloat(3, value.fontSize * scale),
          integer(4, 0), string(5, value.fontName), integer(6, 0), bytes(7, nativeColor(value.color)),
          integer(11, value.underline ? 1 : 0), integer(12, value.strikethrough ? 1 : 0),
        ])
        const payload = concatBytes([bytes(1, styleSuper(charBase.id)), integer(10, 7), bytes(11, properties)])
        return { index: run.index, id: createStyle(2021, payload, charBase, [charBase.id, ...(sheetId !== null ? [sheetId] : [])]) }
      })
      const alignments: Record<string, number> = { left: 0, right: 1, center: 2, justify: 3 }
      const paraEntries = rich.paragraphs.map(paragraph => {
        const payload = concatBytes([bytes(1, styleSuper(paraBase.id)), integer(10, 1), bytes(12, integer(1, alignments[paragraph.alignment] ?? 0))])
        return { index: paragraph.index, id: createStyle(2022, payload, paraBase, [paraBase.id, ...(sheetId !== null ? [sheetId] : [])]) }
      })
      next = upsertProtoField(next, 8, styleTable(charEntries))
      next = upsertProtoField(next, 5, styleTable(paraEntries))
      patches.set(storage.id, next)
      refs.set(storage.id, [...new Set([...readPackedIds(storage.messageInfo!, 5), ...charEntries.map(entry => entry.id), ...paraEntries.map(entry => entry.id)])])
      element.sourceSnapshot.text = rich.text
      element.sourceSnapshot.richText = fingerprint
      written++
    }
  }
  if (!written) return 0
  patches.set(metadata.id, upsertProtoField(metadata.data, 1, lastId))
  for (const [path, stream] of streams) {
    const rewritten = rewriteIWAObjects(stream, (id, type) => objects.get(id)?.type === type ? patches.get(id) ?? null : null,
      (id, _type, info) => refs.has(id) ? replacePackedIds(info, 5, refs.get(id)!) : info)
    const data = concatBytes([rewritten.bytes, ...(appends.get(path) ?? [])])
    streams.set(path, data)
    for (const record of parseIWAObjects(data, path)) if (!objects.has(record.id) || objects.get(record.id)?.type === record.type) objects.set(record.id, record)
  }
  return written
}
