import { SVGPathData } from 'svg-pathdata'
import tinycolor from 'tinycolor2'
import type { PPTElement, Slide } from '@/types/slides'
import {
  type IWAObjectRecord, concatBytes, encodeProtoBytesField as bytes, encodeProtoVarintField as integer,
  firstBytes, firstVarint, parseIWAObjects, rebuildMessage, repeatedReferences, rewriteIWAObjects, upsertProtoField, setStringField,
} from './codec.ts'
import { IWA_TYPE, createNativeIndex, findDrawableArchive, findTextStorageId, readSlideTree, readStorageText } from './document.ts'
import { encodeNativeRecord } from './creation.ts'
import { htmlToNativeText, patchStorageText } from './text.ts'
import { readPackedIds, replacePackedIds, rewriteReferences, rewriteMessageInfo } from './references.ts'
import { NATIVE_MESSAGE_FIELDS, NATIVE_TYPE_NAMES } from './schema.ts'

const ref = (field: number, id: number) => bytes(field, integer(1, id))
export const nativeFloat = (field: number, value: number) => {
  const data = new Uint8Array(4)
  new DataView(data.buffer).setFloat32(0, value, true)
  return concatBytes([integer(field, 0).slice(0, -1).map((byte, index) => index === 0 ? byte | 5 : byte), data])
}
export const nativePoint = (x: number, y: number) => concatBytes([nativeFloat(1, x), nativeFloat(2, y)])
const point = nativePoint
export const nativeColor = (color: string) => {
  const rgb = tinycolor(color).toRgb()
  return concatBytes([integer(1, 1), nativeFloat(3, rgb.r / 255), nativeFloat(4, rgb.g / 255), nativeFloat(5, rgb.b / 255), nativeFloat(6, rgb.a)])
}

export const nativeGeometry = (element: PPTElement, scale: number) => concatBytes([
  bytes(1, point(element.left * scale, element.top * scale)),
  bytes(2, point(element.width * scale, ('height' in element ? element.height : 0) * scale)),
  integer(3, 3 | ('flipH' in element && element.flipH ? 4 : 0) | ('flipV' in element && element.flipV ? 8 : 0)), nativeFloat(4, 'rotate' in element ? element.rotate : 0),
])

/** SVG is normalized before encoding; text and strings are never wire-scanned. */
export const nativePathSource = (element: PPTElement, scale: number) => {
  const width = element.width * scale
  const height = ('height' in element ? element.height : 0) * scale
  const path = element.type === 'shape' ? element.path : `M0 0 L${width} 0 L${width} ${height} L0 ${height} Z`
  const sx = element.type === 'shape' ? width / element.viewBox[0] : 1
  const sy = element.type === 'shape' ? height / element.viewBox[1] : 1
  const commands = new SVGPathData(path).toAbs().normalizeHVZ().normalizeST().aToC().qtToC().scale(sx, sy).commands
  const elements = commands.map(command => {
    if (command.type === SVGPathData.CLOSE_PATH) return bytes(1, integer(1, 5))
    if (command.type === SVGPathData.MOVE_TO || command.type === SVGPathData.LINE_TO) {
      return bytes(1, concatBytes([
        integer(1, command.type === SVGPathData.MOVE_TO ? 1 : 2), bytes(2, point(command.x, command.y)),
      ]))
    }
    if (command.type === SVGPathData.CURVE_TO) {
      return bytes(1, concatBytes([
        integer(1, 4), bytes(2, point(command.x1, command.y1)), bytes(2, point(command.x2, command.y2)), bytes(2, point(command.x, command.y)),
      ]))
    }
    throw new Error('Unsupported normalized SVG command')
  })
  return bytes(5, concatBytes([bytes(2, point(width, height)), bytes(3, concatBytes(elements))]))
}

export const collectNativeReferences = (payload: Uint8Array, type: string, depth = 0): number[] => {
  if (depth > 80) throw new Error('Native object nesting exceeds the supported depth')
  if (type === 'TSP.Reference') return [firstVarint(payload, 1)!].filter(id => id !== undefined)
  const result: number[] = []
  rebuildMessage(payload, field => {
    const child = NATIVE_MESSAGE_FIELDS[type]?.[field.fieldNumber]
    if (child && field.bytes) result.push(...collectNativeReferences(field.bytes, child, depth + 1))
    return undefined
  })
  return result
}

