<template>
  <div class="export-pdf-dialog">
    <div class="thumbnails-view">
      <div class="thumbnails" ref="pdfThumbnailsRef">
        <ThumbnailSlide 
          class="thumbnail" 
          :slide="currentSlide" 
          :size="1600" 
          v-if="rangeType === 'current'"
        />
        <template v-else>
          <ThumbnailSlide 
            class="thumbnail" 
            :class="{ 'break-page': (index + 1) % count === 0 }"
            v-for="(slide, index) in slides" 
            :key="slide.id" 
            :slide="slide" 
            :size="1600" 
          />
        </template>
      </div>
    </div>
    <div class="configs">
      <div class="row">
        <div class="title">Slide Range:</div>
        <RadioGroup
          class="config-item"
          v-model:value="rangeType"
        >
          <RadioButton style="width: 50%;" value="all">All Slides</RadioButton>
          <RadioButton style="width: 50%;" value="current">Current</RadioButton>
        </RadioGroup>
      </div>
      <div class="row">
        <div class="title">Slides / Page:</div>
        <Select 
          class="config-item"
          v-model:value="count"
          :options="[
            { label: '1 Slide per Page', value: 1 },
            { label: '2 Slides per Page', value: 2 },
            { label: '3 Slides per Page', value: 3 },
          ]"
        />
      </div>
      <div class="row">
        <div class="title">Page Margin:</div>
        <div class="config-item">
          <Switch v-model:value="padding" />
        </div>
      </div>
      <div class="tip">
        Tip: Enable "Background graphics" in your browser print dialog for accurate slide backgrounds.
      </div>
    </div>

    <div class="btns">
      <Button class="btn export" type="primary" @click="expPDF()"><i-icon-park-outline:download /> Print / Save PDF</Button>
      <Button class="btn close" @click="emit('close')">Close</Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import { print } from '@/utils/print'

import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import Switch from '@/components/Switch.vue'
import Button from '@/components/Button.vue'
import RadioButton from '@/components/RadioButton.vue'
import RadioGroup from '@/components/RadioGroup.vue'
import Select from '@/components/Select.vue'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const { slides, currentSlide, viewportRatio } = storeToRefs(useSlidesStore())

const pdfThumbnailsRef = useTemplateRef<HTMLElement>('pdfThumbnailsRef')
const rangeType = ref<'all' | 'current'>('all')
const count = ref(1)
const padding = ref(true)

const expPDF = () => {
  if (!pdfThumbnailsRef.value) return
  const pageSize = {
    width: 1600,
    height: rangeType.value === 'all' ? 1600 * viewportRatio.value * count.value : 1600 * viewportRatio.value,
    margin: padding.value ? 50 : 0,
  }
  print(pdfThumbnailsRef.value, pageSize)
}
</script>

<style lang="scss" scoped>
.export-pdf-dialog {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  color: var(--text-primary, #1d1d1f);
}
.thumbnails-view {
  position: fixed;
  left: -99999px;
  top: -99999px;
  width: 1600px;
  height: 900px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  z-index: -1;
}
.thumbnail {
  &.break-page {
    break-after: page;
  }
}
.configs {
  width: 320px;
  height: calc(100% - 80px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: 1;

  .row {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 25px;
  }

  .title {
    width: 110px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary, #1d1d1f);
  }
  .config-item {
    flex: 1;
  }

  .tip {
    font-size: 12px;
    color: var(--text-tertiary, #86868b);
    line-height: 1.8;
    margin-top: 25px;
  }
}
.btns {
  width: 100%;
  max-width: 320px;
  height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;

  .export {
    flex: 1;
  }
  .close {
    min-width: 90px;
    margin-left: 10px;
  }
}
</style>