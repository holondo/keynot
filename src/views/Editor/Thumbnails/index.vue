<template>
  <div
    ref="rootRef"
    class="thumbnails"
    @mousedown="() => setThumbnailsFocus(true)"
    v-click-outside="() => setThumbnailsFocus(false)"
  >
    <Draggable 
      class="thumbnail-list"
      ref="thumbnailsRef"
      :modelValue="slides"
      :animation="200"
      :scroll="true"
      :scrollSensitivity="50"
      :disabled="editingSectionId"
      @end="handleDragEnd"
      itemKey="id"
      v-contextmenu="contextmenusThumbnails"
    >
      <template #item="{ element, index }">
        <div class="thumbnail-container">
          <div class="section-title"
            :data-section-id="element?.sectionTag?.id || ''"
            v-if="element.sectionTag || (hasSection && index === 0)" 
            v-contextmenu="contextmenusSection"
            @dblclick="() => editSection(element?.sectionTag?.id || '')"
          >
            <input 
              :id="`section-title-input-${element?.sectionTag?.id || 'default'}`" 
              type="text"
              :value="element?.sectionTag?.title || ''"
              placeholder="Section name"
              @blur="$event => saveSection($event)"
              @keydown.enter.stop="$event => saveSection($event)"
              v-if="editingSectionId === element?.sectionTag?.id || (index === 0 && editingSectionId === 'default')"
            >
            <span class="text" v-else>
              <div class="text-content">{{ element?.sectionTag ? (element?.sectionTag?.title || 'Untitled Section') : 'Default Section' }}</div>
            </span>
          </div>
          <div
            class="thumbnail-item"
            :class="{
              'active': slideIndex === index,
              'selected': selectedSlidesIndex.includes(index),
            }"
            @mousedown="$event => handleClickSlideThumbnail($event, index)"
            @dblclick="enterScreening()"
            v-contextmenu="contextmenusThumbnailItem"
          >
            <div class="label" :class="{ 'offset-left': index >= 99 }">
              <div class="slide-num">{{ index + 1 }}</div>
              <div
                class="magic-move-dot"
                v-if="element.turningMode === 'magicMove'"
                v-tooltip="'Magic Move Object Transition active'"
              >✦</div>
              <div
                class="build-dot"
                v-else-if="element.animations && element.animations.length"
                v-tooltip="`${element.animations.length} Build(s)`"
              >●</div>
            </div>
            <ThumbnailSlide class="thumbnail" :slide="element" :size="thumbSize" :visible="index < slidesLoadLimit" />
  
            <div class="note-flag" v-if="element.notes && element.notes.length" @click="openNotesPanel()">{{ element.notes.length }}</div>
          </div>
        </div>
      </template>
    </Draggable>

    <div class="navigator-footer">
      <PillButton class="add-slide-btn" size="compact" @click="createSlide()"><i-icon-park-outline:plus />{{ t('thumbnails.addSlide') }}</PillButton>
      <Popover trigger="click" placement="top-start" v-model:value="presetLayoutPopoverVisible" center :title="t('toolbar.addSlide')">
        <template #content>
          <Templates
            @select="slide => { createSlideByTemplate(slide); presetLayoutPopoverVisible = false }"
            @selectAll="({ slides, theme }) => { insertAllTemplates({ slides, theme }); presetLayoutPopoverVisible = false }"
          />
        </template>
        <PillButton caret size="compact" :aria-expanded="presetLayoutPopoverVisible" :hint="t('toolbar.chooseTheme')"><i-icon-park-outline:up /></PillButton>
      </Popover>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore, useKeyboardStore } from '@/store'
import { t } from '@/i18n'
import type { Slide, SlideTheme } from '@/types/slides'
import { isElementInViewport } from '@/utils/element'
import type { ContextmenuItem } from '@/components/Contextmenu/types'
import useSlideHandler from '@/hooks/useSlideHandler'
import useSectionHandler from '@/hooks/useSectionHandler'
import useScreening from '@/hooks/useScreening'
import useLoadSlides from '@/hooks/useLoadSlides'
import useAddSlidesOrElements from '@/hooks/useAddSlidesOrElements'

