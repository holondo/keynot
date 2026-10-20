<template>
  <component :is="as" class="glass-surface" :class="`glass-${variant}`"><slot /></component>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'subtle' | 'regular' | 'elevated'; as?: string }>(), {
  variant: 'regular',
  as: 'div',
})
</script>

<style scoped lang="scss">
@import '@/assets/styles/glass-system.scss';
.glass-surface { position: relative; color: var(--text-primary); }
.glass-subtle { @include glass-surface(subtle); }
.glass-regular { @include glass-surface(regular); }
.glass-elevated { @include glass-surface(elevated); }
</style>
