import JSZip from 'jszip'
import { textFingerprint, appearanceFingerprint } from './richText.ts'
import { readNativeChart, chartFingerprint } from './charts.ts'
import { nativeExtensionState } from './capabilities.ts'
import { groupContext, groupFrameToSlide, type GroupContext } from './groupGeometry.ts'
import type {
  CompatibilityFinding,
  CompatibilityMeasureSummary,
  CompatibilityReport,
  CompatibilitySeverity,
  PPTAnimation,
  PPTChartElement,
  PPTElement,
  PPTImageElement,
  PPTShapeElement,
  PPTTableElement,
  PPTTextElement,
  Slide,
  SlideBackground,
} from '@/types/slides'
import {
  type IWAObjectRecord,
  MAX_ARCHIVE_ENTRIES,
  MAX_TOTAL_UNCOMPRESSED_BYTES,
  decompressIWAStream,
  extractReferenceId,
  firstBytes,
  firstString,
  firstVarint,
  normalizeAndValidateArchivePath,
  parseIWAObjects,
  repeatedReferences,
} from './codec.ts'
import {
  IWA_TYPE,
  createNativeIndex,
  findGeometryBytes,
  findDrawableArchive,
  findShapeInfo,
  findTextStorageId,
  imageMimeType,
  parseGeometryArchive,
  readDataFileNames,
  readSlideTree,
  readStorageText,
} from './document.ts'
import {
  decodeNativeTableGrid,
} from './tables.ts'
import {
  LINE_SEPARATOR,
  OBJECT_REPLACEMENT_CHARACTER,
  escapeHtml,
  nativeStorageToHtml,
  splitParagraphs,
  visibleNativeText,
} from './text.ts'
import {
  buildSnapshotOf,
  readSlideBuilds,
  readSlideTransition,
} from './motion.ts'
import { getBuildDefinition } from '../../configs/builds.ts'
import { getTransitionDefinition } from '../../configs/transitions.ts'
import { createStyleResolver, cssFontFromPostScript, type CharacterStyle } from './styles.ts'
import { createShapeStyleResolver, readShapePath } from './shapes.ts'
import {
  BRIDGE_FORMAT,
  BRIDGE_PATH,
  type BridgePayload,
  KEYNOT_VIEWPORT_SIZE,
  digestNativeEntries,
} from './bridge.ts'

// --- Import ------------------------------------------------------------------

export interface KeynoteImportResult {
  title: string
  slides: Slide[]
  viewportSize: number
  viewportRatio: number
  compatibilityReport: CompatibilityReport
  rawArchiveBase64: string
}

export const uint8ToBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, Array.from(sub))
  }
  return btoa(binary)
}

/** Carry KeyNot-only data (object continuity, element names) onto natively imported slides. */
export const mergeBridgeExtensions = (nativeSlides: Slide[], bridgeSlides: Slide[]): number => {
  const bridgeElements = new Map<string, PPTElement>()
  for (const slide of bridgeSlides) {
    for (const element of slide.elements) if (element.sourceId) bridgeElements.set(element.sourceId, element)
  }
  let merged = 0
  for (const slide of nativeSlides) {
    for (const element of slide.elements) {
      const bridge = element.sourceId ? bridgeElements.get(element.sourceId) : undefined
      if (!bridge) continue
      if (bridge.continuityId) element.continuityId = bridge.continuityId
      if (bridge.name) element.name = bridge.name
      merged++
    }
  }
  return merged
}

/**
 * Parse an Apple Keynote `.key` archive in the browser into editable slides,
 * keeping a snapshot of every native value so export can write back only edits.
 */
