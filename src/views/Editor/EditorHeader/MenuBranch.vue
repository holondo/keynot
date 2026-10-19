<template>
  <div class="menu-branch">
    <div v-for="command in commands" :key="command.id" class="command-wrap">
      <button
        class="command"
        role="menuitem"
        :disabled="command.disabled"
        :aria-haspopup="command.children ? 'menu' : undefined"
        @click.stop="!command.children && emit('execute', command.id)"
      >
        <span class="check">{{ command.checked ? '✓' : '' }}</span>
        <span class="label">{{ command.label }}</span>
        <span v-if="command.shortcut" class="shortcut">{{ command.shortcut }}</span>
        <span v-if="command.children" class="arrow">›</span>
      </button>
      <div v-if="command.children && !command.disabled" class="submenu">
        <MenuBranch :commands="command.children" @execute="id => emit('execute', id)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { KeynoteCommand } from '@/commands/keynoteCommands'
defineProps<{ commands: KeynoteCommand[] }>()
const emit = defineEmits<{ (event: 'execute', commandId: string): void }>()
</script>

<style scoped lang="scss">
.menu-branch { position: relative; overflow: visible; }
.command-wrap { position: relative; }
.command { width: 100%; display: grid; grid-template-columns: 17px 1fr auto 12px; align-items: center; gap: 7px; min-height: 27px; padding: 3px 7px; border: 0; border-radius: 5px; background: transparent; color: var(--text-primary, #1d1d1f); font: inherit; text-align: left; white-space: nowrap; }
.command:not(:disabled):hover { background: var(--accent-color, #007aff); color: #fff; }
.command:disabled { opacity: .42; }
.check { text-align: center; }.shortcut { color: var(--text-secondary, #777); margin-left: 18px; }.command:hover .shortcut { color: inherit; }.arrow { font-size: 18px; }
.submenu { display: none; position: absolute; z-index: 1003; left: calc(100% - 2px); top: -5px; min-width: 210px; padding: 5px; overflow: visible; border: 1px solid var(--border-color, rgba(0,0,0,.12)); border-radius: 9px; background: var(--bg-panel, rgba(255,255,255,.98)); box-shadow: 0 12px 36px rgba(0,0,0,.22); }
.command-wrap:hover > .submenu, .command-wrap:focus-within > .submenu { display: block; }
</style>
