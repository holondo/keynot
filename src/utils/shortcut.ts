import { flattenCommands, KEYNOTE_MENUS } from '@/commands/keynoteCommands'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
const MAC_KEYS: Record<string, string> = { Ctrl: '⌘', Shift: '⇧', Alt: '⌥', Enter: '↩', Delete: '⌫', Backspace: '⌫' }

/** Renders a registry shortcut ("Ctrl+Shift+Z") for the current platform ("⇧⌘Z" on Apple devices). */
export const formatShortcut = (shortcut?: string) => {
  if (!shortcut || !isMac) return shortcut
  const parts = shortcut.split('+').map(part => MAC_KEYS[part] || part)
  const key = parts.pop() || ''
  const order = ['⌃', '⌥', '⇧', '⌘']
  return parts.sort((a, b) => order.indexOf(a) - order.indexOf(b)).join('') + key
}

const registry = new Map(flattenCommands(KEYNOTE_MENUS).map(command => [command.id, command.shortcut]))

/** Shortcut for a command id, from the single command registry. */
export const commandShortcut = (id: string) => formatShortcut(registry.get(id))
