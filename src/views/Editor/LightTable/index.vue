<template>
  <div class="keynote-light-table" v-contextmenu="contextmenusTable">
    <!-- Studio Header Bar -->
    <div class="light-table-header">
      <div class="header-left">
        <div class="view-tag">
          <i-icon-park-outline:view-grid-card class="view-icon" />
          <span class="title">Light Table</span>
          <span class="slide-count-badge">{{ filteredSlides.length }} of {{ slides.length }} Slides</span>
        </div>
        <div class="search-box">
          <i-icon-park-outline:search class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search slide text..."
            class="search-input"
          />
          <span class="clear-btn" v-if="searchQuery" @click="searchQuery = ''">✕</span>
        </div>
      </div>

      <div class="header-center">
        <div class="zoom-slider-group">
          <span class="zoom-label">Card Size</span>
          <i-icon-park-outline:pic class="mini-icon" />
          <input
            type="range"
            min="140"
            max="340"
            step="10"
            v-model.number="cardWidth"
            class="size-range"
          />
          <i-icon-park-outline:picture class="mini-icon" />
          <span class="zoom-value">{{ cardWidth }}px</span>
        </div>
      </div>

      <div class="header-right">
        <div class="action-btn" @click="createSlide()" v-tooltip="'Add Blank Slide'">
          <i-icon-park-outline:plus class="btn-icon" /> Add Slide
        </div>
        <div class="action-btn primary" @click="exitLightTable()" v-tooltip="'Return to Navigator (Esc)'">
          <i-icon-park-outline:back class="btn-icon" /> Done
        </div>
      </div>
    </div>

    <!-- Draggable Slide Grid -->
    <div class="grid-scroll-area">
      <Draggable
        class="cards-grid"
        :modelValue="slides"
        :animation="220"
        itemKey="id"
        @end="handleDragEnd"
      >
        <template #item="{ element, index }">
          <div
            class="light-table-card"
            :class="{
              'active': slideIndex === index,
              'dimmed': searchQuery && !slideMatchesSearch(element),
              'matched': searchQuery && slideMatchesSearch(element),
            }"
            :style="{ width: `${cardWidth}px` }"
            @click="handleSelect(index)"
            @dblclick="handleOpenSlide(index)"
            v-contextmenu="() => contextmenusCard(index)"
          >
            <!-- Card Slide Viewport -->
            <div class="card-viewport" :style="{ width: `${cardWidth}px`, height: `${cardWidth * viewportRatio}px` }">
              <ThumbnailSlide :slide="element" :size="cardWidth" />

              <!-- Quick Hover Bar -->
              <div class="hover-overlay">
                <div class="open-btn" @click.stop="handleOpenSlide(index)" title="Edit this Slide">
                  <i-icon-park-outline:edit-two /> Open
                </div>
              </div>
            </div>

            <!-- Card Footer Meta -->
            <div class="card-meta">
              <div class="meta-left">
                <span class="slide-number">{{ index + 1 }}</span>
                <span class="badge magic" v-if="element.turningMode === 'magicMove'" title="Object Transition (Magic Move)">✦ Magic</span>
                <span class="badge builds" v-else-if="element.animations && element.animations.length" title="Element Builds">● {{ element.animations.length }}</span>
              </div>
              <div class="meta-right">
                <span class="badge notes" v-if="element.remark" title="Has Presenter Notes"><i-icon-park-outline:notes /></span>
                <span class="badge comments" v-if="element.notes && element.notes.length" title="Comments">💬 {{ element.notes.length }}</span>
              </div>
            </div>
          </div>
        </template>
      </Draggable>

      <div class="empty-results" v-if="searchQuery && !filteredSlides.length">
        No slides found matching "{{ searchQuery }}"
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import type { Slide } from '@/types/slides'
import type { ContextmenuItem } from '@/components/Contextmenu/types'
import useSlideHandler from '@/hooks/useSlideHandler'
import useScreening from '@/hooks/useScreening'
import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import Draggable from 'vuedraggable'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { slides, slideIndex, viewportRatio } = storeToRefs(slidesStore)

const cardWidth = ref(210)
const searchQuery = ref('')

