<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="visible" ref="sheetLayer" class="sheet-layer" @keydown.esc.prevent="closeSheet" @keydown.tab="trapFocus">
        <button class="sheet-scrim" :aria-label="t('common.close')" @click="closeSheet"></button>
        <GlassSurface ref="surfaceRef" class="responsive-sheet" :class="{ dragging }" variant="elevated" role="dialog" aria-modal="true" :aria-label="title">
          <!-- The whole header is the drag handle: drag to resize, pull down to dismiss. -->
          <header ref="handleRef" class="sheet-header">
            <span class="sheet-grabber" aria-hidden="true"></span>
            <PillButton v-if="canGoBack" class="sheet-back" icon-only size="touch" :aria-label="t('common.back')" @click="emit('back')"><i-icon-park-outline:left /></PillButton>
            <span v-else></span>
            <strong>{{ title }}</strong>
            <PillButton class="sheet-close" icon-only size="touch" :aria-label="t('common.close')" @click="closeSheet"><i-icon-park-outline:close-small /></PillButton>
          </header>
          <div class="sheet-body"><slot /></div>
        </GlassSurface>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { t } from '@/i18n'
import { useBackDepth } from '@/hooks/useBackStack'
import useSheetDrag from '@/hooks/useSheetDrag'
import useBreakpoint from '@/hooks/useBreakpoint'
import GlassSurface from './GlassSurface.vue'
import PillButton from './PillButton.vue'

const props = defineProps<{
  visible: boolean
  title: string
  canGoBack?: boolean
  /** Nested levels currently pushed inside the sheet (each one is a back-stack step). */
  levels?: number
  returnFocus?: HTMLElement | null
}>()
const emit = defineEmits<{ close: []; back: [] }>()
const sheetLayer = ref<HTMLElement | null>(null)
const surfaceRef = ref<InstanceType<typeof GlassSurface> | null>(null)
const handleRef = ref<HTMLElement | null>(null)
const closeSheet = () => emit('close')

// Back walks out one level at a time, then closes the sheet.
useBackDepth(() => props.visible ? 1 + (props.levels || 0) : 0, () => {
  if (props.canGoBack) emit('back')
  else closeSheet()
})

// Phones: resizable sheet (medium / large detents). Wider screens: centered dialog, no drag.
const { tier } = useBreakpoint()
const isPhone = computed(() => tier.value === 'mobile')
const { dragging } = useSheetDrag({
  surface: computed(() => isPhone.value ? surfaceRef.value?.$el as HTMLElement ?? null : null),
  handle: computed(() => isPhone.value ? handleRef.value : null),
  detents: [0.62, 0.92],
  onDismiss: closeSheet,
})
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
.sheet-scrim { position: absolute; inset: 0; width: 100%; border: 0; background: var(--scrim); }
.responsive-sheet { position: relative; width: min(100%, 560px); max-height: calc(100dvh - 12px); display: flex; flex-direction: column; border-radius: var(--radius-sheet) var(--radius-sheet) 0 0; overflow: hidden; overflow: clip; padding-bottom: env(safe-area-inset-bottom); will-change: transform, height; }
.sheet-grabber { position: absolute; top: 6px; left: 50%; width: 36px; height: 5px; margin-left: -18px; border-radius: var(--radius-pill); background: var(--text-tertiary); opacity: .45; }
.sheet-header { min-height: 60px; display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; gap: 8px; position: relative; flex: 0 0 auto; padding: 14px 10px 6px; text-align: center; cursor: grab; user-select: none; font-size: var(--text-lg); font-weight: var(--weight-strong); }
.sheet-body { flex: 1 1 auto; min-height: 0; overflow: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 4px 8px 12px; }
.dragging .sheet-header { cursor: grabbing; }
.sheet-enter-active, .sheet-leave-active { transition: opacity var(--motion-regular) var(--ease-out); }
.sheet-enter-active .responsive-sheet, .sheet-leave-active .responsive-sheet { transition: transform var(--motion-regular) var(--ease-out); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .responsive-sheet, .sheet-leave-to .responsive-sheet { transform: translateY(100%); }
@media (min-width: 768px) {
  .sheet-grabber { display: none; }
  .sheet-header { cursor: default; }
  .sheet-layer { align-items: center; padding: 24px; }
  .responsive-sheet { width: min(480px, calc(100vw - 48px)); max-height: min(720px, calc(100dvh - 48px)); border-radius: var(--radius-sheet); padding-bottom: 0; }
  .sheet-body { max-height: min(620px, calc(100dvh - 120px)); }
  .sheet-enter-from .responsive-sheet, .sheet-leave-to .responsive-sheet { transform: translateY(16px) scale(.98); }
}
</style>
