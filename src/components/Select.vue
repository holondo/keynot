<template>
  <div class="select-wrap" v-if="disabled">
    <div class="select disabled" ref="selectRef">
      <div class="selector">{{ value }}</div>
      <div class="icon">
        <slot name="icon">
          <i-icon-park-outline:down />
        </slot>
      </div>
    </div>
  </div>
  <Popover 
    class="select-wrap"
    trigger="click" 
    v-model:value="popoverVisible" 
    placement="bottom"
    :contentStyle="{
      padding: 0,
      boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08)',
    }"
    v-else
  >
    <template #content>
      <template v-if="search">
        <Input ref="searchInputRef" simple :placeholder="searchLabel" v-model:value="searchKey" :style="{ width: dropdownWidth + 'px' }" />
        <Divider :margin="0" />
      </template>
      <div class="options" ref="optionsRef" :style="{ width: dropdownWidth + 'px' }">
        <div class="option" 
          :class="{
            'disabled': option.disabled,
            'selected': isSelected(option),
          }"
          v-for="option in showOptions" 
          :key="option.value"
          :style="{ fontFamily: (searchLabel === 'Search font' && option.value) ? String(option.value) : undefined }"
          @click="handleSelect(option)"
        >{{ option.label }}</div>
      </div>
    </template>
    <div class="select" ref="selectRef">
      <div class="selector" :title="String(showLabel)">{{ showLabel }}</div>
      <div class="icon">
        <slot name="icon">
          <i-icon-park-outline:down />
        </slot>
      </div>
    </div>
  </Popover>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch, nextTick, onBeforeUnmount, useTemplateRef } from 'vue'
import Popover from './Popover.vue'
import Input from './Input.vue'
import Divider from './Divider.vue'

interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  value: string | number
  options: SelectOption[]
  disabled?: boolean
  autofocus?: boolean
  defaultLabel?: string
  search?: boolean
  searchLabel?: string
}>(), {
  disabled: false,
  autofocus: false,
  defaultLabel: '',
  search: false,
  searchLabel: 'Search',
})

const emit = defineEmits<{
  (event: 'update:value', payload: string | number): void
}>()

const popoverVisible = ref(false)
const width = ref(0)
const searchKey = ref('')
const selectRef = useTemplateRef<HTMLElement>('selectRef')
const optionsRef = useTemplateRef<HTMLElement>('optionsRef')
const searchInputRef = useTemplateRef<InstanceType<typeof Input>>('searchInputRef')

const dropdownWidth = computed(() => {
  if (props.searchLabel === 'Search font') {
    return Math.max(width.value + 2, 220)
  }
  return width.value + 2
})

