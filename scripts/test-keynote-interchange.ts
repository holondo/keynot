/**
 * Native Keynote interchange regression suite.
 *
 * Fixtures: public/samples/research-transdeck.key and the KeynoteKit test decks in
 * tests/fixtures/keynote (0BSD, see LICENSE.KeynoteKit). Every round trip below
 * removes the KeyNot bridge sidecar before re-importing, so the assertions read
 * only what was written into Apple's native records.
 */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import {
  buildKeynoteArchive,
  buildNativeKeynoteArchive,
  buildKeynotProjectContainer,
  compressIWAStream,
  decompressIWAStream,
  htmlToNativeText,
  importKeynoteArchive,
  parseIWAObjects,
  scanProtoFields,
} from '../src/utils/keynoteImporter.ts'
import type { KeynoteImportResult } from '../src/utils/keynoteImporter.ts'
import type { PPTElement, Slide } from '../src/types/slides.ts'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixture = (name: string) => name === 'research-transdeck.key'
  ? path.join(repoRoot, 'public', 'samples', name)
  : path.join(repoRoot, 'tests', 'fixtures', 'keynote', name)

const BRIDGE = 'Metadata/slate-model.json'

const toArrayBuffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

const load = async (name: string): Promise<{ bytes: Uint8Array; result: KeynoteImportResult }> => {
  const bytes = new Uint8Array(fs.readFileSync(fixture(name)))
  return { bytes, result: await importKeynoteArchive(toArrayBuffer(bytes), name) }
}

const clone = <T>(value: T): T => structuredClone(value)

const allElements = (slides: Slide[]) => slides.flatMap(slide => slide.elements)

const findElement = (slides: Slide[], predicate: (element: PPTElement) => boolean) => {
  const element = allElements(slides).find(predicate)
  assert.ok(element, 'expected element not found')
  return element
}

/** Export, strip the KeyNot sidecar, and re-import: only native records remain. */
const nativeRoundTrip = async (source: KeynoteImportResult, slides: Slide[]) => {
  const { blob, report } = await buildKeynoteArchive(slides, source.title, source.rawArchiveBase64, source.viewportSize)
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  for (const name of Object.keys(zip.files)) if (name.endsWith(BRIDGE)) zip.remove(name)
  const nativeOnly = await zip.generateAsync({ type: 'uint8array' })
  return { report, zip, result: await importKeynoteArchive(toArrayBuffer(nativeOnly), 'roundtrip.key') }
}

const iwaEntries = async (zip: JSZip) => {
  const entries = new Map<string, Uint8Array>()
  for (const name of Object.keys(zip.files)) {
    if (name.endsWith('.iwa')) entries.set(name, decompressIWAStream(await zip.files[name].async('uint8array')))
  }
  return entries
}

const tests: [string, () => Promise<void>][] = []
const test = (name: string, run: () => Promise<void>) => tests.push([name, run])

test('slides come from the show tree, in order, without template slides', async () => {
  const { result } = await load('research-transdeck.key')
  assert.deepEqual(result.slides.map(slide => slide.sourceId), ['2652176', '2652475', '2652599'])
  assert.equal(result.viewportRatio, 1080 / 1920)
})

test('transitions keep their native effect, duration and start mode', async () => {
  const { result } = await load('research-transdeck.key')
  assert.deepEqual(
    result.slides.map(slide => [slide.transition?.effect, slide.transition?.duration, slide.transition?.startMode]),
    [['apple:dissolve', 2000, 'click'], ['apple:3D-cube', 1500, 'click'], ['none', 1000, 'click']],
  )
})

test('geometry is read through the drawable super chain and scaled once per deck', async () => {
  for (const name of ['research-transdeck.key', 'imagedeck.key', 'tabledeck.key', 'twoslides.key', 'palette.key', 'template.key']) {
    const { result } = await load(name)
    for (const element of allElements(result.slides)) {
      assert.ok(element.sourceSnapshot, `${name}: ${element.id} has a native snapshot`)
      assert.ok(element.left >= 0 && element.top >= 0, `${name}: ${element.id} starts inside the slide`)
      assert.ok(element.left + element.width <= 1000.5, `${name}: ${element.id} fits the slide width`)
      assert.ok(!(element.left === 80 && element.width === 840), `${name}: ${element.id} is not a layout fallback`)
    }
  }
  const { result } = await load('imagedeck.key')
  const image = findElement(result.slides, element => element.type === 'image')
  assert.deepEqual([image.left, image.top, image.width, image.height].map(Math.round), [396, 203, 208, 156])
})

