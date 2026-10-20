<template>
  <div 
    class="number-input"
    :class="{
      'disabled': disabled,
      'focused': focused,
    }"
  >
    <span class="prefix">
      <slot name="prefix"></slot>
    </span>
    <div class="input-wrap">
      <input
        type="text"
        :disabled="disabled"
        v-model="number" 
        :placeholder="placeholder"
        @input="$event => emit('input', $event)"
        @focus="$event => handleFocus($event)"
        @blur="$event => handleBlur($event)"
        @change="$event => emit('change', $event)"
        @keydown.enter="$event => handleEnter($event)"
      />
      <div class="handlers">
        <span class="handler" @click="number += step">
          <svg fill="currentColor" width="1em" height="1em" viewBox="64 64 896 896"><path d="M890.5 755.3L537.9 269.2c-12.8-17.6-39-17.6-51.7 0L133.5 755.3A8 8 0 00140 768h75c5.1 0 9.9-2.5 12.9-6.6L512 369.8l284.1 391.6c3 4.1 7.8 6.6 12.9 6.6h75c6.5 0 10.3-7.4 6.5-12.7z"></path></svg>
        </span>
        <span class="handler" @click="number -= step">
          <svg fill="currentColor" width="1em" height="1em" viewBox="64 64 896 896"><path d="M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z"></path></svg>
        </span>
      </div>
    </div>
    <span class="suffix">
      <slot name="suffix"></slot>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  disabled?: boolean
  placeholder?: string
  min?: number
  max?: number
  step?: number
}>(), {
  disabled: false,
  placeholder: '',
  min: 0,
  max: Infinity,
  step: 1,
})

const emit = defineEmits<{
  (event: 'update:value', payload: number): void
  (event: 'input', payload: Event): void
  (event: 'change', payload: Event): void
  (event: 'blur', payload: Event): void
  (event: 'focus', payload: Event): void
  (event: 'enter', payload: Event): void
}>()

const number = ref(0)
const focused = ref(false)

watch(() => props.value, () => {
  if (props.value !== number.value) {
    number.value = props.value
  }
}, {
  immediate: true,
})

watch(number, () => {
  const value = +number.value
  if (isNaN(value)) return
  else if (value > props.max) return
  else if (value < props.min) return

  number.value = value
  emit('update:value', number.value)
})

const checkAndEmitValue = () => {
  let value = +number.value
  if (isNaN(value)) value = props.min
  else if (value > props.max) value = props.max
  else if (value < props.min) value = props.min

  number.value = value
  emit('update:value', number.value)
}

const handleEnter = (e: Event) => {
  checkAndEmitValue()
  emit('enter', e)
}

const handleBlur = (e: Event) => {
  checkAndEmitValue()
  focused.value = false
  emit('blur', e)
}
const handleFocus = (e: Event) => {
  focused.value = true
  emit('focus', e)
}
</script>

<style lang="scss" scoped>
.number-input {
  background-color: var(--bg-control);
  border: 1px solid transparent;
  padding: 0 0 0 6px;
  border-radius: var(--inspector-control-radius, 8px);
  transition: all .15s ease;
  font-size: var(--inspector-control-font-size, 13px);
  font-family: var(--font-ui);
  display: inline-flex;
  align-items: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  height: var(--inspector-control-height, 28px);
  overflow: hidden;

  .input-wrap {
    flex: 1;
    color: var(--text-inspector, rgb(50, 50, 50));
    padding: 0;
    position: relative;
    display: flex;
    align-items: center;
  }
  .handlers {
    width: 18px;
    height: 100%;
    display: flex;
    flex-direction: column;
    font-size: var(--text-xs);
    color: var(--text-tertiary, #86868b);
    user-select: none;
    background-color: var(--bg-control, #f5f5f7);
    border-left: 1px solid var(--border-divider);

    .handler {
      width: 100%;
      height: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      transition: background-color .1s;

      & + .handler {
        border-top: 1px solid var(--border-divider);
      }

      &:hover {
        background-color: var(--bg-hover, rgba(128, 128, 128, 0.15));
        color: var(--text-primary, #000);
      }
    }
  }
  input {
    width: 100%;
    min-width: 0;
    padding: 0;
    height: calc(var(--inspector-control-height, 28px) - 2px);
    line-height: calc(var(--inspector-control-height, 28px) - 2px);
    outline: 0;
    border: 0;
    background: transparent;
    font-size: var(--inspector-control-font-size, 13px);
    font-family: var(--font-ui);
    color: var(--text-inspector, rgb(50, 50, 50));

    &::placeholder {
      color: var(--text-tertiary, #a1a1aa);
    }
  }

  &:not(.disabled):hover, &.focused {
    border-color: var(--accent-color, rgba(0, 122, 255, 0.4));
  }

  &.disabled {
    background-color: var(--bg-control, rgba(128, 128, 128, 0.1));
    border-color: transparent;
    color: var(--text-tertiary, #a1a1aa);
    opacity: var(--disabled-opacity, 0.3);

    input {
      color: var(--text-tertiary, #a1a1aa);
    }
  }

  .prefix, .suffix {
    display: flex;
    justify-content: center;
    align-items: center;
    line-height: calc(var(--inspector-control-height, 28px) - 2px);
    user-select: none;
    font-size: var(--text-sm);
    color: var(--text-tertiary, #86868b);
    padding-right: 4px;
  }
}
</style>