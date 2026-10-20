import {
  type IWAObjectRecord,
  extractReferenceId,
  firstBytes,
  firstString,
  firstVarint,
  readFloat32LE,
  repeatedReferences,
  scanProtoFields,
  utf8Decoder,
} from './codec.ts'

// ---------------------------------------------------------------------------
// Native schema
//
// Type ids and field numbers follow the Keynote 14.5 protobuf definitions
// published by keynote-parser (registry.json + KNArchives/TSDArchives/
// TSWPArchives/TSPArchiveMessages). Effect identifiers follow the Keynote
// 15.2.1 catalog extracted by KeynoteKit (0BSD).
// ---------------------------------------------------------------------------

export const IWA_TYPE = {
  document: 1,
  show: 2,
  slideNode: 4,
  slide: 5,
  templateSlide: 6,
  placeholder: 7,
  build: 8,
  note: 15,
  buildChunk: 153,
  storage: 2001,
  storageAlt: 2005,
  shapeInfo: 2011,
  shape: 3004,
  image: 3005,
  movie: 3007,
  group: 3008,
  chart: 5021,
  table: 6000,
  packageMetadata: 11006,
} as const

/** Number of `super = 1` hops from a drawable record to its TSD.DrawableArchive. */
export const DRAWABLE_SUPER_DEPTH: Record<number, number> = {
  [IWA_TYPE.placeholder]: 3, // KN.Placeholder -> TSWP.ShapeInfo -> TSD.Shape -> TSD.Drawable
  [IWA_TYPE.shapeInfo]: 2, // TSWP.ShapeInfo -> TSD.Shape -> TSD.Drawable
  [IWA_TYPE.shape]: 1,
  [IWA_TYPE.image]: 1,
  [IWA_TYPE.movie]: 1,
  [IWA_TYPE.group]: 1,
  [IWA_TYPE.chart]: 1,
  [IWA_TYPE.table]: 1,
}

export interface ParsedGeometry {
  x: number
  y: number
  width: number
  height: number
  angle: number
}

/**
 * Extract TSD.GeometryArchive (position Point {1:x, 2:y}, size Size {1:w, 2:h}, angle float {4}).
 */
export const parseGeometryArchive = (bytes: Uint8Array | undefined, allowEmptySize = false): ParsedGeometry | null => {
  if (!bytes) return null
  const fields = scanProtoFields(bytes)
  let x = 0
  let y = 0
  let width = 0
  let height = 0
  let angle = 0
  let hasSize = false

  for (const f of fields) {
    if (f.fieldNumber === 1 && f.bytes) {
      const ptFields = scanProtoFields(f.bytes)
      for (const pf of ptFields) {
        if (pf.fieldNumber === 1 && pf.fixed32 !== undefined) x = readFloat32LE(pf.fixed32)
        if (pf.fieldNumber === 2 && pf.fixed32 !== undefined) y = readFloat32LE(pf.fixed32)
      }
    }
    else if (f.fieldNumber === 2 && f.bytes) {
      const szFields = scanProtoFields(f.bytes)
      for (const sf of szFields) {
        if (sf.fieldNumber === 1 && sf.fixed32 !== undefined) {
          width = readFloat32LE(sf.fixed32)
          hasSize = true
        }
        if (sf.fieldNumber === 2 && sf.fixed32 !== undefined) {
          height = readFloat32LE(sf.fixed32)
          hasSize = true
        }
      }
    }
    else if (f.fieldNumber === 4 && f.fixed32 !== undefined) {
      angle = readFloat32LE(f.fixed32)
    }
  }

  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  if (!allowEmptySize && (!hasSize || width <= 0 || height <= 0)) return null
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    width,
    height,
    angle: Number.isFinite(angle) ? angle : 0,
  }
}

/** Index every object in the package, keyed by identifier. */
export interface NativeIndex {
  objects: Map<number, IWAObjectRecord>
  firstOfType: (type: number) => IWAObjectRecord | undefined
}

export const createNativeIndex = (objects: Map<number, IWAObjectRecord>): NativeIndex => ({
  objects,
  firstOfType: type => {
    for (const record of objects.values()) if (record.type === type) return record
    return undefined
  },
})

export interface NativeSlideEntry {
  slide: IWAObjectRecord
  skipped: boolean
  depth: number
}

/**
 * Presentation order from KN.DocumentArchive.show -> KN.ShowArchive.slideTree.slides
 * -> KN.SlideNodeArchive (children nested depth-first). Template slides (masters)
 * are never part of this tree.
 */