test('text, images, tables, builds and presenter notes import', async () => {
  const twoSlides = (await load('twoslides.key')).result
  assert.deepEqual(twoSlides.slides.map(slide => allElements([slide]).filter(element => element.type === 'text').map(element => element.sourceSnapshot?.text)), [['First'], ['Second']])

  const image = findElement((await load('imagedeck.key')).result.slides, element => element.type === 'image')
  assert.ok(image.type === 'image' && image.src.startsWith('data:image/') && image.sourceAssetPath?.startsWith('Data/'))

  const table = findElement((await load('tabledeck.key')).result.slides, element => element.type === 'table')
  assert.ok(table.type === 'table')
  assert.deepEqual(table.data.map(row => row.map(cell => cell.text)), [['Product', 'Units', 'Revenue'], ['Widget', '1200', '24000'], ['Gadget', '800', '56000']])

  const builds = (await load('builds.key')).result.slides[0].animations ?? []
  assert.ok(builds.length > 0 && builds.every(build => build.keynoteEffect), 'builds keep their native effect id')

  const template = (await load('template.key')).result
  assert.match(template.slides[0].remark ?? '', /@layout: title/)
})

test('text styles come from the native stylesheet', async () => {
  const { result } = await load('twoslides.key')
  const title = findElement(result.slides, element => element.type === 'text' && element.sourceSnapshot?.text === 'First')
  assert.ok(title.type === 'text')
  // Basic White title: Helvetica Neue Bold, 116 pt on a 1920-point slide.
  assert.match(title.content, /font-size: 60\.42px/)
  assert.match(title.content, /font-family: Helvetica Neue, sans-serif/)
  assert.match(title.content, /font-weight: bold/)
  assert.equal(title.defaultFontName, 'Helvetica Neue, sans-serif')
})

test('shapes keep their path, fill and proportions; slides keep their background', async () => {
  const palette = (await load('palette.key')).result
  const square = findElement(palette.slides, element => element.type === 'shape')
  assert.ok(square.type === 'shape')
  assert.equal(square.fill, 'rgb(0, 162, 255)')
  assert.deepEqual(square.viewBox, [100, 100])
  assert.match(square.path, /^M 0 0 L 100 0 L 100 100 L 0 100 Z/)

  const builds = (await load('builds.key')).result
  const circle = builds.slides[0].elements.find(element => element.type === 'shape' && element.path.includes('C'))
  assert.ok(circle && circle.type === 'shape')
  assert.deepEqual(circle.viewBox, [100, 100], 'curve bounds, not control points, define the viewBox')

  assert.deepEqual(palette.slides[0].background, { type: 'solid', color: 'rgb(255, 255, 255)' })
})

test('an unedited export leaves every native record byte-identical', async () => {
  for (const name of ['research-transdeck.key', 'imagedeck.key', 'tabledeck.key', 'twoslides.key', 'builds.key', 'palette.key']) {
    const { bytes, result } = await load(name)
    const { blob, report } = await buildKeynoteArchive(result.slides, result.title, result.rawArchiveBase64, result.viewportSize)
    assert.equal(report.written.length, 0, `${name}: nothing was written`)
    const before = await iwaEntries(await JSZip.loadAsync(bytes))
    const after = await iwaEntries(await JSZip.loadAsync(await blob.arrayBuffer()))
    for (const [entry, data] of before) assert.deepEqual(after.get(entry), data, `${name}: ${entry} unchanged`)
  }
})

test('an untouched approximated transition is written back as the original effect', async () => {
  const { result } = await load('research-transdeck.key')
  const slides = clone(result.slides)
  // An effect KeyNot only approximates must still be exported as itself.
  slides[0].sourceSnapshot = { ...slides[0].sourceSnapshot!, transition: { ...slides[0].transition!, effect: 'com.apple.iWork.Keynote.KLNConfetti' } }
  slides[0].transition = { ...slides[0].transition!, effect: 'com.apple.iWork.Keynote.KLNConfetti' }
  const { report } = await buildKeynoteArchive(slides, result.title, result.rawArchiveBase64)
  assert.equal(report.written.length, 0)
})

test('an edited transition is written natively, including Magic Move options', async () => {
  const { result: source } = await load('research-transdeck.key')
  const slides = clone(source.slides)
  slides[2].transition = { effect: 'apple:magic-move', duration: 1350, acceleration: 'easeOut', startMode: 'auto', delay: 500, textMatchMode: 'word', unmatchedBehavior: 'instant' }
  const { result } = await nativeRoundTrip(source, slides)
  const slide = result.slides[2]
  assert.equal(slide.transition?.effect, 'apple:magic-move-implied-motion-path')
  assert.deepEqual(
    [slide.transition?.duration, slide.transition?.acceleration, slide.transition?.startMode, slide.transition?.delay, slide.transition?.textMatchMode, slide.transition?.unmatchedBehavior],
    [1350, 'easeOut', 'auto', 500, 'word', 'instant'],
  )
  assert.equal(result.slides[1].transition?.effect, 'apple:3D-cube', 'other slides keep their effect')
})

