<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div class="modal" :class="{ sheet: isSheet }" ref="modalRef" v-show="visible" :style="wrapStyle || {}" tabindex="-1" @keyup.esc="onEsc()">
        <div class="mask" @click="onClickMask()"></div>
        <Transition :name="isSheet ? 'modal-sheet' : 'modal-zoom'"
          @afterLeave="contentVisible = false"
          @before-enter="contentVisible = true"
        >
          <div ref="contentRef" class="modal-content" v-show="visible" :style="contentStyle">
            <div v-if="isSheet" ref="handleRef" class="sheet-handle" aria-hidden="true"><span class="sheet-grabber"></span></div>
            <PillButton v-if="closeButton" class="close-btn" icon-only :size="isSheet ? 'touch' : 'compact'" :hint="t('common.close')" @click="close()"><i-icon-park-outline:close-small /></PillButton>
            <slot v-if="contentVisible"></slot>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch, useTemplateRef, type CSSProperties } from 'vue'
import { t } from '@/i18n'
import useBreakpoint from '@/hooks/useBreakpoint'
import PillButton from '@/components/ui/PillButton.vue'
import { useBackHandler } from '@/hooks/useBackStack'
import useSheetDrag from '@/hooks/useSheetDrag'

const props = withDefaults(defineProps<{
  visible: boolean
  width?: number
  closeButton?: boolean
  closeOnClickMask?: boolean
  closeOnEsc?: boolean
  contentStyle?: CSSProperties
  wrapStyle?: CSSProperties
}>(), {
  width: 480,
  closeButton: false,
  closeOnClickMask: true,
  closeOnEsc: true,
})

const modalRef = useTemplateRef<HTMLDivElement>('modalRef')

const emit = defineEmits<{
  (event: 'update:visible', payload: boolean): void
  (event: 'closed'): void
}>()

const contentVisible = ref(false)

// Phones get a bottom sheet: full width, thumb-reachable close, scrolls inside.
const { tier } = useBreakpoint()
const isSheet = computed(() => tier.value === 'mobile')

const contentStyle = computed(() => {
  if (isSheet.value) return { ...(props.contentStyle || {}), width: '100%' }
  return {
    width: typeof props.width === 'number' ? ('min(' + props.width + 'px, calc(100vw - 32px))') : props.width,
    ...(props.contentStyle || {})
  }
})

watch(() => props.visible, () => {
  if (props.visible) {
    nextTick(() => modalRef.value!.focus())
  }
})

const close = () => {
  emit('update:visible', false)
  emit('closed')
}

useBackHandler(() => props.visible, () => close())

// Phone sheets: pull the grabber down (or flick) to dismiss.
const contentRef = useTemplateRef<HTMLElement>('contentRef')
const handleRef = useTemplateRef<HTMLElement>('handleRef')
const sheetDrag = useSheetDrag({
  surface: computed(() => isSheet.value ? contentRef.value : null),
  handle: computed(() => isSheet.value ? handleRef.value : null),
  onDismiss: () => close(),
})
watch(() => props.visible, visible => { if (visible) sheetDrag.reset() })

const onEsc = () => {
  if (props.visible && props.closeOnEsc) close()
}

const onClickMask = () => {
  if (props.closeOnClickMask) close()
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/glass-system.scss';

.modal, .mask {
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 5000;
}
.modal {
  position: fixed;
  display: flex;
  justify-content: center;
  align-items: center;
  outline: 0;
  border: 0;
}
.mask {
  position: absolute;
  background: var(--scrim);
}
.modal-content {
  @include glass-scroll-surface(elevated);
  position: relative;
  z-index: 5001;
  /* Content that wants to bleed to the edges uses margin: calc(var(--modal-pad) * -1). */
  --modal-pad: 20px;
  padding: var(--modal-pad);
  color: var(--text-primary);
  border-radius: var(--radius-sheet);
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: var(--glass-shadow-lg);
}
.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  color: var(--text-secondary);
}

/* Bottom sheet on phones. */
.modal.sheet {
  align-items: flex-end;
  .modal-content {
    max-width: 100%;
    max-height: calc(100dvh - 24px - env(safe-area-inset-top));
    border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
    --modal-pad: 16px;
    padding: 0 var(--modal-pad) calc(var(--modal-pad) + env(safe-area-inset-bottom));
    overscroll-behavior: contain;
  }
  /* Sticky drag handle: stays reachable while the sheet content scrolls. */
  .sheet-handle {
    position: sticky;
    top: 0;
    z-index: 3;
    height: 22px;
    margin: 0 calc(var(--modal-pad) * -1) 6px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: grab;
  }
  .sheet-grabber {
    width: 36px;
    height: 5px;
    border-radius: var(--radius-pill);
    background: var(--text-tertiary);
    opacity: .45;
  }
  .close-btn { top: 8px; right: 8px; }
}
.modal-sheet-enter-active { animation: modal-sheet-enter var(--motion-regular) var(--ease-out) both; }
.modal-sheet-leave-active { animation: modal-sheet-enter var(--motion-regular) var(--ease-out) reverse both; }
@keyframes modal-sheet-enter { from { transform: translateY(100%); } }

.modal-fade-enter-active {
  animation: modal-fade-enter .25s both ease-in;
}
.modal-fade-leave-active {
  animation: modal-fade-leave .25s both ease-out;
}
.modal-zoom-enter-active {
  animation: modal-zoom-enter .25s both cubic-bezier(.4, 0, 0, 1.5);
}
.modal-zoom-leave-active {
  animation: modal-zoom-leave .25s both;
}

@keyframes modal-fade-enter {
  from {
    opacity: 0;
  }
}
@keyframes modal-fade-leave {
  to {
    opacity: 0;
  }
}
@keyframes modal-zoom-enter {
  from {
    transform: scale3d(.3, .3, .3);
  }
}
@keyframes modal-zoom-leave {
  to {
    transform: scale3d(.3, .3, .3);
  }
}
</style>