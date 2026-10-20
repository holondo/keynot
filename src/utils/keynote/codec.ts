// Security limits for browser archive parsing (Plan Section 6.5 & 9.2)
export const MAX_ARCHIVE_ENTRIES = 2500
export const MAX_TOTAL_UNCOMPRESSED_BYTES = 180 * 1024 * 1024 // 180 MB
export const MAX_SINGLE_IWA_BYTES = 32 * 1024 * 1024 // 32 MB

/**
 * Normalize ZIP entry paths and reject path traversal (`..`), absolute paths, or null bytes.
 */
export const normalizeAndValidateArchivePath = (rawPath: string): string => {
  if (!rawPath || rawPath.includes('\0')) {
    throw new Error(`Invalid archive entry path: ${rawPath}`)
  }
  const normalized = rawPath.replace(/\\/g, '/').replace(/^\/+/, '')
  const segments = normalized.split('/')
  for (const seg of segments) {
    if (seg === '..') {
      throw new Error(`Unsafe archive path traversal detected: ${rawPath}`)
    }
  }
  return normalized
}

/**
 * Pure TypeScript raw Snappy decompressor & compressor (ported from KeynoteKit 0BSD Snappy.swift).
 * Handles Apple IWA Snappy stream chunks (chunkType 0x00 + 24-bit little-endian length).
 */
export const snappyDecompressRaw = (src: Uint8Array): Uint8Array => {
  let pos = 0

  const readVarint = (): number => {
    let result = 0
    let shift = 0
    while (pos < src.length) {
      const b = src[pos++]
      result |= (b & 0x7f) << shift
      if ((b & 0x80) === 0) return result >>> 0
      shift += 7
      if (shift >= 35) throw new Error('Corrupt Snappy varint preamble')
    }
    throw new Error('Unexpected EOF reading Snappy varint')
  }

  const uncompressedLength = readVarint()
  if (uncompressedLength > MAX_SINGLE_IWA_BYTES) {
    throw new Error(`Snappy uncompressed length exceeds safety cap: ${uncompressedLength}`)
  }

  const out = new Uint8Array(uncompressedLength)
  let outPos = 0

  const copyFromOutput = (offset: number, length: number) => {
    if (offset <= 0 || offset > outPos) {
      throw new Error(`Invalid Snappy back-reference offset ${offset} at outPos ${outPos}`)
    }
    if (outPos + length > out.length) {
      throw new Error('Snappy output buffer overflow')
    }
    let readIdx = outPos - offset
    for (let i = 0; i < length; i++) {
      out[outPos++] = out[readIdx++]
    }
  }

  while (pos < src.length && outPos < uncompressedLength) {
    const tag = src[pos++]
    const tagType = tag & 0x03

    if (tagType === 0x00) {
      // Literal
      const lenMinus1 = tag >>> 2
      let literalLen: number
      if (lenMinus1 < 60) {
        literalLen = lenMinus1 + 1
      }
      else {
        const extraBytes = lenMinus1 - 59
        if (pos + extraBytes > src.length) throw new Error('Truncated Snappy literal length')
        let extra = 0
        for (let i = 0; i < extraBytes; i++) {
          extra |= src[pos++] << (i * 8)
        }
        literalLen = (extra >>> 0) + 1
      }
      if (pos + literalLen > src.length || outPos + literalLen > out.length) {
        throw new Error('Snappy literal out of bounds')
      }
      out.set(src.subarray(pos, pos + literalLen), outPos)
      pos += literalLen
      outPos += literalLen
    }
    else if (tagType === 0x01) {
      // Copy with 1-byte offset: length = ((tag >> 2) & 0x7) + 4, offset = ((tag & 0xe0) << 3) | nextByte
      if (pos >= src.length) throw new Error('Truncated Snappy 1-byte copy')
      const length = ((tag >>> 2) & 0x07) + 4
      const offset = ((tag & 0xe0) << 3) | src[pos++]
      copyFromOutput(offset, length)
    }
    else if (tagType === 0x02) {
      // Copy with 2-byte little-endian offset: length = (tag >> 2) + 1
      if (pos + 2 > src.length) throw new Error('Truncated Snappy 2-byte copy')
      const length = (tag >>> 2) + 1
      const offset = src[pos] | (src[pos + 1] << 8)
      pos += 2
      copyFromOutput(offset, length)
    }
    else {
      // Copy with 4-byte little-endian offset: length = (tag >> 2) + 1
      if (pos + 4 > src.length) throw new Error('Truncated Snappy 4-byte copy')
      const length = (tag >>> 2) + 1
      const offset =
        (src[pos] |
          (src[pos + 1] << 8) |
          (src[pos + 2] << 16) |
          (src[pos + 3] << 24)) >>> 0
      pos += 4
      copyFromOutput(offset, length)
    }
  }

  return outPos === out.length ? out : out.subarray(0, outPos)
}