test('a moved image keeps its native size bytes and only its record changes', async () => {
  const { bytes, result: source } = await load('imagedeck.key')
  const slides = clone(source.slides)
  const image = findElement(slides, element => element.type === 'image')
  image.left += 40
  const { result, zip, report } = await nativeRoundTrip(source, slides)
  assert.deepEqual(report.written.map(entry => entry.feature), ['Position and size'])
  const moved = findElement(result.slides, element => element.sourceId === image.sourceId)
  assert.ok(Math.abs(moved.left - image.left) < 0.01 && Math.abs(moved.width - image.width) < 0.01)

  const before = await iwaEntries(await JSZip.loadAsync(bytes))
  const after = await iwaEntries(zip)
  const changedRecords: number[] = []
  for (const [entry, data] of before) {
    // An archive can hold several messages under one identifier, so compare in stream order.
    const original = parseIWAObjects(data, entry)
    parseIWAObjects(after.get(entry)!, entry).forEach((record, position) => {
      const previous = original[position]
      if (previous?.id !== record.id || Buffer.compare(Buffer.from(previous.data), Buffer.from(record.data)) !== 0) changedRecords.push(record.id)
    })
  }
  assert.deepEqual(changedRecords, [Number(image.sourceId)])
})

test('edited text is written natively and paragraph style tables follow the new paragraphs', async () => {
  const { result: source } = await load('twoslides.key')
  const slides = clone(source.slides)
  const text = findElement(slides, element => element.type === 'text' && element.sourceSnapshot?.text === 'First')
  assert.ok(text.type === 'text')
  text.content = '<p><span>Primeiro &amp; único</span></p><p></p><p>Terceiro<br>linha</p>'
  const { result, zip, report } = await nativeRoundTrip(source, slides)
  assert.ok(report.written.some(entry => entry.feature === 'Text'))
  const expected = 'Primeiro & único\n\nTerceiro linha'
  const reimported = findElement(result.slides, element => element.sourceId === text.sourceId)
  assert.equal(reimported.sourceSnapshot?.text, expected)

  const storage = (await Promise.all(Array.from((await iwaEntries(zip)).entries(), async ([entry, data]) => parseIWAObjects(data, entry))))
    .flat()
    .find(record => record.id === Number(text.sourceTextStorageId))!
  const paragraphStyleEntries = scanProtoFields(scanProtoFields(storage.data).find(field => field.fieldNumber === 5)!.bytes!)
    .map(entry => scanProtoFields(entry.bytes!).find(field => field.fieldNumber === 1)!.varint)
  assert.deepEqual(paragraphStyleEntries, [0, 17, 18], 'one paragraph style entry per paragraph start')
})

test('U+2029 paragraph separators are kept and style tables follow them', async () => {
  const { concatBytes, encodeProtoBytesField, encodeProtoVarintField } = await import('../src/utils/keynote/codec.ts')
  const { patchStorageText, htmlToNativeText: toNative, paragraphSeparatorOf } = await import('../src/utils/keynote/text.ts')
  const entry = (index: number, styleId: number) => encodeProtoBytesField(1, concatBytes([encodeProtoVarintField(1, index), encodeProtoBytesField(2, encodeProtoVarintField(1, styleId))]))
  const oldText = 'Alpha Beta'
  const storage = concatBytes([
    encodeProtoVarintField(1, 3),
    encodeProtoBytesField(3, new TextEncoder().encode(oldText)),
    encodeProtoBytesField(5, concatBytes([entry(0, 101), entry(6, 102)])),
  ])
  const newText = toNative('<p>Alpha</p><p>Beta</p><p>Gamma</p>', paragraphSeparatorOf(oldText))
  assert.equal(newText, 'Alpha Beta Gamma')
  const patched = patchStorageText(storage, oldText, newText)
  assert.ok(patched)
  const table = scanProtoFields(patched).find(field => field.fieldNumber === 5)!.bytes!
  const entries = scanProtoFields(table).map(field => scanProtoFields(field.bytes!).map(item => item.varint ?? scanProtoFields(item.bytes!)[0].varint))
  assert.deepEqual(entries, [[0, 101], [6, 102], [11, 102]], 'the new paragraph inherits the last paragraph style')
})

test('html to native text is lossless for unedited content', async () => {
  for (const name of ['twoslides.key', 'palette.key', 'imagedeck.key']) {
    const { result } = await load(name)
    for (const element of allElements(result.slides)) {
      if (element.type !== 'text') continue
      assert.equal(htmlToNativeText(element.content), element.sourceSnapshot?.text, `${name}: ${element.id}`)
    }
  }
})

