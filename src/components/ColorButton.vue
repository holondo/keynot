<template>
  <div class="keynote-color-well">
    <div class="color-swatch-box" :style="{ backgroundColor: color || '#000000' }"></div>
    <div class="rainbow-wheel"></div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  color: string
}>()
</script>

<style lang="scss" scoped>
.keynote-color-well {
  width: 100%;
  height: 28px;
  padding: 3px 5px;
  background-color: var(--bg-card, var(--bg-control, #ffffff));
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--accent-color, rgba(0, 0, 0, 0.22));
  }

  .color-swatch-box {
    flex: 1;
    height: 100%;
    border-radius: 4px;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
    background-image: linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%),
                      linear-gradient(-45deg, rgba(0,0,0,0.05) 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.05) 75%),
                      linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.05) 75%);
    background-size: 8px 8px;
    background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
  }

  .rainbow-wheel {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: conic-gradient(red, #ff8000, yellow, #00ff00, #00ffff, #0000ff, #8000ff, #ff0080, red);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.6);
    flex-shrink: 0;
  }
}
</style>