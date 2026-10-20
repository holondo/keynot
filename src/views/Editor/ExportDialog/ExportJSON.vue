<template>
  <div class="export-json-dialog">
    <div class="preview">
      <pre>{{ json }}</pre>
    </div>

    <div class="btns">
      <Button class="btn export" type="primary" @click="exportJSON()"><i-icon-park-outline:download /> Export JSON</Button>
      <Button class="btn close" @click="emit('close')">Close</Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import useExport from '@/hooks/useExport'
import Button from '@/components/Button.vue'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const { slides, viewportRatio, title, viewportSize, theme } = storeToRefs(useSlidesStore())
const { exportJSON } = useExport()

const json = computed(() => {
  return {
    title: title.value,
    width: viewportSize.value,
    height: viewportSize.value * viewportRatio.value,
    theme: theme.value,
    slides: slides.value,
  }
})
</script>

<style lang="scss" scoped>
.export-json-dialog {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.preview {
  width: 100%;
  height: calc(100% - 90px);
  margin-bottom: 10px;
  background-color: var(--bg-control, #f9f9f9);
  color: var(--accent-color, #0451a5);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  border-radius: var(--radius-control);
  padding: 12px;
  overflow: auto;
}
pre {
  font-family: var(--font-mono);
}
.btns {
  width: 100%;
  max-width: 320px;
  height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;

  .export {
    flex: 1;
  }
  .close {
    min-width: 90px;
    margin-left: 10px;
  }
}
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
  background-color: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: #e1e1e1;
  border-radius: var(--radius-control);
}
</style>