test('edited table cells and geometry are written natively', async () => {
  const { result: source } = await load('tabledeck.key')
  const slides = clone(source.slides)
  const table = findElement(slides, element => element.type === 'table')
  assert.ok(table.type === 'table')
  table.left += 29
  table.data[0][0].text = 'Item'
  table.data[1][2].text = '31500'
  table.data[2][0].text = 'Doohickey'
  const { result } = await nativeRoundTrip(source, slides)
  const reimported = findElement(result.slides, element => element.sourceId === table.sourceId)
  assert.ok(reimported.type === 'table')
  assert.ok(Math.abs(reimported.left - table.left) < 0.01)
  assert.deepEqual(reimported.data.map(row => row.map(cell => cell.text)), [['Item', 'Units', 'Revenue'], ['Widget', '1200', '31500'], ['Doohickey', '800', '56000']])
})

test('duplicated slides acquire independent native records', async () => {
  const { result } = await load('twoslides.key')
  const slides = clone(result.slides)
  slides.push({ ...clone(slides[0]), id: 'copy' })
  const exported = await nativeRoundTrip(result, slides)
  assert.equal(exported.result.slides.length, 3)
  assert.equal(new Set(exported.result.slides.map(slide => slide.sourceId)).size, 3)
  const originalText = exported.result.slides[0].elements.find(element => element.type === 'text')!
  const copyText = exported.result.slides[2].elements.find(element => element.type === 'text')!
  assert.notEqual(originalText.sourceId, copyText.sourceId)
  assert.notEqual(originalText.sourceTextStorageId, copyText.sourceTextStorageId)
  assert.equal(copyText.sourceSnapshot?.text, originalText.sourceSnapshot?.text)
  assert.ok(exported.report.written.some(entry => entry.feature === 'Slides'))
  assert.ok(!exported.report.keynotOnly.some(entry => entry.feature === 'Slide'))
})

test('the bridge sidecar is used only while native records are unchanged', async () => {
  const { result: source } = await load('twoslides.key')
  const slides = clone(source.slides)
  const text = findElement(slides, element => element.type === 'text')
  text.continuityId = 'hero-title'
  const { blob } = await buildKeynoteArchive(slides, source.title, source.rawArchiveBase64)
  const exported = new Uint8Array(await blob.arrayBuffer())

  const fromBridge = await importKeynoteArchive(toArrayBuffer(exported), 'bridge.key')
  assert.ok(fromBridge.compatibilityReport.findings.some(finding => finding.feature === 'KeyNot bridge metadata' && finding.severity === 'preserved'))

  // Simulate Keynote saving the file again: native records change, the sidecar stays.
  const zip = await JSZip.loadAsync(exported)
  const slidePath = Object.keys(zip.files).find(name => name.endsWith('Index/Document.iwa'))!
  zip.file(slidePath, compressIWAStream(decompressIWAStream(await zip.files[slidePath].async('uint8array'))))
  const resaved = await importKeynoteArchive(toArrayBuffer(await zip.generateAsync({ type: 'uint8array' })), 'resaved.key')
  assert.ok(resaved.compatibilityReport.findings.some(finding => finding.feature === 'Edited after KeyNot export'))
  assert.equal(findElement(resaved.slides, element => element.sourceId === text.sourceId).continuityId, 'hero-title')
})

test('a KeyNot-only container restores its slides', async () => {
  const slides: Slide[] = [{ id: 'a', elements: [], transition: { effect: 'apple:magic-move', duration: 2000, startMode: 'click', delay: 0 } }]
  const { blob, report } = await buildKeynotProjectContainer(slides, 'Local deck')
  assert.ok(report.keynotOnly.length === 1)
  const restored = await importKeynoteArchive(await blob.arrayBuffer(), 'local.key')
  assert.equal(restored.slides[0].transition?.effect, 'apple:magic-move')
})

test('native build edits survive without the bridge and exports refresh snapshots', async () => {
  const { result } = await load('builds.key')
  const slides = clone(result.slides)
  const animation = slides[0].animations![0]
  animation.keynoteEffect = 'apple:bc-appear'
  animation.duration = 1750
  animation.delay = 250
  animation.trigger = 'auto'
  const edited = await nativeRoundTrip(result, slides)
  const restored = edited.result.slides[0].animations!.find(build => build.sourceBuildId === animation.sourceBuildId)!
  assert.ok(restored)
  assert.equal(restored.keynoteEffect, animation.keynoteEffect)
  assert.equal(restored.duration, 1750)
  assert.equal(restored.delay, 250)
  assert.equal(restored.trigger, 'auto')
  assert.ok(edited.report.written.some(entry => entry.feature === 'Builds'))
  const exported = await buildKeynoteArchive(slides, result.title, result.rawArchiveBase64, result.viewportSize)
  const bridged = await importKeynoteArchive(await exported.blob.arrayBuffer(), 'edited.key')
  const again = await buildKeynoteArchive(bridged.slides, bridged.title, bridged.rawArchiveBase64, bridged.viewportSize)
  assert.ok(!again.report.written.some(entry => entry.feature === 'Builds'))
})

