import JSZip from 'jszip'
import { canonicalTransitionEffect } from '../../configs/transitions.ts'
import { createNativeBuilds } from './creation.ts'
import { writeNativeStructure } from './structure.ts'
import { writeNativeObjects, writeNativeObjectLists, nativePoint } from './objects.ts'
import { writeNativeTextStyles } from './styling.ts'
import { reconcileNativeMetadata } from './metadata.ts'
import { writeNativeImages } from './media.ts'
import { writeNativeAppearance } from './appearance.ts'
import { writeNativeNotes } from './notes.ts'
import { patchNativeChart, chartFingerprint } from './charts.ts'
import { readPackedIds, replacePackedIds } from './references.ts'
import { nativeExtensionState } from './capabilities.ts'
import { writeNativeGroups } from './groups.ts'
import type {
  KeynoteElementSnapshot,
  KeynoteSlideSnapshot,
  PPTElement,
  PPTTableElement,
  PPTShapeElement,
  PPTTextElement,
  Slide,
} from '@/types/slides'
import {
  type IWAObjectRecord,
  compressIWAStream,
  decompressIWAStream,
  extractReferenceId,
  encodeProtoVarintField,
  firstBytes,
  normalizeAndValidateArchivePath,
  parseIWAObjects,
  rewriteIWAObjects,
  scanProtoFields,
  writeFloat32Field,
  upsertProtoField,
} from './codec.ts'
import {
  DRAWABLE_SUPER_DEPTH,
  IWA_TYPE,
  createNativeIndex,
  findGeometryBytes,
  readSlideTree,
} from './document.ts'
import {
  buildNativeTableRecordPatches,
} from './tables.ts'
import {
  htmlToNativeText,
  paragraphSeparatorOf,
  patchStorageText,
  visibleNativeText,
} from './text.ts'
import {
  patchSlideTransition,
  planSlideBuilds,
  reorderSlideBuildLists,
  invalidateSlideNodeBuildCache,
  animationAsBuild,
} from './motion.ts'
import {
  BRIDGE_FORMAT,
  BRIDGE_PATH,
  KEYNOT_VIEWPORT_SIZE,
  digestNativeEntries,
} from './bridge.ts'

// --- Export ------------------------------------------------------------------

export const base64ToUint8 = (base64: string): Uint8Array => {
  const bin = atob(base64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i)
  }
  return out
}

export const dataUrlToBytes = (value: string): Uint8Array | null => {
  const match = value.match(/^data:[^;,]+;base64,(.+)$/)
  return match ? base64ToUint8(match[1]) : null
}

export const GEOMETRY_EPSILON = 0.01

export const sameNumber = (a: number, b: number) => Math.abs(a - b) <= GEOMETRY_EPSILON

export const geometryChanged = (element: PPTElement, snapshot: KeynoteElementSnapshot) =>
  !('height' in element)
  || !sameNumber(element.left, snapshot.left)
  || !sameNumber(element.top, snapshot.top)
  || !sameNumber(element.width, snapshot.width)
  || !sameNumber(element.height, snapshot.height)
  || !sameNumber(element.rotate, snapshot.rotate)

/**
 * Write only the geometry components that changed, in place. Untouched values
 * (for example the zero size of an auto-sizing text box) keep their native bytes.
 */
export const writeGeometry = (geometryBytes: Uint8Array, element: PPTElement, snapshot: KeynoteElementSnapshot, inverseScale: number): boolean => {
  const fields = scanProtoFields(geometryBytes)
  const position = fields.find(field => field.fieldNumber === 1 && field.bytes)?.bytes
  const size = fields.find(field => field.fieldNumber === 2 && field.bytes)?.bytes
  if (!position || !size || !('height' in element)) return false
  const writes: (() => boolean)[] = []
  if (!sameNumber(element.left, snapshot.left)) writes.push(() => writeFloat32Field(position, 1, element.left * inverseScale))
  if (!sameNumber(element.top, snapshot.top)) writes.push(() => writeFloat32Field(position, 2, element.top * inverseScale))
  if (!sameNumber(element.width, snapshot.width)) writes.push(() => writeFloat32Field(size, 1, element.width * inverseScale))
  if (!sameNumber(element.height, snapshot.height)) writes.push(() => writeFloat32Field(size, 2, element.height * inverseScale))
  if (!sameNumber(element.rotate, snapshot.rotate)) {
    const angleField = fields.find(field => field.fieldNumber === 4 && field.wireType === 5)
    if (!angleField) return false
    writes.push(() => {
      new DataView(geometryBytes.buffer, geometryBytes.byteOffset + angleField.valueOffset, 4).setFloat32(0, element.rotate, true)
      return true
    })
  }
  return writes.every(write => write())
}

