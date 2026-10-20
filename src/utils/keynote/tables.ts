import type {
  PPTTableElement,
} from '@/types/slides'
import {
  type IWAObjectRecord,
  concatBytes,
  encodeProtoBytesField,
  encodeProtoVarintField,
  extractReferenceId,
  replaceProtoField,
  scanProtoFields,
  tryDecodeUtf8String,
  upsertProtoField,
} from './codec.ts'

export interface NativeTableGrid {
  rows: number
  columns: number
  cells: (string | null)[][]
}

export interface NativeTableParts {
  rows: number
  columns: number
  stringTableId: number | null
  tileRefs: { tileId: number; recordId: number | null }[]
}

export const readUInt16LE = (bytes: Uint8Array, offset: number) => bytes[offset] | (bytes[offset + 1] << 8)
export const readUInt32LE = (bytes: Uint8Array, offset: number) => (
  bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)
) >>> 0

export const decodeTableDecimal = (bytes: Uint8Array, offset: number): number => {
  const exponent = ((bytes[offset + 15] & 0x7f) << 7 | bytes[offset + 14] >> 1) - 6176
  let mantissa = bytes[offset + 14] & 1
  for (let index = 13; index >= 0; index--) mantissa = mantissa * 256 + bytes[offset + index]
  return (bytes[offset + 15] & 0x80 ? -1 : 1) * mantissa * 10 ** exponent
}

export const getNativeTableParts = (
  tableArchive: IWAObjectRecord,
  allObjects: ReadonlyMap<number, IWAObjectRecord>
): NativeTableParts | null => {
  const modelId = extractReferenceId(scanProtoFields(tableArchive.data).find(field => field.fieldNumber === 2)?.bytes)
  const model = modelId !== null ? allObjects.get(modelId) : undefined
  if (!model || model.type !== 6001) return null
  const modelFields = scanProtoFields(model.data)
  const rows = modelFields.find(field => field.fieldNumber === 6)?.varint ?? 0
  const columns = modelFields.find(field => field.fieldNumber === 7)?.varint ?? 0
  const store = modelFields.find(field => field.fieldNumber === 4)?.bytes
  if (!store || rows < 1 || columns < 1 || rows > 1000 || columns > 1000) return null
  const storeFields = scanProtoFields(store)
  const stringTableId = extractReferenceId(storeFields.find(field => field.fieldNumber === 4)?.bytes)
  const tileStorage = storeFields.find(field => field.fieldNumber === 3)?.bytes
  const tileRefs = tileStorage
    ? scanProtoFields(tileStorage).filter(field => field.fieldNumber === 1 && field.bytes).map(field => {
      const fields = scanProtoFields(field.bytes!)
      return {
        tileId: fields.find(item => item.fieldNumber === 1)?.varint ?? 0,
        recordId: extractReferenceId(fields.find(item => item.fieldNumber === 2)?.bytes),
      }
    })
    : []
  return { rows, columns, stringTableId, tileRefs }
}

export const decodeNativeTableGrid = (
  tableArchive: IWAObjectRecord,
  allObjects: ReadonlyMap<number, IWAObjectRecord>
): NativeTableGrid | null => {
  const parts = getNativeTableParts(tableArchive, allObjects)
  if (!parts) return null
  const { rows, columns, stringTableId, tileRefs } = parts
  const strings = new Map<number, string>()
  const stringTable = stringTableId !== null ? allObjects.get(stringTableId) : undefined
  if (stringTable?.type === 6005) {
    for (const entry of scanProtoFields(stringTable.data).filter(field => field.fieldNumber === 3 && field.bytes)) {
      const fields = scanProtoFields(entry.bytes!)
      const key = fields.find(field => field.fieldNumber === 1)?.varint
      const value = tryDecodeUtf8String(fields.find(field => field.fieldNumber === 3)?.bytes)
      if (key !== undefined && value !== null) strings.set(key, value)
    }
  }

  const cells: (string | null)[][] = Array.from({ length: rows }, () => new Array(columns).fill(null))
  const fieldSizes: [number, number][] = [
    [0x1, 16], [0x2, 8], [0x4, 8], [0x8, 4], [0x10, 4], [0x20, 4], [0x40, 4],
    [0x80, 4], [0x100, 4], [0x200, 4], [0x400, 4], [0x800, 4], [0x1000, 4],
    [0x2000, 4], [0x4000, 4], [0x8000, 4], [0x10000, 4], [0x20000, 4],
    [0x40000, 4], [0x80000, 4], [0x100000, 4],
  ]
  const fieldOffset = (buffer: Uint8Array, cellOffset: number, wantedFlag: number): number | null => {
    const flags = readUInt32LE(buffer, cellOffset + 8)
    if ((flags & wantedFlag) === 0) return null
    let offset = cellOffset + 12
    for (const [flag, size] of fieldSizes) {
      if (flag === wantedFlag) return offset
      if (flags & flag) offset += size
    }
    return null
  }

  for (const tileRef of tileRefs) {
    const tile = tileRef.recordId !== null ? allObjects.get(tileRef.recordId) : undefined
    if (!tile || tile.type !== 6002) continue
    for (const rowField of scanProtoFields(tile.data).filter(field => field.fieldNumber === 5 && field.bytes)) {
      const rowFields = scanProtoFields(rowField.bytes!)
      const row = tileRef.tileId * 256 + (rowFields.find(field => field.fieldNumber === 1)?.varint ?? 0)
      const buffer = rowFields.find(field => field.fieldNumber === 6)?.bytes
      const offsets = rowFields.find(field => field.fieldNumber === 7)?.bytes
      if (!buffer || !offsets || row >= rows) continue
      for (let column = 0; column < columns && column * 2 + 1 < offsets.length; column++) {
        const cellOffset = readUInt16LE(offsets, column * 2)
        if (cellOffset === 0xffff || cellOffset + 12 > buffer.length || buffer[cellOffset] !== 5) continue
        const type = buffer[cellOffset + 1]
        if (type === 3 || type === 9) {
          const offset = fieldOffset(buffer, cellOffset, 0x8)
          if (offset !== null && offset + 4 <= buffer.length) cells[row][column] = strings.get(readUInt32LE(buffer, offset)) ?? null
        }
        else if (type === 2 || type === 10) {
          const offset = fieldOffset(buffer, cellOffset, 0x1)
          if (offset !== null && offset + 16 <= buffer.length) cells[row][column] = String(decodeTableDecimal(buffer, offset))
        }
        else if (type === 6) {
          const offset = fieldOffset(buffer, cellOffset, 0x2)
          if (offset !== null && offset + 8 <= buffer.length) {
            const value = new DataView(buffer.buffer, buffer.byteOffset + offset, 8).getFloat64(0, true)
            cells[row][column] = value > 0 ? 'TRUE' : 'FALSE'
          }
        }
      }
    }
  }
  return { rows, columns, cells }
}