export const readSlideTree = (index: NativeIndex): { entries: NativeSlideEntry[]; size: { width: number; height: number } | null } => {
  const document = index.firstOfType(IWA_TYPE.document)
  const showId = extractReferenceId(firstBytes(document?.data, 2))
  const show = showId !== null ? index.objects.get(showId) : undefined
  if (!show || show.type !== IWA_TYPE.show) return { entries: [], size: null }

  const sizeBytes = firstBytes(show.data, 4)
  let size: { width: number; height: number } | null = null
  if (sizeBytes) {
    const fields = scanProtoFields(sizeBytes)
    const width = fields.find(field => field.fieldNumber === 1)?.fixed32
    const height = fields.find(field => field.fieldNumber === 2)?.fixed32
    if (width !== undefined && height !== undefined) {
      const w = readFloat32LE(width)
      const h = readFloat32LE(height)
      if (w > 0 && h > 0 && Number.isFinite(w) && Number.isFinite(h)) size = { width: w, height: h }
    }
  }

  const entries: NativeSlideEntry[] = []
  const visited = new Set<number>()
  const visit = (nodeIds: number[], depth: number) => {
    for (const nodeId of nodeIds) {
      if (visited.has(nodeId)) continue
      visited.add(nodeId)
      const node = index.objects.get(nodeId)
      if (!node || node.type !== IWA_TYPE.slideNode) continue
      const slideId = extractReferenceId(firstBytes(node.data, 2))
      const slide = slideId !== null ? index.objects.get(slideId) : undefined
      if (slide && slide.type === IWA_TYPE.slide) {
        entries.push({ slide, skipped: firstVarint(node.data, 4) === 1, depth })
      }
      visit(repeatedReferences(node.data, 1), depth + 1)
    }
  }
  visit(repeatedReferences(firstBytes(show.data, 3), 2), 0)
  return { entries, size }
}

/** Locate the TSD.DrawableArchive inside a drawable record by following `super` fields. */
export const findDrawableArchive = (record: IWAObjectRecord, payload: Uint8Array = record.data): Uint8Array | null => {
  const depth = DRAWABLE_SUPER_DEPTH[record.type]
  if (depth === undefined) return null
  let message: Uint8Array | undefined = payload
  for (let level = 0; level < depth && message; level++) message = firstBytes(message, 1)
  return message ?? null
}

export const findGeometryBytes = (record: IWAObjectRecord, payload: Uint8Array = record.data): Uint8Array | null => {
  const drawable = findDrawableArchive(record, payload)
  return drawable ? firstBytes(drawable, 1) ?? null : null
}

/** TSWP.ShapeInfoArchive for placeholders and text shapes. */
export const findShapeInfo = (record: IWAObjectRecord): Uint8Array | null => {
  if (record.type === IWA_TYPE.placeholder) return firstBytes(record.data, 1) ?? null
  if (record.type === IWA_TYPE.shapeInfo) return record.data
  return null
}

export const findTextStorageId = (record: IWAObjectRecord): number | null => {
  const shapeInfo = findShapeInfo(record)
  if (!shapeInfo) return null
  // owned_storage (4), then the deprecated storage reference (2).
  return extractReferenceId(firstBytes(shapeInfo, 4)) ?? extractReferenceId(firstBytes(shapeInfo, 2))
}

/** TSWP.StorageArchive.text is `repeated string`; the pieces form one string. */
export const readStorageText = (storage: IWAObjectRecord): string =>
  scanProtoFields(storage.data)
    .filter(field => field.fieldNumber === 3 && field.bytes)
    .map(field => utf8Decoder.decode(field.bytes))
    .join('')

// --- Package assets ----------------------------------------------------------

/** Map TSP.DataReference identifiers to package paths via TSP.PackageMetadata.datas. */
export const readDataFileNames = (index: NativeIndex): Map<number, string> => {
  const names = new Map<number, string>()
  const metadata = index.firstOfType(IWA_TYPE.packageMetadata)
  if (!metadata) return names
  for (const field of scanProtoFields(metadata.data)) {
    if (field.fieldNumber !== 4 || !field.bytes) continue
    const id = firstVarint(field.bytes, 1)
    const fileName = firstString(field.bytes, 4) || firstString(field.bytes, 3)
    if (id !== undefined && fileName) names.set(id, `Data/${fileName}`)
  }
  return names
}

export const IMAGE_MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

export const imageMimeType = (path: string): string | undefined => IMAGE_MIME_TYPES[path.split('.').pop()?.toLowerCase() ?? '']
