import type JSZip from 'jszip'
import type { Slide } from '@/types/slides'
import {
  type IWAObjectRecord, concatBytes, encodeProtoBytesField as bytes, encodeProtoVarintField as integer,
  firstVarint, firstBytes, parseIWAObjects, rebuildMessage, rewriteIWAObjects, upsertProtoField,
} from './codec.ts'
import { IWA_TYPE, createNativeIndex, readSlideTree } from './document.ts'
import { nativeGeometry, nativePoint } from './objects.ts'
import { encodeNativeRecord } from './creation.ts'
import { readPackedIds, replacePackedIds } from './references.ts'

const ref = (field: number, id: number) => bytes(field, integer(1, id))
const string = (field: number, value: string) => bytes(field, new TextEncoder().encode(value))

/** Each replacement gets its own asset reference, so other images never change. */
export const writeNativeImages = async (slides: Slide[], streams: Map<string, Uint8Array>, objects: Map<number, IWAObjectRecord>, zip: JSZip, viewportSize: number) => {
  const metadata = [...objects.values()].find(record => record.type === IWA_TYPE.packageMetadata)
  const mediaStyle = [...objects.values()].find(record => record.type === 3016)
  if (!metadata || !mediaStyle) return 0
  let lastId = Math.max(firstVarint(metadata.data, 1) ?? 0, ...objects.keys())
  const scale = (readSlideTree(createNativeIndex(objects)).size?.width ?? 1920) / viewportSize
  const patches = new Map<number, Uint8Array>()
  const headers = new Map<number, { objects?: number[]; data?: number[] }>()
  const appends = new Map<string, Uint8Array[]>()
  const newData: Uint8Array[] = []
  const digests: Uint8Array[] = []
  const prefix = metadata.sourceIwaPath.includes('/Index/') ? metadata.sourceIwaPath.split('/Index/')[0] + '/' : ''
  let written = 0
  for (const slide of slides) {
    const native = objects.get(Number(slide.sourceId))
    if (!native) continue
    for (const image of slide.elements) {
      if (image.type !== 'image' || image.sourceType === 'IWA:master') continue
      const match = image.src.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,([\s\S]+)$/i)
      if (!match) continue
      const binary = atob(match[2])
      const data = Uint8Array.from(binary, char => char.charCodeAt(0))
      const original = image.sourceAssetPath ? zip.file(`${prefix}${image.sourceAssetPath}`) : null
      const existingBytes = original ? await original.async('uint8array') : undefined
      if (existingBytes && existingBytes.length === data.length && existingBytes.every((byte, index) => byte === data[index])) continue
      const dataId = ++lastId
      const extension = match[1] === 'jpg' ? 'jpeg' : match[1].toLowerCase()
      const name = `keynot-${dataId}.${extension}`
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', data))
      digests.push(digest)
      newData.push(bytes(4, concatBytes([integer(1, dataId), bytes(2, digest), string(3, name), string(4, name), integer(18, data.length)])))
      zip.file(`${prefix}Data/${name}`, data)
      const existing = objects.get(Number(image.sourceId))
      const id = existing?.id ?? ++lastId
      let payload: Uint8Array
      if (existing?.type === IWA_TYPE.image) {
        payload = rebuildMessage(existing.data, field => [11, 12, 13, 15, 16, 17, 23].includes(field.fieldNumber) ? null : undefined,
          [ref(11, dataId), ref(12, dataId)])
        patches.set(id, payload)
        headers.set(id, { data: [dataId] })
      }
      else {
        const caption = ++lastId, title = ++lastId
        const records = appends.get(native.sourceIwaPath) ?? []
        const size = nativePoint(image.width * scale, image.height * scale)
        const drawable = concatBytes([bytes(1, nativeGeometry(image, scale)), ref(2, native.id), integer(7, 1), ref(10, title), ref(11, caption)])
        payload = concatBytes([bytes(1, drawable), ref(3, mediaStyle.id), bytes(4, size), bytes(9, size), ref(11, dataId), ref(12, dataId), integer(18, 0)])
        const template = { ...native, messageInfo: concatBytes([native.messageInfo!, integer(6, dataId)]) }
        const standin = { ...native, messageInfo: concatBytes([integer(2, 10), integer(2, 1), integer(2, 0)]) }
        records.push(encodeNativeRecord(caption, 3097, new Uint8Array(), standin), encodeNativeRecord(title, 3097, new Uint8Array(), standin))
        records.push(encodeNativeRecord(id, IWA_TYPE.image, payload, template, [mediaStyle.id, caption, title]))
        appends.set(native.sourceIwaPath, records)
        headers.set(id, { data: [dataId] })
        patches.set(native.id, concatBytes([patches.get(native.id) ?? native.data, ref(7, id), ref(42, id)]))
        headers.set(native.id, { objects: [...readPackedIds(native.messageInfo!, 5), ...(headers.get(native.id)?.objects ?? []), id] })
        image.sourceId = String(id)
        image.sourceType = 'IWA:3005'
        image.sourceSnapshot = { left: image.left, top: image.top, width: image.width, height: image.height, rotate: image.rotate }
        slide.sourceSnapshot!.drawableIds ??= []
        slide.sourceSnapshot!.drawableIds.push(String(id))
      }
      image.sourceAssetPath = `Data/${name}`
      written++
    }
  }
  if (!written) return 0
  patches.set(metadata.id, concatBytes([upsertProtoField(metadata.data, 1, lastId), ...newData]))
  const documentMetadata = [...objects.values()].find(record => record.type === 11011)
  if (documentMetadata) {
    patches.set(documentMetadata.id, upsertProtoField(documentMetadata.data, 3, concatBytes([
      firstBytes(documentMetadata.data, 3) ?? new Uint8Array(),
      ...digests.map(digest => bytes(1, concatBytes([bytes(1, digest), integer(2, 1)]))),
    ])))
  }
  for (const [path, stream] of streams) {
    const rewritten = rewriteIWAObjects(stream, (id, type) => objects.get(id)?.type === type ? patches.get(id) ?? null : null,
      (id, _type, info) => {
        const header = headers.get(id)
        if (header?.objects) info = replacePackedIds(info, 5, [...new Set(header.objects)])
        if (header?.data) info = replacePackedIds(info, 6, header.data)
        return info
      })
    // Appended image headers also declare data references (the record is not in the old stream).
    let data = concatBytes([rewritten.bytes, ...(appends.get(path) ?? [])])
    data = rewriteIWAObjects(data, () => null, (id, _type, info) => headers.get(id)?.data ? replacePackedIds(info, 6, headers.get(id)!.data!) : info).bytes
    streams.set(path, data)
    for (const record of parseIWAObjects(data, path)) if (!objects.has(record.id) || objects.get(record.id)?.type === record.type) objects.set(record.id, record)
  }
  return written
}