export const packTableDecimal = (value: number): Uint8Array => {
  const bytes = new Uint8Array(16)
  let text = Math.abs(value).toString()
  let exponent = 0
  const exponentIndex = text.search(/e/i)
  if (exponentIndex >= 0) {
    exponent = Number(text.slice(exponentIndex + 1)) || 0
    text = text.slice(0, exponentIndex)
  }
  const dotIndex = text.indexOf('.')
  if (dotIndex >= 0) {
    exponent -= text.length - dotIndex - 1
    text = text.replace('.', '')
  }
  let mantissa = BigInt(text || '0')
  let index = 0
  while (mantissa > 0n && index < 15) {
    bytes[index++] = Number(mantissa & 0xffn)
    mantissa >>= 8n
  }
  const biased = exponent + 6176
  bytes[14] = (biased & 0x7f) << 1
  bytes[15] = biased >> 7
  if (value < 0) bytes[15] |= 0x80
  return bytes
}

export const buildNativeTableRecordPatches = (
  tables: PPTTableElement[],
  allObjects: ReadonlyMap<number, IWAObjectRecord>
): Map<number, Uint8Array> => {
  const patches = new Map<number, Uint8Array>()
  for (const element of tables) {
    if (element.sourceType !== 'IWA:6000' || !element.sourceId) continue
    const tableArchive = allObjects.get(Number(element.sourceId))
    if (!tableArchive) continue
    const parts = getNativeTableParts(tableArchive, allObjects)
    if (!parts || parts.stringTableId === null) continue
    const stringTable = allObjects.get(parts.stringTableId)
    if (!stringTable || stringTable.type !== 6005) continue

    let stringPayload = stringTable.data.slice()
    const stringKeys = new Map<string, number>()
    for (const entry of scanProtoFields(stringPayload).filter(field => field.fieldNumber === 3 && field.bytes)) {
      const fields = scanProtoFields(entry.bytes!)
      const key = fields.find(field => field.fieldNumber === 1)?.varint
      const value = tryDecodeUtf8String(fields.find(field => field.fieldNumber === 3)?.bytes)
      if (key !== undefined && value !== null) stringKeys.set(value, key)
    }
    let nextStringKey = scanProtoFields(stringPayload).find(field => field.fieldNumber === 2)?.varint ?? 1
    const keyForText = (text: string): number => {
      const existing = stringKeys.get(text)
      if (existing !== undefined) return existing
      const key = nextStringKey++
      stringKeys.set(text, key)
      const entry = concatBytes([
        encodeProtoVarintField(1, key),
        encodeProtoVarintField(2, 1),
        encodeProtoBytesField(3, new TextEncoder().encode(text)),
      ])
      stringPayload = concatBytes([stringPayload, encodeProtoBytesField(3, entry)])
      return key
    }

    for (const tileRef of parts.tileRefs) {
      if (tileRef.recordId === null) continue
      const tile = allObjects.get(tileRef.recordId)
      if (!tile || tile.type !== 6002) continue
      let tilePayload = tile.data.slice()
      const originalRows = scanProtoFields(tilePayload).filter(field => field.fieldNumber === 5 && field.bytes)
      const rowMessages = new Map<number, Uint8Array>()
      for (const rowField of originalRows) {
        const rowIndex = scanProtoFields(rowField.bytes!).find(field => field.fieldNumber === 1)?.varint ?? 0
        rowMessages.set(rowIndex, rowField.bytes!.slice())
      }
      let totalCells = 0
      let populatedRows = 0
      const tileStart = tileRef.tileId * 256
      const tileEnd = Math.min(parts.rows, tileStart + 256)
      for (let absoluteRow = tileStart; absoluteRow < tileEnd; absoluteRow++) {
        const relativeRow = absoluteRow - tileStart
        const sourceRow = element.data[absoluteRow] || []
        const originalRow = rowMessages.get(relativeRow)
        const originalFields = originalRow ? scanProtoFields(originalRow) : []
        const originalBuffer = originalFields.find(field => field.fieldNumber === 6)?.bytes
        const originalOffsets = originalFields.find(field => field.fieldNumber === 7)?.bytes
        const offsetValues = originalOffsets ? Array.from({ length: Math.floor(originalOffsets.length / 2) }, (_, column) => readUInt16LE(originalOffsets, column * 2)).filter(offset => offset !== 0xffff) : []
        const offsets = new Uint8Array(parts.columns * 2)
        offsets.fill(0xff)
        const bufferParts: Uint8Array[] = []
        let bufferLength = 0
        let cellCount = 0
        for (let column = 0; column < parts.columns; column++) {
          const text = sourceRow[column]?.text ?? ''
          const oldOffset = originalOffsets && column * 2 + 1 < originalOffsets.length ? readUInt16LE(originalOffsets, column * 2) : 0xffff
          const originalCell = originalBuffer && oldOffset !== 0xffff && oldOffset < originalBuffer.length
            ? originalBuffer.subarray(oldOffset, Math.min(...offsetValues.filter(offset => offset > oldOffset), originalBuffer.length)) : undefined
          const unchanged = text === (element.sourceSnapshot?.cells?.[absoluteRow]?.[column] ?? '')
          if (!text && !(unchanged && originalCell)) continue
          offsets[column * 2] = bufferLength & 0xff
          offsets[column * 2 + 1] = bufferLength >> 8
          const numeric = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(text) ? Number(text) : NaN
          let cell: Uint8Array
          if (unchanged && originalCell) cell = originalCell
          else if (Number.isFinite(numeric)) {
            cell = concatBytes([
              Uint8Array.from([5, 2, 0, 0, 0, 0, 0, 0]),
              Uint8Array.from([1, 0, 0, 0]),
              packTableDecimal(numeric),
            ])
          }
          else {
            const key = keyForText(text)
            cell = concatBytes([
              Uint8Array.from([5, 3, 0, 0, 0, 0, 0, 0]),
              Uint8Array.from([8, 0, 0, 0]),
              Uint8Array.from([key & 0xff, key >> 8 & 0xff, key >> 16 & 0xff, key >> 24 & 0xff]),
            ])
          }
          bufferParts.push(cell)
          bufferLength += cell.length
          cellCount++
        }
        if (!cellCount && !rowMessages.has(relativeRow)) continue
        let rowPayload = rowMessages.get(relativeRow) ?? encodeProtoVarintField(1, relativeRow)
        rowPayload = upsertProtoField(rowPayload, 2, cellCount)
        rowPayload = upsertProtoField(rowPayload, 5, 5)
        rowPayload = upsertProtoField(rowPayload, 6, concatBytes(bufferParts))
        rowPayload = upsertProtoField(rowPayload, 7, offsets)
        rowMessages.set(relativeRow, rowPayload)
        totalCells += cellCount
        populatedRows++
      }
      for (let index = originalRows.length - 1; index >= 0; index--) {
        const rowIndex = scanProtoFields(originalRows[index].bytes!).find(field => field.fieldNumber === 1)?.varint ?? 0
        tilePayload = replaceProtoField(tilePayload, scanProtoFields(tilePayload).filter(field => field.fieldNumber === 5)[index], rowMessages.get(rowIndex)!)
        rowMessages.delete(rowIndex)
      }
      for (const rowPayload of rowMessages.values()) tilePayload = concatBytes([tilePayload, encodeProtoBytesField(5, rowPayload)])
      tilePayload = upsertProtoField(tilePayload, 1, Math.max(0, parts.columns - 1))
      tilePayload = upsertProtoField(tilePayload, 2, Math.max(0, parts.rows - 1))
      tilePayload = upsertProtoField(tilePayload, 3, totalCells)
      tilePayload = upsertProtoField(tilePayload, 4, populatedRows)
      patches.set(tile.id, tilePayload)
    }
    stringPayload = upsertProtoField(stringPayload, 2, nextStringKey)
    patches.set(stringTable.id, stringPayload)
  }
  return patches
}
