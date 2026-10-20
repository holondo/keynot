<template>
  <div class="settings-row" :class="{ stacked }">
    <div class="settings-row-text">
      <span class="settings-row-label">{{ label }}</span>
      <span v-if="description" class="settings-row-description">{{ description }}</span>
    </div>
    <div v-if="$slots.default" class="settings-row-control"><slot /></div>
  </div>
</template>

<script setup lang="ts">
/** stacked: put the control under the text (wide segmented controls, narrow screens). */
defineProps<{ label: string; description?: string; stacked?: boolean }>()
</script>

<style scoped lang="scss">
@import '@/assets/styles/breakpoints.scss';

.settings-row {
  min-height: 52px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  & + & { box-shadow: inset 0 var(--hairline) 0 var(--border-divider); }
}
.settings-row-text { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.settings-row-label { font-size: var(--text-md); font-weight: var(--weight-medium); color: var(--text-primary); }
.settings-row-description { font-size: var(--text-sm); color: var(--text-secondary); }
.settings-row-control { flex: 0 0 auto; display: flex; align-items: center; }

.settings-row.stacked {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  .settings-row-control > :deep(*) { width: 100%; }
}
@include bp(mobile) {
  .settings-row { flex-direction: column; align-items: stretch; gap: 10px; }
  .settings-row-control > :deep(*) { width: 100%; }
}
</style>
