import { NATIVE_MESSAGE_FIELDS, NATIVE_TYPE_NAMES } from './schema.ts'
import { encodeProtoBytesField, encodeProtoVarintField, firstVarint, rebuildMessage, scanProtoFields, upsertProtoField } from './codec.ts'

/** Schema-guided rewriting keeps UTF-8 strings, packed arrays and media opaque. */
export const rewriteReferences = (payload: Uint8Array, type: number | string, ids: Map<number, number>, depth = 0): Uint8Array => {
  if (depth > 80) throw new Error('Native reference nesting exceeds the supported depth')
  const name = typeof type === 'number' ? NATIVE_TYPE_NAMES[type] : type
  if (!name) throw new Error(`No native schema for object type ${type}; copying it would risk invalid references`)
  if (name === 'TSP.Reference') {
    const id = firstVarint(payload, 1)
    return id !== undefined && ids.has(id) ? upsertProtoField(payload, 1, ids.get(id)!) : payload
  }
  return rebuildMessage(payload, field => {
    const child = NATIVE_MESSAGE_FIELDS[name]?.[field.fieldNumber]
    return child && field.bytes ? encodeProtoBytesField(field.fieldNumber, rewriteReferences(field.bytes, child, ids, depth + 1)) : undefined
  })
}

export const readPackedIds = (message: Uint8Array, number: number): number[] => {
  const result: number[] = []
  for (const field of scanProtoFields(message).filter(field => field.fieldNumber === number)) {
    if (field.varint !== undefined) result.push(field.varint)
    else if (field.bytes) {
      let value = 0, multiplier = 1
      for (const byte of field.bytes) {
        value += (byte & 127) * multiplier
        if (byte & 128) multiplier *= 128
        else {
          result.push(value); value = 0; multiplier = 1
        }
      }
      if (multiplier !== 1) throw new Error('Truncated packed native reference')
    }
  }
  return result
}

export const replacePackedIds = (message: Uint8Array, number: number, ids: number[]) =>
  rebuildMessage(message, field => field.fieldNumber === number ? null : undefined, ids.map(id => encodeProtoVarintField(number, id)))

export const rewriteMessageInfo = (info: Uint8Array, ids: Map<number, number>): Uint8Array => {
  const rewritten = replacePackedIds(info, 5, readPackedIds(info, 5).map(id => ids.get(id) ?? id))
  return rebuildMessage(rewritten, field => field.fieldNumber === 4 && field.bytes
    ? encodeProtoBytesField(4, replacePackedIds(field.bytes, 4, readPackedIds(field.bytes, 4).map(id => ids.get(id) ?? id))) : undefined)
}