test('native build removal and order survive without the bridge', async () => {
  const { result } = await load('builds.key')
  const slides = clone(result.slides)
  assert.ok(slides[0].animations!.length > 1)
  slides[0].animations!.reverse()
  slides[0].animations!.pop()
  const reordered = await nativeRoundTrip(result, slides)
  assert.deepEqual(reordered.result.slides[0].animations!.map(build => build.sourceBuildId), slides[0].animations!.map(build => build.sourceBuildId))
  slides[0].animations = []
  const removed = await nativeRoundTrip(result, slides)
  assert.equal(removed.result.slides[0].animations!.length, 0)
})

test('new builds become native records, respect order, and allocate unique identifiers', async () => {
  const { result } = await load('twoslides.key')
  const slides = clone(result.slides)
  const target = slides[0].elements.find(element => element.sourceType !== 'IWA:master' && element.sourceId)!
  slides[0].animations = [
    { id: 'new-in', elId: target.id, type: 'in', effect: 'fadeIn', keynoteEffect: 'apple:bc-appear', duration: 700, delay: 125, trigger: 'click' },
    { id: 'new-out', elId: target.id, type: 'out', effect: 'fadeOut', keynoteEffect: 'apple:dissolve character', duration: 1200, delay: 350, trigger: 'auto' },
  ]
  const exported = await nativeRoundTrip(result, slides)
  assert.deepEqual(exported.result.slides[0].animations!.map(build => [build.keynoteEffect, build.duration, build.delay, build.trigger]), [
    ['apple:bc-appear', 700, 125, 'click'], ['apple:dissolve character', 1200, 350, 'auto'],
  ])
  assert.ok(exported.report.written.some(entry => entry.message.includes('Created 2')))
  assert.ok(!slides[0].animations[0].sourceBuildId, 'export must not mutate the editor model')
  const ids: number[] = []
  for (const [name, data] of await iwaEntries(exported.zip)) for (const record of parseIWAObjects(data, name)) ids.push(record.id)
  const newIds = exported.result.slides[0].animations!.map(build => Number(build.sourceBuildId))
  assert.equal(new Set(newIds).size, 2)
  for (const id of newIds) assert.equal(ids.filter(value => value === id).length, 1)
  const second = await nativeRoundTrip(exported.result, exported.result.slides)
  assert.ok(!second.report.written.some(entry => entry.feature === 'Builds'))
})

test('native slide order, removal, insertion and skip flags survive without the bridge', async () => {
  const { result } = await load('twoslides.key')
  const slides = clone(result.slides).reverse()
  slides[0].skipped = true
  let exported = await nativeRoundTrip(result, slides)
  assert.deepEqual(exported.result.slides.map(slide => slide.sourceId), slides.map(slide => slide.sourceId))
  assert.equal(exported.result.slides[0].skipped, true)
  slides.pop()
  slides.push({ id: 'blank-new-slide', elements: [], transition: { effect: 'apple:push', duration: 500, startMode: 'click', delay: 0 } })
  exported = await nativeRoundTrip(result, slides)
  assert.equal(exported.result.slides.length, 2)
  assert.equal(exported.result.slides[0].sourceId, slides[0].sourceId)
  assert.equal(exported.result.slides[1].elements.filter(element => element.sourceType !== 'IWA:master').length, 0)
  assert.equal(exported.result.slides[1].transition?.effect, 'apple:push')
})

test('new text and vector shapes become editable native drawables', async () => {
  const { result } = await load('twoslides.key')
  const slides = clone(result.slides)
  slides[0].elements.push(
    { id: 'authored-text', type: 'text', left: 50, top: 70, width: 300, height: 90, rotate: 0, content: '<p>Created in KeyNot</p><p>Second paragraph</p>', defaultFontName: 'Arial', defaultColor: '#123456' },
    { id: 'authored-shape', type: 'shape', left: 80, top: 200, width: 120, height: 80, rotate: 12, viewBox: [100, 100], path: 'M0 0 L100 0 L50 100 Z', fill: '#e04020', fixedRatio: false },
  )
  const exported = await nativeRoundTrip(result, slides)
  const text = exported.result.slides[0].elements.find(element => element.sourceSnapshot?.text?.includes('Created in KeyNot'))!
  assert.ok(text && text.type === 'text')
  assert.ok(Math.abs(text.left - 50) < 0.01 && Math.abs(text.width - 300) < 0.01)
  assert.equal(text.sourceSnapshot?.text, 'Created in KeyNot\u2029Second paragraph')
  const shape = exported.result.slides[0].elements.find(element => element.type === 'shape' && Math.abs(element.rotate - 12) < 0.01)!
  assert.ok(shape && shape.type === 'shape')
  assert.equal(shape.fill, 'rgb(224, 64, 32)')
  assert.ok(exported.report.written.some(entry => entry.feature === 'Objects'))
  assert.ok(!exported.report.keynotOnly.some(entry => ['authored-text', 'authored-shape'].includes(entry.objectId ?? '')))
})

