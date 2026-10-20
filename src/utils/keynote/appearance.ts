import tinycolor from 'tinycolor2'
import type { Gradient, PPTElementOutline, PPTElementShadow, Slide } from '@/types/slides'
import { type IWAObjectRecord, concatBytes, encodeProtoBytesField as bytes, encodeProtoVarintField as integer, firstBytes, firstVarint, extractReferenceId, parseIWAObjects, rewriteIWAObjects, upsertProtoField, setStringField } from './codec.ts'
import { IWA_TYPE, createNativeIndex, readSlideTree } from './document.ts'
import { nativeColor, nativeFloat, nativePathSource } from './objects.ts'
import { encodeNativeRecord } from './creation.ts'
import { appearanceFingerprint } from './richText.ts'
import { readPackedIds, replacePackedIds } from './references.ts'

const ref = (field: number, id: number) => bytes(field, integer(1, id))
export const nativeFill = (color: string | undefined, gradient?: Gradient) => gradient ? bytes(2, concatBytes([
  integer(1, gradient.type === 'radial' ? 1 : 0),
  ...gradient.colors.map(stop => bytes(2, concatBytes([bytes(1, nativeColor(stop.color)), nativeFloat(2, stop.pos / 100)]))),
  nativeFloat(3, 1), bytes(5, nativeFloat(2, (90 - gradient.rotate) * Math.PI / 180)),
])) : bytes(1, nativeColor(color ?? 'transparent'))

const stroke = (outline: PPTElementOutline | undefined, scale: number) => outline?.width ? concatBytes([
  bytes(1, nativeColor(outline.color ?? '#000000')), nativeFloat(2, outline.width * scale),
  bytes(6, outline.style === 'dashed' || outline.style === 'dotted'
    ? concatBytes([integer(1, 0), integer(3, 2), nativeFloat(4, outline.style === 'dotted' ? 1 : 4), nativeFloat(4, 3)]) : integer(1, 1)),
]) : bytes(6, integer(1, 2))

const shadow = (value: PPTElementShadow | undefined, scale: number) => value ? concatBytes([
  bytes(1, nativeColor(value.color)), nativeFloat(2, Math.atan2(-value.v, value.h) * 180 / Math.PI),
  nativeFloat(3, Math.hypot(value.h, value.v) * scale), integer(4, Math.round(value.blur * scale)),
  nativeFloat(5, tinycolor(value.color).getAlpha()), integer(6, 1),
]) : integer(6, 0)

const nested = (payload: Uint8Array, path: number[], edit: (data: Uint8Array) => Uint8Array): Uint8Array => path.length
  ? upsertProtoField(payload, path[0], nested(firstBytes(payload, path[0]) ?? new Uint8Array(), path.slice(1), edit)) : edit(payload)

