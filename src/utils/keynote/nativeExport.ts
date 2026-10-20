import type { Slide } from '@/types/slides'
import { buildKeynoteArchive } from './exporter.ts'
import { KEYNOT_VIEWPORT_SIZE } from './bridge.ts'

/** New decks start from a licensed native theme, with real show/component metadata. */
export const buildNativeKeynoteArchive = async (
  slides: Slide[], title: string, source?: string | null, viewportSize = KEYNOT_VIEWPORT_SIZE,
  seedBytes?: Uint8Array,
  viewportRatio?: number,
) => {
  if (source) return buildKeynoteArchive(slides, title, source, viewportSize, viewportRatio)
  if (!seedBytes) {
    const response = await fetch(new URL('../../assets/keynote/seed.key', import.meta.url))
    if (!response.ok) throw new Error('Could not load the native Keynote theme')
    seedBytes = new Uint8Array(await response.arrayBuffer())
  }
  let binary = ''
  for (let offset = 0; offset < seedBytes.length; offset += 0x8000) binary += String.fromCharCode(...seedBytes.subarray(offset, offset + 0x8000))
  const authored = JSON.parse(JSON.stringify(slides)) as Slide[]
  for (const slide of authored) {
    delete slide.sourceId
    delete slide.sourceCloneId
    delete slide.sourceSnapshot
    for (const element of slide.elements) {
      delete element.sourceId
      delete element.sourceCloneId
      delete element.sourceSnapshot
      delete element.sourceTextStorageId
      delete element.sourceAssetPath
      delete element.sourceType
    }
    for (const animation of slide.animations ?? []) delete animation.sourceBuildId
  }
  return buildKeynoteArchive(authored, title, btoa(binary), viewportSize, viewportRatio)
}
