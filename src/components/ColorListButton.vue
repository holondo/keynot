<template>
  <Button class="color-btn" :nowrap="true">
    <div class="blocks">
      <div class="color-block" v-for="(color, index) in colors" :key="index">
        <div class="content" :style="{ backgroundColor: color }"></div>
      </div>
    </div>
    <i-icon-park-outline:platte class="color-btn-icon" />
  </Button>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import Button from './Button.vue'

const props = defineProps<{
  colors: string[]
}>()

const colors = computed(() => {
  if (props.colors.length > 12) return props.colors.slice(0, 12)
  return props.colors
})
</script>

<style lang="scss" scoped>
.color-btn {
  width: 100%;
  height: 28px !important;
  min-height: 28px !important;
  display: flex !important;
  align-items: center;
  justify-content: space-between !important;
  padding: 0 4px 0 0 !important;
  box-sizing: border-box;
}
.blocks {
  display: flex;
  flex: 1;
  min-width: 0;
  height: 20px;
  margin-left: 6px;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
}
.color-block {
  height: 20px;
  flex: 1;
  min-width: 0;
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAEBJREFUOE9jfPbs2X8GIoCkpCQRqhgYGEcNxBlOo2GIM2iGQLL5//8/UTnl+fPnxOWUUQNxhtNoGOLOKYM+2QAAh2Nq10DwkukAAAAASUVORK5CYII=);

  & + & {
    margin-left: 1px;
  }
}
.content {
  width: 100%;
  height: 100%;
}
.color-btn-icon {
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-md);
  color: var(--text-tertiary, #86868b);
  flex-shrink: 0;
}
</style>
