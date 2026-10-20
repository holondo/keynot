<template>
  <div class="screen-slide-list" ref="listRef">
    <div
      :class="[
        'slide-item',
        {
          'current': index === slideIndex,
          'last': index === slideIndex - 1,
          'next': index === slideIndex + 1,
        }
      ]"
      :data-index="index"
      v-for="(slide, index) in slides"
      :key="slide.id"
    >
      <div
        class="slide-content"
        :style="{
          width: slideWidth + 'px',
          height: slideHeight + 'px',
        }"
        v-if="Math.abs(slideIndex - index) < 2 || slide.animations?.length"
      >
        <ScreenSlide
          :slide="slide"
          :scale="scale"
          :animationIndex="animationIndex"
          :turnSlideToId="turnSlideToId"
          :manualExitFullscreen="manualExitFullscreen"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, provide, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import { injectKeySlideScale } from '@/types/injectKey'
import useSlideTransitions from './hooks/useSlideTransitions'

import ScreenSlide from './ScreenSlide.vue'

const props = defineProps<{
  slideWidth: number
  slideHeight: number
  animationIndex: number
  turnSlideToId: (id: string) => void
  manualExitFullscreen: () => void
}>()

const { slides, slideIndex, viewportSize } = storeToRefs(useSlidesStore())

const scale = computed(() => props.slideWidth / viewportSize.value)
provide(injectKeySlideScale, scale)

const listRef = ref<HTMLElement | null>(null)
useSlideTransitions(listRef, slides, slideIndex)
</script>

<style lang="scss" scoped>
.screen-slide-list {
  background: #1d1d1d;
  position: relative;
  width: 100%;
  height: 100%;
}
.slide-item {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  // Only the current slide is visible; transitions reveal the outgoing one while they run.
  visibility: hidden;
  z-index: 0;

  &.current {
    visibility: visible;
    z-index: 2;
  }
}
.slide-content {
  background-color: #fff;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