/** Create basic native objects and clone copied drawables with owned dependencies. */
export const writeNativeObjects = (slides: Slide[], streams: Map<string, Uint8Array>, objects: Map<number, IWAObjectRecord>, viewportSize: number) => {
  const metadata = [...objects.values()].find(record => record.type === IWA_TYPE.packageMetadata)
  if (!metadata) return 0
  let lastId = Math.max(firstVarint(metadata.data, 1) ?? 0, ...objects.keys())
  const scale = (readSlideTree(createNativeIndex(objects)).size?.width ?? 1920) / viewportSize
  const patches = new Map<number, Uint8Array>()
  const appends = new Map<string, Uint8Array[]>()
  const extraRefs = new Map<number, number[]>()
  const baseStyle = [...objects.values()].find(record => record.type === 2025)
  const storageTemplate = [...objects.values()].find(record => record.type === IWA_TYPE.storage && firstBytes(record.data, 2))
  const register = (id: number, type: number, payload: Uint8Array, template: IWAObjectRecord, refs: number[] = [], path = template.sourceIwaPath) => {
    const records = appends.get(path) ?? []
    records.push(encodeNativeRecord(id, type, payload, template, refs))
    appends.set(path, records)
    objects.set(id, { id, type, data: payload, sourceIwaPath: path, messageInfo: template.messageInfo })
  }
  let created = 0
  const claimed = new Set<number>()
  for (const slide of slides) {
    const native = objects.get(Number(slide.sourceId))
    if (!native || native.type !== IWA_TYPE.slide) continue
    for (const element of slide.elements) {
      if (element.sourceType === 'IWA:master') continue
      if (element.sourceId && !claimed.has(Number(element.sourceId))) {
        claimed.add(Number(element.sourceId)); continue
      }
      const source = objects.get(Number(element.sourceCloneId ?? element.sourceId))
      if (source && NATIVE_TYPE_NAMES[source.type]) {
        const dependencies = new Set<number>()
        const visit = (id: number) => {
          const record = objects.get(id)
          if (!record || [1, 2, 4, 5, 6].includes(record.type) || dependencies.has(id) || (id !== source.id && /Style|Theme|CalculationEngine|Document/.test(NATIVE_TYPE_NAMES[record.type] ?? ''))) return
          dependencies.add(id)
          for (const reference of collectNativeReferences(record.data, NATIVE_TYPE_NAMES[record.type])) visit(reference)
        }
        visit(source.id)
        const ids = new Map([...dependencies].map(id => [id, ++lastId]))
        // Parent points to the target slide; theme styles and media data stay shared.
        const parentId = firstVarint(firstBytes(findDrawableArchive(source) ?? undefined, 2), 1)
        if (parentId !== undefined) ids.set(parentId, native.id)
        for (const id of dependencies) {
          const record = objects.get(id)!
          const template = { ...record, messageInfo: rewriteMessageInfo(record.messageInfo!, ids) }
          let clonedPayload = rewriteReferences(record.data, record.type, ids)
          if (record.type === 6001) clonedPayload = setStringField(clonedPayload, 1, crypto.randomUUID())
          register(ids.get(id)!, record.type, clonedPayload, template, readPackedIds(template.messageInfo!, 5), native.sourceIwaPath)
        }
        element.sourceId = String(ids.get(source.id))
        const storageId = findTextStorageId(source)
        if (storageId !== null) element.sourceTextStorageId = String(ids.get(storageId) ?? storageId)
        delete element.sourceCloneId
      }
      else if ((element.type === 'text' || element.type === 'shape') && baseStyle) {
        const id = ++lastId
        const styleId = ++lastId
        const styleProperties = concatBytes([
          bytes(1, bytes(1, nativeColor(element.fill ?? 'transparent'))),
          nativeFloat(3, element.opacity ?? 1),
        ])
        const style = bytes(1, concatBytes([
          bytes(1, concatBytes([ref(3, baseStyle.id), integer(4, 1)])), integer(10, 2), bytes(11, styleProperties),
        ]))
        register(styleId, 2025, style, baseStyle, [baseStyle.id], native.sourceIwaPath)
        const caption = ++lastId, title = ++lastId
        const standin = { ...native, messageInfo: concatBytes([integer(2, 10), integer(2, 1), integer(2, 0)]) }
        register(caption, 3097, new Uint8Array(), standin)
        register(title, 3097, new Uint8Array(), standin)
        const drawable = concatBytes([bytes(1, nativeGeometry(element, scale)), ref(2, native.id), integer(5, element.lock ? 1 : 0), ref(10, title), ref(11, caption)])
        let payload = concatBytes([bytes(1, concatBytes([bytes(1, drawable), ref(2, styleId), bytes(3, nativePathSource(element, scale))])), integer(6, element.type === 'text' ? 1 : 0)])
        const refs = [styleId, caption, title]
        if ((element.type === 'text' || element.text) && storageTemplate) {
          const storageId = ++lastId
          const content = element.type === 'text' ? element.content : element.text!.content
          const text = htmlToNativeText(content, '\u2029')
          const oldText = readStorageText(storageTemplate)
          const storage = patchStorageText(storageTemplate.data, oldText, text)
          if (!storage) continue
          register(storageId, IWA_TYPE.storage, storage, storageTemplate, readPackedIds(storageTemplate.messageInfo!, 5), native.sourceIwaPath)
          payload = concatBytes([payload, ref(2, storageId), ref(4, storageId)])
          refs.push(storageId)
          element.sourceTextStorageId = String(storageId)
          element.sourceSnapshot = { left: element.left, top: element.top, width: element.width, height: element.height, rotate: element.rotate, text }
        }
        register(id, IWA_TYPE.shapeInfo, payload, native, refs)
        element.sourceId = String(id)
        element.sourceType = `IWA:${IWA_TYPE.shapeInfo}`
        element.sourceSnapshot ??= { left: element.left, top: element.top, width: element.width, height: element.height, rotate: element.rotate }
      }
      else continue
      const id = Number(element.sourceId)
      slide.sourceSnapshot!.drawableIds ??= []
      slide.sourceSnapshot!.drawableIds.push(String(id))
      claimed.add(id)
      patches.set(native.id, concatBytes([patches.get(native.id) ?? native.data, ref(7, id), ref(42, id)]))
      extraRefs.set(native.id, [...(extraRefs.get(native.id) ?? []), id])
      created++
    }
  }
  if (!created) return 0
  patches.set(metadata.id, upsertProtoField(metadata.data, 1, lastId))
  for (const [path, stream] of streams) {
    const rewritten = rewriteIWAObjects(stream, (id, type) => objects.get(id)?.type === type ? patches.get(id) ?? null : null,
      (id, _type, info) => extraRefs.has(id) ? replacePackedIds(info, 5, [...readPackedIds(info, 5), ...extraRefs.get(id)!]) : info)
    const data = concatBytes([rewritten.bytes, ...(appends.get(path) ?? [])])
    streams.set(path, data)
    for (const record of parseIWAObjects(data, path)) if (!objects.has(record.id) || objects.get(record.id)?.type === record.type) objects.set(record.id, record)
  }
  return created
}

