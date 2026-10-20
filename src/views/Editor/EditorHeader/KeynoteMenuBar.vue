<template>
  <nav ref="menuBar" class="keynote-menu-bar" aria-label="Presentation menus" @keydown="handleKeydown">
    <template v-if="tier === 'desktop'">
      <div v-for="menu in resolvedMenus" :key="menu.id" class="menu-root">
        <PillButton
          class="menu-trigger"
          size="compact"
          :active="openMenu === menu.id"
          :aria-expanded="openMenu === menu.id"
          aria-haspopup="menu"
          @click.stop="toggleMenu(menu.id)"
          @mouseenter="openMenu && (openMenu = menu.id)"
        >{{ menu.label }}</PillButton>
        <div v-if="openMenu === menu.id" class="menu-panel" role="menu">
          <MenuBranch :commands="menu.commands" @execute="execute" />
        </div>
      </div>
    </template>
    <PillButton
      v-else
      ref="mobileTrigger"
      class="mobile-menu-trigger"
      icon-only
      :size="tier === 'mobile' ? 'touch' : 'regular'"
      :aria-label="t('header.menu')"
      :hint="t('header.menu')"
      aria-haspopup="dialog"
      @click.stop="open()"
    ><i-icon-park-outline:more /></PillButton>
    <MobileCommandMenu :visible="mobileMenuOpen" :initial-path="mobileStartPath" :disabled-command-ids="disabledCommandIds" :checked-command-ids="checkedCommandIds" :return-focus="mobileTrigger?.$el" @execute="execute" @close="mobileMenuOpen = false" />
  </nav>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { KEYNOTE_MENUS, type KeynoteCommand } from '@/commands/keynoteCommands'
import { t } from '@/i18n'
import MenuBranch from './MenuBranch.vue'
import MobileCommandMenu from './MobileCommandMenu.vue'
import PillButton from '@/components/ui/PillButton.vue'
import useBreakpoint from '@/hooks/useBreakpoint'

const props = withDefaults(defineProps<{
  disabledCommandIds?: string[]
  checkedCommandIds?: string[]
}>(), {
  disabledCommandIds: () => [],
  checkedCommandIds: () => [],
})
const emit = defineEmits<{
  (event: 'execute', commandId: string): void
  (event: 'mobileOpenChange', open: boolean): void
}>()
const menuBar = useTemplateRef<HTMLElement>('menuBar')
const openMenu = ref('')
const mobileMenuOpen = ref(false)
const mobileTrigger = ref<any>(null)
const { tier } = useBreakpoint()
const mobileStartPath = ref<string[]>([])
/** Opens the touch command sheet, optionally already inside one root menu (e.g. 'insert'). */
const open = (menuId?: string) => {
  mobileStartPath.value = menuId ? [menuId] : []
  mobileMenuOpen.value = true
}
defineExpose({ open })
watch(mobileMenuOpen, open => emit('mobileOpenChange', open))
const resolvedMenus = computed(() => {
  const disabled = new Set(props.disabledCommandIds)
  const checked = new Set(props.checkedCommandIds)
  const resolveCommands = (commands: KeynoteCommand[]): KeynoteCommand[] => commands.map(command => {
    const children = command.children ? resolveCommands(command.children) : undefined
    return {
      ...command,
      label: t(command.id, command.label),
      children,
      checked: checked.has(command.id),
      disabled: command.disabled || disabled.has(command.id) || !!(children?.length && children.every(child => child.disabled)),
    }
  })
  return KEYNOTE_MENUS.map(menu => ({
    ...menu,
    label: t(menu.id, menu.label),
    commands: resolveCommands(menu.commands),
  }))
})
const closeMenus = () => { openMenu.value = '' }
const toggleMenu = (id: string) => { openMenu.value = openMenu.value === id ? '' : id }
const execute = (id: string) => { emit('execute', id); closeMenus() }

const visibleEnabledCommands = () => Array.from(menuBar.value?.querySelectorAll<HTMLButtonElement>('.command:not(:disabled)') || [])
  .filter(button => button.offsetParent !== null)

const focusFirstCommand = async () => {
  await nextTick()
  visibleEnabledCommands()[0]?.focus()
}

const focusRootMenu = async (index: number, open = false) => {
  const menus = KEYNOTE_MENUS
  const target = menus[(index + menus.length) % menus.length]
  if (openMenu.value || open) openMenu.value = target.id
  await nextTick()
  menuBar.value?.querySelectorAll<HTMLButtonElement>('.menu-trigger')[menus.indexOf(target)]?.focus()
}

const handleKeydown = async (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  if (event.key === 'Escape') {
    event.preventDefault()
    const activeIndex = KEYNOTE_MENUS.findIndex(menu => menu.id === openMenu.value)
    closeMenus()
    await focusRootMenu(Math.max(activeIndex, 0))
    return
  }
  const rootTrigger = target.closest<HTMLButtonElement>('.menu-trigger')
  if (rootTrigger) {
    const triggers = Array.from(menuBar.value?.querySelectorAll<HTMLButtonElement>('.menu-trigger') || [])
    const index = triggers.indexOf(rootTrigger)
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      await focusRootMenu(index + (event.key === 'ArrowRight' ? 1 : -1), !!openMenu.value)
    }
    else if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openMenu.value = KEYNOTE_MENUS[index].id
      await focusFirstCommand()
    }
    return
  }

  const command = target.closest<HTMLButtonElement>('.command')
  if (command && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End')) {
    event.preventDefault()
    const commands = visibleEnabledCommands()
    const index = commands.indexOf(command)
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? commands.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + commands.length) % commands.length
    commands[nextIndex]?.focus()
  }
  else if (command && event.key === 'ArrowRight') {
    const submenu = command.parentElement?.querySelector<HTMLElement>(':scope > .submenu')
    const firstChild = submenu?.querySelector<HTMLButtonElement>('.command:not(:disabled)')
    if (firstChild) {
      event.preventDefault()
      firstChild.focus()
    }
  }
  else if (command && event.key === 'ArrowLeft') {
    const parentSubmenu = command.closest('.submenu')
    const parentCommand = parentSubmenu?.parentElement?.querySelector<HTMLButtonElement>(':scope > .command')
    if (parentCommand) {
      event.preventDefault()
      parentCommand.focus()
    }
  }
}

onMounted(() => document.addEventListener('click', closeMenus))
onBeforeUnmount(() => document.removeEventListener('click', closeMenus))
</script>

<style scoped lang="scss">
@import '@/assets/styles/glass-system.scss';
.keynote-menu-bar { position: relative; z-index: 1001; display: flex; align-items: center; gap: 0; overflow: visible; }
.menu-root { position: relative; overflow: visible; }
.menu-trigger { padding-inline: 9px; cursor: default; }
.menu-panel {
  @include menu-surface;
  position: absolute;
  z-index: 1002;
  top: calc(100% + 8px);
  left: 0;
  min-width: 240px;
  overflow: visible;
}
</style>