export const importKeynoteArchive = async (
  buffer: ArrayBuffer,
  fileName = 'Presentation.key'
): Promise<KeynoteImportResult> => {
  const zip = await JSZip.loadAsync(buffer)
  const entryNames = Object.keys(zip.files)

  if (entryNames.length > MAX_ARCHIVE_ENTRIES) {
    throw new Error(`Archive contains too many entries (${entryNames.length} > ${MAX_ARCHIVE_ENTRIES})`)
  }

  // Strip an optional top-level folder (e.g. "deck/Index/Slide.iwa").
  const normalizedMap = new Map<string, JSZip.JSZipObject>()
  for (const rawName of entryNames) {
    const entry = zip.files[rawName]
    if (entry.dir) continue
    const norm = normalizeAndValidateArchivePath(rawName)
    const parts = norm.split('/')
    const canonical =
      parts.length > 1 && ['Index', 'Data', 'Metadata'].includes(parts[1])
        ? parts.slice(1).join('/')
        : parts.length === 2 && parts[1].startsWith('preview')
          ? parts[1]
          : norm
    normalizedMap.set(canonical, entry)
  }

  // 1. Decompress every Index/*.iwa stream.
  let totalUncompressed = 0
  const allObjects = new Map<number, IWAObjectRecord>()
  const nativeEntries: [string, Uint8Array][] = []
  let iwaFileCount = 0
  const sortedPaths = Array.from(normalizedMap.keys()).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  )
  for (const path of sortedPaths) {
    if (!path.startsWith('Index/') || !path.endsWith('.iwa')) continue
    const framedBytes = await normalizedMap.get(path)!.async('uint8array')
    totalUncompressed += framedBytes.byteLength
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error('Archive exceeds maximum uncompressed size limit')
    }
    nativeEntries.push([path, framedBytes])
    try {
      const decompressed = decompressIWAStream(framedBytes)
      totalUncompressed += decompressed.byteLength
      if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
        throw new Error('Decompressed IWA exceeds memory safety cap')
      }
      iwaFileCount++
      // The first message of an archive is its primary record; later ones share the id.
      for (const record of parseIWAObjects(decompressed, path)) if (!allObjects.has(record.id)) allObjects.set(record.id, record)
    }
    catch (error) {
      if (error instanceof Error && error.message.includes('memory safety cap')) throw error
      // A single corrupt stream is reported through the missing objects below.
    }
  }

  // 2. A KeyNot bridge sidecar is authoritative only while the native records are untouched.
  const findings: CompatibilityFinding[] = []
  let bridge: BridgePayload | null = null
  const bridgeEntry = normalizedMap.get(BRIDGE_PATH)
  if (bridgeEntry) {
    try {
      const parsed = JSON.parse(await bridgeEntry.async('string')) as BridgePayload
      if (parsed?.format === BRIDGE_FORMAT && Array.isArray(parsed.slides) && parsed.slides.length) bridge = parsed
    }
    catch {
      findings.push({ category: 'structure', severity: 'fallback', feature: 'KeyNot bridge metadata', message: 'Ignored unreadable KeyNot bridge metadata; slides were read from the native Keynote records.' })
    }
  }
  const index = createNativeIndex(allObjects)
  const tree = readSlideTree(index)
  const showSize = tree.size ?? { width: 1920, height: 1080 }
  const digestedMedia = new Set<string>()
  if (bridge && bridge.version >= 4) {
    for (const [path, entry] of normalizedMap) {
      if (path.startsWith('Data/') && !entry.dir) {
        const bytes = await entry.async('uint8array')
        totalUncompressed += bytes.length
        if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) throw new Error('Keynote package exceeds the memory safety cap')
        nativeEntries.push([path, bytes])
        digestedMedia.add(path)
      }
    }
  }
  const nativeDigest = await digestNativeEntries(nativeEntries)
  // A container without native records is a KeyNot project (exported from a deck
  // that never came from Keynote); otherwise the digest must match.
  if (bridge && (bridge.nativeDigest === nativeDigest || nativeEntries.length === 0)) {
    return {
      title: bridge.title || fileName.replace(/\.key$/i, '') || 'Keynote Presentation',
      slides: bridge.slides,
      viewportSize: KEYNOT_VIEWPORT_SIZE,
      viewportRatio: showSize.height / showSize.width,
      compatibilityReport: buildCompatibilityReport({
        fileName,
        slideCount: bridge.slides.length,
        iwaFileCount,
        messageCount: allObjects.size,
        mediaAssetCount: sortedPaths.filter(path => path.startsWith('Data/')).length,
        findings: [{
          category: 'roundTrip',
          severity: 'preserved',
          feature: 'KeyNot bridge metadata',
          message: 'The native Keynote records are unchanged since KeyNot exported this file, so KeyNot-only data was restored from the bridge metadata.',
        }],
      }),
      rawArchiveBase64: uint8ToBase64(new Uint8Array(buffer)),
    }
  }

  const scale = KEYNOT_VIEWPORT_SIZE / showSize.width
  const styles = createStyleResolver(index)
  const shapeStyles = createShapeStyleResolver(index)
  if (!tree.size) {
    findings.push({ category: 'structure', severity: 'fallback', feature: 'Slide size', message: 'The show size was not found; assumed 1920 × 1080.' })
  }

  let slideEntries = tree.entries
  if (!slideEntries.length) {
    // Older or unusual packages: every in-document slide archive outside the templates.
    slideEntries = Array.from(allObjects.values())
      .filter(record => record.type === IWA_TYPE.slide && !record.sourceIwaPath.includes('TemplateSlide'))
      .map(slide => ({ slide, skipped: false, depth: 0 }))
    findings.push({ category: 'structure', severity: 'fallback', feature: 'Slide order', message: 'The slide tree was not found; slides are ordered by package file name.' })
  }

  // 3. Package assets.
  const dataFileNames = readDataFileNames(index)
  const assetDataUrls = new Map<string, string>()
  let mediaAssetCount = 0
  const loadImageAsset = async (dataId: number | null): Promise<{ path: string; dataUrl: string } | null> => {
    if (dataId === null) return null
    const path = dataFileNames.get(dataId)
    if (!path) return null
    const cached = assetDataUrls.get(path)
    if (cached) return { path, dataUrl: cached }
    const entry = normalizedMap.get(path)
    const mime = imageMimeType(path)
    if (!entry || !mime) return null
    const bytes = await entry.async('uint8array')
    if (!digestedMedia.has(path)) totalUncompressed += bytes.byteLength
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) return null
    const dataUrl = `data:${mime};base64,${uint8ToBase64(bytes)}`
    assetDataUrls.set(path, dataUrl)
    mediaAssetCount++
    return { path, dataUrl }
  }

  /** KN.SlideStyleArchive fill of the slide, or of its template slide when the slide sets none. */
  const readSlideBackground = async (slide: IWAObjectRecord): Promise<SlideBackground> => {
    let fill = shapeStyles.slideFill(extractReferenceId(firstBytes(slide.data, 1)))
    if (!fill.color && !fill.gradient && fill.imageDataId === undefined) {
      const templateId = extractReferenceId(firstBytes(slide.data, 17))
      const template = templateId !== null ? allObjects.get(templateId) : undefined
      if (template) fill = shapeStyles.slideFill(extractReferenceId(firstBytes(template.data, 1)))
    }
    if (fill.gradient) return { type: 'gradient', color: fill.color, gradient: fill.gradient }
    if (fill.imageDataId !== undefined) {
      const asset = await loadImageAsset(fill.imageDataId)
      // ImageFillArchive technique: 2 tile, 4 scale to fit, otherwise fill.
      if (asset) return { type: 'image', image: { src: asset.dataUrl, size: fill.imageTechnique === 2 ? 'repeat' : fill.imageTechnique === 4 ? 'contain' : 'cover' } }
    }
    return { type: 'solid', color: fill.color ?? 'rgb(255, 255, 255)' }
  }

  const slides: Slide[] = []
  let editableObjects = 0
  let skippedObjects = 0

  // 4. Slides.
  for (let slideIndex = 0; slideIndex < slideEntries.length; slideIndex++) {
    const { slide: slideRecord, skipped } = slideEntries[slideIndex]
    const slideNumber = slideIndex + 1
    const elements: PPTElement[] = []
    const elementIdByDrawable = new Map<number, string>()

    const transition = readSlideTransition(slideRecord)
    if (transition.effect !== 'none') {
      const definition = getTransitionDefinition(transition.effect)
      const known = definition.label['en-US'] !== transition.effect
      findings.push({
        category: 'visual',
        severity: definition.fidelity === 'native' ? 'preserved' : known ? 'approximated' : 'fallback',
        slideIndex: slideNumber,
        feature: `Transition: ${definition.label['en-US']}`,
        message: definition.fidelity === 'native'
          ? `Keynote '${transition.effect}' plays in KeyNot and is written back unchanged.`
          : `Keynote '${transition.effect}' plays as an approximation in KeyNot; the effect itself is kept and written back unchanged.`,
      })
    }

    // Owned drawables in z-order, then any placeholder the z-order does not list.
    const drawableIds: number[] = []
    const addDrawable = (id: number | null) => {
      if (id !== null && !drawableIds.includes(id)) drawableIds.push(id)
    }
    const zOrder = repeatedReferences(slideRecord.data, 42)
    for (const id of zOrder.length ? zOrder : repeatedReferences(slideRecord.data, 7)) addDrawable(id)
    for (const field of [5, 6, 20, 30]) addDrawable(extractReferenceId(firstBytes(slideRecord.data, field)))

    const masterElements: PPTElement[] = []
    const nativeGroups: string[] = []
    const visitedDrawables = new Set<string>()
    /** Import one drawable. Template (master) objects are locked, unnamed natively, and never reported. */
    const importDrawable = async (drawableId: number, master: boolean, context?: GroupContext): Promise<void> => {
      const visitKey = `${master}:${drawableId}`
      if (visitedDrawables.has(visitKey)) return
      visitedDrawables.add(visitKey)
      if ((context?.depth ?? 0) > 32) throw new Error('Keynote group nesting exceeds the supported depth')
      const pushElement = (element: PPTElement) => {
        if (!master) {
          if (context) {
            element.groupId = context.groupId
            element.sourceGroup = { id: context.nativeId, uiGroupId: context.groupId }
          }
          const source = allObjects.get(Number(element.sourceId))
          const drawable = source ? findDrawableArchive(source) : undefined
          if (firstVarint(drawable ?? undefined, 5) === 1) element.lock = true
          const hyperlink = firstString(drawable ?? undefined, 4)
          if (hyperlink) element.link = { type: 'web', target: hyperlink }
          const name = firstString(drawable ?? undefined, 8)
          if (name) element.name = name
          if (element.sourceSnapshot) {
            element.sourceSnapshot.richText = textFingerprint(element)
            element.sourceSnapshot.appearance = appearanceFingerprint(element)
            element.sourceSnapshot.extensions = nativeExtensionState(element)
          }
          elements.push(element)
          return
        }
        delete element.sourceId
        delete element.sourceTextStorageId
        delete element.sourceAssetPath
        delete element.sourceSnapshot
        element.id = `key-master-${slideRecord.id}-${drawableId}`
        element.continuityId = `key-master-${drawableId}`
        element.sourceType = 'IWA:master'
        element.lock = true
        masterElements.push(element)
      }
      const addFinding = (finding: CompatibilityFinding) => {
        if (!master) findings.push(finding)
      }
      const drawable = allObjects.get(drawableId)
      if (!drawable) return
      // Auto-sizing text boxes store a zero size; Keynote lays them out from their text.
      const localGeometry = parseGeometryArchive(findGeometryBytes(drawable) ?? undefined, drawable.type === IWA_TYPE.shapeInfo)
      const geometry = localGeometry ? groupFrameToSlide(localGeometry, context) : null
      const elementId = `key-el-${slideRecord.id}-${drawableId}`
      const frame = geometry
        ? {
          left: geometry.x * scale,
          top: geometry.y * scale,
          width: geometry.width * scale,
          height: geometry.height * scale,
          rotate: geometry.angle,
        }
        : null

      const reportSkipped = (feature: string, message: string, severity: CompatibilitySeverity = 'unsupported') => {
        if (!master) skippedObjects++
        addFinding({ category: 'editability', severity, slideIndex: slideNumber, objectId: String(drawableId), feature, message })
      }

      if (drawable.type === IWA_TYPE.placeholder || drawable.type === IWA_TYPE.shapeInfo || drawable.type === IWA_TYPE.shape) {
        const storageId = findTextStorageId(drawable)
        const storage = storageId !== null ? allObjects.get(storageId) : undefined
        const text = storage && (storage.type === IWA_TYPE.storage || storage.type === IWA_TYPE.storageAlt) ? readStorageText(storage) : null
        const placeholderKind = drawable.type === IWA_TYPE.placeholder ? firstVarint(drawable.data, 2) ?? 0 : null
        const hasText = text !== null && visibleNativeText(text).trim() !== ''
        // An empty placeholder is invisible when presenting; there is nothing to show.
        if (!hasText && drawable.type === IWA_TYPE.placeholder) return
        if (!frame) {
          reportSkipped('Object without geometry', 'The object geometry could not be read, so it was left untouched in the source document.')
          return
        }

        const shapeArchive = drawable.type === IWA_TYPE.shape ? drawable.data : firstBytes(findShapeInfo(drawable) ?? undefined, 1)
        const shapeStyle = shapeStyles.shape(extractReferenceId(firstBytes(shapeArchive, 2)), scale)
        const isTextBox = drawable.type === IWA_TYPE.placeholder || firstVarint(findShapeInfo(drawable) ?? undefined, 6) === 1
        // Text boxes and invisible shapes with text become text objects; drawn shapes keep their text inside.
        const asText = hasText && (isTextBox || shapeStyle.invisible)
        if (!hasText && shapeStyle.invisible) return

        let styled: { html: string; firstStyle: CharacterStyle } | null = null
        if (hasText && text !== null && storage) {
          // Keynote's defaults when the stylesheet sets nothing: title 80 pt, body 44 pt.
          styled = nativeStorageToHtml(storage.data, text, styles, scale, { fontSize: placeholderKind === 2 ? 80 : 44, color: 'rgb(0, 0, 0)' })
          if (text.includes(OBJECT_REPLACEMENT_CHARACTER)) {
            addFinding({ category: 'editability', severity: 'approximated', slideIndex: slideNumber, objectId: String(drawableId), feature: 'Inline objects in text', message: 'This text contains inline objects; position edits are written back, but text edits stay in KeyNot only.' })
          }
          addFinding({ category: 'visual', severity: 'approximated', slideIndex: slideNumber, objectId: String(drawableId), feature: 'Text styles', message: 'Font, size, colour, emphasis and alignment come from the Keynote stylesheet; bullets, spacing and text insets use KeyNot defaults, and fonts missing in the browser are substituted.' })
          if (frame.width <= 0 || frame.height <= 0) {
            const fontSize = (styled.firstStyle.fontSize ?? 44) * scale
            const lines = splitParagraphs(visibleNativeText(text)).flatMap(paragraph => paragraph.split(LINE_SEPARATOR))
            const longest = Math.max(...lines.map(line => line.length))
            frame.width = Math.min(KEYNOT_VIEWPORT_SIZE - frame.left, Math.max(80, longest * fontSize * 0.6))
            frame.height = lines.length * fontSize * 1.2 + 10
            addFinding({ category: 'visual', severity: 'approximated', slideIndex: slideNumber, objectId: String(drawableId), feature: 'Auto-sizing text box', message: 'Keynote sizes this text box from its text; KeyNot estimated the size. The size is only written back if you resize it.' })
          }
        }
        const fontFamily = styled?.firstStyle.fontName ? cssFontFromPostScript(styled.firstStyle.fontName).family : 'Helvetica Neue, sans-serif'
        const fontColor = styled?.firstStyle.color ?? 'rgb(0, 0, 0)'
        const provenance = {
          id: elementId,
          continuityId: `key-${drawableId}`,
          sourceId: String(drawableId),
          sourceType: `IWA:${drawable.type}`,
          ...(styled ? { sourceTextStorageId: String(storageId) } : {}),
          sourceSnapshot: { ...frame, ...(styled && text !== null ? { text } : {}) },
        }

        if (asText && styled && text !== null) {
          const textElement: PPTTextElement = {
            ...provenance,
            name: visibleNativeText(text).slice(0, 28),
            type: 'text',
            ...frame,
            defaultFontName: fontFamily,
            defaultColor: fontColor,
            content: styled.html,
            lineHeight: 1.2,
            ...(shapeStyle.fill ? { fill: shapeStyle.fill } : {}),
            ...(shapeStyle.outline ? { outline: shapeStyle.outline } : {}),
            ...(shapeStyle.opacity !== undefined ? { opacity: shapeStyle.opacity } : {}),
            ...(shapeStyle.shadow ? { shadow: shapeStyle.shadow } : {}),
          }
          pushElement(textElement)
        }
        else {
          if (frame.width <= 0 || frame.height <= 0) return
          const geometry = readShapePath(firstBytes(shapeArchive, 3), [frame.width / scale, frame.height / scale])
          const shapeElement: PPTShapeElement = {
            ...provenance,
            name: styled && text !== null ? visibleNativeText(text).slice(0, 28) : `Keynote Shape ${drawableId}`,
            type: 'shape',
            ...frame,
            viewBox: geometry.viewBox,
            path: geometry.path,
            fixedRatio: false,
            fill: geometry.isLine ? 'transparent' : shapeStyle.fill ?? 'transparent',
            ...(shapeStyle.gradient && !geometry.isLine ? { gradient: shapeStyle.gradient } : {}),
            ...(shapeStyle.outline ? { outline: shapeStyle.outline } : {}),
            ...(shapeStyle.opacity !== undefined ? { opacity: shapeStyle.opacity } : {}),
            ...(shapeStyle.shadow ? { shadow: shapeStyle.shadow } : {}),
            ...(geometry.flipH ? { flipH: true } : {}),
            ...(geometry.flipV ? { flipV: true } : {}),
            ...(styled ? { text: { content: styled.html, defaultFontName: fontFamily, defaultColor: fontColor, align: 'middle' as const } } : {}),
          }
          pushElement(shapeElement)
          if (geometry.approximated || shapeStyle.hasLineEnds) {
            addFinding({ category: 'visual', severity: 'approximated', slideIndex: slideNumber, objectId: String(drawableId), feature: 'Shape geometry', message: shapeStyle.hasLineEnds ? 'Arrowheads and line ends are not drawn yet.' : 'This shape kind (arrow, star, callout or connection line) is drawn as a close approximation.' })
          }
        }
        elementIdByDrawable.set(drawableId, elementId)
        if (!master) editableObjects++
      }
      else if (drawable.type === IWA_TYPE.image) {
        if (!frame) {
          reportSkipped('Image without geometry', 'The image geometry could not be read, so it was left untouched in the source document.')
          return
        }
        const asset = await loadImageAsset(extractReferenceId(firstBytes(drawable.data, 11)))
          ?? await loadImageAsset(extractReferenceId(firstBytes(drawable.data, 12)))
          ?? await loadImageAsset(extractReferenceId(firstBytes(drawable.data, 13)))
        if (!asset) {
          reportSkipped('Image data', 'The image file is missing or in a format the browser cannot show (for example PDF or HEIC); it stays unchanged in the source document.')
          return
        }
        const mediaStyle = shapeStyles.shape(extractReferenceId(firstBytes(drawable.data, 3)), scale)
        const imageElement: PPTImageElement = {
          id: elementId,
          continuityId: `key-${drawableId}`,
          sourceId: String(drawableId),
          sourceType: 'IWA:3005',
          sourceAssetPath: asset.path,
          sourceSnapshot: { ...frame },
          name: `Keynote Image ${drawableId}`,
          type: 'image',
          ...frame,
          fixedRatio: true,
          src: asset.dataUrl,
          ...(mediaStyle.outline ? { outline: mediaStyle.outline } : {}),
          ...(mediaStyle.opacity !== undefined ? { opacity: mediaStyle.opacity } : {}),
          ...(mediaStyle.shadow ? { shadow: mediaStyle.shadow } : {}),
        }
        pushElement(imageElement)
        elementIdByDrawable.set(drawableId, elementId)
        if (!master) editableObjects++
        if (firstBytes(drawable.data, 5)) {
          addFinding({ category: 'visual', severity: 'approximated', slideIndex: slideNumber, objectId: String(drawableId), feature: 'Image mask', message: 'The image is masked in Keynote; KeyNot shows the full image frame.' })
        }
      }
      else if (drawable.type === IWA_TYPE.table) {
        if (!frame) {
          reportSkipped('Table without geometry', 'The table geometry could not be read, so it was left untouched in the source document.')
          return
        }
        const nativeGrid = decodeNativeTableGrid(drawable, allObjects)
        const rowCount = nativeGrid?.rows ?? 5
        const columnCount = nativeGrid?.columns ?? 4
        const cells = Array.from({ length: rowCount }, (_, row) =>
          Array.from({ length: columnCount }, (_, column) => nativeGrid?.cells[row]?.[column] ?? ''))
        const tableData: PPTTableElement['data'] = cells.map((row, rowIndex) =>
          row.map((text, columnIndex) => ({
            id: `key-cell-${drawableId}-${rowIndex}-${columnIndex}`,
            colspan: 1,
            rowspan: 1,
            text,
            style: {
              fontname: 'Inter',
              color: '#1d1d1f',
              backcolor: rowIndex === 0 ? '#e8eef8' : '#ffffff',
            },
          })))
        const tableElement: PPTTableElement = {
          id: elementId,
          continuityId: `key-${drawableId}`,
          sourceId: String(drawableId),
          sourceType: 'IWA:6000',
          sourceSnapshot: { ...frame, cells },
          name: `Keynote Table ${drawableId}`,
          type: 'table',
          ...frame,
          data: tableData,
          colWidths: new Array(columnCount).fill(1 / columnCount),
          cellMinHeight: Math.max(12, frame.height / rowCount),
          rowHeights: new Array(rowCount).fill(1 / rowCount),
          outline: { width: 1, style: 'solid', color: '#c7c7cc' },
          theme: {
            color: '#4472c4',
            rowHeader: true,
            rowFooter: false,
            colHeader: false,
            colFooter: false,
          },
        }
        pushElement(tableElement)
        elementIdByDrawable.set(drawableId, elementId)
        if (!master) editableObjects++
        addFinding({
          category: 'editability',
          severity: 'approximated',
          slideIndex: slideNumber,
          objectId: String(drawableId),
          feature: 'Keynote table',
          message: nativeGrid
            ? 'Text, number and boolean cells are editable and written back; cell styles and formulas stay as they are in Keynote.'
            : 'This table cell format could not be decoded; it is shown empty and its cells stay unchanged in the source document.',
        })
      }
      else if (drawable.type === IWA_TYPE.group) {
        if (!localGeometry) {
          reportSkipped('Group', 'This group has no readable geometry; it is preserved natively.'); return
        }
        if (!master) nativeGroups.push(String(drawableId))
        const next = groupContext(drawableId, localGeometry, context)
        for (const child of repeatedReferences(drawable.data, 2)) await importDrawable(child, master, next)
      }
      else if (drawable.type === IWA_TYPE.chart) {
        const chart = readNativeChart(drawable)
        if (!frame || !chart) {
          reportSkipped('Chart', 'This chart grid could not be decoded; its native records are preserved.'); return
        }
        const element: PPTChartElement = {
          id: elementId, continuityId: `key-${drawableId}`, sourceId: String(drawableId), sourceType: 'IWA:5021',
          sourceSnapshot: { ...frame }, type: 'chart', ...frame, chartType: chart.chartType, data: chart.data,
          options: chart.options, themeColors: ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47'],
        }
        element.sourceSnapshot!.chart = chartFingerprint(element)
        pushElement(element)
        elementIdByDrawable.set(drawableId, elementId)
        if (!master) editableObjects++
        addFinding({ category: 'visual', severity: 'approximated', slideIndex: slideNumber, objectId: elementId, feature: 'Chart', message: 'Chart data and geometry are editable and written natively; browser chart styling approximates the Keynote theme.' })
      }
      else if (drawable.type === IWA_TYPE.movie) {
        reportSkipped('Movie or audio', 'Movies and audio are not imported yet; they stay unchanged in the source document.')
      }
      else {
        reportSkipped(`Object type ${drawable.type}`, 'This object type is not imported yet; it stays unchanged in the source document.')
      }
    }

    // Template (master) objects sit behind the slide's own objects, as in Keynote.
    const templateId = extractReferenceId(firstBytes(slideRecord.data, 17))
    const template = templateId !== null ? allObjects.get(templateId) : undefined
    if (template) {
      const templateOrder = repeatedReferences(template.data, 42)
      for (const id of templateOrder.length ? templateOrder : repeatedReferences(template.data, 7)) {
        if (allObjects.get(id)?.type !== IWA_TYPE.placeholder) await importDrawable(id, true)
      }
    }
    for (const drawableId of drawableIds) await importDrawable(drawableId, false)
    elements.unshift(...masterElements)

    // 5. Builds, in Keynote playback order.
    const animations: PPTAnimation[] = []
    const editableBuilds = []
    for (const build of readSlideBuilds(slideRecord, index)) {
      const elId = elementIdByDrawable.get(build.drawableId)
      if (!elId) {
        findings.push({ category: 'visual', severity: 'unsupported', slideIndex: slideNumber, feature: `Build: ${build.effect}`, message: 'The build targets an object that was not imported; it stays unchanged in the source document.' })
        continue
      }
      editableBuilds.push(buildSnapshotOf(build))
      const mapped = getBuildDefinition(build.kind, build.effect)
      animations.push({
        id: `key-build-${build.buildId}`,
        elId,
        type: mapped.type,
        effect: mapped.player,
        duration: build.durationMs,
        trigger: build.trigger,
        keynoteEffect: build.effect,
        sourceBuildId: String(build.buildId),
        delay: build.delayMs,
        ...(build.actionParams ? { actionParams: build.actionParams } : {}),
      })
      findings.push({
        category: 'visual',
        severity: mapped.fidelity === 'native' ? 'preserved' : 'approximated',
        slideIndex: slideNumber,
        objectId: elId,
        feature: `Build ${build.kind}: ${build.effect}`,
        message: `Plays as '${mapped.player}' in KeyNot. Native effect identifiers and timing are preserved on export.`,
      })
    }

    // 6. Presenter notes (KN.NoteArchive.containedStorage).
    const noteId = extractReferenceId(firstBytes(slideRecord.data, 27))
    const note = noteId !== null ? allObjects.get(noteId) : undefined
    const noteStorageId = note?.type === IWA_TYPE.note ? extractReferenceId(firstBytes(note.data, 1)) : null
    const noteStorage = noteStorageId !== null ? allObjects.get(noteStorageId) : undefined
    const noteText = noteStorage ? visibleNativeText(readStorageText(noteStorage)) : ''

    const background = await readSlideBackground(slideRecord)
    const remark = noteText.trim() ? splitParagraphs(noteText).map(line => `<p>${escapeHtml(line)}</p>`).join('') : ''
    slides.push({
      id: `key-slide-${slideRecord.id}`,
      sourceId: String(slideRecord.id),
      sourceSnapshot: { transition: { ...transition }, builds: editableBuilds, drawableIds: [...elementIdByDrawable.keys()].map(String), background: JSON.stringify(background), remark, groups: nativeGroups },
      transition,
      elements,
      animations,
      background,
      remark,
      ...(skipped ? { skipped: true } : {}),
    })
  }

  if (!slides.length) throw new Error('No slides were found in this Keynote document.')

  if (bridge) {
    const merged = mergeBridgeExtensions(slides, bridge.slides)
    findings.push({
      category: 'roundTrip',
      severity: 'approximated',
      feature: 'Edited after KeyNot export',
      message: `This file changed after KeyNot exported it, so slides were read from the native Keynote records. KeyNot-only details were restored for ${merged} matching objects; objects that only existed in KeyNot are not restored.`,
    })
  }

  findings.unshift({
    category: 'structure',
    severity: 'preserved',
    feature: 'Keynote document structure',
    message: `Read ${slides.length} slides in presentation order from ${iwaFileCount} IWA streams (${allObjects.size} records); ${editableObjects} objects are editable and ${skippedObjects} stay unchanged in the source document.`,
  })

  return {
    title: fileName.replace(/\.key$/i, '') || 'Keynote Presentation',
    slides,
    viewportSize: KEYNOT_VIEWPORT_SIZE,
    viewportRatio: showSize.height / showSize.width,
    compatibilityReport: buildCompatibilityReport({
      fileName,
      slideCount: slides.length,
      iwaFileCount,
      messageCount: allObjects.size,
      mediaAssetCount,
      findings,
    }),
    rawArchiveBase64: uint8ToBase64(new Uint8Array(buffer)),
  }
}

