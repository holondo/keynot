<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="visible" ref="sheetLayer" class="sheet-layer" @keydown.esc.prevent="closeSheet" @keydown.tab="trapFocus">
        <button class="sheet-scrim" :aria-label="t('common.close')" @click="closeSheet"></button>
        <GlassSurface class="responsive-sheet" variant="elevated" role="dialog" aria-modal="true" :aria-label="title">
          <header class="sheet-header">
            <PillButton v-if="canGoBack" icon-only size="touch" :aria-label="t('common.back')" @click="emit('back')">‹</PillButton>
            <strong>{{ title }}</strong>
            <PillButton icon-only size="touch" :aria-label="t('common.close')" @click="closeSheet">×</PillButton>
          </header>
          <div class="sheet-body"><slot /></div>
        </GlassSurface>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { t } from '@/i18n'
import GlassSurface from './GlassSurface.vue'
import PillButton from './PillButton.vue'

const props = defineProps<{ visible: boolean; title: string; canGoBack?: boolean; returnFocus?: HTMLElement | null }>()
const emit = defineEmits<{ close: []; back: [] }>()
const sheetLayer = ref<HTMLElement | null>(null)
const closeSheet = () => emit('close')
const focusableElements = () => Array.from(sheetLayer.value?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])') || [])
const trapFocus = (event: KeyboardEvent) => {
  const items = focusableElements()
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
watch(() => props.visible, async visible => {
  await nextTick()
  if (visible) focusableElements()[0]?.focus()
  else props.returnFocus?.focus()
})
</script>

<style scoped lang="scss">
.sheet-layer { position: fixed; inset: 0; z-index: var(--z-sheet); display: flex; align-items: flex-end; justify-content: center; }
.sheet-scrim { position: absolute; inset: 0; width: 100%; border: 0; background: rgba(10, 12, 18, .34); }
.responsive-sheet { position: relative; width: min(100%, 560px); max-height: min(78dvh, 680px); border-radius: var(--radius-sheet) var(--radius-sheet) 0 0; overflow: hidden; padding-bottom: env(safe-area-inset-bottom); }
.sheet-header { min-height: 60px; display: grid; grid-template-columns: 48px 1fr 48px; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border-divider); text-align: center; }
.sheet-body { max-height: calc(78dvh - 60px); overflow: auto; padding: 8px 12px 16px; }
.sheet-enter-active, .sheet-leave-active { transition: opacity var(--motion-regular) var(--ease-out); }
.sheet-enter-active .responsive-sheet, .sheet-leave-active .responsive-sheet { transition: transform var(--motion-regular) var(--ease-out); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .responsive-sheet, .sheet-leave-to .responsive-sheet { transform: translateY(28px); }
</style>
