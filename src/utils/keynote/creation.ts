import type { Slide } from '@/types/slides'
import { BUILDS, KEYNOTE_BUILD_KIND } from '../../configs/builds.ts'
import {
  type IWAObjectRecord, concatBytes, encodeVarint, encodeProtoBytesField as bytes,
  encodeProtoVarintField as integer, encodeDoubleField as double, firstVarint,
  firstBytes, extractReferenceId, rebuildMessage, upsertProtoField, rewriteIWAObjects, parseIWAObjects,
} from './codec.ts'
import { IWA_TYPE } from './document.ts'
import { animationAsBuild, invalidateSlideNodeBuildCache } from './motion.ts'

const string = (field: number, value: string) => bytes(field, new TextEncoder().encode(value))
const reference = (field: number, id: number) => bytes(field, integer(1, id))

/** New records inherit the document's version stamp, never its reference lists. */
export const encodeNativeRecord = (id: number, type: number, payload: Uint8Array, template: IWAObjectRecord, refs: number[] = []) => {
  let info = rebuildMessage(template.messageInfo ?? new Uint8Array(), field =>
    field.fieldNumber !== 2 ? null : undefined)
  info = concatBytes([info, integer(1, type), integer(3, payload.length), ...refs.map(id => integer(5, id))])
  const archive = concatBytes([integer(1, id), bytes(2, info)])
  return concatBytes([encodeVarint(archive.length), archive, payload])
}

const uuid = () => {
  const random = crypto.getRandomValues(new Uint32Array(2))
  return concatBytes([integer(1, random[0]), integer(2, random[1])])
}

/** Materialize newly authored builds into the existing slide component. */
export const createNativeBuilds = (slides: Slide[], streams: Map<string, Uint8Array>, objects: Map<number, IWAObjectRecord>): number => {
  const metadata = [...objects.values()].find(record => record.type === IWA_TYPE.packageMetadata)
  if (!metadata) return 0
  let lastId = Math.max(firstVarint(metadata.data, 1) ?? 0, ...objects.keys())
  const payloads = new Map<number, Uint8Array>()
  const appended = new Map<string, Uint8Array[]>()
  const addedRefs = new Map<number, number[]>()
  let created = 0
  const ownedSlides = new Set<number>()
  for (const slide of slides) {
    const native = objects.get(Number(slide.sourceId))
    if (!native || native.type !== IWA_TYPE.slide || ownedSlides.has(native.id)) continue
    ownedSlides.add(native.id)
    const additions: number[] = []
    for (const animation of slide.animations ?? []) {
      if (animation.sourceBuildId) continue
      const target = slide.elements.find(element => element.id === animation.elId)
      const drawable = objects.get(Number(target?.sourceId))
      if (!drawable || target?.sourceType === 'IWA:master') continue
      const definition = animation.keynoteEffect
        ? BUILDS.find(build => build.id === animation.keynoteEffect && build.type === animation.type)
        : BUILDS.find(build => build.player === animation.effect && build.type === animation.type)
      if (!definition) continue
      // A motion path needs its native geometry, not only an effect identifier.
      if (definition.player === 'actionMove') continue
      const buildId = ++lastId
      const chunkId = ++lastId
      animation.keynoteEffect = definition.id
      animation.sourceBuildId = String(buildId)
      const values = animationAsBuild(animation)
      const attributes = concatBytes([
        ...(values.actionParams?.rotate !== undefined ? [double(9, values.actionParams.rotate)] : []),
        ...(values.actionParams?.scale !== undefined ? [double(11, values.actionParams.scale)] : []),
        ...(values.actionParams?.opacity !== undefined ? [double(12, values.actionParams.opacity)] : []),
        integer(4, 1), bytes(18, concatBytes([
          string(1, KEYNOTE_BUILD_KIND[values.kind]), string(2, values.effect),
          double(3, values.duration / 1000), double(5, values.delay / 1000),
        ])),
      ])
      const build = concatBytes([reference(1, drawable.id), string(2, 'All at Once'), bytes(4, attributes), integer(5, 1)])
      const buildUUID = uuid()
      const chunk = concatBytes([
        reference(1, buildId), double(3, values.delay / 1000), double(4, values.duration / 1000),
        integer(5, values.trigger === 'click' ? 0 : 1), integer(6, values.trigger === 'meantime' ? 0 : 1),
        bytes(7, concatBytes([bytes(1, buildUUID), integer(2, 1)])), bytes(8, buildUUID),
      ])
      const records = appended.get(native.sourceIwaPath) ?? []
      records.push(encodeNativeRecord(buildId, IWA_TYPE.build, build, native), encodeNativeRecord(chunkId, IWA_TYPE.buildChunk, chunk, native))
      appended.set(native.sourceIwaPath, records)
      payloads.set(native.id, concatBytes([payloads.get(native.id) ?? native.data, reference(2, buildId), reference(43, chunkId)]))
      additions.push(buildId, chunkId)
      slide.sourceSnapshot!.builds ??= []
      slide.sourceSnapshot!.builds.push({ buildId: String(buildId), chunkIds: [String(chunkId)], ...values })
      created++
    }
    if (additions.length) addedRefs.set(native.id, additions)
  }
  if (!created) return 0
  payloads.set(metadata.id, upsertProtoField(metadata.data, 1, lastId))
  for (const record of objects.values()) {
    if (record.type !== IWA_TYPE.slideNode) continue
    if (addedRefs.has(extractReferenceId(firstBytes(record.data, 2)) ?? -1)) payloads.set(record.id, invalidateSlideNodeBuildCache(record.data, true))
  }
  for (const [path, stream] of streams) {
    const rewritten = rewriteIWAObjects(stream, (id, type) => objects.get(id)?.type === type ? payloads.get(id) ?? null : null,
      (id, type, info) => {
        const refs = type === IWA_TYPE.slide ? addedRefs.get(id) : undefined
        return refs ? concatBytes([info, ...refs.map(id => integer(5, id))]) : info
      })
    const data = concatBytes([rewritten.bytes, ...(appended.get(path) ?? [])])
    streams.set(path, data)
    for (const record of parseIWAObjects(data, path)) if (!objects.has(record.id) || objects.get(record.id)?.type === record.type) objects.set(record.id, record)
  }
  return created
}
