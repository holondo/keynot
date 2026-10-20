<template>
  <div class="floating-rail" :class="{ scrollable, vertical }">
    <div class="rail-track"><slot /></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ scrollable?: boolean; vertical?: boolean }>()
</script>

<style scoped lang="scss">
@import '@/assets/styles/glass-system.scss';
.floating-rail {
  @include glass-surface(regular);
  position: relative;
  display: flex;
  min-width: 0;
  border-radius: var(--radius-pill);
}
.rail-track {
  display: flex;
  align-items: center;
  gap: var(--rail-gap);
  min-width: 0;
  padding: var(--rail-padding);
  flex: 1 1 auto;
  border-radius: inherit;
}
.vertical .rail-track { flex-direction: column; }
/* The track scrolls inside a fixed glass shape, so the blur never scrolls away. */
.scrollable .rail-track {
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  > :deep(*) { scroll-snap-align: center; flex: 0 0 auto; }
  &::-webkit-scrollbar { display: none; }
}
</style>
