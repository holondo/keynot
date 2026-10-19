<template>
  <div class="remark">
    <div 
      class="resize-handler"
      @mousedown="$event => resize($event)"
      v-tooltip="'Drag to resize Presenter Notes drawer'"
    ></div>

    <div class="remark-header">
      <div class="header-left">
        <i-icon-park-outline:notes class="notes-icon" />
        <span class="notes-title">Presenter Notes</span>
        <span class="slide-badge">Slide {{ slideIndex + 1 }} of {{ slides.length }}</span>
      </div>
      <div class="header-right">
        <div class="header-btn" @click="clearNotes" v-if="remark" title="Clear notes for this slide">
          Clear
        </div>
        <div class="header-btn close-btn" @click="closeNotes" v-tooltip="'Hide Presenter Notes (Alt+P)'">
          <i-icon-park-outline:close />
        </div>
      </div>
    </div>

    <div class="remark-body">
      <Editor
        :value="remark"
        ref="editorRef"
        @update="value => handleInput(value)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'

import Editor from './Editor.vue'

const props = defineProps<{
  height: number
}>()

const emit = defineEmits<{
  (event: 'update:height', payload: number): void
}>()

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { currentSlide, slides, slideIndex } = storeToRefs(slidesStore)

const editorRef = useTemplateRef<InstanceType<typeof Editor>>('editorRef')
watch(() => currentSlide.value?.id, () => {
  nextTick(() => {
    editorRef.value?.updateTextContent()
  })
}, {
  immediate: true,
})

const remark = computed(() => currentSlide.value?.remark || '')

const handleInput = (content: string) => {
  slidesStore.updateSlide({ remark: content })
}

const clearNotes = () => {
  slidesStore.updateSlide({ remark: '' })
  nextTick(() => {
    editorRef.value?.updateTextContent()
  })
}

const closeNotes = () => {
  mainStore.setShowPresenterNotes(false)
}

const resize = (e: MouseEvent) => {
  let isMouseDown = true
  const startPageY = e.pageY
  const originHeight = props.height

  document.onmousemove = e => {
    if (!isMouseDown) return

    const currentPageY = e.pageY

    const moveY = currentPageY - startPageY
    let newHeight = -moveY + originHeight

    if (newHeight < 60) newHeight = 60
    if (newHeight > 400) newHeight = 400

    emit('update:height', newHeight)
  }

  document.onmouseup = () => {
    isMouseDown = false
    document.onmousemove = null
    document.onmouseup = null
  }
}
</script>

<style lang="scss" scoped>
.remark {
  position: relative;
  border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
  background-color: var(--bg-header, rgba(255, 255, 255, 0.88));
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  color: var(--text-primary, #1d1d1f);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.resize-handler {
  height: 6px;
  position: absolute;
  top: -3px;
  left: 0;
  right: 0;
  cursor: n-resize;
  z-index: 10;

  &:hover {
    background-color: var(--accent-color, #007aff);
    height: 3px;
    top: -1px;
    opacity: 0.7;
  }
}

.remark-header {
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid var(--border-divider, rgba(0, 0, 0, 0.06));
  flex-shrink: 0;
  user-select: none;

  .header-left {
    display: flex;
    align-items: center;
    gap: 6px;

    .notes-icon {
      font-size: 13px;
      color: var(--accent-color, #007aff);
    }
    .notes-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary, #515154);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .slide-badge {
      font-size: 10.5px;
      color: var(--text-tertiary, #86868b);
      margin-left: 4px;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;

    .header-btn {
      font-size: 11px;
      color: var(--text-tertiary, #86868b);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      padding: 1px 5px;
      transition: all 0.12s;

      &:hover {
        color: var(--text-primary, #1d1d1f);
        background: var(--bg-control, rgba(0, 0, 0, 0.06));
      }

      &.close-btn {
        font-size: 12px;
        width: 18px;
        height: 18px;
        padding: 0;
      }
    }
  }
}

.remark-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}
</style>