/** Reorder/delete imported objects while retaining native objects the importer cannot edit. */
export const writeNativeObjectLists = (slides: Slide[], streams: Map<string, Uint8Array>, objects: Map<number, IWAObjectRecord>) => {
  const patches = new Map<number, Uint8Array>()
  for (const slide of slides) {
    const native = objects.get(Number(slide.sourceId))
    const managed = new Set([...(slide.sourceSnapshot?.drawableIds ?? []), ...(slide.sourceSnapshot?.groups ?? [])].map(Number))
    if (!native || !managed.size) continue
    const desired = [...new Set(slide.elements.filter(element => element.sourceType !== 'IWA:master' && element.sourceId).map(element => Number(element.sourceGroup?.id ?? element.sourceId)))]
    const old = repeatedReferences(native.data, 42).length ? repeatedReferences(native.data, 42) : repeatedReferences(native.data, 7)
    const desiredSet = new Set(desired)
    const queue = desired.slice()
    const nextOrder = old.flatMap(id => managed.has(id) ? (queue.length ? [queue.shift()!] : []) : [id]).concat(queue)
    const removedSpecial = [5, 6, 20, 30].some(field => {
      const id = firstBytes(native.data, field)
      const value = id ? firstVarint(id, 1) : undefined
      return value !== undefined && managed.has(value) && !desiredSet.has(value)
    })
    if (old.join() === nextOrder.join() && !removedSpecial) continue
    const payload = rebuildMessage(native.data, field => {
      if (field.fieldNumber === 7 || field.fieldNumber === 42) return null
      if ([5, 6, 20, 30].includes(field.fieldNumber) && field.bytes) {
        const id = firstVarint(field.bytes, 1)
        if (id !== undefined && managed.has(id) && !desiredSet.has(id)) return null
      }
      return undefined
    }, [...nextOrder.map(id => ref(7, id)), ...nextOrder.map(id => ref(42, id))])
    patches.set(native.id, payload)
    slide.sourceSnapshot!.drawableIds = slide.elements.filter(element => element.sourceType !== 'IWA:master' && element.sourceId).map(element => element.sourceId!)
  }
  if (!patches.size) return 0
  for (const [path, stream] of streams) {
    const rewritten = rewriteIWAObjects(stream, (id, type) => type === IWA_TYPE.slide ? patches.get(id) ?? null : null)
    streams.set(path, rewritten.bytes)
    for (const record of parseIWAObjects(rewritten.bytes, path)) if (objects.get(record.id)?.type === record.type) objects.set(record.id, record)
  }
  return patches.size
}
