import type { Slide } from '@/types/slides'
import {
  type IWAObjectRecord, concatBytes, encodeProtoBytesField as bytes, encodeProtoVarintField as integer,
  firstBytes, firstString, firstVarint, extractReferenceId, parseIWAObjects,
  rebuildMessage, scanProtoFields, rewriteIWAObjects, setStringField, upsertProtoField,
} from './codec.ts'
import { IWA_TYPE, createNativeIndex, readSlideTree } from './document.ts'
import { readSlideTransition } from './motion.ts'
import { encodeNativeRecord } from './creation.ts'
import { readPackedIds, replacePackedIds, rewriteMessageInfo, rewriteReferences } from './references.ts'

const ref = (field: number, id: number) => bytes(field, integer(1, id))
const uuid = () => {
  const random = crypto.getRandomValues(new Uint32Array(2))
  return concatBytes([integer(1, random[0]), integer(2, random[1])])
}

/** Bookkeeping in ComponentInfo uses scalar identifiers, not TSP.Reference. */
const cloneComponentInfo = (payload: Uint8Array, ids: Map<number, number>): Uint8Array => rebuildMessage(payload, field => {
  if (field.fieldNumber === 1 && field.varint !== undefined) return ids.has(field.varint) ? integer(field.fieldNumber, ids.get(field.varint)!) : undefined
  if ((field.fieldNumber === 6 || field.fieldNumber === 18) && field.bytes) {
    return bytes(field.fieldNumber, rebuildMessage(field.bytes, item => item.varint !== undefined && [1, 2].includes(item.fieldNumber) && ids.has(item.varint) ? integer(item.fieldNumber, ids.get(item.varint)!) : undefined))
  }
  if (field.fieldNumber === 11 && field.bytes) {
    const old = firstVarint(field.bytes, 1)!
    return ids.has(old) ? bytes(11, upsertProtoField(upsertProtoField(field.bytes, 1, ids.get(old)!), 2, uuid())) : undefined
  }
  if (field.fieldNumber === 7 && field.bytes) {
    return bytes(7, rebuildMessage(field.bytes, item => item.fieldNumber === 2 && item.bytes
      ? bytes(2, rebuildMessage(item.bytes, entry => entry.fieldNumber === 1 && entry.varint !== undefined && ids.has(entry.varint) ? integer(1, ids.get(entry.varint)!) : undefined)) : undefined))
  }
  return undefined
})

