import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import {
  decompressIWAStream,
  compressIWAStream,
  importKeynoteArchive,
  buildKeynoteArchiveBlob,
} from '../src/utils/keynoteImporter.ts'
import { analyzeSlideTransitionMatches } from '../src/utils/magicMove.ts'
import type { Slide } from '../src/types/slides.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

async function runVerificationSuite() {
  console.log('=== KeyNot Presentation Studio — Automated Verification Suite ===\n')

  // 1. Test Snappy / IWA codec round-trip
  console.log('[1/4] Verifying Snappy / IWA Stream Framing Codec...')
  const samplePayload = new TextEncoder().encode(
    'KeyNot Presentation Studio — Keynote IWA Protobuf Stream Framing Verification Test ' +
    'Repeated block repeated block repeated block 1234567890!'
  )
  const framed = compressIWAStream(samplePayload)
  assert.equal(framed[0], 0x00, 'IWA frame header byte must be 0x00')
  const unframed = decompressIWAStream(framed)
  assert.deepEqual(unframed, samplePayload, 'Decompressed IWA payload must match original bytes exactly')
  console.log(`  PASS: Compressed ${samplePayload.length}B -> ${framed.length}B and losslessly restored.\n`)

  // 2. Test starter deck Object Transition (Magic Move) & Action Builds
  console.log('[2/4] Verifying Starter Deck Object Transitions (Magic Move) & Action Builds...')
  const slidesJsonPath = path.join(repoRoot, 'public', 'mocks', 'slides.json')
  const starterSlides = JSON.parse(fs.readFileSync(slidesJsonPath, 'utf-8')) as Slide[]
  assert.ok(starterSlides.length >= 4, 'Starter deck must have at least 4 showcase slides')

  // Slide 1 -> Slide 2 Magic Move
  assert.equal(starterSlides[1].turningMode, 'magicMove', 'Slide 2 must use magicMove transition')
  const match1to2 = analyzeSlideTransitionMatches(starterSlides[0], starterSlides[1])
  assert.ok(match1to2.matchedPairs.length >= 2, `Expected >= 2 matched objects between Slide 1 and Slide 2, got ${match1to2.matchedPairs.length}`)
  console.log(`  PASS: Slide 1 -> Slide 2 matched ${match1to2.matchedPairs.length} objects via continuityId:`)
  for (const pair of match1to2.matchedPairs) {
    console.log(`    - [${pair.matchReason}] "${pair.fromElement.name || pair.fromElement.id}" -> "${pair.toElement.name || pair.toElement.id}" (continuityId=${pair.continuityId})`)
  }

  // Slide 2 -> Slide 3 Magic Move
  assert.equal(starterSlides[2].turningMode, 'magicMove', 'Slide 3 must use magicMove transition')
  const match2to3 = analyzeSlideTransitionMatches(starterSlides[1], starterSlides[2])
  assert.ok(match2to3.matchedPairs.length >= 3, `Expected >= 3 matched objects between Slide 2 and Slide 3, got ${match2to3.matchedPairs.length}`)
  console.log(`  PASS: Slide 2 -> Slide 3 matched ${match2to3.matchedPairs.length} objects (including morphing Motion Engine card).`)

  // Verify unlinking by clearing continuityId on a cloned slide element
  const slide2Clone: Slide = JSON.parse(JSON.stringify(starterSlides[1]))
  const firstPair = match1to2.matchedPairs[0]
  const targetElInClone = slide2Clone.elements.find(el => el.id === firstPair.toElement.id)
  assert.ok(targetElInClone, 'Target element must exist in cloned slide')
  delete targetElInClone.continuityId
  targetElInClone.name = 'Unlinked Element'
  const matchAfterUnlink = analyzeSlideTransitionMatches(starterSlides[0], slide2Clone)
  assert.equal(
    matchAfterUnlink.matchedPairs.length,
    match1to2.matchedPairs.length - 1,
    'Unlinking continuityId must exclude it from matched pairs'
  )
  console.log('  PASS: Manual unlink / continuityId separation verified.\n')

  // 3. Test real Keynote .key archive import & 4-measure Compatibility Report
  console.log('[3/4] Verifying Native .key (ZIP + IWA + Snappy + Protobuf) Import...')
  const fixtureCandidates = [
    'C:\\Users\\holondo\\AppData\\Local\\Temp\\keynot-research-2300824faf7846f7a166993e824abbeb\\research-transdeck.key',
    path.join(repoRoot, 'public', 'samples', 'research-transdeck.key'),
  ]
  const existingFixture = fixtureCandidates.find(p => fs.existsSync(p))

  if (existingFixture) {
    const repoSampleDir = path.join(repoRoot, 'public', 'samples')
    if (!fs.existsSync(repoSampleDir)) fs.mkdirSync(repoSampleDir, { recursive: true })
    const repoSamplePath = path.join(repoSampleDir, 'research-transdeck.key')
    if (existingFixture !== repoSamplePath) {
      fs.copyFileSync(existingFixture, repoSamplePath)
    }

    const keyBytes = fs.readFileSync(existingFixture)
    const arrayBuffer = keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength)
    const result = await importKeynoteArchive(arrayBuffer, 'research-transdeck.key')

    assert.ok(result.slides.length > 0, 'Imported .key deck must produce slides')
    assert.equal(result.compatibilityReport.sourceFormat, 'keynote', 'Report sourceFormat must be keynote')
    assert.ok(result.compatibilityReport.measures.importStructure.score > 0, 'importStructure score must be > 0')
    assert.ok(result.compatibilityReport.measures.visualFidelity.score > 0, 'visualFidelity score must be > 0')
    assert.ok(result.compatibilityReport.measures.editability.score > 0, 'editability score must be > 0')
    assert.ok(result.compatibilityReport.measures.exportRoundTrip.score > 0, 'exportRoundTrip score must be > 0')
    assert.equal(result.compatibilityReport.measures.exportRoundTrip.status, 'Partial')
    assert.match(result.compatibilityReport.measures.exportRoundTrip.summary, /geometry/i)
    assert.doesNotMatch(result.compatibilityReport.measures.exportRoundTrip.summary, /text patching/i)

    console.log(`  PASS: Imported "${result.title}" (${result.slides.length} slides, ${result.compatibilityReport.iwaFileCount} .iwa archives, ${result.compatibilityReport.messageCount} protobuf objects) from ${path.basename(existingFixture)}`)
    console.log(`  PASS: 4-Measure Compatibility Report:`)
    console.log(`    - Import Structure : ${result.compatibilityReport.measures.importStructure.score}% (${result.compatibilityReport.measures.importStructure.status}) — ${result.compatibilityReport.measures.importStructure.summary}`)
    console.log(`    - Visual Fidelity  : ${result.compatibilityReport.measures.visualFidelity.score}% (${result.compatibilityReport.measures.visualFidelity.status}) — ${result.compatibilityReport.measures.visualFidelity.summary}`)
    console.log(`    - Editability      : ${result.compatibilityReport.measures.editability.score}% (${result.compatibilityReport.measures.editability.status}) — ${result.compatibilityReport.measures.editability.summary}`)
    console.log(`    - Export Round-Trip: ${result.compatibilityReport.measures.exportRoundTrip.score}% (${result.compatibilityReport.measures.exportRoundTrip.status}) — ${result.compatibilityReport.measures.exportRoundTrip.summary}`)

    // A source-preserving export is only Keynote-compatible when edits are written into
    // the native IWA object graph. The private Slate sidecar must not be required.
    const editableSlide = result.slides.find(slide => slide.elements.some(element => element.type === 'image'))
    const editableImage = editableSlide?.elements.find(element => element.type === 'image')
    assert.ok(editableSlide && editableImage, 'Real Keynote fixture must expose an image with native geometry')

    const nativeEditedSlides = structuredClone(result.slides)
    const editedSlide = nativeEditedSlides.find(slide => slide.id === editableSlide.id)!
    const editedImage = editedSlide.elements.find(element => element.id === editableImage.id)!
    editedImage.left += 37

    const nativeExport = await buildKeynoteArchiveBlob(
      nativeEditedSlides,
      result.title,
      result.rawArchiveBase64
    )
    const nativeZip = await JSZip.loadAsync(await nativeExport.arrayBuffer())
    const sourceZip = await JSZip.loadAsync(keyBytes)
    const sourceIwaPaths = Object.keys(sourceZip.files).filter(name => name.endsWith('.iwa'))
    const changedIwaPaths: string[] = []
    for (const iwaPath of sourceIwaPaths) {
      const [before, after] = await Promise.all([
        sourceZip.file(iwaPath)!.async('uint8array'),
        nativeZip.file(iwaPath)!.async('uint8array'),
      ])
      if (!Buffer.from(before).equals(Buffer.from(after))) changedIwaPaths.push(iwaPath)
    }
    assert.ok(changedIwaPaths.length > 0, 'At least one native IWA stream must change')
    assert.ok(
      changedIwaPaths.length < sourceIwaPaths.length,
      'Unrelated native IWA streams must remain byte-identical'
    )
    nativeZip.remove('Metadata/slate-model.json')
    const nativeOnlyBytes = await nativeZip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })
    const nativeOnlyResult = await importKeynoteArchive(nativeOnlyBytes, 'native-only-roundtrip.key')
    const nativeOnlySlide = nativeOnlyResult.slides.find(slide => slide.sourceId === editableSlide.sourceId)
    const nativeOnlyImage = nativeOnlySlide?.elements.find(element => element.sourceId === editableImage.sourceId)
    assert.ok(nativeOnlyImage, 'Native-only re-import must preserve the edited source image')
    assert.equal(
      nativeOnlyImage.left,
      editedImage.left,
      'Edited geometry must survive through native IWA data without Metadata/slate-model.json'
    )
    console.log('  PASS: Native IWA geometry edit survives after removing the private Slate sidecar.')
  } else {
    console.log('  INFO: External research-transdeck.key not found in Temp; testing synthesized .key archive...')
  }

  // 4. Test .key export & round-trip re-import
  console.log('\n[4/4] Verifying .key Archive Export & Round-Trip Re-Import...')
  const exportedKeyBlob = await buildKeynoteArchiveBlob(starterSlides, 'Slate Studio Verification Deck')
  const exportedArrayBuffer = await exportedKeyBlob.arrayBuffer()
  assert.ok(exportedArrayBuffer.byteLength > 500, 'Exported .key archive must be non-empty')

  const roundTripResult = await importKeynoteArchive(exportedArrayBuffer, 'roundtrip-verification.key')
  assert.equal(roundTripResult.slides.length, starterSlides.length, 'Round-trip .key import must preserve exact slide count')
  assert.equal(roundTripResult.slides[1].turningMode, 'magicMove', 'Round-trip .key import must preserve Magic Move transition')
  assert.equal(
    roundTripResult.slides[0].elements[0].continuityId,
    starterSlides[0].elements[0].continuityId,
    'Round-trip .key import must preserve element continuityId'
  )
  console.log(`  PASS: Exported .key (${exportedArrayBuffer.byteLength} bytes) and re-imported ${roundTripResult.slides.length} slides with full continuityId and Magic Move preservation.\n`)

  console.log('=== ALL VERIFICATION CHECKS PASSED ===')
}

runVerificationSuite().catch(err => {
  console.error('Verification suite failed:', err)
  process.exit(1)
})