export interface KeynoteExportEntry {
  slideIndex?: number
  objectId?: string
  feature: string
  message: string
}

export interface KeynoteExportReport {
  /** Edits written into native Keynote records. */
  written: KeynoteExportEntry[]
  /** Edits that exist only in KeyNot (kept in the bridge metadata). */
  keynotOnly: KeynoteExportEntry[]
}

export interface KeynoteExportResult {
  blob: Blob
  report: KeynoteExportReport
}

export interface ExportPlan {
  slides: Map<number, { slide: Slide; slideIndex: number }>
  elements: Map<number, { element: PPTElement; slideIndex: number }>
  storages: Map<number, { element: PPTTextElement | PPTShapeElement; content: string; slideIndex: number }>
}

/**
 * Each native record is owned by the first slide/element that carries its id.
 * Copies (duplicated slides, pasted objects) are KeyNot-only.
 */
export const planExport = (slides: Slide[], report: KeynoteExportReport): ExportPlan => {
  const plan: ExportPlan = { slides: new Map(), elements: new Map(), storages: new Map() }
  slides.forEach((slide, position) => {
    const slideIndex = position + 1
    const slideId = Number(slide.sourceId)
    if (slide.sourceId && Number.isSafeInteger(slideId) && !plan.slides.has(slideId)) {
      plan.slides.set(slideId, { slide, slideIndex })
    }
    else {
      report.keynotOnly.push({ slideIndex, feature: 'Slide', message: 'This slide was added or duplicated in KeyNot; it is kept in the KeyNot bridge metadata only.' })
    }
    for (const element of slide.elements) {
      // Template objects belong to the master slide, which export never rewrites.
      if (element.sourceType === 'IWA:master') continue
      const sourceId = Number(element.sourceId)
      if (!element.sourceId || !element.sourceSnapshot || !Number.isSafeInteger(sourceId) || plan.elements.has(sourceId)) {
        report.keynotOnly.push({ slideIndex, objectId: element.id, feature: element.type, message: 'This object was created in KeyNot; it is kept in the KeyNot bridge metadata only.' })
        continue
      }
      plan.elements.set(sourceId, { element, slideIndex })
      if (element.type === 'text' && element.sourceTextStorageId) {
        plan.storages.set(Number(element.sourceTextStorageId), { element, content: element.content, slideIndex })
      }
      if (element.type === 'shape' && element.sourceTextStorageId && element.text) {
        plan.storages.set(Number(element.sourceTextStorageId), { element, content: element.text.content, slideIndex })
      }
    }
  })
  return plan
}

export const tableCellsChanged = (element: PPTTableElement, cells: string[][]) =>
  element.data.length !== cells.length
  || element.data.some((row, rowIndex) => row.length !== cells[rowIndex].length || row.some((cell, columnIndex) => (cell.text ?? '') !== cells[rowIndex][columnIndex]))

/**
 * Export a `.key` archive.
 *
 * With a source document, native content stays intact except edited records and
 * their reference/cache bookkeeping. New decks start from a native theme.
 * Everything that exists only in KeyNot is stored in
 * `Metadata/slate-model.json`, tagged with a digest of the native records it
 * belongs to. A private project container is a separate, explicit legacy API.
 */