/** Persist slide insertion/copy/order/removal and skip flags in the native show. */
export const writeNativeStructure = (slides: Slide[], streams: Map<string, Uint8Array>, objects: Map<number, IWAObjectRecord>) => {
  if (!slides.length) throw new Error('A Keynote presentation must contain at least one slide')
  const original = readSlideTree(createNativeIndex(objects)).entries.map(entry => entry.slide.id)
  const show = [...objects.values()].find(record => record.type === IWA_TYPE.show)
  const metadata = [...objects.values()].find(record => record.type === IWA_TYPE.packageMetadata)
  if (!show || !metadata || !original.length) return { created: 0, changed: false }
  let lastId = Math.max(firstVarint(metadata.data, 1) ?? 0, ...objects.keys())
  let metadataPayload = metadata.data
  const patches = new Map<number, Uint8Array>()
  const added = new Map<string, Uint8Array[]>()
  const used = new Set<number>()
  const nodeBySlide = new Map<number, IWAObjectRecord>()
  for (const record of objects.values()) {
    if (record.type === IWA_TYPE.slideNode) {
      const id = extractReferenceId(firstBytes(record.data, 2))
      if (id !== null) nodeBySlide.set(id, record)
    }
  }
  const order: number[] = []
  let created = 0
  for (const slide of slides) {
    let native = objects.get(Number(slide.sourceId))
    let node = native ? nodeBySlide.get(native.id) : undefined
    if (!native || native.type !== IWA_TYPE.slide || used.has(native.id) || !node) {
      const origin = Number(slide.sourceCloneId ?? slide.sourceId)
      const source = objects.get(origin) ?? objects.get(original[0])!
      const sourceNode = nodeBySlide.get(source.id)!
      const sourceStream = streams.get(source.sourceIwaPath)!
      const ids = new Map<number, number>()
      for (const record of parseIWAObjects(sourceStream, source.sourceIwaPath)) if (!ids.has(record.id)) ids.set(record.id, ++lastId)
      ids.set(sourceNode.id, ++lastId)
      const rootId = ids.get(source.id)!
      const newNodeId = ids.get(sourceNode.id)!
      const prefix = source.sourceIwaPath.slice(0, source.sourceIwaPath.lastIndexOf('/') + 1)
      const path = `${prefix}Slide-${rootId}.iwa`
      const blank = !Number.isFinite(origin)
      const cloned = rewriteIWAObjects(sourceStream, (id, type, payload) => {
        let next = rewriteReferences(payload, type, ids)
        if (id === source.id && type === IWA_TYPE.slide && blank) {
          next = rebuildMessage(next, field => [2, 5, 6, 7, 17, 20, 27, 30, 42, 43].includes(field.fieldNumber) ? null : undefined)
        }
        return next
      }, (_id, _type, info) => rewriteMessageInfo(info, ids), id => ids.get(id) ?? id)
      streams.set(path, cloned.bytes)
      for (const record of parseIWAObjects(cloned.bytes, path)) if (!objects.has(record.id)) objects.set(record.id, record)
      let nodeData = rewriteReferences(sourceNode.data, IWA_TYPE.slideNode, ids)
      nodeData = rebuildMessage(nodeData, field => [1, 3, 10, 16].includes(field.fieldNumber) ? null : undefined)
      nodeData = upsertProtoField(nodeData, 14, 1) // thumbnailsAreDirty
      const nodeTemplate = { ...sourceNode, messageInfo: rewriteMessageInfo(sourceNode.messageInfo!, ids) }
      const records = added.get(sourceNode.sourceIwaPath) ?? []
      records.push(encodeNativeRecord(newNodeId, IWA_TYPE.slideNode, nodeData, nodeTemplate, [rootId]))
      added.set(sourceNode.sourceIwaPath, records)
      node = { id: newNodeId, type: IWA_TYPE.slideNode, data: nodeData, sourceIwaPath: sourceNode.sourceIwaPath }
      objects.set(node.id, node)
      nodeBySlide.set(rootId, node)
      native = objects.get(rootId)!
      slide.sourceId = String(rootId)
      delete slide.sourceCloneId
      if (blank) slide.sourceSnapshot = { transition: readSlideTransition(native), builds: [] }
      else {
        for (const element of slide.elements) {
          const id = Number(element.sourceCloneId ?? element.sourceId)
          if (!ids.has(id)) continue
          element.sourceId = String(ids.get(id))
          delete element.sourceCloneId
          if (element.sourceGroup) element.sourceGroup.id = String(ids.get(Number(element.sourceGroup.id)) ?? element.sourceGroup.id)
          if (element.sourceTextStorageId) element.sourceTextStorageId = String(ids.get(Number(element.sourceTextStorageId)) ?? element.sourceTextStorageId)
        }
        for (const animation of slide.animations ?? []) if (animation.sourceBuildId) animation.sourceBuildId = String(ids.get(Number(animation.sourceBuildId)) ?? animation.sourceBuildId)
        for (const build of slide.sourceSnapshot?.builds ?? []) {
          build.buildId = String(ids.get(Number(build.buildId)) ?? build.buildId)
          build.chunkIds = build.chunkIds.map(id => String(ids.get(Number(id)) ?? id))
        }
        if (slide.sourceSnapshot?.drawableIds) slide.sourceSnapshot.drawableIds = slide.sourceSnapshot.drawableIds.map(id => String(ids.get(Number(id)) ?? id))
        if (slide.sourceSnapshot?.groups) slide.sourceSnapshot.groups = slide.sourceSnapshot.groups.map(id => String(ids.get(Number(id)) ?? id))
      }
      const componentInfo = [...scanComponents(metadataPayload)].find(data => firstVarint(data, 1) === source.id)
      if (!componentInfo) throw new Error(`Native slide ${source.id} has no component metadata`)
      let newInfo = cloneComponentInfo(componentInfo, ids)
      newInfo = setStringField(newInfo, 3, `Slide-${rootId}`)
      metadataPayload = concatBytes([metadataPayload, bytes(3, newInfo)])
      // Mirror the document component's external link and thumbnail usages.
      metadataPayload = rebuildMessage(metadataPayload, field => {
        if (field.fieldNumber !== 3 || !field.bytes || firstString(field.bytes, 2) !== 'Document') return undefined
        const extras: Uint8Array[] = []
        for (const external of fieldsOf(field.bytes, 6)) {
          if (firstVarint(external, 1) === source.id) {
            extras.push(bytes(6, rebuildMessage(external, item => item.varint !== undefined && [1, 2].includes(item.fieldNumber) && ids.has(item.varint) ? integer(item.fieldNumber, ids.get(item.varint)!) : undefined)))
          }
        }
        return bytes(3, concatBytes([field.bytes, ...extras]))
      })
      created++
    }
    used.add(native.id)
    order.push(node.id)
    const skipped = firstVarint(node.data, 4) === 1
    if (skipped !== !!slide.skipped) patches.set(node.id, upsertProtoField(patches.get(node.id) ?? node.data, 4, slide.skipped ? 1 : 0))
  }
  const changed = created > 0 || original.join() !== slides.map(slide => slide.sourceId).join()
  if (changed) {
    let tree = firstBytes(show.data, 3) ?? new Uint8Array()
    tree = rebuildMessage(tree, field => field.fieldNumber === 2 ? null : undefined, order.map(id => ref(2, id)))
    patches.set(show.id, upsertProtoField(show.data, 3, tree))
    // Flatten the edited outline in presentation order; no stale child can reintroduce a removed slide.
    for (const id of order) {
      const node = objects.get(id)!
      patches.set(id, rebuildMessage(patches.get(id) ?? node.data, field => field.fieldNumber === 1 ? null : undefined))
    }
    patches.set(metadata.id, upsertProtoField(metadataPayload, 1, lastId))
  }
  if (!changed && !patches.size) return { created, changed: false }
  for (const [path, stream] of streams) {
    const rewritten = rewriteIWAObjects(stream, (id, type) => objects.get(id)?.type === type ? patches.get(id) ?? null : null,
      (id, _type, info) => id === show.id && changed ? replacePackedIds(info, 5, [...readPackedIds(info, 5).filter(id => ![...nodeBySlide.values()].some(node => node.id === id)), ...order]) : info)
    const data = concatBytes([rewritten.bytes, ...(added.get(path) ?? [])])
    streams.set(path, data)
    for (const record of parseIWAObjects(data, path)) if (!objects.has(record.id) || objects.get(record.id)?.type === record.type) objects.set(record.id, record)
  }
  return { created, changed: true }
}

const fieldsOf = (data: Uint8Array, number: number) => scanProtoFields(data).filter(field => field.fieldNumber === number && field.bytes).map(field => field.bytes!)
const scanComponents = (data: Uint8Array) => fieldsOf(data, 3)
