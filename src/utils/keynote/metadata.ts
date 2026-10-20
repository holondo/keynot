import { type IWAObjectRecord, concatBytes, encodeProtoBytesField as bytes, encodeProtoVarintField as integer, firstVarint, rebuildMessage, rewriteIWAObjects, scanProtoFields } from './codec.ts'
import { IWA_TYPE } from './document.ts'
import { collectNativeReferences } from './objects.ts'
import { NATIVE_TYPE_NAMES } from './schema.ts'
import { readPackedIds } from './references.ts'

/** Register new objects and their cross-component dependencies in PackageMetadata. */
export const reconcileNativeMetadata = (streams: Map<string, Uint8Array>, objects: Map<number, IWAObjectRecord>, originalIds: Set<number>) => {
  const metadata = [...objects.values()].find(record => record.type === IWA_TYPE.packageMetadata)
  if (!metadata) return false
  let changed = false
  const componentByPath = new Map<string, number>()
  for (const field of scanProtoFields(metadata.data)) {
    if (field.fieldNumber === 3 && field.bytes) {
      const id = firstVarint(field.bytes, 1)!
      const record = objects.get(id)
      if (record) componentByPath.set(record.sourceIwaPath, id)
    }
  }
  const payload = rebuildMessage(metadata.data, field => {
    if (field.fieldNumber !== 3 || !field.bytes) return undefined
    const root = firstVarint(field.bytes, 1)!
    const path = objects.get(root)?.sourceIwaPath
    if (!path) return undefined
    const knownUUIDs = new Set<number>()
    const knownRefs = new Set<string>()
    const knownData = new Set<string>()
    for (const item of scanProtoFields(field.bytes)) {
      if (item.fieldNumber === 11 && item.bytes) knownUUIDs.add(firstVarint(item.bytes, 1)!)
      if (item.fieldNumber === 6 && item.bytes) knownRefs.add(`${firstVarint(item.bytes, 1)}:${firstVarint(item.bytes, 2) ?? ''}`)
      if (item.fieldNumber === 7 && item.bytes) {
        const dataId = firstVarint(item.bytes, 1)
        for (const usage of scanProtoFields(item.bytes)) if (usage.fieldNumber === 2 && usage.bytes) knownData.add(`${dataId}:${firstVarint(usage.bytes, 1)}`)
      }
    }
    const append: Uint8Array[] = []
    for (const record of objects.values()) {
      if (record.sourceIwaPath !== path) continue
      if (!originalIds.has(record.id) && !knownUUIDs.has(record.id)) {
        const random = crypto.getRandomValues(new Uint32Array(2))
        append.push(bytes(11, concatBytes([integer(1, record.id), bytes(2, concatBytes([integer(1, random[0]), integer(2, random[1])]))])))
        knownUUIDs.add(record.id)
      }
      const type = NATIVE_TYPE_NAMES[record.type]
      for (const dataId of readPackedIds(record.messageInfo ?? new Uint8Array(), 6)) {
        if (knownData.has(`${dataId}:${record.id}`)) continue
        append.push(bytes(7, concatBytes([integer(1, dataId), bytes(2, concatBytes([integer(1, record.id), integer(2, 1)]))])))
        knownData.add(`${dataId}:${record.id}`)
      }
      const refs = [...readPackedIds(record.messageInfo ?? new Uint8Array(), 5), ...(type ? collectNativeReferences(record.data, type) : [])]
      for (const id of refs) {
        const target = objects.get(id)
        const component = target ? componentByPath.get(target.sourceIwaPath) : undefined
        if (component === undefined || component === root || knownRefs.has(`${component}:${id}`)) continue
        append.push(bytes(6, concatBytes([integer(1, component), integer(2, id)])))
        knownRefs.add(`${component}:${id}`)
      }
    }
    if (!append.length) return undefined
    changed = true
    return bytes(3, concatBytes([field.bytes, ...append]))
  })
  if (changed) {
    const stream = streams.get(metadata.sourceIwaPath)!
    streams.set(metadata.sourceIwaPath, rewriteIWAObjects(stream, (id, type) => id === metadata.id && type === metadata.type ? payload : null).bytes)
  }
  return changed
}
