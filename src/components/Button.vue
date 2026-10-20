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
      'first': first,
      'last': last,
    }"
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
  size?: 'small' | 'normal'
  first?: boolean
  last?: boolean
}>(), {
  checked: false,
  disabled: false,
  type: 'default',
  size: 'normal',
  first: false,
  last: false,
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
  height: 28px;
  line-height: 28px;
  outline: 0;
  font-size: 12.5px;
  padding: 0 14px;
  text-align: center;
  color: var(--text-primary, #1d1d1f);
  border-radius: 6px;
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
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;

  &.small {
    height: 24px;
    line-height: 24px;
    padding: 0 10px;
    font-size: 11.5px;
  }

  &.default {
    background-color: var(--bg-control, #f5f5f7);
    border-color: var(--border-color, rgba(0, 0, 0, 0.12));
    color: var(--text-primary, #1d1d1f);

    &:hover {
      background-color: var(--bg-control-active, #ebebee);
      color: var(--text-primary, #1d1d1f);
      border-color: var(--border-color, rgba(0, 0, 0, 0.18));
    }
  }

  &.primary {
    background-color: var(--accent-color, #007aff);
    border-color: var(--accent-color, #007aff);
    color: #fff;
    box-shadow: 0 1px 3px rgba(0, 122, 255, 0.3);

    &:hover {
      background-color: #0062cc;
      border-color: #0062cc;
    }
  }

  &.checkbox, &.radio {
    background-color: var(--bg-control, #f5f5f7);
    border-color: var(--border-color, rgba(0, 0, 0, 0.12));
    color: var(--text-primary, #1d1d1f);

    &:not(.checked):hover {
      background-color: var(--bg-control-active, #ebebee);
      color: var(--accent-color, #007aff);
    }
  }

  &.checked {
    color: #fff;
    background-color: var(--accent-color, #007aff);
    border-color: var(--accent-color, #007aff);

    &:hover {
      background-color: #0062cc;
      border-color: #0062cc;
    }
  }

  &.disabled {
    background-color: var(--bg-control, rgba(128, 128, 128, 0.1));
    border-color: var(--border-color, rgba(0, 0, 0, 0.06));
    color: var(--text-tertiary, #a1a1aa);
    cursor: default;
    box-shadow: none;
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