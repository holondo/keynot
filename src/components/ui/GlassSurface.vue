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
@use '@/assets/styles/glass-system.scss' as glass;
.glass-surface { color: var(--text-primary); }
.glass-subtle { @include glass.glass-surface(subtle); }
.glass-regular { @include glass.glass-surface(regular); }
.glass-elevated { @include glass.glass-surface(elevated); }
</style>
