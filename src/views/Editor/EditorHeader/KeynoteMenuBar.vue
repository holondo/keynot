<template>
  <nav class="keynote-menu-bar" aria-label="Presentation menus" @keydown.esc="closeMenus">
    <div v-for="menu in resolvedMenus" :key="menu.id" class="menu-root">
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { KEYNOTE_MENUS, type KeynoteCommand } from '@/commands/keynoteCommands'
import MenuBranch from './MenuBranch.vue'

const props = withDefaults(defineProps<{
  disabledCommandIds?: string[]
  checkedCommandIds?: string[]
}>(), {
  disabledCommandIds: () => [],
  checkedCommandIds: () => [],
})
const emit = defineEmits<{ (event: 'execute', commandId: string): void }>()
const openMenu = ref('')
const resolvedMenus = computed(() => {
  const disabled = new Set(props.disabledCommandIds)
  const checked = new Set(props.checkedCommandIds)
  const resolveCommands = (commands: KeynoteCommand[]): KeynoteCommand[] => commands.map(command => {
    const children = command.children ? resolveCommands(command.children) : undefined
    return {
      ...command,
      children,
      checked: checked.has(command.id),
      disabled: command.disabled || disabled.has(command.id) || !!(children?.length && children.every(child => child.disabled)),
    }
  })
  return KEYNOTE_MENUS.map(menu => ({ ...menu, commands: resolveCommands(menu.commands) }))
})
const closeMenus = () => { openMenu.value = '' }
const toggleMenu = (id: string) => { openMenu.value = openMenu.value === id ? '' : id }
const execute = (id: string) => { emit('execute', id); closeMenus() }

onMounted(() => document.addEventListener('click', closeMenus))
onBeforeUnmount(() => document.removeEventListener('click', closeMenus))
</script>

<style scoped lang="scss">
.keynote-menu-bar { position: relative; z-index: 1001; display: flex; align-items: center; height: 100%; gap: 1px; overflow: visible; }
.menu-root { position: relative; overflow: visible; }
.menu-trigger { border: 0; background: transparent; color: var(--text-primary, #1d1d1f); padding: 4px 7px; border-radius: 5px; font: inherit; cursor: default; }
.menu-trigger:hover, .menu-trigger.open { background: var(--accent-color, #007aff); color: #fff; }
.menu-panel { position: absolute; z-index: 1002; top: calc(100% + 5px); left: 0; min-width: 238px; padding: 5px; overflow: visible; border: 1px solid var(--border-color, rgba(0,0,0,.12)); border-radius: 9px; background: var(--bg-panel, rgba(255,255,255,.98)); box-shadow: 0 12px 36px rgba(0,0,0,.22); backdrop-filter: blur(24px); }
</style>
