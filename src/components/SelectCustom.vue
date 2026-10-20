<template>
  <div class="select-wrap" v-if="disabled">
    <div class="select disabled" ref="selectRef">
      <div class="selector"><slot name="label"></slot></div>
      <div class="icon">
        <slot name="icon">
          <i-icon-park-outline:down />
        </slot>
      </div>
    </div>
  </div>
  <Popover 
    class="select-wrap"
    trigger="click" 
    v-model:value="popoverVisible" 
    placement="bottom"
    :contentStyle="{
      padding: 0,
      boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08)',
    }"
    v-else
  >
    <template #content>
      <div class="options" :style="{ width: width + 2 + 'px' }" @click="popoverVisible = false">
        <slot name="options"></slot>
      </div>
    </template>
    <div class="select" ref="selectRef">
      <div class="selector"><slot name="label"></slot></div>
      <div class="icon">
        <slot name="icon">
          <i-icon-park-outline:down />
        </slot>
      </div>
    </div>
  </Popover>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import Popover from './Popover.vue'

withDefaults(defineProps<{
  disabled?: boolean
}>(), {
  disabled: false,
})

const popoverVisible = ref(false)
const selectRef = useTemplateRef<HTMLElement>('selectRef')
const width = ref(0)

const updateWidth = () => {
  if (!selectRef.value) return
  width.value = selectRef.value.clientWidth
}
const resizeObserver = new ResizeObserver(updateWidth)
onMounted(() => {
  if (!selectRef.value) return
  resizeObserver.observe(selectRef.value)
})
onUnmounted(() => {
  if (!selectRef.value) return
  resizeObserver.unobserve(selectRef.value)
})
</script>

<style lang="scss" scoped>
.select {
  width: 100%;
  height: 32px;
  padding-right: 32px;
  border-radius: var(--radius-control);
  transition: border-color .2s;
  font-size: var(--text-md);
  user-select: none;
  background-color: var(--bg-card, var(--bg-control, #ffffff));
  color: var(--text-primary, #1d1d1f);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  position: relative;
  cursor: pointer;

  &:not(.disabled):hover {
    border-color: var(--accent-color, #007aff);
  }

  &.disabled {
    background-color: var(--bg-control, rgba(128, 128, 128, 0.1));
    border-color: var(--border-color, rgba(0, 0, 0, 0.06));
    color: var(--text-tertiary, #b7b7b7);
    cursor: default;
  }

  .selector {
    min-width: 50px;
    height: 30px;
    line-height: 30px;
    padding-left: 10px;
    color: var(--text-primary, #1d1d1f);
    @include ellipsis-oneline();
  }
}
.options {
  max-height: 260px;
  padding: 5px;
  overflow: auto;
  text-align: left;
  font-size: var(--text-md);
  user-select: none;
  background: var(--popover-bg, #ffffff);
  color: var(--text-primary, #1d1d1f);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  border-radius: var(--radius-control);
}
.icon {
  width: 32px;
  height: 30px;
  color: var(--text-tertiary, #bfbfbf);
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>