/** Independent style variations avoid modifying shared theme or master styles. */
export const writeNativeAppearance = (slides: Slide[], streams: Map<string, Uint8Array>, objects: Map<number, IWAObjectRecord>, viewportSize: number) => {
  const metadata = [...objects.values()].find(record => record.type === IWA_TYPE.packageMetadata)
  if (!metadata) return 0
  const scale = (readSlideTree(createNativeIndex(objects)).size?.width ?? 1920) / viewportSize
  let lastId = Math.max(firstVarint(metadata.data, 1) ?? 0, ...objects.keys())
  const patches = new Map<number, Uint8Array>()
  const extraRefs = new Map<number, number[]>()
  const appends = new Map<string, Uint8Array[]>()
  const createStyle = (base: IWAObjectRecord, type: number, payload: Uint8Array) => {
    const id = ++lastId
    const records = appends.get(base.sourceIwaPath) ?? []
    records.push(encodeNativeRecord(id, type, payload, base, [base.id]))
    appends.set(base.sourceIwaPath, records)
    return id
  }
  let written = 0
  for (const slide of slides) {
    const nativeSlide = objects.get(Number(slide.sourceId))
    if (!nativeSlide) continue
    if (slide.background && slide.background.type !== 'image' && JSON.stringify(slide.background) !== slide.sourceSnapshot?.background) {
      const base = objects.get(extractReferenceId(firstBytes(nativeSlide.data, 1)) ?? -1) ?? [...objects.values()].find(record => record.type === 9)
      if (base) {
        const style = concatBytes([bytes(1, concatBytes([ref(3, base.id), integer(4, 1)])), integer(10, 1), bytes(11, bytes(1, nativeFill(slide.background.color, slide.background.type === 'gradient' ? slide.background.gradient : undefined)))])
        const id = createStyle(base, 9, style)
        patches.set(nativeSlide.id, upsertProtoField(nativeSlide.data, 1, integer(1, id)))
        extraRefs.set(nativeSlide.id, [id])
        slide.sourceSnapshot!.background = JSON.stringify(slide.background)
        written++
      }
    }
    for (const element of slide.elements) {
      const record = objects.get(Number(element.sourceId))
      if (!record || !element.sourceSnapshot || ![IWA_TYPE.placeholder, IWA_TYPE.shapeInfo, IWA_TYPE.shape, IWA_TYPE.image].includes(record.type as 7 | 2011 | 3004 | 3005)) continue
      const fingerprint = appearanceFingerprint(element)
      const resizedShape = element.type === 'shape' && (element.width !== element.sourceSnapshot.width || element.height !== element.sourceSnapshot.height)
      if (fingerprint === element.sourceSnapshot.appearance && !resizedShape) continue
      const image = record.type === IWA_TYPE.image
      const shapePath = record.type === IWA_TYPE.placeholder ? [1, 1] : record.type === IWA_TYPE.shapeInfo ? [1] : []
      let shape = record.data
      for (const field of shapePath) shape = firstBytes(shape, field)!
      const baseId = extractReferenceId(firstBytes(shape, image ? 3 : 2))
      const base = objects.get(baseId ?? -1)
      if (!base) continue
      const styleSuper = bytes(1, concatBytes([ref(3, base.id), integer(4, 1)]))
      const outline = 'outline' in element ? element.outline : undefined
      const opacity = 'opacity' in element ? element.opacity ?? 1 : 1
      const properties = image ? concatBytes([bytes(1, stroke(outline, scale)), nativeFloat(2, opacity), bytes(3, shadow('shadow' in element ? element.shadow : undefined, scale))])
        : concatBytes([bytes(1, nativeFill('fill' in element ? element.fill : undefined, 'gradient' in element ? element.gradient : undefined)), bytes(2, stroke(outline, scale)), nativeFloat(3, opacity), bytes(4, shadow('shadow' in element ? element.shadow : undefined, scale))])
      let style = concatBytes([styleSuper, integer(10, 4), bytes(11, properties)])
      const type = image ? 3016 : base.type
      if (type === 2025) style = bytes(1, style)
      const styleId = createStyle(base, type, style)
      let payload = nested(record.data, shapePath, data => upsertProtoField(data, image ? 3 : 2, integer(1, styleId)))
      if (element.type === 'shape') payload = nested(payload, shapePath, data => upsertProtoField(data, 3, nativePathSource(element, scale)))
      const drawablePath = image ? [1] : [...shapePath, 1]
      payload = nested(payload, drawablePath, data => upsertProtoField(data, 5, element.lock ? 1 : 0))
      payload = nested(payload, drawablePath, data => {
        data = setStringField(data, 8, element.name ?? '')
        return setStringField(data, 4, element.link?.type === 'web' ? element.link.target : '')
      })
      payload = nested(payload, [...drawablePath, 1], data => {
        let flags = firstVarint(data, 3) ?? 3
        if ('flipH' in element) flags = element.flipH ? flags | 4 : flags & ~4
        if ('flipV' in element) flags = element.flipV ? flags | 8 : flags & ~8
        return upsertProtoField(data, 3, flags)
      })
      patches.set(record.id, payload)
      extraRefs.set(record.id, [styleId])
      element.sourceSnapshot.appearance = fingerprint
      written++
    }
  }
  if (!written) return 0
  patches.set(metadata.id, upsertProtoField(metadata.data, 1, lastId))
  for (const [path, stream] of streams) {
    const rewritten = rewriteIWAObjects(stream, (id, type) => objects.get(id)?.type === type ? patches.get(id) ?? null : null,
      (id, _type, info) => extraRefs.has(id) ? replacePackedIds(info, 5, [...new Set([...readPackedIds(info, 5), ...extraRefs.get(id)!])]) : info)
    const data = concatBytes([rewritten.bytes, ...(appends.get(path) ?? [])])
    streams.set(path, data)
    for (const record of parseIWAObjects(data, path)) if (!objects.has(record.id) || objects.get(record.id)?.type === record.type) objects.set(record.id, record)
  }
  return written
}