const showLabel = computed(() => {
  // 1. Exact match on value
  const exact = props.options.find(item => item.value === props.value)
  if (exact) return exact.label

  if (typeof props.value === 'string' && props.value) {
    const rawVal = props.value.trim()
    const cleanVal = rawVal.replace(/['"]/g, '').toLowerCase()

    // 2. Exact match on clean string or label
    const byLabelOrClean = props.options.find(item => {
      const itemVal = String(item.value).replace(/['"]/g, '').toLowerCase().trim()
      const itemLabel = item.label.toLowerCase().trim()
      return itemVal === cleanVal || itemLabel === cleanVal
    })
    if (byLabelOrClean) return byLabelOrClean.label

    // 3. Apple System / SF Pro special handling
    if (cleanVal.includes('apple-system') || cleanVal.includes('sf pro') || cleanVal.includes('blinkmacsystemfont')) {
      const sfOption = props.options.find(item => item.label.includes('SF Pro') || item.label.includes('System'))
      if (sfOption) return sfOption.label
      return 'SF Pro (System)'
    }

    // 4. Primary font name from font-family stack (e.g. "Georgia, 'Times New Roman'..." -> "Georgia")
    const primary = rawVal.split(',')[0].replace(/['"-]/g, '').trim()
    const primaryMatch = props.options.find(item => {
      const itemLabel = item.label.toLowerCase()
      const itemVal = String(item.value).replace(/['"]/g, '').toLowerCase()
      return itemLabel === primary.toLowerCase() || itemVal.startsWith(primary.toLowerCase())
    })
    if (primaryMatch) return primaryMatch.label
    if (primary) return primary
  }

  return props.defaultLabel || props.value
})

const isSelected = (option: SelectOption) => {
  if (option.value === props.value) return true
  if (typeof props.value === 'string' && typeof option.value === 'string') {
    const v1 = props.value.replace(/['"]/g, '').toLowerCase().trim()
    const v2 = option.value.replace(/['"]/g, '').toLowerCase().trim()
    if (v1 && v2 && (v1 === v2 || v1.startsWith(v2) || v2.startsWith(v1))) return true
    if ((v1.includes('apple-system') || v1.includes('sf pro')) && (v2.includes('apple-system') || v2.includes('sf pro') || option.label.includes('SF Pro'))) return true
  }
  return false
}

const showOptions = computed(() => {
  if (!props.search) return props.options
  if (!searchKey.value.trim()) return props.options
  const opts = props.options.filter(item => {
    return item.label.toLowerCase().indexOf(searchKey.value.toLowerCase()) !== -1
  })
  return opts.length ? opts : props.options
})

watch(popoverVisible, () => {
  if (popoverVisible.value) {
    nextTick(() => {
      if (searchInputRef.value) searchInputRef.value.focus()
      if (props.autofocus && optionsRef.value) {
        optionsRef.value.querySelector('.option.selected')?.scrollIntoView({ block: 'center' })
      }
    })
  }
  else searchKey.value = ''
})
onBeforeUnmount(() => {
  searchKey.value = ''
})

const updateWidth = () => {
  if (!selectRef.value) return
  width.value = selectRef.value.clientWidth
}
const resizeObserver = new ResizeObserver(updateWidth)
onMounted(() => {
  if (!selectRef.value) return
  resizeObserver.observe(selectRef.value)
})
onUnmounted(() => {
  if (!selectRef.value) return
  resizeObserver.unobserve(selectRef.value)
})

const handleSelect = (option: SelectOption) => {
  if (option.disabled) return

  emit('update:value', option.value)
  popoverVisible.value = false
}
</script>

<style lang="scss" scoped>
.select {
  width: 100%;
  height: var(--inspector-control-height, 28px);
  padding-right: 26px;
  border-radius: var(--inspector-control-radius, 8px);
  transition: all .15s ease;
  font-size: var(--inspector-control-font-size, 13px);
  font-family: var(--font-ui);
  user-select: none;
  background-color: var(--bg-card, var(--bg-control, #ffffff));
  color: var(--text-inspector, rgb(50, 50, 50));
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  position: relative;
  cursor: pointer;

  &:not(.disabled):hover {
    border-color: var(--accent-color, rgba(0, 122, 255, 0.4));
  }

  &.disabled {
    background-color: var(--bg-control, rgba(128, 128, 128, 0.1));
    border-color: var(--border-color, rgba(0, 0, 0, 0.06));
    color: var(--text-tertiary, #a1a1aa);
    opacity: var(--disabled-opacity, 0.3);
    cursor: default;
    box-shadow: none;
  }

  .selector {
    min-width: 40px;
    height: calc(var(--inspector-control-height, 28px) - 2px);
    line-height: calc(var(--inspector-control-height, 28px) - 2px);
    padding-left: 8px;
    font-size: var(--inspector-control-font-size, 13px);
    font-weight: 450;
    color: var(--text-inspector, rgb(50, 50, 50));
    @include ellipsis-oneline();
  }
}
.options {
  max-height: 260px;
  padding: 4px;
  overflow: auto;
  text-align: left;
  font-size: 12.5px;
  user-select: none;
  background: var(--popover-bg, rgba(255, 255, 255, 0.95));
  color: var(--text-primary, #1d1d1f);
  backdrop-filter: blur(20px);
  border-radius: 8px;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
.option {
  height: 28px;
  line-height: 28px;
  padding: 0 8px;
  border-radius: 5px;
  color: var(--text-primary, #1d1d1f);
  @include ellipsis-oneline();

  &.disabled {
    color: var(--text-tertiary, #a1a1aa);
  }
  &:not(.disabled, .selected):hover {
    background-color: var(--bg-hover, rgba(128, 128, 128, 0.12));
    color: var(--text-primary, #1d1d1f);
    cursor: pointer;
  }

  &.selected {
    color: #fff;
    background-color: var(--accent-color, #007aff);
    font-weight: 600;
  }
}
.icon {
  width: 24px;
  height: 26px;
  color: var(--text-tertiary, #86868b);
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 11px;
}
</style>