export const buildKeynoteArchive = async (
  slides: Slide[],
  title: string,
  rawArchiveBase64?: string | null,
  viewportSize = KEYNOT_VIEWPORT_SIZE,
  viewportRatio?: number,
): Promise<KeynoteExportResult> => {
  const report: KeynoteExportReport = { written: [], keynotOnly: [] }

  if (!rawArchiveBase64) {
    const { buildNativeKeynoteArchive } = await import('./nativeExport.ts')
    return buildNativeKeynoteArchive(slides, title, null, viewportSize, undefined, viewportRatio)
  }

  const zip = await JSZip.loadAsync(base64ToUint8(rawArchiveBase64))
  slides = JSON.parse(JSON.stringify(slides)) as Slide[]
  for (const slide of slides) if (slide.transition) slide.transition.effect = canonicalTransitionEffect(slide.transition.effect)
  let iwaPaths = Object.keys(zip.files).filter(path => !zip.files[path].dir && path.toLowerCase().endsWith('.iwa'))
  const streams = new Map<string, Uint8Array>()
  const nativeObjects = new Map<number, IWAObjectRecord>()
  for (const path of iwaPaths) {
    const decompressed = decompressIWAStream(new Uint8Array(await zip.files[path].async('arraybuffer')))
    streams.set(path, decompressed)
    // The first message of an archive is its primary record; later ones share the id.
    for (const record of parseIWAObjects(decompressed, path)) if (!nativeObjects.has(record.id)) nativeObjects.set(record.id, record)
  }
  let resizedShow = false
  if (viewportRatio !== undefined && Number.isFinite(viewportRatio) && viewportRatio > 0) {
    const index = createNativeIndex(nativeObjects)
    const size = readSlideTree(index).size
    const show = index.firstOfType(IWA_TYPE.show)
    if (size && show && Math.abs(size.height / size.width - viewportRatio) > 0.000001) {
      const payload = upsertProtoField(show.data, 4, nativePoint(size.width, size.width * viewportRatio))
      const next = rewriteIWAObjects(streams.get(show.sourceIwaPath)!, (id, type) => id === show.id && type === show.type ? payload : null)
      streams.set(show.sourceIwaPath, next.bytes)
      nativeObjects.set(show.id, { ...show, data: payload })
      resizedShow = true
      report.written.push({ feature: 'Slide size', message: 'Wrote the presentation aspect ratio into the native show.' })
    }
  }
  const originalIds = new Set(nativeObjects.keys())
  const structure = writeNativeStructure(slides, streams, nativeObjects)
  if (structure.changed) report.written.push({ feature: 'Slides', message: `Wrote native slide order and skip flags; created ${structure.created} slides.` })
  iwaPaths = [...streams.keys()]
  const createdObjects = writeNativeObjects(slides, streams, nativeObjects, viewportSize)
  if (createdObjects) report.written.push({ feature: 'Objects', message: `Created ${createdObjects} native Keynote objects.` })
  const images = await writeNativeImages(slides, streams, nativeObjects, zip, viewportSize)
  if (images) report.written.push({ feature: 'Image', message: `Wrote ${images} native images with independent asset references.` })
  const appearance = writeNativeAppearance(slides, streams, nativeObjects, viewportSize)
  if (appearance) report.written.push({ feature: 'Appearance', message: `Wrote ${appearance} native object styles and slide backgrounds.` })
  const notes = writeNativeNotes(slides, streams, nativeObjects)
  if (notes) report.written.push({ feature: 'Presenter notes', message: `Wrote ${notes} native presenter notes.` })
  const styledText = writeNativeTextStyles(slides, streams, nativeObjects, viewportSize)
  if (styledText) report.written.push({ feature: 'Text', message: `Wrote ${styledText} native rich-text storages and their character and paragraph styles.` })
  const groups = writeNativeGroups(slides, streams, nativeObjects, viewportSize)
  if (groups) report.written.push({ feature: 'Groups', message: `Wrote native grouping and ungrouping on ${groups} slides.` })
  const createdBuilds = createNativeBuilds(slides, streams, nativeObjects)
  if (createdBuilds) report.written.push({ feature: 'Builds', message: `Created ${createdBuilds} native Keynote builds.` })
  const objectLists = writeNativeObjectLists(slides, streams, nativeObjects)
  if (objectLists) report.written.push({ feature: 'Object order', message: 'Wrote native object stacking order and removals.' })
  if (structure.changed || createdObjects || createdBuilds || styledText || images || appearance || notes || groups) reconcileNativeMetadata(streams, nativeObjects, originalIds)
  const index = createNativeIndex(nativeObjects)
  const showSize = readSlideTree(index).size ?? { width: 1920, height: 1080 }
  const inverseScale = showSize.width / viewportSize

  const plan = planExport(slides, report)
  for (const [, { element, slideIndex }] of plan.elements) {
    const extensions = nativeExtensionState(element)
    for (const feature of new Set([...Object.keys(extensions), ...Object.keys(element.sourceSnapshot?.extensions ?? {})])) {
      const state = extensions[feature]
      if (state === element.sourceSnapshot?.extensions?.[feature]) continue
      report.keynotOnly.push({ slideIndex, objectId: element.sourceId, feature, message: 'These settings are retained in KeyNot metadata; the native Keynote settings are preserved.' })
    }
    if ((element.type === 'text' || (element.type === 'shape' && element.text)) && !element.sourceTextStorageId) {
      report.keynotOnly.push({ slideIndex, objectId: element.sourceId, feature: 'Text', message: 'This object has no writable native text storage; text is kept in KeyNot metadata.' })
    }
  }
  // Snapshots describe the native records; after a write they must match the new values.
  const refreshedElements = new Map<string, KeynoteElementSnapshot>()
  const refreshedSlides = new Map<string, KeynoteSlideSnapshot>()
  const refreshElement = (element: PPTElement, patch: Partial<KeynoteElementSnapshot>) => {
    refreshedElements.set(element.id, { ...(refreshedElements.get(element.id) ?? element.sourceSnapshot!), ...patch })
  }
  const tablePatches = buildNativeTableRecordPatches(
    Array.from(plan.elements.values())
      .map(({ element }) => element)
      .filter((element): element is PPTTableElement => element.type === 'table' && !!element.sourceSnapshot?.cells && tableCellsChanged(element, element.sourceSnapshot.cells)),
    nativeObjects
  )
  for (const [, { element, slideIndex }] of plan.elements) {
    if (element.type === 'table' && element.sourceSnapshot?.cells && tableCellsChanged(element, element.sourceSnapshot.cells)) {
      report.written.push({ slideIndex, objectId: element.sourceId, feature: 'Table cells', message: 'Edited cell values were written into the Keynote table.' })
      const original = element.sourceSnapshot.cells
      if (element.data.length !== original.length || element.data.some((row, index) => row.length !== original[index]?.length)) {
        report.keynotOnly.push({ slideIndex, objectId: element.sourceId, feature: 'Table dimensions', message: 'Added or removed rows and columns are kept in KeyNot; native table dimensions are preserved.' })
      }
      refreshElement(element, { cells: original.map((row, index) => row.map((_cell, column) => element.data[index]?.[column]?.text ?? '')) })
    }
  }

  const buildRecords = new Map<number, (payload: Uint8Array) => Uint8Array>()
  const buildTargets = new Map<number, number>()
  const buildPlans = new Map<number, NonNullable<ReturnType<typeof planSlideBuilds>>>()
  for (const [id, { slide, slideIndex }] of plan.slides) {
    const builds = planSlideBuilds(slide)
    for (const animation of slide.animations ?? []) {
      const target = slide.elements.find(element => element.id === animation.elId)
      if (animation.sourceBuildId && target?.sourceId) buildTargets.set(Number(animation.sourceBuildId), Number(target.sourceId))
      if (animation.sourceBuildId && !animation.keynoteEffect) report.keynotOnly.push({ slideIndex, feature: 'Build effect', message: 'This player effect has no native Keynote mapping; the original native effect is kept.' })
      if (!animation.sourceBuildId) report.keynotOnly.push({ slideIndex, feature: 'Build', message: `This effect or target cannot yet be written natively (${animation.keynoteEffect ?? animation.effect}); it is kept in KeyNot.` })
    }
    if (!builds) continue
    buildPlans.set(id, builds)
    for (const [recordId, patch] of builds.records) buildRecords.set(recordId, patch)
    refreshedSlides.set(slide.id, {
      ...slide.sourceSnapshot!,
      builds: (slide.animations ?? []).flatMap(animation => {
        const snapshot = slide.sourceSnapshot?.builds?.find(build => build.buildId === animation.sourceBuildId)
        return snapshot ? [animation.keynoteEffect ? { ...snapshot, ...animationAsBuild(animation) } : snapshot] : []
      }),
    })
    report.written.push({ slideIndex, feature: 'Builds', message: `Updated ${builds.edited} native builds and removed ${builds.removed}; native playback order was preserved or updated.` })
  }

  for (const [path, decompressed] of streams) {
    const patched = rewriteIWAObjects(decompressed, (id, type, payload) => {
      const buildPatch = buildRecords.get(id)
      if (buildPatch && type !== IWA_TYPE.build && type === nativeObjects.get(id)?.type) return buildPatch(payload)
      if (type === IWA_TYPE.build) {
        let next = buildPatch ? buildPatch(payload) : payload
        const target = buildTargets.get(id)
        if (target !== undefined && extractReferenceId(firstBytes(next, 1)) !== target) {
          next = upsertProtoField(next, 1, encodeProtoVarintField(1, target))
          report.written.push({ feature: 'Build target', message: 'Updated the native build to target its copied object.' })
        }
        if (next !== payload) return next
      }
      if (type === IWA_TYPE.slideNode) {
        const slideId = extractReferenceId(firstBytes(payload, 2))
        const builds = slideId === null ? undefined : buildPlans.get(slideId)
        if (builds) {
          const slide = plan.slides.get(slideId!)!.slide
          return invalidateSlideNodeBuildCache(payload, (builds.buildOrder ?? slide.sourceSnapshot?.builds ?? []).length > 0)
        }
      }
      const tablePatch = tablePatches.get(id)
      if (tablePatch && type === nativeObjects.get(id)?.type) return tablePatch

      const slideEntry = plan.slides.get(id)
      if (slideEntry && type === IWA_TYPE.slide) {
        const next = patchSlideTransition(payload, slideEntry.slide)
        const builds = buildPlans.get(id)
        const nextPayload = builds ? reorderSlideBuildLists(next?.payload ?? payload, builds) : next?.payload
        if (!next) return nextPayload ?? null
        report.written.push({ slideIndex: slideEntry.slideIndex, feature: 'Transition', message: 'The edited slide transition was written into the Keynote slide.' })
        refreshedSlides.set(slideEntry.slide.id, { ...(refreshedSlides.get(slideEntry.slide.id) ?? slideEntry.slide.sourceSnapshot!), ...next.snapshot })
        return nextPayload!
      }

      const storageEntry = plan.storages.get(id)
      if (storageEntry && (type === IWA_TYPE.storage || type === IWA_TYPE.storageAlt)) {
        const { element, content, slideIndex } = storageEntry
        const oldText = element.sourceSnapshot?.text
        if (oldText === undefined) return null
        const newText = htmlToNativeText(content, paragraphSeparatorOf(oldText))
        if (newText === visibleNativeText(oldText)) return null
        const next = patchStorageText(payload, oldText, newText)
        if (next) {
          report.written.push({ slideIndex, objectId: element.sourceId, feature: 'Text', message: 'Edited text was written into the Keynote text storage; paragraph styles were kept.' })
          refreshElement(element, { text: newText })
        }
        else report.keynotOnly.push({ slideIndex, objectId: element.sourceId, feature: 'Text', message: 'This text anchors inline objects or fields Keynote must lay out itself; the edit is kept in KeyNot only.' })
        return next
      }

      const elementEntry = plan.elements.get(id)
      if (elementEntry && DRAWABLE_SUPER_DEPTH[type] !== undefined) {
        const { element, slideIndex } = elementEntry
        let chartPatch: Uint8Array | null = null
        if (element.type === 'chart') {
          chartPatch = patchNativeChart(payload, element)
          if (chartPatch) {
            report.written.push({ slideIndex, objectId: element.sourceId, feature: 'Chart data', message: 'Wrote native chart labels, series, values and chart type.' })
            refreshElement(element, { chart: chartFingerprint(element) })
            payload = chartPatch
          }
        }
        if (!element.sourceSnapshot || !geometryChanged(element, element.sourceSnapshot)) return chartPatch
        const next = payload.slice()
        const geometryBytes = findGeometryBytes({ id, type, data: next, sourceIwaPath: path }, next)
        if (geometryBytes && writeGeometry(geometryBytes, element, element.sourceSnapshot, inverseScale)) {
          report.written.push({ slideIndex, objectId: element.sourceId, feature: 'Position and size', message: 'Edited position, size and rotation were written into the Keynote object.' })
          if ('height' in element) {
            refreshElement(element, { left: element.left, top: element.top, width: element.width, height: element.height, rotate: element.rotate })
          }
          return next
        }
        report.keynotOnly.push({ slideIndex, objectId: element.sourceId, feature: 'Position and size', message: 'The Keynote object has no editable geometry record; the change is kept in KeyNot only.' })
      }
      return null
    }, (id, type, info) => {
      const target = type === IWA_TYPE.build ? buildTargets.get(id) : undefined
      if (target === undefined || extractReferenceId(firstBytes(nativeObjects.get(id)?.data, 1)) === target) return info
      return replacePackedIds(info, 5, [...new Set([...readPackedIds(info, 5), target])])
    })
    if (patched.changed > 0 || createdBuilds || structure.changed || createdObjects || styledText || objectLists || images || appearance || notes || resizedShow || groups) zip.file(path, compressIWAStream(patched.bytes))
  }

  for (const [, { element, slideIndex }] of plan.elements) {
    if (element.type !== 'image' || !element.sourceAssetPath) continue
    const replacement = dataUrlToBytes(element.src)
    const archivePath = Object.keys(zip.files).find(path => path === element.sourceAssetPath || path.endsWith(`/${element.sourceAssetPath}`))
    if (!replacement || !archivePath) continue
    const current = await zip.files[archivePath].async('uint8array')
    if (current.length === replacement.length && current.every((byte, position) => byte === replacement[position])) continue
    zip.file(archivePath, replacement)
    report.written.push({ slideIndex, objectId: element.sourceId, feature: 'Image', message: 'The replaced image was written into the Keynote package.' })
  }

  const nativeEntries: [string, Uint8Array][] = []
  for (const path of iwaPaths) {
    const canonical = normalizeAndValidateArchivePath(path)
    const parts = canonical.split('/')
    const key = parts.length > 1 && parts[1] === 'Index' ? parts.slice(1).join('/') : canonical
    nativeEntries.push([key, await zip.files[path].async('uint8array')])
  }
  const packagePrefix = iwaPaths[0]?.includes('/Index/') ? `${iwaPaths[0].split('/Index/')[0]}/` : ''
  for (const [path, entry] of Object.entries(zip.files)) {
    if (!entry.dir && path.startsWith(`${packagePrefix}Data/`)) nativeEntries.push([path.slice(packagePrefix.length), await entry.async('uint8array')])
  }
  const bridgePath = Object.keys(zip.files).find(path => path.endsWith(BRIDGE_PATH))
    ?? (iwaPaths[0]?.includes('/Index/') ? `${iwaPaths[0].split('/Index/')[0]}/${BRIDGE_PATH}` : BRIDGE_PATH)
  zip.file(bridgePath, JSON.stringify({
    format: BRIDGE_FORMAT,
    version: 4,
    title,
    exportedAt: new Date().toISOString(),
    nativeDigest: await digestNativeEntries(nativeEntries),
    slides: slides.map(slide => ({
      ...slide,
      ...(refreshedSlides.has(slide.id) ? { sourceSnapshot: refreshedSlides.get(slide.id) } : {}),
      elements: slide.elements.map(element => refreshedElements.has(element.id)
        ? { ...element, sourceSnapshot: refreshedElements.get(element.id) }
        : element),
    })),
  }, null, 2))

  return { blob: await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), report }
}

/** Legacy KeyNot-only containers are explicitly named and never used by native export. */
export const buildKeynotProjectContainer = async (slides: Slide[], title: string): Promise<KeynoteExportResult> => {
  const zip = new JSZip()
  zip.file(BRIDGE_PATH, JSON.stringify({ format: BRIDGE_FORMAT, version: 3, title, slides }))
  return {
    blob: await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }),
    report: { written: [], keynotOnly: [{ feature: 'Presentation', message: 'Legacy KeyNot project container; this is not a native Apple Keynote presentation.' }] },
  }
}

/** @deprecated Use `buildKeynoteArchive`, which also returns what was written natively. */
export const buildKeynoteArchiveBlob = async (
  slides: Slide[],
  title: string,
  rawArchiveBase64?: string | null,
  viewportSize = KEYNOT_VIEWPORT_SIZE
): Promise<Blob> => (await buildKeynoteArchive(slides, title, rawArchiveBase64, viewportSize)).blob
