import type {
  AnimationTrigger,
  ActionAnimationParams,
  KeynoteBuildSnapshot,
  KeynoteSlideSnapshot,
  PPTAnimation,
  Slide,
  SlideTransition,
  TextMatchGranularity,
  TransitionAcceleration,
} from '@/types/slides'
import { isMagicMove } from '../../configs/transitions.ts'
import { KEYNOTE_BUILD_KIND, buildKindOf, type BuildKind } from '../../configs/builds.ts'
import {
  type IWAObjectRecord,
  encodeProtoBytesField,
  encodeProtoVarintField,
  rebuildMessage,
  extractReferenceId,
  firstBytes,
  firstDouble,
  firstString,
  firstVarint,
  repeatedReferences,
  setDoubleField,
  setStringField,
  upsertProtoField,
} from './codec.ts'
import {
  IWA_TYPE,
  type NativeIndex,
} from './document.ts'

// --- Transitions -------------------------------------------------------------

const TIMING_CURVE_TO_ACCELERATION: Record<number, TransitionAcceleration> = {
  1: 'constant',
  2: 'easeIn',
  3: 'easeOut',
  4: 'easeInOut',
}
const ACCELERATION_TO_TIMING_CURVE: Record<TransitionAcceleration, number> = {
  constant: 1,
  easeIn: 2,
  easeOut: 3,
  easeInOut: 4,
}
const TEXT_DELIVERY_TO_MATCH: Record<number, TextMatchGranularity> = { 1: 'object', 2: 'word', 3: 'character' }
const MATCH_TO_TEXT_DELIVERY: Record<TextMatchGranularity, number> = { object: 1, word: 2, character: 3 }

const seconds = (value: number | undefined, fallback: number) =>
  value !== undefined && value >= 0 && value < 600 ? Math.round(value * 1000) : fallback

/**
 * KN.SlideArchive.transition -> KN.TransitionArchive.attributes ->
 * KN.TransitionAttributesArchive.animationAttributes (KN.AnimationAttributesArchive).
 */
export const readSlideTransition = (slide: IWAObjectRecord): SlideTransition => {
  const attributes = firstBytes(firstBytes(slide.data, 4), 2)
  const animation = firstBytes(attributes, 8)
  // Keynote 9 and earlier stored the same values directly on the attributes.
  const effect = firstString(animation, 2) ?? firstString(attributes, 2) ?? 'none'
  const transition: SlideTransition = {
    effect: effect || 'none',
    duration: seconds(firstDouble(animation, 3) ?? firstDouble(attributes, 3), 1000),
    startMode: (firstVarint(animation, 6) ?? firstVarint(attributes, 6)) === 1 ? 'auto' : 'click',
    delay: seconds(firstDouble(animation, 5), 0),
  }
  const direction = firstVarint(animation, 4) ?? firstVarint(attributes, 4)
  if (direction !== undefined) transition.direction = direction
  if (isMagicMove(transition)) {
    transition.acceleration = TIMING_CURVE_TO_ACCELERATION[firstVarint(attributes, 15) ?? 4] ?? 'easeInOut'
    transition.unmatchedBehavior = firstVarint(attributes, 13) === 0 ? 'instant' : 'fade'
    transition.textMatchMode = TEXT_DELIVERY_TO_MATCH[firstVarint(attributes, 16) ?? 1] ?? 'object'
  }
  return transition
}

const sameTransition = (a: SlideTransition, b: SlideTransition) =>
  a.effect === b.effect
  && a.duration === b.duration
  && a.startMode === b.startMode
  && a.delay === b.delay
  && a.direction === b.direction
  && a.acceleration === b.acceleration
  && a.unmatchedBehavior === b.unmatchedBehavior
  && a.textMatchMode === b.textMatchMode

/**
 * Write the slide's transition into KN.SlideArchive.transition when it differs
 * from the native one; untouched transitions are never rewritten.
 */