/**
 * Decompress an Apple IWA framed stream (repeated 4-byte chunk headers: [0x00, lenLE24] + Snappy payload).
 */
export const decompressIWAStream = (framed: Uint8Array): Uint8Array => {
  const chunks: Uint8Array[] = []
  let totalLen = 0
  let offset = 0

  while (offset + 4 <= framed.length) {
    const chunkType = framed[offset]
    const chunkLen =
      framed[offset + 1] |
      (framed[offset + 2] << 8) |
      (framed[offset + 3] << 16)
    offset += 4

    if (offset + chunkLen > framed.length) {
      break
    }
    const payload = framed.subarray(offset, offset + chunkLen)
    offset += chunkLen

    if (chunkType === 0x00) {
      const decompressed = snappyDecompressRaw(payload)
      chunks.push(decompressed)
      totalLen += decompressed.length
    }
    else if (chunkType === 0x01) {
      // Uncompressed chunk
      chunks.push(payload)
      totalLen += payload.length
    }
  }

  const combined = new Uint8Array(totalLen)
  let writeOffset = 0
  for (const c of chunks) {
    combined.set(c, writeOffset)
    writeOffset += c.length
  }
  return combined
}

/**
 * Encode raw bytes into a valid IWA Snappy-framed stream (used for source-preserving .key patch export).
 */
export const compressIWAStream = (raw: Uint8Array): Uint8Array => {
  // Encode varint uncompressed length + literal blocks (up to 32KB per Snappy chunk)
  const MAX_CHUNK = 32768
  const framedParts: Uint8Array[] = []

  for (let start = 0; start < raw.length || (raw.length === 0 && start === 0); start += MAX_CHUNK) {
    const slice = raw.subarray(start, Math.min(start + MAX_CHUNK, raw.length))
    const varintBytes: number[] = []
    let v = slice.length
    while (v >= 0x80) {
      varintBytes.push((v & 0x7f) | 0x80)
      v >>>= 7
    }
    varintBytes.push(v)

    const lenMinus1 = Math.max(slice.length - 1, 0)
    const literalHeader: number[] = []
    if (slice.length > 0) {
      if (lenMinus1 < 60) {
        literalHeader.push((lenMinus1 << 2) | 0x00)
      }
      else if (lenMinus1 <= 0xff) {
        literalHeader.push((60 << 2) | 0x00, lenMinus1 & 0xff)
      }
      else {
        literalHeader.push(
          (61 << 2) | 0x00,
          lenMinus1 & 0xff,
          (lenMinus1 >>> 8) & 0xff
        )
      }
    }

    const snappyChunkLen = varintBytes.length + literalHeader.length + slice.length
    const framed = new Uint8Array(4 + snappyChunkLen)
    framed[0] = 0x00
    framed[1] = snappyChunkLen & 0xff
    framed[2] = (snappyChunkLen >>> 8) & 0xff
    framed[3] = (snappyChunkLen >>> 16) & 0xff

    let p = 4
    for (const b of varintBytes) framed[p++] = b
    for (const b of literalHeader) framed[p++] = b
    framed.set(slice, p)
    framedParts.push(framed)

    if (raw.length === 0) break
  }

  const total = framedParts.reduce((acc, part) => acc + part.length, 0)
  const result = new Uint8Array(total)
  let pos = 0
  for (const part of framedParts) {
    result.set(part, pos)
    pos += part.length
  }
  return result
}

export interface ProtoField {
  fieldNumber: number
  wireType: number
  valueOffset: number
  fieldStart: number
  fieldEnd: number
  varint?: number
  fixed32?: number
  fixed64?: bigint
  bytes?: Uint8Array
}

/**
 * Non-allocating Protobuf wire scanner (ported from KeynoteKit 0BSD ProtoScanner.swift).
 */
