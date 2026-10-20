<template>
  <button
    type="button"
    v-bind="$attrs"
    class="pill-button"
    :class="[`size-${size}`, `variant-${variant}`, { active, selected, 'icon-only': iconOnly, caret }]"
    :aria-pressed="selected ? true : undefined"
    :aria-label="$attrs['aria-label'] as string || hint"
    :aria-keyshortcuts="shortcut"
    v-tooltip="tooltip"
  ><slot /></button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  /** Short hover hint; also used as the accessible name for icon-only pills. */
  hint?: string
  /** Keyboard shortcut shown inside the hint, e.g. "⌘Z". */
  shortcut?: string
  active?: boolean
  selected?: boolean
  iconOnly?: boolean
  /** Narrow trailing chevron segment of a split control. */
  caret?: boolean
  size?: 'compact' | 'regular' | 'touch'
  /** quiet: flat control living inside a rail. glass: standalone floating pill. accent: primary action. */
  variant?: 'quiet' | 'glass' | 'accent'
}>(), { size: 'regular', variant: 'quiet' })

const tooltip = computed(() => props.hint
  ? { content: props.shortcut ? `${props.hint}<kbd>${props.shortcut}</kbd>` : props.hint, placement: 'bottom' as const, delay: [400, 0] as [number, number] }
  : undefined)
</script>

<style scoped lang="scss">
@import '@/assets/styles/glass-system.scss';

.pill-button {
  --pill-h: var(--control-regular);
  height: var(--pill-h);
  min-width: var(--pill-h);
  padding: 0 12px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  line-height: 1;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 0 0 auto;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out), color var(--motion-fast), transform var(--motion-fast) var(--ease-out);

  :deep(svg) { width: 16px; height: 16px; flex: 0 0 auto; }

  &:hover:not(:disabled) { background: var(--bg-control); }
  &:active:not(:disabled) { background: var(--bg-hover); }
  &:focus-visible { outline: none; box-shadow: var(--focus-ring); }
  &:disabled { opacity: var(--disabled-opacity); cursor: default; }
  &[aria-expanded="true"] { background: var(--bg-control); }
  /* Toggled tools: neutral raised fill, like an iOS segmented selection. Blue is reserved
     for the single primary action (variant-accent), so contrast stays high everywhere. */
  &.active, &.selected {
    background: var(--bg-control-active);
    color: var(--text-primary);
    box-shadow: var(--glass-shadow-sm);
  }

  /* Touch: a quick press-in like native controls; hover tint would stick after the tap. */
  @media (pointer: coarse) {
    &:hover:not(:disabled):not(.active):not(.selected):not(.variant-accent):not([aria-expanded="true"]) { background: transparent; }
    &:active:not(:disabled) { transform: scale(.92); background: var(--bg-control); }
  }

  &.variant-glass { position: relative; @include glass-surface(regular); }
  &.variant-accent { background: var(--accent-color); color: #fff; &:hover:not(:disabled) { background: var(--accent-hover); } }

  &.size-compact { --pill-h: var(--control-compact); padding-inline: 10px; font-size: var(--text-sm); :deep(svg) { width: 14px; height: 14px; } }
  &.size-touch { --pill-h: var(--control-touch); :deep(svg) { width: 20px; height: 20px; } }
  &.icon-only { padding: 0; width: var(--pill-h); }
  &.caret {
    min-width: 0;
    width: 18px;
    padding: 0;
    margin-left: -2px;
    color: var(--text-secondary);
    :deep(svg) { width: 10px; height: 10px; }
  }
}
</style>
