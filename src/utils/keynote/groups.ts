import type { PPTElement, Slide } from '@/types/slides'
import { type IWAObjectRecord, concatBytes, encodeProtoBytesField as bytes, encodeProtoVarintField as integer, firstBytes, firstVarint, parseIWAObjects, rebuildMessage, repeatedReferences, rewriteIWAObjects, upsertProtoField } from './codec.ts'
import { DRAWABLE_SUPER_DEPTH, IWA_TYPE, createNativeIndex, readSlideTree } from './document.ts'
import { nativeGeometry } from './objects.ts'
import { encodeNativeRecord } from './creation.ts'
import { readPackedIds, replacePackedIds } from './references.ts'

const ref = (field: number, id: number) => bytes(field, integer(1, id))
const drawableEdit = (data: Uint8Array, depth: number, edit: (data: Uint8Array) => Uint8Array): Uint8Array => depth
  ? upsertProtoField(data, 1, drawableEdit(firstBytes(data, 1)!, depth - 1, edit)) : edit(data)

/** Canonicalize edited groups into native groups; untouched groups keep every byte. */
export const writeNativeGroups = (slides: Slide[], streams: Map<string, Uint8Array>, objects: Map<number, IWAObjectRecord>, viewportSize: number) => {
  const metadata = [...objects.values()].find(record => record.type === IWA_TYPE.packageMetadata)
  if (!metadata) return 0
  let lastId = Math.max(firstVarint(metadata.data, 1) ?? 0, ...objects.keys())
  const scale = (readSlideTree(createNativeIndex(objects)).size?.width ?? 1920) / viewportSize
  const patches = new Map<number, Uint8Array>()
  const refs = new Map<number, number[]>()
  const appends = new Map<string, Uint8Array[]>()
  let written = 0
  for (const slide of slides) {
    const native = objects.get(Number(slide.sourceId))
    if (!native) continue
    const elements = slide.elements.filter(element => element.sourceType !== 'IWA:master' && element.sourceId && 'height' in element && 'rotate' in element)
    const grouped = elements.filter(element => element.groupId || element.sourceGroup)
    const currentIds = new Set(elements.map(element => Number(element.sourceId)))
    const nativeGroupIds = new Set((slide.sourceSnapshot?.groups ?? []).map(Number))
    const changed = grouped.some(element => element.groupId !== element.sourceGroup?.uiGroupId || (element.sourceGroup && (
      element.left !== element.sourceSnapshot?.left || element.top !== element.sourceSnapshot?.top || element.width !== element.sourceSnapshot?.width
      || ('height' in element && element.height !== element.sourceSnapshot?.height) || ('rotate' in element && element.rotate !== element.sourceSnapshot?.rotate)
    ))) || [...nativeGroupIds].some(id => repeatedReferences(objects.get(id)?.data, 2).some(child => !nativeGroupIds.has(child) && (slide.sourceSnapshot?.drawableIds ?? []).includes(String(child)) && !currentIds.has(child)))
    if (!changed) continue
    const managed = new Set((slide.sourceSnapshot?.drawableIds ?? []).map(Number))
    const emptyGroups = new Set<number>()
    const retainGroup = (id: number, visited = new Set<number>()): number[] => {
      if (visited.has(id)) return []
      visited.add(id)
      const record = objects.get(id)
      if (!record) return []
      const kept = repeatedReferences(record.data, 2).filter(child => nativeGroupIds.has(child) ? retainGroup(child, visited).length > 0 : !managed.has(child))
      if (!kept.length) emptyGroups.add(id)
      patches.set(id, rebuildMessage(record.data, field => field.fieldNumber === 2 ? null : undefined, kept.map(child => ref(2, child))))
      return kept
    }
    for (const id of nativeGroupIds) retainGroup(id)
    const byGroup = new Map<string, PPTElement[]>()
    for (const element of elements) if (element.groupId) byGroup.set(element.groupId, [...(byGroup.get(element.groupId) ?? []), element])
    const newGroups: number[] = []
    const groupForElement = new Map<string, { id: number; left: number; top: number }>()
    const records = appends.get(native.sourceIwaPath) ?? []
    for (const [uiGroupId, members] of byGroup) {
      const left = Math.min(...members.map(element => element.left)), top = Math.min(...members.map(element => element.top))
      const width = Math.max(...members.map(element => element.left + element.width)) - left
      const height = Math.max(...members.map(element => element.top + ('height' in element ? element.height : 0))) - top
      const caption = ++lastId, title = ++lastId, id = ++lastId
      const standin = { ...native, messageInfo: concatBytes([integer(2, 10), integer(2, 1), integer(2, 0)]) }
      records.push(encodeNativeRecord(caption, 3097, new Uint8Array(), standin), encodeNativeRecord(title, 3097, new Uint8Array(), standin))
      const frame = { id: '', type: 'shape', left, top, width, height, rotate: 0 } as PPTElement
      const drawable = concatBytes([bytes(1, nativeGeometry(frame, scale)), ref(2, native.id), ref(10, title), ref(11, caption)])
      const children = members.map(element => Number(element.sourceId))
      const payload = concatBytes([bytes(1, drawable), ...children.map(child => ref(2, child))])
      records.push(encodeNativeRecord(id, IWA_TYPE.group, payload, native, [caption, title, ...children]))
      for (const element of members) {
        groupForElement.set(element.id, { id, left, top })
        element.sourceGroup = { id: String(id), uiGroupId }
      }
      newGroups.push(id)
    }
    appends.set(native.sourceIwaPath, records)
    for (const element of elements) {
      if (!element.sourceGroup && !groupForElement.has(element.id)) continue
      const record = objects.get(Number(element.sourceId))!
      const depth = DRAWABLE_SUPER_DEPTH[record.type]
      if (depth === undefined) continue
      const group = groupForElement.get(element.id)
      const local = { ...element, left: element.left - (group?.left ?? 0), top: element.top - (group?.top ?? 0) }
      const payload = drawableEdit(record.data, depth, data => upsertProtoField(upsertProtoField(data, 1, nativeGeometry(local, scale)), 2, integer(1, group?.id ?? native.id)))
      patches.set(record.id, payload)
      if (!group) delete element.sourceGroup
      if ('height' in element && 'rotate' in element) element.sourceSnapshot = { ...element.sourceSnapshot!, left: element.left, top: element.top, width: element.width, height: element.height, rotate: element.rotate }
    }
    const originalOrder = repeatedReferences(native.data, 42).length ? repeatedReferences(native.data, 42) : repeatedReferences(native.data, 7)
    const remaining = originalOrder.filter(id => !emptyGroups.has(id) && !managed.has(id))
    const roots = elements.map(element => Number(element.sourceGroup?.id ?? element.sourceId))
    const order = [...new Set([...remaining, ...roots])]
    patches.set(native.id, rebuildMessage(native.data, field => field.fieldNumber === 7 || field.fieldNumber === 42 ? null : undefined,
      [...order.map(id => ref(7, id)), ...order.map(id => ref(42, id))]))
    refs.set(native.id, [...new Set([...readPackedIds(native.messageInfo!, 5), ...order])])
    slide.sourceSnapshot!.groups = [...nativeGroupIds].filter(id => !emptyGroups.has(id)).concat(newGroups).map(String)
    slide.sourceSnapshot!.drawableIds = elements.map(element => element.sourceId!)
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