export const SEVERITY_WEIGHT: Record<CompatibilitySeverity, number> = { preserved: 1, approximated: 0.6, fallback: 0.25, unsupported: 0 }

export const measure = (findings: CompatibilityFinding[], categories: CompatibilityFinding['category'][], empty: string, label: string): CompatibilityMeasureSummary => {
  const relevant = findings.filter(finding => categories.includes(finding.category))
  if (!relevant.length) return { score: 100, status: 'High', summary: empty }
  const score = Math.round(100 * relevant.reduce((sum, finding) => sum + SEVERITY_WEIGHT[finding.severity], 0) / relevant.length)
  const count = (severity: CompatibilitySeverity) => relevant.filter(finding => finding.severity === severity).length
  return {
    score,
    status: score >= 85 ? 'High' : score >= 50 ? 'Partial' : 'Degraded',
    summary: `${label}: ${count('preserved')} preserved, ${count('approximated')} approximated, ${count('fallback')} fallback, ${count('unsupported')} unsupported.`,
  }
}

/** Scores are derived from the findings themselves; nothing is a fixed constant. */
export const buildCompatibilityReport = (input: {
  fileName: string
  slideCount: number
  iwaFileCount: number
  messageCount: number
  mediaAssetCount: number
  findings: CompatibilityFinding[]
}): CompatibilityReport => ({
  sourceFormat: 'keynote',
  fileName: input.fileName,
  importedAt: Date.now(),
  slideCount: input.slideCount,
  iwaFileCount: input.iwaFileCount,
  messageCount: input.messageCount,
  mediaAssetCount: input.mediaAssetCount,
  measures: {
    importStructure: measure(input.findings, ['structure'], 'Slides were read in presentation order.', 'Structure'),
    visualFidelity: measure(input.findings, ['visual'], 'No approximated visuals were reported.', 'Visuals'),
    editability: measure(input.findings, ['editability'], 'Every imported object is editable.', 'Objects'),
    exportRoundTrip: {
      score: null,
      status: 'Unverified',
      summary: 'Export writes only edited text, geometry, table cells, images and transitions into the original records. Apple Keynote has not opened this export yet, so round-trip fidelity is unverified.',
    },
  },
  findings: input.findings,
})