import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import Templates from './Templates.vue'
import Popover from '@/components/Popover.vue'
import PillButton from '@/components/ui/PillButton.vue'
import Draggable from 'vuedraggable'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const keyboardStore = useKeyboardStore()
const { selectedSlidesIndex: _selectedSlidesIndex, thumbnailsFocus } = storeToRefs(mainStore)
const { slides, slideIndex, currentSlide } = storeToRefs(slidesStore)
const { ctrlKeyState, shiftKeyState } = storeToRefs(keyboardStore)

const { slidesLoadLimit } = useLoadSlides()

const selectedSlidesIndex = computed(() => [..._selectedSlidesIndex.value, slideIndex.value])

const presetLayoutPopoverVisible = ref(false)

// Thumbnails fill the panel: width minus the shared gutter (--thumb-gutter) and number column.
const rootRef = useTemplateRef<HTMLElement>('rootRef')
const thumbSize = ref(140)
let thumbResizeObserver: ResizeObserver | null = null
onMounted(() => {
  if (!rootRef.value) return
  const measure = () => {
    const el = rootRef.value!
    const style = getComputedStyle(el)
    const gutter = parseFloat(style.getPropertyValue('--thumb-gutter')) || 10
    const number = parseFloat(style.getPropertyValue('--thumb-number')) || 18
    thumbSize.value = Math.max(60, Math.floor(el.clientWidth - gutter * 2 - number))
  }
  thumbResizeObserver = new ResizeObserver(measure)
  thumbResizeObserver.observe(rootRef.value)
  measure()
})
onBeforeUnmount(() => thumbResizeObserver?.disconnect())

const hasSection = computed(() => {
  return slides.value.some(item => item.sectionTag)
})

const { addSlidesFromData } = useAddSlidesOrElements()

const {
  copySlide,
  pasteSlide,
  createSlide,
  createSlideByTemplate,
  copyAndPasteSlide,
  deleteSlide,
  cutSlide,
  selectAllSlide,
  sortSlides,
  isEmptySlide,
} = useSlideHandler()

const {
  createSection,
  removeSection,
  removeAllSection,
  removeSectionSlides,
  updateSectionTitle,
} = useSectionHandler()

