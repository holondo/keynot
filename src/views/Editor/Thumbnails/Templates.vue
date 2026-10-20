<template>
  <div class="templates" ref="rootRef">
    <Tabs
      class="catalogs"
      segmented
      :tabs="templates.map(item => ({ key: item.id, label: item.name }))"
      :value="activeCatalog"
      @update:value="key => changeCatalog(key as string)"
    />
    <div class="header">
      <Tabs
        class="types"
        card
        :tabs="types.map(item => ({ key: item.value, label: item.label }))"
        :value="activeType"
        @update:value="key => activeType = key as string"
      />
      <PillButton size="compact" class="insert-all" @click="insertTemplates({ slides, theme })">Insert All</PillButton>
    </div>
    <div class="list" ref="listRef" v-loading="{ state: loading, text: 'Loading...' }">
      <template v-for="slide in slides" :key="slide.id">
        <!-- Tap/click inserts directly: no hover-only overlay, so it works on touch. -->
        <button
          v-if="slide.type === activeType || activeType === 'all'"
          type="button"
          class="slide-item"
          v-tooltip="{ content: 'Insert Slide', placement: 'top', delay: [500, 0] }"
          @click="insertTemplate(slide)"
        >
          <ThumbnailSlide class="thumbnail" :slide="slide" :size="thumbSize" />
        </button>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import type { Slide, SlideTheme } from '@/types/slides'
import api from '@/services'

import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import Tabs from '@/components/Tabs.vue'
import PillButton from '@/components/ui/PillButton.vue'

const emit = defineEmits<{
  (event: 'select', payload: Slide): void
  (event: 'selectAll', payload: { slides: Slide[], theme: Partial<SlideTheme> }): void
}>()

const slidesStore = useSlidesStore()
const { templates } = storeToRefs(slidesStore)

const slides = ref<Slide[]>([])
const theme = ref<Partial<SlideTheme>>({})
const listRef = useTemplateRef<HTMLElement>('listRef')
const types = ref<{
  label: string
  value: string
}[]>([
  { label: 'All', value: 'all' },
  { label: 'Cover', value: 'cover' },
  { label: 'Contents', value: 'contents' },
  { label: 'Section', value: 'transition' },
  { label: 'Content', value: 'content' },
  { label: 'Closing', value: 'end' },
])
const activeType = ref('all')

// Two fluid columns: thumbnail width follows the popover/sheet width.
const rootRef = useTemplateRef<HTMLElement>('rootRef')
const thumbSize = ref(180)
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  if (!rootRef.value) return
  const measure = () => { thumbSize.value = Math.max(100, Math.floor((rootRef.value!.clientWidth - 10) / 2)) }
  resizeObserver = new ResizeObserver(measure)
  resizeObserver.observe(rootRef.value)
  measure()
})
onBeforeUnmount(() => resizeObserver?.disconnect())

const activeCatalog = ref('')
const loading = ref(false)

const insertTemplate = (slide: Slide) => {
  emit('select', slide)
}

const insertTemplates = ({ slides, theme }: { slides: Slide[], theme: Partial<SlideTheme> }) => {
  emit('selectAll', { slides, theme })
}

const changeCatalog = (id: string) => {
  loading.value = true
  activeCatalog.value = id
  api.getMockData(activeCatalog.value).then(ret => {
    slides.value = ret.slides
    if (ret.theme) theme.value = ret.theme

    loading.value = false

    if (listRef.value) listRef.value.scrollTo(0, 0) 
  }).catch(() => {
    loading.value = false
  })
}

onMounted(() => {
  changeCatalog(templates.value[0].id)
})
</script>

<style lang="scss" scoped>
.templates {
  width: min(440px, calc(100vw - 48px));
  height: min(520px, calc(100dvh - 160px));
  display: flex;
  flex-direction: column;
  gap: 8px;
  user-select: none;
  color: var(--text-primary);
}
.catalogs, .types { flex: 0 0 auto; }
.header {
  display: flex;
  align-items: center;
  gap: 8px;
  .types { flex: 1 1 auto; min-width: 0; }
}
.insert-all { color: var(--accent-color); flex: 0 0 auto; }
.list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-content: start;
  padding: 2px;
}
.slide-item {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  border-radius: var(--radius-menu-item);
  .thumbnail {
    border-radius: var(--radius-menu-item);
    overflow: hidden;
    box-shadow: 0 0 0 1px var(--border-divider);
    transition: box-shadow var(--motion-fast);
  }
  &:hover .thumbnail, &:focus-visible .thumbnail { box-shadow: 0 0 0 2px var(--accent-color); }
  &:focus-visible { outline: none; }
  &:active .thumbnail { transform: scale(.97); }
}
</style>
