<template>
  <div 
    class="input"
    :class="{
      'disabled': disabled,
      'focused': focused,
      'simple': simple,
    }"
  >
    <span class="prefix">
      <slot name="prefix"></slot>
    </span>
    <input
      type="text"
      ref="inputRef"
      :disabled="disabled"
      :value="value" 
      :placeholder="placeholder"
      :maxlength="maxlength"
      @input="$event => handleInput($event)"
      @focus="$event => handleFocus($event)"
      @blur="$event => handleBlur($event)"
      @change="$event => emit('change', $event)"
      @keydown.enter="$event => emit('enter', $event)"
      @keydown.backspace="$event => emit('backspace', $event)"
    />
    <span class="suffix">
      <slot name="suffix"></slot>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { useTemplateRef, ref } from 'vue'

withDefaults(defineProps<{
  value: string
  disabled?: boolean
  placeholder?: string
  simple?: boolean
  maxlength?: number
}>(), {
  disabled: false,
  placeholder: '',
  simple: false,
})

const emit = defineEmits<{
  (event: 'update:value', payload: string): void
  (event: 'input', payload: Event): void
  (event: 'change', payload: Event): void
  (event: 'blur', payload: Event): void
  (event: 'focus', payload: Event): void
  (event: 'enter', payload: Event): void
  (event: 'backspace', payload: Event): void
}>()

const focused = ref(false)

const handleInput = (e: Event) => {
  emit('update:value', (e.target as HTMLInputElement).value)
}
const handleBlur = (e: Event) => {
  focused.value = false
  emit('blur', e)
}
const handleFocus = (e: Event) => {
  focused.value = true
  emit('focus', e)
}

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const focus = () => {
  if (inputRef.value) inputRef.value.focus()
}

defineExpose({
  focus,
})
</script>

<style lang="scss" scoped>
.input {
  background-color: var(--bg-control);
  border: 1px solid transparent;
  padding: 0 5px;
  border-radius: var(--inspector-control-radius, 8px);
  transition: border-color .2s;
  font-size: var(--inspector-control-font-size, 13px);
  font-family: var(--font-ui);
  display: flex;

  input {
    min-width: 0;
    height: var(--inspector-control-height, 28px);
    outline: 0;
    border: 0;
    line-height: var(--inspector-control-height, 28px);
    vertical-align: top;
    background: transparent;
    color: var(--text-inspector, rgb(50, 50, 50));
    padding: 0 5px;
    flex: 1;
    font-size: var(--inspector-control-font-size, 13px);
    font-family: var(--font-ui);

    &::placeholder {
      color: var(--text-tertiary, #86868b);
    }
  }

  &:not(.disabled):hover, &.focused {
    border-color: var(--accent-color, rgb(0, 122, 255));
  }

  &.disabled {
    background-color: var(--bg-control, rgba(128, 128, 128, 0.1));
    border-color: transparent;
    color: var(--text-tertiary, #b7b7b7);
    opacity: var(--disabled-opacity, 0.3);

    input {
      color: var(--text-tertiary, #b7b7b7);
    }
  }

  &.simple {
    border: 0;
  }

  .prefix, .suffix {
    display: flex;
    justify-content: center;
    align-items: center;
    line-height: var(--inspector-control-height, 28px);
    user-select: none;
    color: var(--text-tertiary, #86868b);
  }
}
</style>