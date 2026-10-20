<template>
  <div class="button-group" :class="{ 'passive': passive }" ref="groupRef">
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
  passive?: boolean
}>(), {
  passive: false,
})
</script>

<style lang="scss" scoped>
.button-group {
  display: inline-flex;
  align-items: center;
  max-width: 100%;

  ::v-deep(button.button) {
    border-radius: 0;
    border-left-width: 1px;
    border-right-width: 0;
    display: inline-flex;
    flex: 1;
    min-width: 0;
  }

  &:not(.passive) {
    ::v-deep(button.button) {
      &:not(:last-child, .radio, .checkbox):hover {
        position: relative;

        &::after {
          content: '';
          width: 1px;
          height: calc(100% + 2px);
          background-color: var(--accent-color, #007aff);
          position: absolute;
          top: -1px;
          right: -1px;
        }
      }

      &:first-child {
        border-top-left-radius: var(--radius-sm, 6px);
        border-bottom-left-radius: var(--radius-sm, 6px);
        border-left-width: 1px;
      }

      &:last-child {
        border-top-right-radius: var(--radius-sm, 6px);
        border-bottom-right-radius: var(--radius-sm, 6px);
        border-right-width: 1px;
      }
    }
  }
  &.passive {
    ::v-deep(button.button) {
      &:not(.last, .radio, .checkbox):hover {
        position: relative;

        &::after {
          content: '';
          width: 1px;
          height: calc(100% + 2px);
          background-color: var(--accent-color, #007aff);
          position: absolute;
          top: -1px;
          right: -1px;
        }
      }

      &.first {
        border-top-left-radius: var(--radius-sm, 6px);
        border-bottom-left-radius: var(--radius-sm, 6px);
        border-left-width: 1px;
      }

      &.last {
        border-top-right-radius: var(--radius-sm, 6px);
        border-bottom-right-radius: var(--radius-sm, 6px);
        border-right-width: 1px;
      }
    }
  }
}
</style>
