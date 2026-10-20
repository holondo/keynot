export interface KeynoteCommand {
  id: string
  label: string
  shortcut?: string
  disabled?: boolean
  checked?: boolean
  children?: KeynoteCommand[]
}

export interface KeynoteMenu {
  id: string
  label: string
  commands: KeynoteCommand[]
}

export const KEYNOTE_MENUS: KeynoteMenu[] = [
  { id: 'file', label: 'File', commands: [
    { id: 'file.new', label: 'New Presentation', shortcut: 'Ctrl+N' },
    { id: 'file.open', label: 'Open…', shortcut: 'Ctrl+O' },
    { id: 'file.workspace', label: 'All Presentations…' },
    { id: 'file.theme', label: 'Choose Theme…' },
    { id: 'file.versions', label: 'Browse All Versions…' },
    { id: 'file.export', label: 'Export To', children: [
      { id: 'file.export.keynote', label: 'Keynote…' },
      { id: 'file.export.powerpoint', label: 'PowerPoint…' },
      { id: 'file.export.pdf', label: 'PDF…' },
      { id: 'file.export.images', label: 'Images…' },
    ] },
    { id: 'file.compatibility', label: 'Compatibility Report…' },
    { id: 'file.preferences', label: 'Preferences…', shortcut: 'Ctrl+,' },
  ] },
  { id: 'edit', label: 'Edit', commands: [
    { id: 'edit.undo', label: 'Undo', shortcut: 'Ctrl+Z' },
    { id: 'edit.redo', label: 'Redo', shortcut: 'Ctrl+Y' },
    { id: 'edit.cut', label: 'Cut', shortcut: 'Ctrl+X' },
    { id: 'edit.copy', label: 'Copy', shortcut: 'Ctrl+C' },
    { id: 'edit.paste', label: 'Paste', shortcut: 'Ctrl+V' },
    { id: 'edit.duplicate', label: 'Duplicate', shortcut: 'Ctrl+D' },
    { id: 'edit.delete', label: 'Delete', shortcut: 'Delete' },
    { id: 'edit.select-all', label: 'Select All', shortcut: 'Ctrl+A' },
    { id: 'edit.find', label: 'Find and Replace…', shortcut: 'Ctrl+F' },
  ] },
  { id: 'insert', label: 'Insert', commands: [
    { id: 'insert.slide', label: 'New Slide' },
    { id: 'insert.text', label: 'Text Box' },
    { id: 'insert.shape', label: 'Shape', children: [
      { id: 'insert.shape.rectangle', label: 'Rectangle' },
      { id: 'insert.shape.circle', label: 'Circle' },
      { id: 'insert.shape.line', label: 'Line' },
    ] },
    { id: 'insert.table', label: 'Table' },
    { id: 'insert.chart', label: 'Chart' },
    { id: 'insert.media', label: 'Media', children: [
      { id: 'insert.media.image', label: 'Choose Image…' },
      { id: 'insert.media.video', label: 'Choose Video…' },
      { id: 'insert.media.audio', label: 'Choose Audio…' },
    ] },
    { id: 'insert.latex', label: 'Equation…' },
    { id: 'insert.comment', label: 'Comment' },
  ] },
  { id: 'slide', label: 'Slide', commands: [
    { id: 'slide.add', label: 'New Slide', shortcut: 'Enter' },
    { id: 'slide.duplicate', label: 'Duplicate Slide' },
    { id: 'slide.delete', label: 'Delete Slide' },
    { id: 'slide.skip', label: 'Skip Slide' },
    { id: 'slide.layout', label: 'Apply Layout…' },
    { id: 'slide.background', label: 'Change Background…' },
    { id: 'slide.notes', label: 'Show Presenter Notes' },
  ] },
  { id: 'format', label: 'Format', commands: [
    { id: 'format.inspector', label: 'Show Format Inspector' },
    { id: 'format.animate', label: 'Show Animate Inspector' },
    { id: 'format.document', label: 'Show Document Inspector' },
    { id: 'format.copy-style', label: 'Copy Style', shortcut: 'Alt+Ctrl+C' },
    { id: 'format.paste-style', label: 'Paste Style', shortcut: 'Alt+Ctrl+V' },
    { id: 'format.font', label: 'Font', children: [
      { id: 'format.font.bold', label: 'Bold', shortcut: 'Ctrl+B' },
      { id: 'format.font.italic', label: 'Italic', shortcut: 'Ctrl+I' },
      { id: 'format.font.underline', label: 'Underline', shortcut: 'Ctrl+U' },
    ] },
  ] },
  { id: 'arrange', label: 'Arrange', commands: [
    { id: 'arrange.front', label: 'Bring to Front' },
    { id: 'arrange.forward', label: 'Bring Forward' },
    { id: 'arrange.backward', label: 'Send Backward' },
    { id: 'arrange.back', label: 'Send to Back' },
    { id: 'arrange.align', label: 'Align Objects', children: [
      { id: 'arrange.align.left', label: 'Left' },
      { id: 'arrange.align.center', label: 'Center' },
      { id: 'arrange.align.right', label: 'Right' },
    ] },
    { id: 'arrange.group', label: 'Group', shortcut: 'Ctrl+G' },
    { id: 'arrange.ungroup', label: 'Ungroup', shortcut: 'Shift+Ctrl+G' },
    { id: 'arrange.lock', label: 'Lock' },
  ] },
  { id: 'view', label: 'View', commands: [
    { id: 'view.navigator', label: 'Navigator' },
    { id: 'view.slide-only', label: 'Slide Only' },
    { id: 'view.light-table', label: 'Light Table' },
    { id: 'view.rulers', label: 'Show Rulers' },
    { id: 'view.object-list', label: 'Show Object List' },
    { id: 'view.comments', label: 'Show Comments' },
    { id: 'view.dark-mode', label: 'Dark Mode' },
  ] },
  { id: 'play', label: 'Play', commands: [
    { id: 'play.beginning', label: 'From Beginning', shortcut: 'F5' },
    { id: 'play.current', label: 'From Current Slide', shortcut: 'Shift+F5' },
    { id: 'play.rehearse', label: 'Rehearse Slideshow' },
  ] },
  { id: 'help', label: 'Help', commands: [
    { id: 'help.shortcuts', label: 'Keyboard Shortcuts' },
    { id: 'help.keynote', label: 'Keynote Compatibility' },
    { id: 'help.about', label: 'About KeyNot' },
  ] },
]

export const flattenCommands = (menus: KeynoteMenu[]): KeynoteCommand[] => {
  const flattened: KeynoteCommand[] = []
  const visit = (commands: KeynoteCommand[]) => {
    for (const command of commands) {
      flattened.push(command)
      if (command.children) visit(command.children)
    }
  }
  for (const menu of menus) visit(menu.commands)
  return flattened
}
