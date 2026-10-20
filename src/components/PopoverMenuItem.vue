<template>
  <div class="popover-menu-item" :class="{ 'center': center }" @click="emit('click')">
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
  center?: boolean
}>(), {
  center: false,
})

const emit = defineEmits<{
  (event: 'click'): void
}>()
</script>

<style lang="scss" scoped>
@import '@/assets/styles/glass-system.scss';
.popover-menu-item {
  @include menu-item;
  min-width: 80px;

  &.center { justify-content: center; text-align: center; }
  &:hover :deep(.icon) { color: #fff; }
  :deep(.icon) { font-size: var(--text-lg); color: var(--text-secondary); }
}
</style>