export const patchSlideTransition = (payload: Uint8Array, slide: Slide): { payload: Uint8Array; snapshot: KeynoteSlideSnapshot } | null => {
  const native = slide.sourceSnapshot?.transition
  if (!native) return null
  const transition = slide.transition ?? { ...native, effect: 'none' }
  if (sameTransition(transition, native)) return null

  const transitionArchive = firstBytes(payload, 4) ?? new Uint8Array()
  let attributes = firstBytes(transitionArchive, 2) ?? new Uint8Array()
  let animation = firstBytes(attributes, 8) ?? encodeProtoBytesField(1, new TextEncoder().encode('Transition'))
  animation = setStringField(animation, 2, transition.effect)
  animation = setDoubleField(animation, 3, transition.duration / 1000)
  animation = setDoubleField(animation, 5, transition.delay / 1000)
  animation = upsertProtoField(animation, 6, transition.startMode === 'auto' ? 1 : 0)
  if (transition.direction !== undefined) animation = upsertProtoField(animation, 4, transition.direction)
  attributes = upsertProtoField(attributes, 8, animation)
  if (isMagicMove(transition)) {
    attributes = upsertProtoField(attributes, 15, ACCELERATION_TO_TIMING_CURVE[transition.acceleration ?? 'easeInOut'])
    attributes = upsertProtoField(attributes, 13, transition.unmatchedBehavior === 'instant' ? 0 : 1)
    attributes = upsertProtoField(attributes, 16, MATCH_TO_TEXT_DELIVERY[transition.textMatchMode ?? 'object'])
  }
  return {
    payload: upsertProtoField(payload, 4, upsertProtoField(transitionArchive, 2, attributes)),
    snapshot: { transition },
  }
}

// --- Builds ------------------------------------------------------------------

/**
 * Chunk timing → KeyNot trigger. Keynote writes On Click as automatic=false,
 * referent=true (KeynoteKit). Automatic chunks are read as "After Previous" unless
 * referent is explicitly false, which is taken as "With Previous" (inferred; not
 * yet confirmed against a Keynote-authored deck).
 */
const triggerOfChunk = (chunk: Uint8Array | undefined): AnimationTrigger => {
  if (firstVarint(chunk, 5) !== 1) return 'click'
  return firstVarint(chunk, 6) === 0 ? 'meantime' : 'auto'
}

export interface NativeBuild {
  actionParams?: ActionAnimationParams
  buildId: number
  chunkIds: number[]
  drawableId: number
  kind: BuildKind
  effect: string
  durationMs: number
  delayMs: number
  trigger: AnimationTrigger
}

/** Builds in playback order: KN.SlideArchive.buildChunks (43), then any build not chunked. */
export const readSlideBuilds = (slide: IWAObjectRecord, index: NativeIndex): NativeBuild[] => {
  const builds = new Map<number, NativeBuild>()
  const order: number[] = []
  const addBuild = (buildId: number, chunkId: number | null, chunk?: Uint8Array) => {
    const existing = builds.get(buildId)
    if (existing) {
      if (chunkId !== null) existing.chunkIds.push(chunkId)
      return
    }
    const build = index.objects.get(buildId)
    if (!build || build.type !== IWA_TYPE.build) return
    const drawableId = extractReferenceId(firstBytes(build.data, 1))
    const animation = firstBytes(firstBytes(build.data, 4), 18)
    const attributes = firstBytes(build.data, 4)
    const effect = firstString(animation, 2)
    if (drawableId === null || !effect) return
    const seconds = firstDouble(chunk, 4) ?? firstDouble(animation, 3)
    const delay = firstDouble(chunk, 3) ?? firstDouble(animation, 5)
    builds.set(buildId, {
      buildId,
      chunkIds: chunkId !== null ? [chunkId] : [],
      drawableId,
      kind: buildKindOf(firstString(animation, 1) ?? 'In'),
      effect,
      durationMs: seconds !== undefined && seconds >= 0 && seconds < 600 ? Math.round(seconds * 1000) : 1000,
      delayMs: delay !== undefined && delay > 0 && delay < 600 ? Math.round(delay * 1000) : 0,
      trigger: triggerOfChunk(chunk),
      ...(buildKindOf(firstString(animation, 1) ?? 'In') === 'action' ? { actionParams: {
        ...(firstDouble(attributes, 9) !== undefined ? { rotate: firstDouble(attributes, 9) } : {}),
        ...(firstDouble(attributes, 11) !== undefined ? { scale: firstDouble(attributes, 11) } : {}),
        ...(firstDouble(attributes, 12) !== undefined ? { opacity: firstDouble(attributes, 12) } : {}),
      } } : {}),
    })
    order.push(buildId)
  }
  for (const chunkId of repeatedReferences(slide.data, 43)) {
    const chunk = index.objects.get(chunkId)
    if (!chunk || chunk.type !== IWA_TYPE.buildChunk) continue
    const buildId = extractReferenceId(firstBytes(chunk.data, 1))
    if (buildId !== null) addBuild(buildId, chunkId, chunk.data)
  }
  for (const buildId of repeatedReferences(slide.data, 2)) addBuild(buildId, null)
  return order.map(id => builds.get(id)!)
}

