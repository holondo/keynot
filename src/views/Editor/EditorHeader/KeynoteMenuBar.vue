<template>
  <nav class="keynote-menu-bar" aria-label="Presentation menus" @keydown.esc="closeMenus">
    <div v-for="menu in KEYNOTE_MENUS" :key="menu.id" class="menu-root">
      <button
        class="menu-trigger"
        :class="{ open: openMenu === menu.id }"
        :aria-expanded="openMenu === menu.id"
        @click.stop="toggleMenu(menu.id)"
        @mouseenter="openMenu && (openMenu = menu.id)"
      >{{ menu.label }}</button>
      <div v-if="openMenu === menu.id" class="menu-panel" role="menu">
        <MenuBranch :commands="menu.commands" @execute="execute" />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { KEYNOTE_MENUS } from '@/commands/keynoteCommands'
import MenuBranch from './MenuBranch.vue'

const emit = defineEmits<{ (event: 'execute', commandId: string): void }>()
const openMenu = ref('')
const closeMenus = () => { openMenu.value = '' }
const toggleMenu = (id: string) => { openMenu.value = openMenu.value === id ? '' : id }
const execute = (id: string) => { emit('execute', id); closeMenus() }

onMounted(() => document.addEventListener('click', closeMenus))
onBeforeUnmount(() => document.removeEventListener('click', closeMenus))
</script>

<style scoped lang="scss">
.keynote-menu-bar { display: flex; align-items: center; height: 100%; gap: 1px; }
.menu-root { position: relative; }
.menu-trigger { border: 0; background: transparent; color: var(--text-primary, #1d1d1f); padding: 4px 7px; border-radius: 5px; font: inherit; cursor: default; }
.menu-trigger:hover, .menu-trigger.open { background: var(--accent-color, #007aff); color: #fff; }
.menu-panel { position: absolute; z-index: 1000; top: calc(100% + 5px); left: 0; min-width: 238px; padding: 5px; border: 1px solid var(--border-color, rgba(0,0,0,.12)); border-radius: 9px; background: var(--bg-panel, rgba(255,255,255,.98)); box-shadow: 0 12px 36px rgba(0,0,0,.22); backdrop-filter: blur(24px); }
</style>
