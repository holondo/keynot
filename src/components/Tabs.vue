<template>
  <div class="tabs"
    :class="{
      'card': card || segmented,
      'segmented': segmented,
      'secondary': secondary,
      'space-around': spaceAround,
      'space-between': spaceBetween,
    }" 
    :style="tabsStyle || {}"
  >
    <div 
      class="tab" 
      :class="{ 'active': tab.key === value, 'disabled': tab.disabled }"
      v-for="tab in tabs" 
      :key="tab.key"
      :style="{
        ...(tabStyle || {}),
        '--color': tab.color,
      }"
      @click="!tab.disabled && emit('update:value', tab.key)"
    >{{tab.label}}</div>
  </div>
</template>

<script lang="ts" setup>
import { type CSSProperties } from 'vue'

export interface TabItem {
  key: string
  label: string
  color?: string
  disabled?: boolean
}

withDefaults(defineProps<{
  value: string
  tabs: TabItem[]
  card?: boolean
  segmented?: boolean
  secondary?: boolean
  tabsStyle?: CSSProperties
  tabStyle?: CSSProperties
  spaceAround?: boolean
  spaceBetween?: boolean
}>(), {
  card: false,
  segmented: false,
  secondary: false,
  spaceAround: false,
  spaceBetween: false,
})

const emit = defineEmits<{
  (event: 'update:value', payload: string): void
}>()
</script>

<style lang="scss" scoped>
.tabs {
  display: flex;
  user-select: none;
  line-height: 1;

  &:not(.card):not(.segmented) {
    font-size: var(--text-md);
    align-items: center;
    justify-content: flex-start;
    border-bottom: 1px solid var(--border-divider, rgba(0, 0, 0, 0.08));

    &.space-around {
      justify-content: space-around;
    }
    &.space-between {
      justify-content: space-between;
    }

    .tab {
      text-align: center;
      border-bottom: 2px solid transparent;
      padding: 8px 10px;
      cursor: pointer;
      color: var(--text-secondary, #6e6e73);
      font-weight: 500;

      &:hover:not(.active) {
        color: var(--text-primary, #1d1d1f);
      }

      &.active {
        color: var(--accent-color, #007aff);
        border-bottom: 2px solid var(--color, var(--accent-color, #007aff));
        font-weight: 600;
      }
      &.disabled {
        opacity: 0.35;
        cursor: default;
      }
    }
  }

  &.card, &.segmented {
    height: 30px;
    padding: 2px;
    background-color: var(--bg-control, #e9e9eb);
    border-radius: 9999px;
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    max-width: 100%;
    /* Too many tabs for a narrow screen: scroll the segment instead of overflowing. */
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }

    .tab {
      flex: 1 0 auto;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 9999px;
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-secondary, #1d1d1f);
      background-color: transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      padding: 0 8px;

      &:hover:not(.active) {
        color: var(--text-primary, #000);
      }

      &.active {
        background-color: var(--accent-color, #007aff);
        color: #ffffff;
        font-weight: var(--weight-strong);
      }

      &.disabled {
        opacity: 0.4;
        cursor: default;
      }
    }

    /* Card tabs are the secondary level under a segmented switch: neutral active state. */
    &.card, &.secondary {
      background-color: var(--bg-control, #e4e4e7);

      .tab.active {
        background-color: var(--bg-control-active, #ffffff);
        color: var(--text-primary, #1d1d1f);
        box-shadow: var(--glass-shadow-sm);
      }
    }
  }
}
</style>