const {
  createSlide,
  copySlide,
  pasteSlide,
  copyAndPasteSlide,
  deleteSlide,
  cutSlide,
  sortSlides,
} = useSlideHandler()

const { enterScreening } = useScreening()

const slideMatchesSearch = (slide: Slide): boolean => {
  if (!searchQuery.value.trim()) return true
  const query = searchQuery.value.toLowerCase()
  // Check text elements
  for (const el of slide.elements) {
    if (el.type === 'text' && el.content && el.content.toLowerCase().includes(query)) {
      return true
    }
    if (el.type === 'shape' && el.text?.content && el.text.content.toLowerCase().includes(query)) {
      return true
    }
  }
  // Check remark
  if (slide.remark && slide.remark.toLowerCase().includes(query)) return true
  return false
}

const filteredSlides = computed(() => {
  if (!searchQuery.value.trim()) return slides.value
  return slides.value.filter(slideMatchesSearch)
})

const handleSelect = (index: number) => {
  slidesStore.updateSlideIndex(index)
}

const handleOpenSlide = (index: number) => {
  slidesStore.updateSlideIndex(index)
  mainStore.setEditorViewMode('navigator')
}

const exitLightTable = () => {
  mainStore.setEditorViewMode('navigator')
}

const handleDragEnd = (event: { newIndex: number; oldIndex: number }) => {
  const { newIndex, oldIndex } = event
  sortSlides(oldIndex, newIndex)
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    exitLightTable()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

const contextmenusCard = (index: number): ContextmenuItem[] => {
  return [
    {
      text: 'Open Slide',
      subText: 'Enter',
      handler: () => handleOpenSlide(index),
    },
    {
      text: 'Play from Here',
      subText: 'Shift+F5',
      handler: () => {
        slidesStore.updateSlideIndex(index)
        enterScreening()
      },
    },
    { divider: true },
    {
      text: 'Duplicate Slide',
      subText: 'Ctrl+D',
      handler: () => {
        slidesStore.updateSlideIndex(index)
        copyAndPasteSlide()
      },
    },
    {
      text: 'Copy',
      subText: 'Ctrl+C',
      handler: () => {
        slidesStore.updateSlideIndex(index)
        copySlide()
      },
    },
    {
      text: 'Cut',
      subText: 'Ctrl+X',
      handler: () => {
        slidesStore.updateSlideIndex(index)
        cutSlide()
      },
    },
    {
      text: 'Delete Slide',
      subText: 'Delete',
      disable: slides.value.length <= 1,
      handler: () => {
        slidesStore.updateSlideIndex(index)
        deleteSlide()
      },
    },
  ]
}

const contextmenusTable = (): ContextmenuItem[] => {
  return [
    {
      text: 'Add Slide',
      subText: 'Enter',
      handler: createSlide,
    },
    {
      text: 'Paste Slide',
      subText: 'Ctrl+V',
      handler: pasteSlide,
    },
    { divider: true },
    {
      text: 'Exit Light Table',
      subText: 'Esc',
      handler: exitLightTable,
    },
  ]
}
</script>

<style lang="scss" scoped>
.keynote-light-table {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-canvas, #161618);
  user-select: none;
  overflow: hidden;
}

.light-table-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background-color: var(--bg-header, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  flex-shrink: 0;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;

  .view-tag {
    display: flex;
    align-items: center;
    gap: 8px;

    .view-icon {
      font-size: var(--text-lg);
      color: var(--accent-color, #007aff);
    }
    .title {
      font-size: var(--text-md);
      font-weight: 600;
      color: var(--text-primary, #1d1d1f);
    }
    .slide-count-badge {
      font-size: var(--text-xs);
      padding: 2px 7px;
      border-radius: 999px;
      background: var(--bg-control, rgba(0, 0, 0, 0.06));
      color: var(--text-secondary, #86868b);
      font-weight: 500;
    }
  }

  .search-box {
    position: relative;
    display: flex;
    align-items: center;

    .search-icon {
      position: absolute;
      left: 8px;
      font-size: var(--text-md);
      color: var(--text-tertiary, #86868b);
      pointer-events: none;
    }

    .search-input {
      width: 170px;
      height: 26px;
      padding: 0 24px 0 26px;
      border-radius: var(--radius-control);
      border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
      background: var(--bg-input, #fff);
      font-size: var(--text-xs);
      color: var(--text-primary, #1d1d1f);
      outline: none;
      transition: all 0.15s ease;

      &:focus {
        width: 220px;
        border-color: var(--accent-color, #007aff);
      }
    }

    .clear-btn {
      position: absolute;
      right: 7px;
      font-size: var(--text-xs);
      color: var(--text-tertiary, #86868b);
      cursor: pointer;
      &:hover {
        color: var(--text-primary, #1d1d1f);
      }
    }
  }
}

.header-center {
  display: flex;
  align-items: center;

  .zoom-slider-group {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-control, rgba(0, 0, 0, 0.04));
    padding: 3px 10px;
    border-radius: var(--radius-control);
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.05));

    .zoom-label {
      font-size: var(--text-xs);
      color: var(--text-tertiary, #86868b);
      font-weight: 500;
    }
    .mini-icon {
      font-size: var(--text-sm);
      color: var(--text-secondary, #515154);
    }
    .size-range {
      width: 100px;
      accent-color: var(--accent-color, #007aff);
      cursor: pointer;
    }
    .zoom-value {
      font-size: var(--text-xs);
      color: var(--text-secondary, #515154);
      min-width: 36px;
      font-variant-numeric: tabular-nums;
    }
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 28px;
    padding: 0 12px;
    border-radius: var(--radius-control);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    background: var(--bg-pill, rgba(255, 255, 255, 0.9));
    color: var(--text-primary, #1d1d1f);
    border: 1px solid var(--border-pill, rgba(0, 0, 0, 0.1));
    transition: all 0.15s ease;

    &:hover {
      background: var(--bg-pill-hover, #ffffff);
    }

    &.primary {
      background: var(--accent-color, #007aff);
      color: #fff;
      border-color: var(--accent-color, #007aff);
      &:hover {
        opacity: 0.92;
      }
    }

    .btn-icon {
      font-size: var(--text-md);
    }
  }
}

.grid-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.cards-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-content: flex-start;
}

.light-table-card {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-control);
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
  user-select: none;

  &.dimmed {
    opacity: 0.25;
  }
  &.matched {
    transform: scale(1.02);
  }

  .card-viewport {
    position: relative;
    border-radius: var(--radius-control);
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18), 0 1px 3px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: #fff;
    transition: box-shadow 0.15s ease;

    .hover-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.15s ease;

      .open-btn {
        padding: 6px 14px;
        background: rgba(255, 255, 255, 0.95);
        color: #1d1d1f;
        border-radius: 999px;
        font-size: var(--text-sm);
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        display: inline-flex;
        align-items: center;
        gap: 5px;

        &:hover {
          background: #ffffff;
          transform: scale(1.04);
        }
      }
    }

    &:hover .hover-overlay {
      opacity: 1;
    }
  }

  &.active .card-viewport {
    box-shadow: 0 0 0 2.5px var(--accent-color, #007aff), 0 8px 24px rgba(0, 122, 255, 0.25);
  }

  .card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 4px 0;

    .meta-left {
      display: flex;
      align-items: center;
      gap: 6px;

      .slide-number {
        font-size: var(--text-xs);
        font-weight: 600;
        color: var(--text-tertiary, #86868b);
      }
    }

    .meta-right {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .badge {
      font-size: var(--text-xs);
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 500;

      &.magic {
        background: rgba(175, 82, 222, 0.15);
        color: #af52de;
      }
      &.builds {
        background: rgba(0, 122, 255, 0.15);
        color: var(--accent-color, #007aff);
      }
      &.notes {
        background: rgba(255, 149, 0, 0.15);
        color: #ff9500;
      }
      &.comments {
        background: rgba(52, 199, 89, 0.15);
        color: #34c759;
      }
    }
  }
}

.empty-results {
  width: 100%;
  padding: 60px 0;
  text-align: center;
  color: var(--text-tertiary, #86868b);
  font-size: var(--text-md);
}
</style>
