/**
 * Keynote transition model: catalog, defaults, PPTist-era migration and the
 * token pairing used by Magic Move "By Word" / "By Character".
 */
import assert from 'node:assert/strict'
import { TRANSITIONS, TRANSITION_GROUPS, createTransition, getTransitionDefinition, isMagicMove } from '../src/configs/transitions.ts'
import { migrateLegacyTransitions } from '../src/utils/transitionEngine.ts'
import { matchTokens } from '../src/utils/textMorph.ts'
import type { Slide } from '../src/types/slides.ts'

/** Transition identifiers in Keynote 15.2.1 (KeynoteKit catalog/effects-keynote-15.2.1.json). */
const KEYNOTE_15_2_1 = [
  'apple:magic-move-implied-motion-path', 'apple:ClotheslinePush', 'com.apple.iWork.Keynote.KLNConfetti', 'apple:dissolve',
  'apple:bounce', 'apple:droplet', 'apple:fade-and-move', 'com.apple.iWork.Keynote.BLTFadeThruColor', 'apple:apple-grid',
  'apple:wipe-iris', 'apple:slide', 'apple:push', 'apple:reveal', 'apple:FlipThrough', 'apple:wipe',
  'com.apple.iWork.Keynote.BLTBlinds', 'com.apple.iWork.Keynote.KLNColorPlanes', 'apple:3D-cube', 'apple:doorway', 'apple:fall',
  'apple:revolve', 'com.apple.iWork.Keynote.BUKFlop', 'com.apple.iWork.Keynote.BLTMosaicFlip', 'apple:pageflip', 'apple:pivot',
  'com.apple.iWork.Keynote.BLTReflection', 'com.apple.iWork.Keynote.BLTRevolvingDoor', 'apple:scale', 'com.apple.iWork.Keynote.KLNSwap',
  'com.apple.iWork.Keynote.BLTSwoosh', 'apple:twirl', 'com.apple.iWork.Keynote.BUKTwist', 'apple:ca-cube', 'apple:ca-dissolve-and-flip',
  'apple:ca-pop', 'apple:ca-push', 'apple:ca-revolve', 'apple:ca-zoom', 'apple:ca-isometric', 'apple:ca-text-shimmer',
  'apple:ca-text-sparkle', 'apple:ca-swing',
]

const tests: [string, () => void][] = [
  ['every Keynote transition is in the gallery exactly once', () => {
    const ids = TRANSITIONS.map(definition => definition.id)
    assert.equal(new Set(ids).size, ids.length, 'no duplicates')
    for (const id of KEYNOTE_15_2_1) assert.notEqual(getTransitionDefinition(id).label['en-US'], id, `${id} has a definition`)
    assert.ok(TRANSITIONS.every(definition => TRANSITION_GROUPS.some(group => group.id === definition.group)))
    assert.equal(getTransitionDefinition('apple:magic-move-implied-motion-path').engine, 'magicMove')
    assert.deepEqual(new Set(ids.filter(id => id !== 'none')), new Set(KEYNOTE_15_2_1), 'catalog uses the exact native ids')
  }],
  ['unknown effects keep their identifier and play as a dissolve', () => {
    const definition = getTransitionDefinition('com.example.FutureEffect')
    assert.equal(definition.id, 'com.example.FutureEffect')
    assert.equal(definition.engine, 'dissolve')
    assert.equal(definition.fidelity, 'approximate')
  }],
  ['new transitions use Keynote defaults', () => {
    assert.deepEqual(createTransition('apple:dissolve'), { effect: 'apple:dissolve', duration: 1000, startMode: 'click', delay: 0 })
    assert.deepEqual(createTransition('apple:push'), { effect: 'apple:push', duration: 1000, startMode: 'click', delay: 0, direction: 12 })
    const magic = createTransition('apple:magic-move')
    assert.equal(magic.duration, 2000)
    assert.ok(isMagicMove(magic))
    assert.equal(createTransition('apple:scale', { effect: 'apple:dissolve', duration: 1500, startMode: 'auto', delay: 250 }).duration, 1500, 'switching effect keeps timing')
  }],
  ['PPTist-era transitions move to the slide being left', () => {
    const legacy: Slide[] = [
      { id: 'a', elements: [] },
      { id: 'b', elements: [], turningMode: 'magicMove', transitionConfig: { duration: 950, textMatchMode: 'word' } },
      { id: 'c', elements: [], turningMode: 'slideX' },
      { id: 'd', elements: [] },
    ]
    const migrated = migrateLegacyTransitions(legacy)
    assert.equal(migrated[0].transition?.effect, 'apple:magic-move-implied-motion-path')
    assert.equal(migrated[0].transition?.duration, 950)
    assert.equal(migrated[0].transition?.textMatchMode, 'word')
    assert.deepEqual([migrated[1].transition?.effect, migrated[1].transition?.direction], ['apple:push', 12])
    assert.equal(migrated[2].transition, undefined, 'no legacy transition into the last slide')
    assert.equal(migrated[3].transition, undefined)
    assert.ok(migrated.every(slide => slide.turningMode === undefined && slide.transitionConfig === undefined))
    assert.equal(migrateLegacyTransitions(migrated), migrated, 'idempotent')
  }],
  ['word and character tokens pair by longest common subsequence', () => {
    assert.deepEqual(matchTokens(['Keynote', 'for', 'the', 'web'], ['KeyNot', 'for', 'the', 'web', 'too']), [[1, 1], [2, 2], [3, 3]])
    assert.deepEqual(matchTokens(['a', 'b', 'a'], ['a', 'a']), [[0, 0], [2, 1]])
    assert.deepEqual(matchTokens([], ['x']), [])
  }],
]

let failed = 0
for (const [name, run] of tests) {
  try {
    run()
    console.log(`  PASS  ${name}`)
  }
  catch (error) {
    failed++
    console.error(`  FAIL  ${name}\n${error instanceof Error ? error.stack : error}`)
  }
}
console.log(`\n${tests.length - failed}/${tests.length} transition checks passed`)
if (failed) process.exit(1)