export const scanProtoFields = (buf: Uint8Array): ProtoField[] => {
  const fields: ProtoField[] = []
  let pos = 0

  const readVarintBig = (): bigint => {
    let result = 0n
    let shift = 0n
    while (pos < buf.length) {
      const b = buf[pos++]
      result |= BigInt(b & 0x7f) << shift
      if ((b & 0x80) === 0) return result
      shift += 7n
      if (shift > 70n) throw new Error('Invalid protobuf varint')
    }
    throw new Error('EOF reading protobuf varint')
  }

  while (pos < buf.length) {
    const fieldStart = pos
    let tag: number
    try {
      tag = Number(readVarintBig())
    }
    catch {
      break
    }
    if (tag === 0) break

    const fieldNumber = tag >>> 3
    const wireType = tag & 0x07
    if (fieldNumber <= 0 || fieldNumber > 500000) break

    if (wireType === 0) {
      try {
        const valueOffset = pos
        const v = Number(readVarintBig())
        fields.push({ fieldNumber, wireType, valueOffset, fieldStart, fieldEnd: pos, varint: v })
      }
      catch {
        break
      }
    }
    else if (wireType === 1) {
      if (pos + 8 > buf.length) break
      const valueOffset = pos
      const view = new DataView(buf.buffer, buf.byteOffset + pos, 8)
      pos += 8
      fields.push({ fieldNumber, wireType, valueOffset, fieldStart, fieldEnd: pos, fixed64: view.getBigUint64(0, true) })
    }
    else if (wireType === 2) {
      let len: number
      try {
        len = Number(readVarintBig())
      }
      catch {
        break
      }
      if (len < 0 || pos + len > buf.length) break
      pos += len
      fields.push({ fieldNumber, wireType, valueOffset: pos - len, fieldStart, fieldEnd: pos, bytes: buf.subarray(pos - len, pos) })
    }
    else if (wireType === 5) {
      if (pos + 4 > buf.length) break
      const valueOffset = pos
      const view = new DataView(buf.buffer, buf.byteOffset + pos, 4)
      pos += 4
      fields.push({ fieldNumber, wireType, valueOffset, fieldStart, fieldEnd: pos, fixed32: view.getUint32(0, true) })
    }
    else {
      break
    }
  }

  return fields
}

export const readFloat32LE = (fixed32: number): number => {
  const buf = new ArrayBuffer(4)
  const view = new DataView(buf)
  view.setUint32(0, fixed32, true)
  return view.getFloat32(0, true)
}

export const readFloat64LE = (fixed64: bigint): number => {
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setBigUint64(0, fixed64, true)
  return view.getFloat64(0, true)
}

export const encodeVarint = (value: number): Uint8Array => {
  const bytes: number[] = []
  // Arithmetic instead of bit operators: object identifiers can exceed 32 bits.
  let remaining = Math.max(0, Math.floor(value))
  while (remaining >= 0x80) {
    bytes.push((remaining % 0x80) | 0x80)
    remaining = Math.floor(remaining / 0x80)
  }
  bytes.push(remaining)
  return Uint8Array.from(bytes)
}

