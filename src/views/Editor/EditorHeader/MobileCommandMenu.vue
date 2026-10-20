<template>
  <ResponsiveSheet :visible="visible" :title="levelTitle" :can-go-back="navigationPath.length > 0" :return-focus="returnFocus" @back="goBack" @close="close">
    <div class="mobile-command-list" role="menu">
      <button
        v-for="item in levelItems"
        :key="item.id"
        class="mobile-command"
        :disabled="item.disabled"
        role="menuitem"
        @click="activate(item)"
      >
        <span class="check">{{ item.checked ? '✓' : '' }}</span>
        <span class="label">{{ item.label }}</span>
        <span v-if="item.children" class="arrow">›</span>
      </button>
    </div>
  </ResponsiveSheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { KEYNOTE_MENUS, type KeynoteCommand } from '@/commands/keynoteCommands'
import { t } from '@/i18n'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet.vue'

const props = withDefaults(defineProps<{ visible: boolean; disabledCommandIds?: string[]; checkedCommandIds?: string[]; returnFocus?: HTMLElement | null }>(), { disabledCommandIds: () => [], checkedCommandIds: () => [] })
const emit = defineEmits<{ execute: [id: string]; close: [] }>()
const navigationPath = ref<string[]>([])
watch(() => props.visible, visible => { if (!visible) navigationPath.value = [] })
const disabled = computed(() => new Set(props.disabledCommandIds))
const checked = computed(() => new Set(props.checkedCommandIds))
const resolveCommand = (command: KeynoteCommand): KeynoteCommand => ({ ...command, label: t(command.id, command.label), disabled: command.disabled || disabled.value.has(command.id), checked: checked.value.has(command.id), children: command.children?.map(resolveCommand) })
const menus = computed(() => KEYNOTE_MENUS.map(menu => ({ ...menu, label: t(menu.id, menu.label), children: menu.commands.map(resolveCommand) })))
const currentMenu = computed<any>(() => {
  let items: any[] = menus.value
  let current: any = null
  for (const id of navigationPath.value) { current = items.find(item => item.id === id); items = current?.children || [] }
  return { current, items }
})
const levelItems = computed(() => currentMenu.value.items)
const levelTitle = computed(() => currentMenu.value.current?.label || t('header.menu'))
const activate = (item: any) => { if (item.disabled) return; if (item.children?.length) navigationPath.value.push(item.id); else { emit('execute', item.id); emit('close') } }
const goBack = () => navigationPath.value.pop()
const close = () => emit('close')
</script>

<style scoped lang="scss">
.mobile-command-list { display: grid; gap: 4px; }
.mobile-command { min-height: var(--control-touch); width: 100%; display: grid; grid-template-columns: 24px 1fr 20px; align-items: center; gap: 8px; border: 0; border-radius: 12px; padding: 0 12px; background: transparent; color: var(--text-primary); text-align: left; font: inherit; }
.mobile-command:not(:disabled):active { background: var(--bg-control-active); }
.mobile-command:disabled { opacity: var(--disabled-opacity); }
.check { text-align: center; color: var(--accent-color); }
.label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.arrow { text-align: right; font-size: 22px; color: var(--text-tertiary); }
@media (hover: none) { .mobile-command .shortcut { display: none; } }
</style>
