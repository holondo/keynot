/**
 * Apple Keynote (.key) interchange. The implementation lives in `./keynote/`:
 * codec (ZIP/Snappy/protobuf), document (native schema), text, tables, motion,
 * bridge (KeyNot sidecar), importer and exporter.
 */
export {
  compressIWAStream,
  decompressIWAStream,
  normalizeAndValidateArchivePath,
  parseIWAObjects,
  readFloat32LE,
  scanProtoFields,
  snappyDecompressRaw,
} from './keynote/codec.ts'
export type { IWAObjectRecord, ProtoField } from './keynote/codec.ts'
export { htmlToNativeText } from './keynote/text.ts'
export { importKeynoteArchive } from './keynote/importer.ts'
export type { KeynoteImportResult } from './keynote/importer.ts'
export { buildKeynoteArchive, buildKeynoteArchiveBlob, buildKeynotProjectContainer } from './keynote/exporter.ts'
export { buildNativeKeynoteArchive } from './keynote/nativeExport.ts'
export type { KeynoteExportEntry, KeynoteExportReport, KeynoteExportResult } from './keynote/exporter.ts'
