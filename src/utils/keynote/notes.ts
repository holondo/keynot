import type { Slide } from '@/types/slides'
import { type IWAObjectRecord, concatBytes, encodeProtoBytesField as bytes, encodeProtoVarintField as integer, firstBytes, firstVarint, extractReferenceId, parseIWAObjects, rewriteIWAObjects, upsertProtoField } from './codec.ts'
import { IWA_TYPE, readStorageText } from './document.ts'
import { encodeNativeRecord } from './creation.ts'
import { htmlToNativeText, paragraphSeparatorOf, patchStorageText } from './text.ts'
import { readPackedIds, replacePackedIds } from './references.ts'

export const writeNativeNotes = (slides: Slide[], streams: Map<string, Uint8Array>, objects: Map<number, IWAObjectRecord>) => {
  const metadata = [...objects.values()].find(record => record.type === IWA_TYPE.packageMetadata)
  const template = [...objects.values()].find(record => record.type === IWA_TYPE.storage && firstBytes(record.data, 2))
  if (!metadata || !template) return 0
  let lastId = Math.max(firstVarint(metadata.data, 1) ?? 0, ...objects.keys())
  const patches = new Map<number, Uint8Array>()
  const refs = new Map<number, number[]>()
  const appends = new Map<string, Uint8Array[]>()
  const ref = (id: number) => integer(1, id)
  let written = 0
  for (const slide of slides) {
    const native = objects.get(Number(slide.sourceId))
    if (!native || (slide.remark ?? '') === (slide.sourceSnapshot?.remark ?? '')) continue
    const note = objects.get(extractReferenceId(firstBytes(native.data, 27)) ?? -1)
    const storage = objects.get(extractReferenceId(firstBytes(note?.data, 1)) ?? -1)
    if (storage) {
      const original = readStorageText(storage)
      const text = htmlToNativeText(slide.remark ?? '', paragraphSeparatorOf(original))
      const next = patchStorageText(storage.data, original, text)
      if (!next) continue
      patches.set(storage.id, next)
    }
    else {
      const noteId = ++lastId, storageId = ++lastId
      const text = htmlToNativeText(slide.remark ?? '', '\u2029')
      const next = patchStorageText(template.data, readStorageText(template), text)
      if (!next) continue
      const records = appends.get(native.sourceIwaPath) ?? []
      records.push(encodeNativeRecord(storageId, IWA_TYPE.storage, upsertProtoField(next, 1, 4), template, readPackedIds(template.messageInfo!, 5)))
      records.push(encodeNativeRecord(noteId, IWA_TYPE.note, bytes(1, ref(storageId)), native, [storageId]))
      appends.set(native.sourceIwaPath, records)
      patches.set(native.id, upsertProtoField(native.data, 27, ref(noteId)))
      refs.set(native.id, [...readPackedIds(native.messageInfo!, 5), noteId])
      for (const record of objects.values()) if (record.type === IWA_TYPE.slideNode && extractReferenceId(firstBytes(record.data, 2)) === native.id) patches.set(record.id, upsertProtoField(record.data, 8, 1))
    }
    slide.sourceSnapshot!.remark = slide.remark ?? ''
    written++
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
