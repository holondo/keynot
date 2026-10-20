<template>
  <div class="floating-rail" :class="{ scrollable }"><slot /></div>
</template>

<script setup lang="ts">
defineProps<{ scrollable?: boolean }>()
</script>

<style scoped lang="scss">
@import '@/assets/styles/glass-system.scss';
.floating-rail {
  @include glass-surface(regular);
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 4px;
  border-radius: var(--radius-pill);
  &.scrollable {
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    > :deep(*) { scroll-snap-align: center; flex: 0 0 auto; }
    &::-webkit-scrollbar { display: none; }
  }
}
</style>
