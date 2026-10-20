<template>
  <div class="fullscreen-spin" :class="{ 'mask': mask }" v-if="loading">
    <div class="spin">
      <div class="spinner"></div>
      <div class="text">{{tip}}</div>
      <button v-if="cancelable" class="cancel-btn" @click="emit('cancel')">
        {{ cancelText || 'Cancel' }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  loading?: boolean
  mask?: boolean
  tip?: string
  cancelable?: boolean
  cancelText?: string
}>(), {
  loading: false,
  mask: true,
  tip: '',
  cancelable: false,
  cancelText: 'Cancel',
})

const emit = defineEmits<{
  (event: 'cancel'): void
}>()

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.loading && props.cancelable) {
    emit('cancel')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style lang="scss" scoped>
.fullscreen-spin {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;

  &.mask {
    background-color: var(--mask-bg, rgba(0, 0, 0, 0.45));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
}
.spin {
  width: 240px;
  min-height: 160px;
  background: var(--popover-bg, rgba(255, 255, 255, 0.95));
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  border-radius: var(--radius-menu);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px 20px;
  box-sizing: border-box;
}
.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--accent-color, #007aff);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spinner .8s linear infinite;
}
.text {
  margin-top: 14px;
  color: var(--text-primary, #1d1d1f);
  font-size: var(--text-md);
  font-weight: 500;
  text-align: center;
  line-height: 1.4;
}
.cancel-btn {
  margin-top: 16px;
  padding: 6px 20px;
  background: var(--bg-control, rgba(0, 0, 0, 0.06));
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
  border-radius: 9999px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary, #1d1d1f);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--bg-hover, rgba(0, 0, 0, 0.1));
    border-color: var(--text-secondary, #86868b);
    transform: translateY(-1px);
  }
}
@keyframes spinner {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>