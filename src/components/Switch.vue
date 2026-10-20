<template>
  <span
    class="switch"
    :class="{
      'active': value,
      'disabled': disabled,
    }" 
    @click="handleChange()"
  >
    <span class="switch-core"></span>
  </span>
</template>

<script lang="ts" setup>
const props = withDefaults(defineProps<{
  value: boolean
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  (event: 'update:value', payload: boolean): void
}>()

const handleChange = () => {
  if (props.disabled) return
  emit('update:value', !props.value)
}
</script>

<style lang="scss" scoped>
.switch {
  height: 20px;
  display: inline-block;
  cursor: pointer;

  &:not(.disabled).active {
    .switch-core {
      border-color: var(--accent-green, #34c759);
      background-color: var(--accent-green, #34c759);

      &::after {
        left: 100%;
        margin-left: -17px;
      }
    }
  }

  &.disabled {
    cursor: default;
    opacity: 0.5;

    .switch-core::after {
      background-color: #f5f5f5;
    }
  }
}
.switch-core {
  margin: 0;
  display: inline-block;
  position: relative;
  width: 36px;
  height: 20px;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
  outline: none;
  border-radius: var(--radius-menu);
  box-sizing: border-box;
  background: var(--bg-control, #d9d9d9);
  transition: border-color .2s, background-color .2s;
  vertical-align: middle;

  &::after {
    content: '';
    position: absolute;
    top: 1px;
    left: 1px;
    border-radius: 100%;
    transition: all .2s;
    width: 16px;
    height: 16px;
    background-color: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
}
</style>