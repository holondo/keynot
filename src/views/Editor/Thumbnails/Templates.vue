<template>
  <div class="templates">
    <div class="catalogs">
      <div class="catalog" 
        :class="{ 'active': activeCatalog === item.id }" 
        v-for="item in templates" 
        :key="item.id"
        @click="changeCatalog(item.id)"
      >{{ item.name }}</div>
    </div>
    <div class="content" v-loading="{ state: loading, text: 'Loading...' }">
      <div class="header">
        <div class="types">
          <div class="type" 
            :class="{ 'active': activeType === item.value }"
            v-for="item in types"
            :key="item.value"
            @click="activeType = item.value"
          >{{ item.label }}</div>
        </div>
        <div class="insert-all" @click="insertTemplates({ slides, theme })">Insert All</div>
      </div>
      <div class="list" ref="listRef">
        <template v-for="slide in slides" :key="slide.id">
          <div 
            class="slide-item"
            v-if="slide.type === activeType || activeType === 'all'"
          >
            <ThumbnailSlide class="thumbnail" :slide="slide" :size="180" />
    
            <div class="btns">
              <Button class="btn" type="primary" size="small" @click="insertTemplate(slide)">Insert Slide</Button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import type { Slide, SlideTheme } from '@/types/slides'
import api from '@/services'

import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import Button from '@/components/Button.vue'

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
  width: 500px;
  height: 500px;
  display: flex;
  user-select: none;
  color: var(--text-primary, #1d1d1f);
}
.catalogs {
  width: 114px;
  margin-right: 10px;
  padding-right: 10px;
  border-right: 1px solid var(--border-divider, rgba(0, 0, 0, 0.08));
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.2);
    border-radius: 2px;
  }

  .catalog {
    padding: 7px 8px;
    border-radius: 6px;
    font-size: 12px;
    color: var(--text-secondary, #515154);
    cursor: pointer;
    transition: all 0.12s ease;

    &:hover {
      background-color: var(--bg-control, rgba(0, 0, 0, 0.05));
      color: var(--text-primary, #1d1d1f);
    }

    &.active {
      color: var(--accent-color, #007aff);
      background-color: rgba(0, 122, 255, 0.1);
      border-right: 2px solid var(--accent-color, #007aff);
      font-weight: 600;
    }

    & + .catalog {
      margin-top: 3px; 
    }
  }
}
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-right: 4px;

  &:hover .insert-all {
    opacity: 1;
    transition: opacity $transitionDelay;
  }
}
.types {
  display: flex;

  .type {
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 12px;
    color: var(--text-secondary, #515154);
    cursor: pointer;
    transition: all 0.12s ease;

    & +.type {
      margin-left: 4px;
    }

    &.active {
      color: var(--accent-color, #007aff);
      background-color: rgba(0, 122, 255, 0.1);
      font-weight: 600;
    }

    &:hover:not(.active) {
      background-color: var(--bg-control, rgba(0, 0, 0, 0.05));
      color: var(--text-primary, #1d1d1f);
    }
  }
}
.insert-all {
  opacity: 0;
  font-size: 12px;
  color: var(--accent-color, #007aff);
  text-decoration: underline;
  cursor: pointer;
}
.list {
  flex: 1;
  width: 376px;
  padding: 2px;
  overflow-y: auto;
  @include flex-grid-layout();

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.2);
    border-radius: 2px;
  }
}
.slide-item {
  position: relative;
  @include flex-grid-layout-children(2, 48%);

  &:hover .btns {
    opacity: 1;
  }

  &:hover .thumbnail {
    outline-color: var(--accent-color, #007aff);
  }

  .btns {
    @include absolute-0();

    flex-direction: column;
    justify-content: center;
    align-items: center;
    display: flex;
    background-color: rgba(0, 0, 0, 0.4);
    opacity: 0;
    transition: opacity $transitionDelay;
    border-radius: 6px;
  }

  .thumbnail {
    outline: 2px solid var(--border-color, rgba(0, 0, 0, 0.1));
    transition: outline $transitionDelay;
    border-radius: 6px;
    cursor: pointer;
  }
}
</style>