import { storeToRefs } from 'pinia'
import { nanoid } from 'nanoid'
import { useSlidesStore, useMainStore } from '@/store'
import type { PPTElement, Slide } from '@/types/slides'
import { createSlideIdMap, createElementIdMap, getElementRange } from '@/utils/element'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

/**
 * A copy must not claim the native Keynote record of its original: export would
 * otherwise write two objects into one record.
 */
const detachNativeSource = (element: PPTElement) => {
  element.sourceCloneId ??= element.sourceId
  delete element.sourceId
  if (element.sourceType !== 'IWA:master') delete element.sourceType
  delete element.sourceAssetPath
}

export default () => {
  const mainStore = useMainStore()
  const slidesStore = useSlidesStore()
  const { currentSlide, slides: allSlides } = storeToRefs(slidesStore)

  const { addHistorySnapshot } = useHistorySnapshot()

  /**
   * Add elements to the current slide.
   * Same-slide paste generates a fresh continuityId to avoid accidental collisions,
   * while cross-slide paste preserves continuityId if no element on the current slide already uses it.
   */
  const addElementsFromData = (elements: PPTElement[]) => {
    const { groupIdMap, elIdMap } = createElementIdMap(elements)

    const firstElement = elements[0]
    let offset = 0
    let lastSameElement: PPTElement | undefined

    do {
      lastSameElement = currentSlide.value.elements.find(el => {
        if (el.type !== firstElement.type) return false

        const { minX: oMinX, maxX: oMaxX, minY: oMinY, maxY: oMaxY } = getElementRange(el)
        const { minX: nMinX, maxX: nMaxX, minY: nMinY, maxY: nMaxY } = getElementRange({
          ...firstElement,
          left: firstElement.left + offset,
          top: firstElement.top + offset
        })
        if (
          oMinX === nMinX &&
          oMaxX === nMaxX &&
          oMinY === nMinY &&
          oMaxY === nMaxY
        ) return true

        return false
      })
      if (lastSameElement) offset += 10

    } while (lastSameElement)

    const existingContinuityIds = new Set(
      currentSlide.value.elements.map(el => el.continuityId || el.id)
    )

    const nativeSourceIds = new Set(
      allSlides.value.flatMap(slide => slide.elements.map(el => el.sourceId).filter(Boolean))
    )

    for (const element of elements) {
      if (element.sourceId && nativeSourceIds.has(element.sourceId)) detachNativeSource(element)
      const originalContinuityId = element.continuityId || element.id
      const newId = elIdMap[element.id]
      element.id = newId

      if (existingContinuityIds.has(originalContinuityId)) {
        element.continuityId = `cont-${newId}`
      }
      else {
        element.continuityId = originalContinuityId
        existingContinuityIds.add(originalContinuityId)
      }

      element.left = element.left + offset
      element.top = element.top + offset

      if (element.groupId) element.groupId = groupIdMap[element.groupId]
    }
    slidesStore.addElement(elements)
    mainStore.setActiveElementIdList(Object.values(elIdMap))
    addHistorySnapshot()
  }

  /**
   * Add or duplicate slides.
   * Preserves continuityId on every element so Object Transition (Magic Move) works immediately after duplicating a slide.
   */
  const addSlidesFromData = (slides: Slide[]) => {
    const slideIdMap = createSlideIdMap(slides)
    const newSlides = slides.map(slide => {
      const { groupIdMap, elIdMap } = createElementIdMap(slide.elements)

      for (const element of slide.elements) {
        const preservedContinuityId = element.continuityId || element.id
        element.id = elIdMap[element.id]
        element.continuityId = preservedContinuityId
        detachNativeSource(element)
        if (element.groupId) element.groupId = groupIdMap[element.groupId]

        if (element.link && element.link.type === 'slide') {
          if (slideIdMap[element.link.target]) {
            element.link.target = slideIdMap[element.link.target]
          }
          else delete element.link
        }
      }
      if (slide.animations) {
        for (const animation of slide.animations) {
          animation.id = nanoid(10)
          animation.elId = elIdMap[animation.elId]
        }
      }
      const copy: Slide = { ...slide, id: slideIdMap[slide.id] }
      copy.sourceCloneId ??= copy.sourceId
      delete copy.sourceId
      return copy
    })
    slidesStore.addSlide(newSlides)
    addHistorySnapshot()
  }

  return {
    addElementsFromData,
    addSlidesFromData,
  }
}
