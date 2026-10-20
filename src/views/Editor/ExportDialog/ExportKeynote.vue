<template>
  <div class="export-keynote-dialog">
    <div class="configs">
      <div class="status-banner" :class="{ 'has-source': !!keynoteSourceBase64 }">
        <div class="status-title">
          <strong v-if="keynoteSourceBase64">Source-Preserving .key Archive Patch Active</strong>
          <strong v-else>Synthesized Apple Keynote (.key) Archive Bundle</strong>
        </div>
        <div class="status-desc" v-if="keynoteSourceBase64">
          This deck was imported from an Apple Keynote <code>.key</code> archive. Exporting will preserve the original IWA binary streams and media assets while embedding updated KeyNot scene metadata.
        </div>
        <div class="status-desc" v-else>
          Packages your presentation into a <code>.key</code> ZIP bundle with Snappy-framed <code>Index/Document.iwa</code>, <code>Index/Slide.iwa</code>, and lossless KeyNot round-trip metadata.
        </div>
      </div>

      <div class="row">
        <div class="title">Slide Range:</div>
        <RadioGroup
          class="config-item"
          v-model:value="rangeType"
        >
          <RadioButton style="width: 33.33%;" value="all">All Slides</RadioButton>
          <RadioButton style="width: 33.33%;" value="current">Current</RadioButton>
          <RadioButton style="width: 33.33%;" value="custom">Custom</RadioButton>
        </RadioGroup>
      </div>
      <div class="row" v-if="rangeType === 'custom'">
        <div class="title" :data-range="`(${range[0]} ~ ${range[1]})`">Custom Range:</div>
        <Slider
          class="config-item"
          range
          :min="1"
          :max="slides.length"
          :step="1"
          v-model:value="range"
        />
      </div>
    </div>
    <div class="btns">
      <Button class="btn export" type="primary" @click="exportKeynote(selectedSlides)">
        <i-icon-park-outline:download /> Export .key Archive
      </Button>
      <Button class="btn close" @click="emit('close')">Close</Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import useExport from '@/hooks/useExport'

import Slider from '@/components/Slider.vue'
import Button from '@/components/Button.vue'
import RadioButton from '@/components/RadioButton.vue'
import RadioGroup from '@/components/RadioGroup.vue'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const { slides, currentSlide, keynoteSourceBase64 } = storeToRefs(useSlidesStore())
const { exportKeynote } = useExport()

const rangeType = ref<'all' | 'current' | 'custom'>('all')
const range = ref<[number, number]>([1, slides.value.length])

const selectedSlides = computed(() => {
  if (rangeType.value === 'all') return slides.value
  if (rangeType.value === 'current') return [currentSlide.value]
  return slides.value.filter((item, index) => {
    const [min, max] = range.value
    return index >= min - 1 && index <= max - 1
  })
})
</script>

<style lang="scss" scoped>
.export-keynote-dialog {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.configs {
  width: min(400px, calc(100vw - 48px));
  height: calc(100% - 80px);
  display: flex;
  flex-direction: column;
  justify-content: center;

  .status-banner {
    background: var(--bg-control, rgba(128, 128, 128, 0.08));
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    border-radius: var(--radius-control);
    padding: 12px 14px;
    margin-bottom: 24px;

    &.has-source {
      background: rgba(99, 102, 241, 0.12);
      border-color: rgba(99, 102, 241, 0.4);
    }

    .status-title {
      font-size: var(--text-md);
      color: var(--text-primary, #1d1d1f);
      margin-bottom: 6px;
    }
    .status-desc {
      font-size: var(--text-sm);
      color: var(--text-secondary, #86868b);
      line-height: 1.5;
    }
  }

  .row {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 25px;
  }

  .title {
    width: 110px;
    position: relative;

    &::after {
      content: attr(data-range);
      position: absolute;
      top: 20px;
      left: 0;
    }
  }
  .config-item {
    flex: 1;
  }
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
</style>