export const buildSnapshotOf = (build: NativeBuild): KeynoteBuildSnapshot => ({
  buildId: String(build.buildId),
  chunkIds: build.chunkIds.map(String),
  kind: build.kind,
  effect: build.effect,
  duration: build.durationMs,
  delay: build.delayMs,
  trigger: build.trigger,
  ...(build.actionParams ? { actionParams: { ...build.actionParams } } : {}),
})

/** The animation as Keynote values: kind, native effect and timing. */
export const animationAsBuild = (animation: PPTAnimation): Omit<KeynoteBuildSnapshot, 'buildId' | 'chunkIds'> => ({
  kind: animation.type === 'out' ? 'out' : animation.type === 'in' ? 'in' : 'action',
  effect: animation.keynoteEffect ?? '',
  duration: animation.duration,
  delay: animation.delay ?? 0,
  trigger: animation.trigger,
  ...(animation.type === 'action' && animation.actionParams ? { actionParams: { ...animation.actionParams } } : {}),
})

const sameBuild = (a: Omit<KeynoteBuildSnapshot, 'buildId' | 'chunkIds'>, b: KeynoteBuildSnapshot) =>
  a.kind === b.kind && a.effect === b.effect && a.duration === b.duration && a.delay === b.delay && a.trigger === b.trigger
  && JSON.stringify(a.actionParams) === JSON.stringify(b.actionParams)

export interface BuildPlan {
  /** Record id → replacement payload for edited builds and chunks. */
  records: Map<number, (payload: Uint8Array) => Uint8Array>
  /** New playback order of chunk references, or null when unchanged. */
  chunkOrder: number[] | null
  /** Build references kept on the slide, in order (null when unchanged). */
  buildOrder: number[] | null
  managedBuildIds: number[]
  managedChunkIds: number[]
  edited: number
  removed: number
}

/**
 * Compare a slide's animations with its native builds. Edited effects and timing
 * patch the KN.BuildArchive / KN.BuildChunkArchive records; reordering and
 * removal rewrite the slide's build lists. New KeyNot builds are not written.
 */
