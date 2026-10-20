<template>
  <button 
    class="button"
    :class="{
      'disabled': disabled,
      'checked': !disabled && checked,
      'default': !disabled && type === 'default',
      'primary': !disabled && type === 'primary',
      'checkbox': !disabled && type === 'checkbox',
      'radio': !disabled && type === 'radio',
      'small': size === 'small',
      'large': size === 'large',
      'block': block,
      'nowrap': nowrap,
      'first': first,
      'last': last,
    }"
    :title="title || undefined"
    @click="handleClick()"
  >
    <slot></slot>
  </button>
</template>

<script lang="ts" setup>
const props = withDefaults(defineProps<{
  checked?: boolean
  disabled?: boolean
  type?: 'default' | 'primary' | 'checkbox' | 'radio'
  size?: 'small' | 'normal' | 'large'
  first?: boolean
  last?: boolean
  block?: boolean
  nowrap?: boolean
  title?: string
}>(), {
  checked: false,
  disabled: false,
  type: 'default',
  size: 'normal',
  first: false,
  last: false,
  block: false,
  nowrap: false,
})

const emit = defineEmits<{
  (event: 'click'): void
}>()

const handleClick = () => {
  if (props.disabled) return
  emit('click')
}
</script>

<style lang="scss" scoped>
.button {
  min-height: 28px;
  height: auto;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  outline: 0;
  font-size: 12px;
  line-height: 1.35;
  padding: 4px 10px;
  text-align: center;
  color: var(--text-primary, #1d1d1f);
  border-radius: var(--radius-sm, 6px);
  user-select: none;
  cursor: pointer;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
  background-color: var(--bg-control, #ffffff);
  transition: all 0.15s ease;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  flex-shrink: 1;
  word-break: break-word;

  &.nowrap {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    height: 28px;
    padding: 0 8px;
  }

  &.block {
    width: 100%;
    display: flex;
  }

  &.small {
    min-height: 24px;
    font-size: 11.5px;
    padding: 2px 8px;

    &.nowrap {
      height: 24px;
      line-height: 22px;
    }
  }

  &.large {
    min-height: 32px;
    font-size: 13px;
    padding: 6px 14px;

    &.nowrap {
      height: 32px;
      line-height: 30px;
    }
  }

  &.default {
    background-color: var(--bg-control, #f5f5f7);
    border-color: var(--border-color, rgba(0, 0, 0, 0.12));
    color: var(--text-primary, #1d1d1f);

    &:hover:not(.disabled) {
      background-color: var(--bg-control-active, #ebebee);
      color: var(--text-primary, #1d1d1f);
      border-color: var(--border-color, rgba(0, 0, 0, 0.2));
    }
  }

  &.primary {
    background-color: var(--accent-color, #007aff);
    border-color: var(--accent-color, #007aff);
    color: #fff;
    box-shadow: 0 1px 3px rgba(0, 122, 255, 0.3);

    &:hover:not(.disabled) {
      background-color: var(--accent-hover, #0062cc);
      border-color: var(--accent-hover, #0062cc);
    }
  }

  &.checkbox, &.radio {
    background-color: var(--bg-control, #f5f5f7);
    border-color: var(--border-color, rgba(0, 0, 0, 0.12));
    color: var(--text-primary, #1d1d1f);

    &:not(.checked):hover:not(.disabled) {
      background-color: var(--bg-control-active, #ebebee);
      color: var(--accent-color, #007aff);
    }
  }

  &.checked {
    color: #fff;
    background-color: var(--accent-color, #007aff);
    border-color: var(--accent-color, #007aff);

    &:hover:not(.disabled) {
      background-color: var(--accent-hover, #0062cc);
      border-color: var(--accent-hover, #0062cc);
    }
  }

  &.disabled {
    background-color: var(--bg-control, rgba(128, 128, 128, 0.1));
    border-color: var(--border-color, rgba(0, 0, 0, 0.06));
    color: var(--text-tertiary, #a1a1aa);
    cursor: default;
    box-shadow: none;
    opacity: 0.55;
  }
}

:global([data-theme="dark"]) .button.default,
:global(.dark) .button.default {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
  color: #f5f5f7;

  &:hover {
    background-color: rgba(255, 255, 255, 0.18);
    border-color: rgba(255, 255, 255, 0.25);
    color: #ffffff;
  }
}
</style>