export const concatBytes = (parts: Uint8Array[]): Uint8Array => {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

export const replaceProtoField = (message: Uint8Array, field: ProtoField, value: number | Uint8Array): Uint8Array => {
  const encoded = typeof value === 'number'
    ? concatBytes([encodeVarint((field.fieldNumber << 3) | 0), encodeVarint(value)])
    : concatBytes([encodeVarint((field.fieldNumber << 3) | 2), encodeVarint(value.length), value])
  return concatBytes([message.subarray(0, field.fieldStart), encoded, message.subarray(field.fieldEnd)])
}

export const rewriteIWAObjects = (
  decompressed: Uint8Array,
  rewrite: (id: number, type: number, payload: Uint8Array) => Uint8Array | null,
  rewriteInfo?: (id: number, type: number, info: Uint8Array) => Uint8Array,
  remapId?: (id: number) => number
): { bytes: Uint8Array; changed: number } => {
  const output: Uint8Array[] = []
  let pos = 0
  let changed = 0
  const readVarintAt = (): number | null => {
    let value = 0
    let shift = 0
    while (pos < decompressed.length && shift < 35) {
      const byte = decompressed[pos++]
      value |= (byte & 0x7f) << shift
      if ((byte & 0x80) === 0) return value >>> 0
      shift += 7
    }
    return null
  }

  while (pos < decompressed.length) {
    const archiveLength = readVarintAt()
    if (!archiveLength || pos + archiveLength > decompressed.length) break
    let archiveInfo = decompressed.slice(pos, pos + archiveLength)
    pos += archiveLength
    const archiveFields = scanProtoFields(archiveInfo)
    const id = archiveFields.find(field => field.fieldNumber === 1)?.varint ?? 0
    const infoFields = archiveFields.filter(field => field.fieldNumber === 2 && field.bytes)
    const payloads: Uint8Array[] = []
    const rewrittenInfos: Uint8Array[] = []

    for (const infoField of infoFields) {
      let info = infoField.bytes!.slice()
      const fields = scanProtoFields(info)
      const type = fields.find(field => field.fieldNumber === 1)?.varint ?? 0
      const lengthField = fields.find(field => field.fieldNumber === 3 && field.varint !== undefined)
      const length = lengthField?.varint ?? 0
      if (pos + length > decompressed.length) return { bytes: decompressed, changed: 0 }
      const payload = decompressed.slice(pos, pos + length)
      pos += length
      const replacement = rewrite(id, type, payload)
      const nextPayload = replacement ?? payload
      if (replacement && !lengthField) return { bytes: decompressed, changed: 0 }
      if (replacement && lengthField) {
        info = replaceProtoField(info, lengthField, nextPayload.length)
        changed++
      }
      if (rewriteInfo) info = rewriteInfo(id, type, info)
      payloads.push(nextPayload)
      rewrittenInfos.push(info)
    }

    for (let index = infoFields.length - 1; index >= 0; index--) {
      archiveInfo = replaceProtoField(archiveInfo, scanProtoFields(archiveInfo).filter(field => field.fieldNumber === 2)[index], rewrittenInfos[index])
    }
    if (remapId) archiveInfo = upsertProtoField(archiveInfo, 1, remapId(id))
    output.push(encodeVarint(archiveInfo.length), archiveInfo, ...payloads)
  }
  if (pos < decompressed.length) output.push(decompressed.subarray(pos))
  return { bytes: concatBytes(output), changed }
}

export interface IWAObjectRecord {
  id: number
  type: number
  data: Uint8Array
  sourceIwaPath: string
  messageInfo?: Uint8Array
}

/**
 * Parse decompressed IWA archive stream into TSP.ArchiveInfo + MessageInfo + payload records.
 */
export const parseIWAObjects = (decompressed: Uint8Array, sourceIwaPath: string): IWAObjectRecord[] => {
  const objects: IWAObjectRecord[] = []
  let pos = 0

  const readVarint = (): number | null => {
    let result = 0
    let shift = 0
    while (pos < decompressed.length) {
      const b = decompressed[pos++]
      result |= (b & 0x7f) << shift
      if ((b & 0x80) === 0) return result >>> 0
      shift += 7
      if (shift >= 35) return null
    }
    return null
  }

  while (pos < decompressed.length) {
    const archiveInfoLen = readVarint()
    if (archiveInfoLen === null || archiveInfoLen <= 0 || pos + archiveInfoLen > decompressed.length) {
      break
    }

    const archiveInfoBytes = decompressed.subarray(pos, pos + archiveInfoLen)
    pos += archiveInfoLen

    const archiveFields = scanProtoFields(archiveInfoBytes)
    let identifier = 0
    const messageInfos: { type: number; length: number; bytes: Uint8Array }[] = []

    for (const f of archiveFields) {
      if (f.fieldNumber === 1 && f.varint !== undefined) {
        identifier = f.varint
      }
      else if (f.fieldNumber === 2 && f.bytes) {
        const msgFields = scanProtoFields(f.bytes)
        let msgType = 0
        let msgLen = 0
        for (const mf of msgFields) {
          if (mf.fieldNumber === 1 && mf.varint !== undefined) msgType = mf.varint
          if (mf.fieldNumber === 3 && mf.varint !== undefined) msgLen = mf.varint
        }
        messageInfos.push({ type: msgType, length: msgLen, bytes: f.bytes })
      }
    }

    for (const info of messageInfos) {
      if (pos + info.length > decompressed.length) {
        pos = decompressed.length
        break
      }
      const payload = decompressed.subarray(pos, pos + info.length)
      pos += info.length
      objects.push({
        id: identifier,
        type: info.type,
        data: payload,
        sourceIwaPath,
        messageInfo: info.bytes,
      })
    }
  }

  return objects
}

export const utf8Decoder = new TextDecoder('utf-8', { fatal: false })

export const tryDecodeUtf8String = (bytes: Uint8Array | undefined): string | null => {
  if (!bytes || bytes.length === 0) return null
  const text = utf8Decoder.decode(bytes)
  // Check that it's mostly printable UTF-8 text
  let printable = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 0xfffd)) {
      printable++
    }
  }
  if (printable / Math.max(text.length, 1) < 0.75) return null
  return text.trim()
}

/**
 * Extract TSP.Reference id (field 1 varint inside length-delimited message).
 */