export const planSlideBuilds = (slide: Slide): BuildPlan | null => {
  const native = slide.sourceSnapshot?.builds
  if (!native?.length) return null
  const animations = slide.animations ?? []
  const byBuild = new Map<string, PPTAnimation>()
  for (const animation of animations) {
    if (animation.sourceBuildId && !byBuild.has(animation.sourceBuildId)) byBuild.set(animation.sourceBuildId, animation)
  }
  const plan: BuildPlan = { records: new Map(), chunkOrder: null, buildOrder: null, managedBuildIds: native.map(build => Number(build.buildId)), managedChunkIds: native.flatMap(build => build.chunkIds.map(Number)), edited: 0, removed: 0 }

  for (const snapshot of native) {
    const animation = byBuild.get(snapshot.buildId)
    if (!animation) {
      plan.removed++
      continue
    }
    const current = animationAsBuild(animation)
    if (!current.effect || sameBuild(current, snapshot)) continue
    plan.edited++
    plan.records.set(Number(snapshot.buildId), payload => {
      let attributes = firstBytes(payload, 4) ?? new Uint8Array()
      if (current.actionParams?.rotate !== undefined) attributes = setDoubleField(attributes, 9, current.actionParams.rotate)
      if (current.actionParams?.scale !== undefined) attributes = setDoubleField(attributes, 11, current.actionParams.scale)
      if (current.actionParams?.opacity !== undefined) attributes = setDoubleField(attributes, 12, current.actionParams.opacity)
      let animationAttributes = firstBytes(attributes, 18) ?? new Uint8Array()
      animationAttributes = setStringField(animationAttributes, 1, KEYNOTE_BUILD_KIND[current.kind])
      animationAttributes = setStringField(animationAttributes, 2, current.effect)
      animationAttributes = setDoubleField(animationAttributes, 3, current.duration / 1000)
      animationAttributes = setDoubleField(animationAttributes, 5, current.delay / 1000)
      return upsertProtoField(payload, 4, upsertProtoField(attributes, 18, animationAttributes))
    })
    snapshot.chunkIds.forEach((chunkId, position) => {
      plan.records.set(Number(chunkId), payload => {
        let next = setDoubleField(payload, 4, current.duration / 1000)
        // Start and delay belong to the first stage; later paragraph stages follow it.
        if (position === 0) {
          next = setDoubleField(next, 3, current.delay / 1000)
          next = upsertProtoField(next, 5, current.trigger === 'click' ? 0 : 1)
          next = upsertProtoField(next, 6, current.trigger === 'meantime' ? 0 : 1)
        }
        return next
      })
    })
  }

  const keptInOrder = animations
    .map(animation => animation.sourceBuildId)
    .filter((id, position, all): id is string => !!id && all.indexOf(id) === position && native.some(build => build.buildId === id))
  const nativeOrder = native.map(build => build.buildId)
  if (plan.removed || keptInOrder.join() !== nativeOrder.filter(id => keptInOrder.includes(id)).join()) {
    plan.buildOrder = keptInOrder.map(Number)
    plan.chunkOrder = keptInOrder.flatMap(id => native.find(build => build.buildId === id)!.chunkIds.map(Number))
  }
  return plan.records.size || plan.buildOrder ? plan : null
}

/** Rewrite KN.SlideArchive.builds (2) and buildChunks (43) in the planned order. */
export const reorderSlideBuildLists = (payload: Uint8Array, plan: BuildPlan): Uint8Array => {
  if (!plan.buildOrder || !plan.chunkOrder) return payload
  const reference = (id: number) => encodeProtoVarintField(1, id)
  return rebuildMessage(
    payload,
    field => (field.fieldNumber === 2 || field.fieldNumber === 43) && field.bytes ? null : undefined,
    [
      ...plan.buildOrder.concat(repeatedReferences(payload, 2).filter(id => !plan.managedBuildIds.includes(id))).map(id => encodeProtoBytesField(2, reference(id))),
      ...plan.chunkOrder.concat(repeatedReferences(payload, 43).filter(id => !plan.managedChunkIds.includes(id))).map(id => encodeProtoBytesField(43, reference(id))),
    ]
  )
}

/** Clear KN.SlideNodeArchive build caches so Keynote recounts the builds. */
export const invalidateSlideNodeBuildCache = (payload: Uint8Array, hasBuilds: boolean): Uint8Array => {
  let next = upsertProtoField(payload, 6, hasBuilds ? 1 : 0)
  next = upsertProtoField(next, 20, hasBuilds ? 1 : 0)
  next = upsertProtoField(next, 26, 0xFFFFFFFF)
  next = upsertProtoField(next, 27, 0xFFFFFFFF)
  return next
}
