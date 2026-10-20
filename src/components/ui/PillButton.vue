<template>
  <button
    v-bind="$attrs"
    class="pill-button"
    :class="[`size-${size}`, `variant-${variant}`, { active, selected, 'icon-only': iconOnly }]"
    :aria-pressed="selected ? true : undefined"
  ><slot /></button>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{
  active?: boolean
  selected?: boolean
  iconOnly?: boolean
  size?: 'compact' | 'regular' | 'touch'
  variant?: 'glass' | 'quiet'
}>(), { size: 'regular', variant: 'glass' })
</script>

<style scoped lang="scss">
@import '@/assets/styles/glass-system.scss';
.pill-button {
  @include glass-surface(regular);
  min-width: var(--control-regular);
  height: var(--control-regular);
  padding: 0 13px;
  border-radius: var(--radius-pill);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: transform var(--motion-fast) var(--ease-out), background var(--motion-fast), box-shadow var(--motion-fast);
  &:hover:not(:disabled) { transform: translateY(-1px); background: var(--glass-surface-elevated); }
  &:focus-visible { outline: none; box-shadow: var(--focus-ring), var(--glass-shadow-sm); }
  &:disabled { opacity: var(--disabled-opacity); cursor: default; }
  &.active, &.selected { background: var(--accent-color); border-color: transparent; color: #fff; }
  &.variant-quiet {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    &:hover:not(:disabled) { background: var(--bg-control, rgba(0, 0, 0, 0.05)); box-shadow: none; transform: none; }
    &.active, &.selected { background: var(--accent-color); color: #fff; }
  }
  &.icon-only { padding: 0; aspect-ratio: 1; }
  &.size-compact { min-width: var(--control-compact); height: var(--control-compact); padding-inline: 10px; }
  &.size-touch { min-width: var(--control-touch); height: var(--control-touch); }
}
</style>