const thumbnailsRef = useTemplateRef<InstanceType<typeof Draggable>>('thumbnailsRef')
watch(() => slideIndex.value, () => {
  if (selectedSlidesIndex.value.length) {
    mainStore.updateSelectedSlidesIndex([])
  }

  nextTick(() => {
    const activeThumbnailRef: HTMLElement = thumbnailsRef.value?.$el?.querySelector('.thumbnail-item.active')
    if (thumbnailsRef.value && activeThumbnailRef && !isElementInViewport(activeThumbnailRef, thumbnailsRef.value.$el)) {
      setTimeout(() => {
        activeThumbnailRef.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  })
}, { immediate: true })

const changeSlideIndex = (index: number) => {
  mainStore.setActiveElementIdList([])

  if (slideIndex.value === index) return
  slidesStore.updateSlideIndex(index)
}

const handleClickSlideThumbnail = (e: MouseEvent, index: number) => {
  if (editingSectionId.value) return

  const isMultiSelected = selectedSlidesIndex.value.length > 1

  if (isMultiSelected && selectedSlidesIndex.value.includes(index) && e.button !== 0) return

  if (ctrlKeyState.value) {
    if (slideIndex.value === index) {
      if (!isMultiSelected) return

      const newSelectedSlidesIndex = selectedSlidesIndex.value.filter(item => item !== index)
      mainStore.updateSelectedSlidesIndex(newSelectedSlidesIndex)
      changeSlideIndex(selectedSlidesIndex.value[0])
    }
    else {
      if (selectedSlidesIndex.value.includes(index)) {
        const newSelectedSlidesIndex = selectedSlidesIndex.value.filter(item => item !== index)
        mainStore.updateSelectedSlidesIndex(newSelectedSlidesIndex)
      }
      else {
        const newSelectedSlidesIndex = [...selectedSlidesIndex.value, index]
        mainStore.updateSelectedSlidesIndex(newSelectedSlidesIndex)
      }
    }
  }
  else if (shiftKeyState.value) {
    if (slideIndex.value === index && !isMultiSelected) return

    let minIndex = Math.min(...selectedSlidesIndex.value)
    let maxIndex = index

    if (index < minIndex) {
      maxIndex = Math.max(...selectedSlidesIndex.value)
      minIndex = index
    }

    const newSelectedSlidesIndex = []
    for (let i = minIndex; i <= maxIndex; i++) newSelectedSlidesIndex.push(i)
    mainStore.updateSelectedSlidesIndex(newSelectedSlidesIndex)
  }
  else {
    mainStore.updateSelectedSlidesIndex([])
    changeSlideIndex(index)
  }
}

const setThumbnailsFocus = (focus: boolean) => {
  if (thumbnailsFocus.value === focus) return
  mainStore.setThumbnailsFocus(focus)

  if (!focus) mainStore.updateSelectedSlidesIndex([])
}

const handleDragEnd = (eventData: { newIndex: number; oldIndex: number }) => {
  const { newIndex, oldIndex } = eventData
  if (newIndex === undefined || oldIndex === undefined || newIndex === oldIndex) return
  sortSlides(newIndex, oldIndex)
}

const openNotesPanel = () => {
  mainStore.setNotesPanelState(true)
}

const editingSectionId = ref('')

const editSection = (id: string) => {
  mainStore.setDisableHotkeysState(true)
  editingSectionId.value = id || 'default'

  nextTick(() => {
    const inputRef = document.querySelector(`#section-title-input-${id || 'default'}`) as HTMLInputElement
    inputRef.focus()
  })
}

const saveSection = (e: FocusEvent | KeyboardEvent) => {
  const title = (e.target as HTMLInputElement).value
  updateSectionTitle(editingSectionId.value, title)

  editingSectionId.value = ''
  mainStore.setDisableHotkeysState(false)
}

const insertAllTemplates = ({ slides, theme }: { slides: Slide[], theme: Partial<SlideTheme> }) => {
  if (isEmptySlide.value) slidesStore.setSlides(slides, theme)
  else addSlidesFromData(slides)
}

const contextmenusSection = (el: HTMLElement): ContextmenuItem[] => {
  const sectionId = el.dataset.sectionId!

  return [
    {
      text: 'Remove Section Header',
      handler: () => removeSection(sectionId),
    },
    {
      text: 'Delete Section & Slides',
      handler: () => {
        mainStore.setActiveElementIdList([])
        removeSectionSlides(sectionId)
      },
    },
    {
      text: 'Remove All Sections',
      handler: removeAllSection,
    },
    {
      text: 'Rename Section',
      handler: () => editSection(sectionId),
    },
  ]
}

const { enterScreening, enterScreeningFromStart } = useScreening()

const contextmenusThumbnails = (): ContextmenuItem[] => {
  return [
    {
      text: t('thumbnails.paste'),
      subText: 'Ctrl + V',
      handler: pasteSlide,
    },
    {
      text: t('menu.editSelectAll'),
      subText: 'Ctrl + A',
      handler: selectAllSlide,
    },
    {
      text: t('thumbnails.addSlide'),
      subText: 'Enter',
      handler: createSlide,
    },
    {
      text: t('toolbar.playSlideshow'),
      subText: 'F5',
      handler: enterScreeningFromStart,
    },
  ]
}

const contextmenusThumbnailItem = (): ContextmenuItem[] => {
  return [
    {
      text: t('thumbnails.cut'),
      subText: 'Ctrl + X',
      handler: cutSlide,
    },
    {
      text: t('thumbnails.copy'),
      subText: 'Ctrl + C',
      handler: copySlide,
    },
    {
      text: t('thumbnails.paste'),
      subText: 'Ctrl + V',
      handler: pasteSlide,
    },
    {
      text: t('menu.editSelectAll'),
      subText: 'Ctrl + A',
      handler: selectAllSlide,
    },
    { divider: true },
    {
      text: t('thumbnails.addSlide'),
      subText: 'Enter',
      handler: createSlide,
    },
    {
      text: t('thumbnails.duplicateSlide'),
      subText: 'Ctrl + D',
      handler: copyAndPasteSlide,
    },
    {
      text: t('thumbnails.deleteSlide'),
      subText: 'Delete',
      handler: () => deleteSlide(),
    },
    {
      text: 'Add Section Header',
      handler: createSection,
      disable: !!currentSlide.value.sectionTag,
    },
    { divider: true },
    {
      text: t('toolbar.playFromCurrent'),
      subText: 'Shift + F5',
      handler: enterScreening,
    },
  ]
}
</script>

<style lang="scss" scoped>
/*
 * Symmetric geometry: equal gutter left/right, a narrow number column, and a
 * thumbnail radius concentric with the panel (panel radius - gutter).
 */
.thumbnails {
  --thumb-gutter: 10px;
  --thumb-number: 18px;
  --thumb-radius: calc(var(--radius-panel) - var(--thumb-gutter));
  display: flex;
  flex-direction: column;
  user-select: none;
}
.thumbnail-list {
  padding: var(--thumb-gutter) 0;
  flex: 1;
  overflow: auto;

  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.15);
  }
}
.thumbnail-item {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 5px var(--thumb-gutter) 5px 0;
  position: relative;
  gap: 0;

  .thumbnail {
    border-radius: var(--thumb-radius);
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);
    outline: 2px solid transparent;
    transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  }

  &:hover .thumbnail {
    outline-color: rgba(0, 122, 255, 0.35);
  }

  &.active {
    .label .slide-num {
      color: var(--text-primary, #1d1d1f);
      font-weight: 700;
    }
    .thumbnail {
      outline: 2.5px solid var(--accent-color, #007aff);
      box-shadow: 0 0 0 1px rgba(0, 122, 255, 0.25), 0 4px 16px rgba(0, 0, 0, 0.2);
    }
  }
  &.selected {
    .thumbnail {
      outline: 2.5px solid var(--accent-color, #007aff);
    }
    .note-flag {
      background-color: var(--accent-color, #007aff);

      &::after {
        border-top-color: var(--accent-color, #007aff);
      }
    }
  }

  .note-flag {
    width: 16px;
    height: 12px;
    border-radius: 2px;
    position: absolute;
    left: calc(var(--thumb-gutter) + var(--thumb-number) + 6px);
    top: 12px;
    font-size: var(--text-xs);
    background-color: #ffd60a;
    color: #1c1c1e;
    font-weight: 700;
    text-align: center;
    line-height: 12px;
    cursor: pointer;

    &::after {
      content: '';
      width: 0;
      height: 0;
      position: absolute;
      top: 10px;
      left: 4px;
      border: 4px solid transparent;
      border-top-color: #ffd60a;
    }
  }
}
.label {
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--text-tertiary, #86868b);
  width: calc(var(--thumb-gutter) + var(--thumb-number));
  padding-right: 6px;
  padding-top: 2px;
  cursor: grab;
  display: flex;
  flex-direction: column;
  align-items: flex-end;


  .magic-move-dot {
    color: #ff9f0a;
    font-size: var(--text-xs);
    margin-top: 2px;
  }

  .build-dot {
    color: var(--accent-color, #007aff);
    font-size: var(--text-xs);
    margin-top: 3px;
  }

  &.offset-left {
    position: relative;
    left: -2px;
  }

  &:active {
    cursor: grabbing;
  }
}
.navigator-footer {
  padding: 6px;
  border-top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--rail-gap);
}
.add-slide-btn { flex: 1 1 auto; }
.section-title {
  height: 26px;
  font-size: var(--text-xs);
  padding: 6px var(--thumb-gutter) 2px calc(var(--thumb-gutter) + var(--thumb-number));
  color: var(--text-tertiary, #86868b);
  font-weight: 600;

  &.contextmenu-active {
    color: var(--accent-color, #007aff);

    .text::before {
      border-bottom-color: var(--accent-color, #007aff);
      border-right-color: var(--accent-color, #007aff);
    }
  }

  .text {
    display: flex;
    align-items: center;
    position: relative;

    &::before {
      content: '';
      width: 0;
      height: 0;
      border-top: 3px solid transparent;
      border-left: 3px solid transparent;
      border-bottom: 3px solid var(--text-tertiary, #98989d);
      border-right: 3px solid var(--text-tertiary, #98989d);
      margin-right: 6px;
    }

    .text-content {
      display: inline-block;
      @include ellipsis-oneline();
    }
  }

  input {
    width: 100%;
    background: var(--bg-input, #2c2c2e);
    color: var(--text-primary, #fff);
    border: 1px solid var(--accent-color, #0a84ff);
    border-radius: var(--radius-control);
    outline: 0;
    padding: 1px 4px;
    font-size: var(--text-xs);
  }
}
</style>