test('copied text objects have independent text storages', async () => {
  const { result } = await load('twoslides.key')
  const slides = clone(result.slides)
  const source = slides[0].elements.find(element => element.type === 'text')!
  const copy = clone(source)
  copy.id = 'copied-text'
  copy.sourceCloneId = copy.sourceId
  delete copy.sourceId
  copy.left += 30
  if (copy.type === 'text') copy.content = '<p>Independent copy</p>'
  slides[0].elements.push(copy)
  const exported = await nativeRoundTrip(result, slides)
  const texts = exported.result.slides[0].elements.filter(element => element.type === 'text')
  assert.ok(texts.some(element => element.sourceSnapshot?.text === 'First'))
  assert.ok(texts.some(element => element.sourceSnapshot?.text === 'Independent copy'))
  assert.equal(new Set(texts.map(element => element.sourceTextStorageId)).size, texts.length)
})

test('a presentation authored from scratch exports real native slides with rich text', async () => {
  const seed = new Uint8Array(fs.readFileSync(fixture('twoslides.key')))
  const slides: Slide[] = [{ id: 'authored', elements: [
    { id: 'rich', type: 'text', left: 50, top: 60, width: 400, height: 120, rotate: 0, content: '<p style="text-align:center"><strong style="font-size:36px;color:#ef2000">Native &amp; bold</strong> <em style="font-size:20px">italic</em></p>', defaultFontName: 'Arial', defaultColor: '#123456' },
  ], transition: { effect: 'apple:push', duration: 600, startMode: 'click', delay: 0 } }]
  const exported = await buildNativeKeynoteArchive(slides, 'Authored', null, 1000, seed)
  const zip = await JSZip.loadAsync(await exported.blob.arrayBuffer())
  zip.remove(BRIDGE)
  const result = await importKeynoteArchive(toArrayBuffer(await zip.generateAsync({ type: 'uint8array' })), 'authored.key')
  assert.equal(result.slides.length, 1)
  assert.equal(result.slides[0].transition?.effect, 'apple:push')
  const text = result.slides[0].elements.find(element => element.type === 'text')!
  assert.ok(text.type === 'text')
  assert.match(text.content, /text-align: center/)
  assert.match(text.content, /font-size: 36px/)
  assert.match(text.content, /font-weight: bold/)
  assert.match(text.content, /font-style: italic/)
  assert.match(text.content, /rgb\(239, 32, 0\)/)
  assert.ok(!exported.report.keynotOnly.length)
})

test('deleting an imported object removes native special-placeholder references too', async () => {
  const { result } = await load('twoslides.key')
  const slides = clone(result.slides)
  slides[0].elements = []
  const exported = await nativeRoundTrip(result, slides)
  assert.equal(exported.result.slides[0].elements.length, 0)
  assert.ok(exported.report.written.some(entry => entry.feature === 'Object order'))
})

test('native backgrounds and edited shape styles survive without the bridge', async () => {
  const { result } = await load('palette.key')
  const slides = clone(result.slides)
  slides[0].background = { type: 'solid', color: '#102030' }
  const shape = slides[0].elements.find(element => element.type === 'shape')!
  assert.ok(shape && shape.type === 'shape')
  shape.fill = '#20a040'
  shape.opacity = 0.65
  shape.outline = { width: 3, color: '#442288', style: 'dashed' }
  const exported = await nativeRoundTrip(result, slides)
  assert.equal(exported.result.slides[0].background?.color, 'rgb(16, 32, 48)')
  const restored = exported.result.slides[0].elements.find(element => element.sourceId === shape.sourceId)!
  assert.ok(restored.type === 'shape')
  assert.equal(restored.fill, 'rgb(32, 160, 64)')
  assert.equal(restored.opacity, 0.65)
  assert.equal(restored.outline?.width, 3)
  assert.equal(restored.outline?.style, 'dashed')
})

test('new image data is native and replacing a shared asset leaves the original untouched', async () => {
  const { result } = await load('imagedeck.key')
  const slides = clone(result.slides)
  const original = slides[0].elements.find(element => element.type === 'image')!
  assert.ok(original.type === 'image')
  const copy = clone(original)
  copy.id = 'independent-image'
  copy.sourceCloneId = copy.sourceId
  delete copy.sourceId
  copy.sourceAssetPath = undefined
  copy.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='
  slides[0].elements.push(copy)
  const exported = await nativeRoundTrip(result, slides)
  const images = exported.result.slides[0].elements.filter(element => element.type === 'image')
  assert.equal(images.length, 2)
  assert.ok(images.some(image => image.src === original.src))
  assert.ok(images.some(image => image.src === copy.src))
  assert.equal(new Set(images.map(image => image.sourceAssetPath)).size, 2)
})