export const extractReferenceId = (bytes: Uint8Array | undefined): number | null => {
  if (!bytes) return null
  const fields = scanProtoFields(bytes)
  const f1 = fields.find(f => f.fieldNumber === 1 && f.varint !== undefined)
  return f1?.varint ?? null
}

export const encodeProtoVarintField = (fieldNumber: number, value: number) => concatBytes([
  encodeVarint((fieldNumber << 3) | 0),
  encodeVarint(value),
])

export const encodeProtoBytesField = (fieldNumber: number, value: Uint8Array) => concatBytes([
  encodeVarint((fieldNumber << 3) | 2),
  encodeVarint(value.length),
  value,
])

export const upsertProtoField = (
  message: Uint8Array,
  fieldNumber: number,
  value: number | Uint8Array
): Uint8Array => {
  const field = scanProtoFields(message).find(item => item.fieldNumber === fieldNumber)
  if (field) return replaceProtoField(message, field, value)
  return concatBytes([
    message,
    typeof value === 'number' ? encodeProtoVarintField(fieldNumber, value) : encodeProtoBytesField(fieldNumber, value),
  ])
}

export const writeFloat32Field = (message: Uint8Array, fieldNumber: number, value: number): boolean => {
  const field = scanProtoFields(message).find(item => item.fieldNumber === fieldNumber && item.wireType === 5)
  if (!field) return false
  new DataView(message.buffer, message.byteOffset + field.valueOffset, 4).setFloat32(0, value, true)
  return true
}

export const firstBytes = (message: Uint8Array | undefined, fieldNumber: number): Uint8Array | undefined =>
  message ? scanProtoFields(message).find(field => field.fieldNumber === fieldNumber && field.bytes)?.bytes : undefined

export const firstVarint = (message: Uint8Array | undefined, fieldNumber: number): number | undefined =>
  message ? scanProtoFields(message).find(field => field.fieldNumber === fieldNumber && field.varint !== undefined)?.varint : undefined

export const firstDouble = (message: Uint8Array | undefined, fieldNumber: number): number | undefined => {
  const field = message ? scanProtoFields(message).find(item => item.fieldNumber === fieldNumber && item.fixed64 !== undefined) : undefined
  return field?.fixed64 !== undefined ? readFloat64LE(field.fixed64) : undefined
}

export const firstString = (message: Uint8Array | undefined, fieldNumber: number): string | undefined => {
  const bytes = firstBytes(message, fieldNumber)
  return bytes ? utf8Decoder.decode(bytes) : undefined
}

export const repeatedReferences = (message: Uint8Array | undefined, fieldNumber: number): number[] => {
  if (!message) return []
  const ids: number[] = []
  for (const field of scanProtoFields(message)) {
    if (field.fieldNumber !== fieldNumber || !field.bytes) continue
    const id = extractReferenceId(field.bytes)
    if (id !== null) ids.push(id)
  }
  return ids
}

export const encodeDoubleField = (fieldNumber: number, value: number): Uint8Array => {
  const encoded = new Uint8Array(8)
  new DataView(encoded.buffer).setFloat64(0, value, true)
  return concatBytes([encodeVarint((fieldNumber << 3) | 1), encoded])
}

/**
 * Rebuild a message field by field. `edit` returns `undefined` to keep a field,
 * `null` to drop it, or the complete encoded replacement (tag included).
 * `append` adds encoded fields at the end.
 */
export const rebuildMessage = (
  message: Uint8Array,
  edit: (field: ProtoField, index: number) => Uint8Array | null | undefined,
  append: Uint8Array[] = []
): Uint8Array => {
  const parts: Uint8Array[] = []
  let cursor = 0
  scanProtoFields(message).forEach((field, index) => {
    const replacement = edit(field, index)
    if (replacement === undefined) return
    parts.push(message.subarray(cursor, field.fieldStart))
    if (replacement) parts.push(replacement)
    cursor = field.fieldEnd
  })
  parts.push(message.subarray(cursor), ...append)
  return concatBytes(parts)
}

export const setDoubleField = (message: Uint8Array, fieldNumber: number, value: number): Uint8Array => {
  let found = false
  const result = rebuildMessage(message, field => {
    if (field.fieldNumber !== fieldNumber) return undefined
    if (found) return null
    found = true
    return encodeDoubleField(fieldNumber, value)
  })
  return found ? result : concatBytes([message, encodeDoubleField(fieldNumber, value)])
}

export const setStringField = (message: Uint8Array, fieldNumber: number, value: string): Uint8Array =>
  upsertProtoField(message, fieldNumber, new TextEncoder().encode(value))
