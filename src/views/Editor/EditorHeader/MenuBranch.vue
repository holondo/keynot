<template>
  <div class="menu-branch">
    <div v-for="command in commands" :key="command.id" class="command-wrap" @mouseenter="placeSubmenu(command.id, $event)" @focusin="placeSubmenu(command.id, $event)">
      <button
        class="command"
        role="menuitem"
        :disabled="command.disabled"
        :aria-haspopup="command.children ? 'menu' : undefined"
        @click.stop="!command.children && emit('execute', command.id)"
      >
        <span class="check">{{ command.checked ? '✓' : '' }}</span>
        <span class="label">{{ command.label }}</span>
        <span v-if="command.shortcut" class="shortcut">{{ formatShortcut(command.shortcut) }}</span>
        <span v-if="command.children" class="arrow">›</span>
      </button>
      <div v-if="command.children && !command.disabled" class="submenu" :class="{ 'opens-left': opensLeft[command.id] }">
        <MenuBranch :commands="command.children" @execute="id => emit('execute', id)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { KeynoteCommand } from '@/commands/keynoteCommands'
import { formatShortcut } from '@/utils/shortcut'
defineProps<{ commands: KeynoteCommand[] }>()
const emit = defineEmits<{ (event: 'execute', commandId: string): void }>()
const opensLeft = reactive<Record<string, boolean>>({})
const placeSubmenu = (id: string, event: Event) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  opensLeft[id] = rect.right + 220 > window.innerWidth
}
</script>

<style scoped lang="scss">
@import '@/assets/styles/glass-system.scss';
.menu-branch { position: relative; overflow: visible; }
.command-wrap { position: relative; }
.command {
  @include menu-item;
  width: 100%;
  display: grid;
  grid-template-columns: 14px 1fr auto 10px;
  min-height: 28px;
  text-align: left;
  white-space: nowrap;
  &:not(:disabled):hover .shortcut,
  &:not(:disabled):hover .arrow { color: #fff; }
}
.command:disabled { opacity: var(--disabled-opacity); cursor: default; }
.check { text-align: center; }
.shortcut { color: var(--text-tertiary); margin-left: 18px; font-size: var(--text-sm); }
.arrow { font-size: var(--text-lg); line-height: 1; color: var(--text-tertiary); }
.submenu {
  @include menu-surface;
  display: none;
  position: absolute;
  z-index: 1003;
  left: 100%;
  top: -4px;
  min-width: 210px;
  overflow: visible;
}
.command-wrap:hover > .submenu, .command-wrap:focus-within > .submenu { display: block; }
.submenu.opens-left { left: auto; right: 100%; }
</style>
