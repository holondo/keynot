<template>
  <ul class="menu-content">
    <template v-for="(menu, index) in menus" :key="menu.text || index">
      <li
        v-if="!menu.hide"
        class="menu-item"
        @click.stop="handleClickMenuItem(menu)"
        :class="{'divider': menu.divider, 'disable': menu.disable}"
      >
        <div 
          class="menu-item-content" 
          :class="{
            'has-children': menu.children,
            'has-handler': menu.handler,
          }" 
          v-if="!menu.divider"
        >
          <span class="text">{{menu.text}}</span>
          <span class="sub-text" v-if="menu.subText && !menu.children">{{ formatShortcut(menu.subText.replace(/\s*\+\s*/g, '+')) }}</span>

          <menu-content 
            class="sub-menu"
            :menus="menu.children" 
            v-if="menu.children && menu.children.length"
            :handleClickMenuItem="handleClickMenuItem" 
          />
        </div>
      </li>
    </template>
  </ul>
</template>

<script lang="ts" setup>
import { formatShortcut } from '@/utils/shortcut'
import type { ContextmenuItem } from './types'

defineProps<{
  menus: ContextmenuItem[]
  handleClickMenuItem: (item: ContextmenuItem) => void
}>()
</script>

<style lang="scss" scoped>
@import '@/assets/styles/glass-system.scss';
$menuWidth: 188px;
$menuHeight: 28px;
$subMenuWidth: 132px;

.menu-content {
  @include menu-surface;
  min-width: $menuWidth;
  width: max-content;
  list-style: none;
  margin: 0;
}
.menu-item {
  padding: 0 12px;
  color: var(--text-primary, #1d1d1f);
  font-size: var(--text-md);
  transition: background-color 0.08s ease;
  white-space: nowrap;
  height: $menuHeight;
  line-height: $menuHeight;
  background-color: transparent;
  border-radius: var(--radius-menu-item);
  cursor: pointer;

  &:not(.disable):hover > .menu-item-content > .sub-menu {
    display: block;
  }

  &:not(.disable):hover > .has-children.has-handler::after {
    transform: scale(1);
  }

  &:hover:not(.disable) {
    background-color: var(--accent-color, #007aff);
    color: #fff;

    .menu-item-content .sub-text {
      color: rgba(255, 255, 255, 0.85);
    }
    .menu-item-content.has-children::before {
      border-color: #fff #fff transparent transparent;
    }
  }

  &.divider {
    height: 1px;
    overflow: hidden;
    margin: 5px 6px;
    background-color: var(--border-divider, rgba(0, 0, 0, 0.08));
    line-height: 0;
    padding: 0;
  }

  &.disable {
    color: var(--text-tertiary, #a1a1aa);
    cursor: no-drop;
  }
}
.menu-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;

  &.has-children::before {
    content: '';
    display: inline-block;
    width: 7px;
    height: 7px;
    border-width: 1.5px;
    border-style: solid;
    border-color: var(--text-tertiary, #a1a1aa) var(--text-tertiary, #a1a1aa) transparent transparent;
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%) rotate(45deg);
  }
  &.has-children.has-handler::after {
    content: '';
    display: inline-block;
    width: 1px;
    height: 20px;
    background-color: rgba(255, 255, 255, 0.3);
    position: absolute;
    right: 16px;
    top: 4px;
    transform: scale(0);
    transition: transform $transitionDelayFast;
  }

  .sub-text {
    color: var(--text-tertiary, #98989d);
    font-size: var(--text-sm);
    margin-left: 24px;
  }
  .sub-menu {
    width: $subMenuWidth;
    position: absolute;
    display: none;
    left: 100%;
    top: -4px;
  }
}
</style>