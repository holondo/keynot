<template>
  <div class="popover" :class="{ 'center': center }" ref="triggerRef" @click="isPhone && toggleSheet()">
    <div class="popover-content" :style="contentStyle" ref="contentRef">
      <slot name="content" v-if="contentVisible && !isPhone"></slot>
    </div>
    <slot></slot>
    <!-- Phones: every popover becomes a bottom sheet with the same content (native pattern). -->
    <ResponsiveSheet v-if="isPhone" :visible="sheetOpen" :title="title || ''" :return-focus="triggerRef" @close="setSheet(false)">
      <div class="popover-sheet-content" @click.stop><slot name="content" v-if="sheetOpen"></slot></div>
    </ResponsiveSheet>
  </div>
</template>

<script lang="ts" setup>
import { type CSSProperties, onMounted, onUnmounted, ref, watch, computed, useTemplateRef } from 'vue'
import tippy, { type Instance, type Placement } from 'tippy.js'

import 'tippy.js/animations/scale.css'
import { useBackHandler } from '@/hooks/useBackStack'
import useBreakpoint from '@/hooks/useBreakpoint'
import ResponsiveSheet from './ui/ResponsiveSheet.vue'

const props = withDefaults(defineProps<{
  value?: boolean
  trigger?: 'click' | 'mouseenter' | 'manual'
  placement?: Placement
  appendTo?: HTMLElement | 'parent'
  contentStyle?: CSSProperties
  center?: boolean
  offset?: number
  /** Sheet title on phones. */
  title?: string
}>(), {
  value: false,
  trigger: 'click',
  placement: 'bottom',
  center: false,
  offset: 8,
})

const emit = defineEmits<{
  (event: 'update:value', payload: boolean): void
  (event: 'show'): void
  (event: 'hide'): void
}>()

const instance = ref<Instance>()
const contentVisible = ref(false)
const triggerRef = useTemplateRef<HTMLElement>('triggerRef')
const contentRef = useTemplateRef<HTMLElement>('contentRef')

// Desktop/tablet popovers get a back entry here; phone sheets register their own.
useBackHandler(() => contentVisible.value && !isPhone.value, () => instance.value?.hide())

const contentStyle = computed(() => {
  return props.contentStyle || {}
})

const { tier } = useBreakpoint()
const isPhone = computed(() => tier.value === 'mobile')
const sheetOpen = ref(false)
const setSheet = (open: boolean) => {
  if (sheetOpen.value === open) return
  sheetOpen.value = open
  emit('update:value', open)
  if (open) emit('show')
  else emit('hide')
}
const toggleSheet = () => setSheet(!sheetOpen.value)
watch(isPhone, phone => {
  if (phone) instance.value?.disable()
  else { instance.value?.enable(); setSheet(false) }
})

watch(() => props.value, () => {
  if (isPhone.value) return setSheet(props.value)
  if (!instance.value) return
  if (props.value) instance.value.show()
  else instance.value.hide()
})

onUnmounted(() => {
  if (instance.value) instance.value.destroy()
})

onMounted(() => {
  instance.value = tippy(triggerRef.value!, {
    content: contentRef.value!,
    allowHTML: true,
    trigger: props.trigger,
    placement: props.placement,
    interactive: true,
    appendTo: props.appendTo || document.body,
    maxWidth: 'none',
    offset: [0, props.offset],
    duration: 200,
    animation: 'scale',
    theme: 'popover',
    // Keep the popover inside the screen with a margin, whatever the trigger position.
    popperOptions: { modifiers: [{ name: 'preventOverflow', options: { padding: 8 } }, { name: 'flip', options: { padding: 8 } }] },
    onShow() {
      contentVisible.value = true
    },
    onShown() {
      if (!props.value) {
        emit('update:value', true)
        emit('show')
      }
    },
    onHidden() {
      if (props.value) {
        emit('update:value', false)
        emit('hide')
      }
      contentVisible.value = false
    },
  })
  if (isPhone.value) instance.value.disable()
})
</script>

<style lang="scss" scoped>
.popover-sheet-content > :deep(*) { width: 100% !important; max-width: 100%; }
@import '@/assets/styles/glass-system.scss';
.popover {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}
.popover.center {
  display: flex;
  justify-content: center;
  align-items: center;
}
.popover-content {
  @include menu-surface;
  padding: 6px;
}
</style>

<style lang="scss">
.tippy-box[data-theme~='popover'] {
  border: 0;
  outline: 0;
  background-color: transparent !important;
  box-shadow: none !important;

  .tippy-content {
    padding: 0 !important;
  }
}
</style>