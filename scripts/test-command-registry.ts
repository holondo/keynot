import assert from 'node:assert/strict'
import { KEYNOTE_MENUS, flattenCommands } from '../src/commands/keynoteCommands.ts'

const expectedMenus = ['File', 'Edit', 'Insert', 'Slide', 'Format', 'Arrange', 'View', 'Play', 'Help']
assert.deepEqual(KEYNOTE_MENUS.map(menu => menu.label), expectedMenus)

const commands = flattenCommands(KEYNOTE_MENUS)
const commandIds = commands.map(command => command.id)
assert.equal(new Set(commandIds).size, commandIds.length, 'Command IDs must be unique')
assert.ok(commands.length >= 45, 'Keynote menu surface must expose at least 45 commands')
assert.ok(commands.some(command => command.children?.length), 'Registry must contain real submenus')

for (const required of [
  'file.open', 'file.export.keynote', 'edit.undo', 'edit.redo', 'insert.text',
  'slide.add', 'slide.duplicate', 'format.inspector', 'arrange.group',
  'view.navigator', 'view.dark-mode', 'play.current', 'help.shortcuts',
]) {
  assert.ok(commandIds.includes(required), `Missing required command: ${required}`)
}

console.log(`PASS: ${KEYNOTE_MENUS.length} menus and ${commands.length} unique menu commands registered.`)