test('duplicated tables own independent native tile and string records', async () => {
  const { result } = await load('tabledeck.key')
  const slides = clone(result.slides)
  const table = slides[0].elements.find(element => element.type === 'table')!
  assert.ok(table.type === 'table')
  const copy = clone(table)
  copy.id = 'table-copy'
  copy.sourceCloneId = copy.sourceId
  delete copy.sourceId
  copy.data[1][2].text = '99000'
  copy.left += 20
  slides[0].elements.push(copy)
  const exported = await nativeRoundTrip(result, slides)
  const tables = exported.result.slides[0].elements.filter(element => element.type === 'table')
  assert.equal(tables.length, 2)
  assert.equal(tables[0].data[1][2].text, '24000')
  assert.equal(tables[1].data[1][2].text, '99000')
  assert.notEqual(tables[0].sourceId, tables[1].sourceId)
})

test('new presenter notes and action parameters are stored natively', async () => {
  const { result } = await load('twoslides.key')
  const slides = clone(result.slides)
  slides[0].remark = '<p>Presenter note</p><p>Next point</p>'
  const element = slides[0].elements.find(element => element.type === 'text')!
  slides[0].animations = [{ id: 'rotation', elId: element.id, effect: 'actionRotate', keynoteEffect: 'apple:action-rotation', type: 'action', duration: 900, trigger: 'click', actionParams: { rotate: 45, scale: 1.2, opacity: 0.8 } }]
  const exported = await nativeRoundTrip(result, slides)
  assert.match(exported.result.slides[0].remark!, /Presenter note/)
  assert.match(exported.result.slides[0].remark!, /Next point/)
  const animation = exported.result.slides[0].animations![0]
  assert.deepEqual(animation.actionParams, { rotate: 45, scale: 1.2, opacity: 0.8 })
  animation.actionParams!.rotate = 80
  const edited = await nativeRoundTrip(exported.result, exported.result.slides)
  assert.equal(edited.result.slides[0].animations![0].actionParams?.rotate, 80)
})

test('native chart grids import and data edits preserve the original chart model', async () => {
  const { result } = await load('chartdeck.key')
  const slides = clone(result.slides)
  const chart = slides[0].elements.find(element => element.type === 'chart')!
  assert.ok(chart && chart.type === 'chart')
  assert.deepEqual(chart.data.labels, ['Q1', 'Q2', 'Q3'])
  assert.deepEqual(chart.data.legends, ['Revenue', 'Costs'])
  assert.deepEqual(chart.data.series, [[100, 150, 210], [60, 80, 95]])
  chart.data = { labels: ['Jan', 'Feb'], legends: ['Actual', 'Target', 'Plan'], series: [[12, 25], [20, 30], [18, 28]] }
  const exported = await nativeRoundTrip(result, slides)
  const restored = exported.result.slides[0].elements.find(element => element.type === 'chart')!
  assert.ok(restored.type === 'chart')
  assert.deepEqual(restored.data, chart.data)
  assert.ok(exported.report.written.some(entry => entry.feature === 'Chart data'))
})

test('unsupported edits are explicit in the native export report', async () => {
  const { result } = await load('imagedeck.key')
  const slides = clone(result.slides)
  const image = slides[0].elements.find(element => element.type === 'image')!
  assert.ok(image.type === 'image')
  image.filters = { brightness: '120%' }
  const exported = await nativeRoundTrip(result, slides)
  assert.ok(exported.report.keynotOnly.some(entry => entry.feature === 'Image crop and adjustments'))
  const original = slides[0].elements.find(element => element.type === 'image')!
  original.sourceSnapshot!.extensions = { 'Image crop and adjustments': JSON.stringify({ filters: image.filters }) }
  delete image.filters
  const removed = await nativeRoundTrip(result, slides)
  assert.ok(removed.report.keynotOnly.some(entry => entry.feature === 'Image crop and adjustments'))
})

test('native aspect ratios follow the document size setting', async () => {
  const seed = new Uint8Array(fs.readFileSync(fixture('twoslides.key')))
  const exported = await buildNativeKeynoteArchive([{ id: 'portrait', elements: [] }], 'Portrait', null, 1000, seed, 4 / 3)
  const zip = await JSZip.loadAsync(await exported.blob.arrayBuffer())
  zip.remove(BRIDGE)
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  const imported = await importKeynoteArchive(toArrayBuffer(bytes), 'portrait.key')
  assert.ok(Math.abs(imported.viewportRatio - 4 / 3) < 0.00001)
})

