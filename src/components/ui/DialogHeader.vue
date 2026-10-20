<template>
  <header class="dialog-header">
    <div class="titles">
      <h2 class="title">{{ title }}</h2>
      <p v-if="subtitle || $slots.subtitle" class="subtitle"><slot name="subtitle">{{ subtitle }}</slot></p>
    </div>
    <div v-if="$slots.default" class="actions"><slot /></div>
    <PillButton v-if="closable" class="dialog-close" icon-only :hint="t('common.close')" @click="emit('close')">
      <i-icon-park-outline:close-small />
    </PillButton>
  </header>
</template>

<script setup lang="ts">
import { t } from '@/i18n'
import PillButton from './PillButton.vue'

withDefaults(defineProps<{ title: string; subtitle?: string; closable?: boolean }>(), { closable: true })
const emit = defineEmits<{ close: [] }>()
</script>

<style scoped lang="scss">
@import '@/assets/styles/breakpoints.scss';

/* One header for every dialog and sheet: title left, actions and close right. */
.dialog-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
}
.titles { flex: 1 1 auto; min-width: 0; padding-top: 6px; }
.title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--weight-strong);
  line-height: 1.3;
  color: var(--text-primary);
}
.subtitle {
  margin: 2px 0 0;
  font-size: var(--text-sm);
  line-height: 1.4;
  color: var(--text-secondary);
}
.actions { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; }
.dialog-close { flex: 0 0 auto; color: var(--text-secondary); }

@include bp(mobile) {
  .dialog-header { flex-wrap: wrap; }
  .titles { order: 0; flex-basis: calc(100% - 52px); }
  .dialog-close { order: 1; }
  .actions { order: 2; flex-basis: 100%; }
}
</style>
