<template>
  <div class="popover-menu-item" :class="{ 'center': center }" @click="emit('click')">
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
  center?: boolean
}>(), {
  center: false,
})

const emit = defineEmits<{
  (event: 'click'): void
}>()
</script>

<style lang="scss" scoped>
.popover-menu-item {
  min-width: 80px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--text-primary, #1d1d1f);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.12s ease;

  &.center {
    justify-content: center;
    text-align: center;
  }

  &:hover {
    background-color: var(--accent-color, #007aff);
    color: #ffffff !important;

    ::v-deep(.icon) {
      color: #ffffff !important;
    }
  }
  & + .popover-menu-item {
    margin-top: 2px;
  }
}
</style>