test('editing one table cell leaves every untouched cell buffer byte-identical', async () => {
  const { bytes, result } = await load('tabledeck.key')
  const slides = clone(result.slides)
  const table = slides[0].elements.find(element => element.type === 'table')!
  assert.ok(table.type === 'table')
  table.data[1][2].text = '76543'
  const exported = await nativeRoundTrip(result, slides)
  const cellBuffers = async (zip: JSZip) => {
    const result = new Map<string, Uint8Array>()
    for (const [name, stream] of await iwaEntries(zip)) for (const record of parseIWAObjects(stream, name)) {
      if (record.type !== 6002) continue
      for (const row of scanProtoFields(record.data).filter(field => field.fieldNumber === 5 && field.bytes)) {
        const fields = scanProtoFields(row.bytes!)
        const rowIndex = fields.find(field => field.fieldNumber === 1)!.varint!
        const buffer = fields.find(field => field.fieldNumber === 6)?.bytes
        const offsets = fields.find(field => field.fieldNumber === 7)?.bytes
        if (!buffer || !offsets) continue
        const starts = Array.from({ length: offsets.length / 2 }, (_, col) => new DataView(offsets.buffer, offsets.byteOffset + col * 2, 2).getUint16(0, true))
        starts.forEach((start, col) => {
          if (start === 65535) return
          const end = Math.min(...starts.filter(value => value !== 65535 && value > start), buffer.length)
          result.set(`${record.id}:${rowIndex}:${col}`, buffer.slice(start, end))
        })
      }
    }
    return result
  }
  const before = await cellBuffers(await JSZip.loadAsync(bytes)), after = await cellBuffers(exported.zip)
  let changed = 0
  for (const [key, value] of before) {
    if (!value.every((byte, index) => after.get(key)?.[index] === byte) || value.length !== after.get(key)?.length) changed++
    else assert.deepEqual(after.get(key), value)
  }
  assert.equal(changed, 1, 'only the edited cell buffer may change')
})

test('externally changed image bytes invalidate the bridge even when IWA bytes do not change', async () => {
  const { result } = await load('imagedeck.key')
  const exported = await buildKeynoteArchive(result.slides, result.title, result.rawArchiveBase64)
  const zip = await JSZip.loadAsync(await exported.blob.arrayBuffer())
  const image = result.slides[0].elements.find(element => element.type === 'image')!
  assert.ok(image.type === 'image')
  const replacement = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='
  zip.file(image.sourceAssetPath!, Buffer.from(replacement, 'base64'))
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  const imported = await importKeynoteArchive(toArrayBuffer(bytes), 'externally-edited.key')
  const restored = imported.slides[0].elements.find(element => element.type === 'image')!
  assert.ok(restored.type === 'image')
  assert.equal(restored.src.split(',')[1], replacement)
  assert.ok(!imported.compatibilityReport.findings.some(finding => finding.feature === 'KeyNot bridge metadata' && finding.severity === 'preserved'))
})

test('native grouping, movement and ungrouping preserve slide-space geometry', async () => {
  const { result } = await load('palette.key')
  const slides = clone(result.slides)
  const source = slides[0].elements.find(element => element.type === 'shape')!
  const copy = clone(source)
  copy.id = 'group-copy'
  copy.sourceCloneId = copy.sourceId
  delete copy.sourceId
  copy.left += 140
  slides[0].elements.push(copy)
  const shapes = [source, copy]
  shapes.forEach(element => element.groupId = 'authored-group')
  const exported = await nativeRoundTrip(result, slides)
  const members = exported.result.slides[0].elements.filter(element => element.sourceGroup)
  assert.equal(members.length, 2)
  assert.equal(new Set(members.map(element => element.groupId)).size, 1)
  for (let index = 0; index < members.length; index++) {
    assert.ok(Math.abs(members[index].left - shapes[index].left) < 0.01)
    assert.ok(Math.abs(members[index].top - shapes[index].top) < 0.01)
  }
  const unchanged = await buildKeynoteArchive(exported.result.slides, exported.result.title, exported.result.rawArchiveBase64)
  assert.equal(unchanged.report.written.length, 0)
  members.forEach(element => element.left += 25)
  const moved = await nativeRoundTrip(exported.result, exported.result.slides)
  const movedMembers = moved.result.slides[0].elements.filter(element => element.sourceGroup)
  assert.ok(Math.abs(movedMembers[0].left - shapes[0].left - 25) < 0.01)
  movedMembers.forEach(element => delete element.groupId)
  const ungrouped = await nativeRoundTrip(moved.result, moved.result.slides)
  assert.equal(ungrouped.result.slides[0].elements.filter(element => element.sourceGroup).length, 0)
  assert.ok(ungrouped.result.slides[0].elements.some(element => Math.abs(element.left - shapes[0].left - 25) < 0.01))
})

let failed = 0
for (const [name, run] of tests) {
  try {
    await run()
    console.log(`  PASS  ${name}`)
  }
  catch (error) {
    failed++
    console.error(`  FAIL  ${name}\n${error instanceof Error ? error.stack : error}`)
  }
}
console.log(`\n${tests.length - failed}/${tests.length} Keynote interchange checks passed`)
if (failed) process.exit(1)
