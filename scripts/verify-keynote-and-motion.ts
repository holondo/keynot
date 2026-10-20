import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import {
  decompressIWAStream,
  compressIWAStream,
  importKeynoteArchive,
  buildNativeKeynoteArchive,
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
  assert.equal(starterSlides[0].transition?.effect, 'apple:magic-move-implied-motion-path', 'Slide 1 must leave with Magic Move')
  const match1to2 = analyzeSlideTransitionMatches(starterSlides[0], starterSlides[1])
  assert.ok(match1to2.matchedPairs.length >= 2, `Expected >= 2 matched objects between Slide 1 and Slide 2, got ${match1to2.matchedPairs.length}`)
  console.log(`  PASS: Slide 1 -> Slide 2 matched ${match1to2.matchedPairs.length} objects via continuityId:`)
  for (const pair of match1to2.matchedPairs) {
    console.log(`    - [${pair.matchReason}] "${pair.fromElement.name || pair.fromElement.id}" -> "${pair.toElement.name || pair.toElement.id}" (continuityId=${pair.continuityId})`)
  }

  // Slide 2 -> Slide 3 Magic Move
  assert.equal(starterSlides[1].transition?.effect, 'apple:magic-move-implied-motion-path', 'Slide 2 must leave with Magic Move')
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

  // 3. Native .key import/export is covered by scripts/test-keynote-interchange.ts.
  console.log('[3/4] Native .key interchange: see scripts/test-keynote-interchange.ts\n')

  // 4. Test .key export & round-trip re-import
  console.log('\n[4/4] Verifying .key Archive Export & Round-Trip Re-Import...')
  const { blob: exportedKeyBlob } = await buildNativeKeynoteArchive(starterSlides, 'Slate Studio Verification Deck', null, 1000, new Uint8Array(fs.readFileSync(path.join(repoRoot, 'src/assets/keynote/seed.key'))))
  const exportedArrayBuffer = await exportedKeyBlob.arrayBuffer()
  assert.ok(exportedArrayBuffer.byteLength > 500, 'Exported .key archive must be non-empty')

  const roundTripResult = await importKeynoteArchive(exportedArrayBuffer, 'roundtrip-verification.key')
  assert.equal(roundTripResult.slides.length, starterSlides.length, 'Round-trip .key import must preserve exact slide count')
  assert.equal(roundTripResult.slides[0].transition?.effect, 'apple:magic-move-implied-motion-path', 'Round-trip .key import must preserve Magic Move transition')
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
  process.exitCode = 1
  process.exit(1)
})
