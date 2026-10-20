<template>
  <ResponsiveSheet :visible="visible" :title="levelTitle" :can-go-back="navigationPath.length > 0" :levels="navigationPath.length" :return-focus="returnFocus" @back="goBack" @close="close">
    <Transition :name="`level-${transitionDirection}`" mode="out-in">
    <div class="mobile-command-list" role="menu" :key="navigationPath.join('/')">
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
    </Transition>
  </ResponsiveSheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { KEYNOTE_MENUS, type KeynoteCommand } from '@/commands/keynoteCommands'
import { t } from '@/i18n'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet.vue'

const props = withDefaults(defineProps<{ visible: boolean; disabledCommandIds?: string[]; checkedCommandIds?: string[]; returnFocus?: HTMLElement | null; initialPath?: string[] }>(), { disabledCommandIds: () => [], checkedCommandIds: () => [], initialPath: () => [] })
const emit = defineEmits<{ execute: [id: string]; close: [] }>()
const navigationPath = ref<string[]>([])
// Pushing a level slides in from the right, going back slides from the left (native stack feel).
const transitionDirection = ref<'forward' | 'back'>('forward')
watch(() => navigationPath.value.length, (length, previous) => { transitionDirection.value = length >= previous ? 'forward' : 'back' })
watch(() => props.visible, visible => { navigationPath.value = visible ? [...props.initialPath] : [] })
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
@import '@/assets/styles/glass-system.scss';
.mobile-command-list { display: grid; gap: 2px; }
.mobile-command {
  @include menu-item;
  min-height: var(--control-touch);
  width: 100%;
  display: grid;
  grid-template-columns: 20px 1fr 16px;
  padding: 0 12px;
  text-align: left;
  font-size: var(--text-lg);
  &:not(:disabled):hover { background: var(--bg-control); color: var(--text-primary); }
  &:not(:disabled):active { background: var(--bg-hover); }
}
.mobile-command:disabled { opacity: var(--disabled-opacity); }
.check { text-align: center; color: var(--accent-color); }
.label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.arrow { text-align: right; font-size: 20px; line-height: 1; color: var(--text-tertiary); }
.level-forward-enter-active, .level-forward-leave-active,
.level-back-enter-active, .level-back-leave-active { transition: transform 160ms var(--ease-out), opacity 160ms var(--ease-out); }
.level-forward-enter-from, .level-back-leave-to { transform: translateX(24px); opacity: 0; }
.level-forward-leave-to, .level-back-enter-from { transform: translateX(-24px); opacity: 0; }
</style>
