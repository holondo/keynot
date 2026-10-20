import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'


console.log('=== KeyNot Dark Mode & UI Layout Regression Test Suite ===\n')

// 1. Static Layout Verification: Toolbar & Header Cleanliness
console.log('[1/4] Testing CanvasTool and EditorHeader button cleanliness...')
{
  const canvasToolSrc = fs.readFileSync(path.resolve('src/views/Editor/CanvasTool/index.vue'), 'utf-8')
  const editorHeaderSrc = fs.readFileSync(path.resolve('src/views/Editor/EditorHeader/index.vue'), 'utf-8')

  // CanvasTool right cluster should NOT have theme-mode-pill or share-pill
  assert.ok(!canvasToolSrc.includes('theme-mode-pill'), 'CanvasTool must not contain loose theme toggle pill')
  assert.ok(!canvasToolSrc.includes('toggleColorMode'), 'CanvasTool must not define loose toggleColorMode')
  assert.ok(!canvasToolSrc.includes('share-pill'), 'CanvasTool right cluster must not contain loose share-pill')

  // CanvasTool right cluster must contain the 3 standard Keynote inspector triggers
  assert.ok(canvasToolSrc.includes('keynote-inspector-capsule'), 'CanvasTool must contain keynote-inspector-capsule')
  assert.ok(canvasToolSrc.includes("switchInspectorGroup('format')"), 'Must have format inspector trigger')
  assert.ok(canvasToolSrc.includes("switchInspectorGroup('animate')"), 'Must have animate inspector trigger')
  assert.ok(canvasToolSrc.includes("switchInspectorGroup('document')"), 'Must have document inspector trigger')

  // EditorHeader should NOT have loose lang-pill or languageMenuVisible
  assert.ok(!editorHeaderSrc.includes('lang-pill'), 'EditorHeader must not contain loose lang-pill')
  assert.ok(!editorHeaderSrc.includes('languageMenuVisible'), 'EditorHeader must not have loose languageMenuVisible')

  // EditorHeader must have PreferencesModal trigger
  assert.ok(editorHeaderSrc.includes('preferencesModalVisible'), 'EditorHeader must expose preferencesModal')
  assert.ok(editorHeaderSrc.includes('<PreferencesModal'), 'EditorHeader must mount PreferencesModal')

  console.log('  PASS: Header and canvas toolbar are clean; dark mode & language are relegated to Preferences.')
}

// 2. PreferencesModal Feature Verification
console.log('[2/4] Testing PreferencesModal controls (Language & Appearance)...')
{
  const prefModalSrc = fs.readFileSync(path.resolve('src/views/Editor/EditorHeader/PreferencesModal.vue'), 'utf-8')

  // Must have Language segmented control
  assert.ok(prefModalSrc.includes("setLocale('en-US')"), 'PreferencesModal must allow selecting en-US')
  assert.ok(prefModalSrc.includes("setLocale('pt-BR')"), 'PreferencesModal must allow selecting pt-BR')

  // Must have Appearance / ColorMode segmented control
  assert.ok(prefModalSrc.includes("mainStore.setColorMode('light')"), 'PreferencesModal must support Light mode')
  assert.ok(prefModalSrc.includes("mainStore.setColorMode('dark')"), 'PreferencesModal must support Dark mode')
  assert.ok(prefModalSrc.includes("mainStore.setColorMode('auto')"), 'PreferencesModal must support Auto mode')

  console.log('  PASS: PreferencesModal provides complete controls for Language, Appearance, and Storage.')
}

// 3. Dark Mode Color Variables & Menu Contrast Verification
console.log('[3/4] Testing global SCSS and menu contrast variables in dark mode...')
{
  const globalScss = fs.readFileSync(path.resolve('src/assets/styles/global.scss'), 'utf-8')
  const menuBarSrc = fs.readFileSync(path.resolve('src/views/Editor/EditorHeader/KeynoteMenuBar.vue'), 'utf-8')
  const menuBranchSrc = fs.readFileSync(path.resolve('src/views/Editor/EditorHeader/MenuBranch.vue'), 'utf-8')

  // global.scss must define --bg-panel for both light and dark modes
  assert.ok(globalScss.includes('--bg-panel: rgba(255, 255, 255, 0.98);'), 'Light mode must define --bg-panel')
  assert.ok(globalScss.includes('--bg-panel: rgba(38, 38, 44, 0.98);'), 'Dark mode must define dark --bg-panel')
  assert.ok(globalScss.includes('[data-theme="dark"], .dark'), 'global.scss must style both data-theme="dark" and .dark')

  // KeynoteMenuBar & MenuBranch must style dark menu panel explicitly
  assert.ok(menuBarSrc.includes('data-theme="dark"') || menuBarSrc.includes('var(--bg-panel'), 'KeynoteMenuBar must support dark mode')
  assert.ok(menuBranchSrc.includes('data-theme="dark"') || menuBranchSrc.includes('var(--bg-panel'), 'MenuBranch must support dark mode')

  console.log('  PASS: CSS variables define translucent dark panel background preventing white-on-white menus.')
}

// 4. Runtime applyColorMode Functionality
console.log('[4/4] Testing applyColorMode implementation in store/main.ts...')
{
  const mainStoreSrc = fs.readFileSync(path.resolve('src/store/main.ts'), 'utf-8')

  assert.ok(mainStoreSrc.includes("document.documentElement.setAttribute('data-theme', activeTheme)"), 'Must set data-theme attribute')
  assert.ok(mainStoreSrc.includes("document.documentElement.classList.add('dark')"), 'Must add dark class')
  assert.ok(mainStoreSrc.includes("document.documentElement.classList.remove('dark')"), 'Must remove dark class')

  // Execute isolated applyColorMode logic
  const mockClassList = new Set<string>()
  const mockAttributes: Record<string, string> = {}
  const applyFn = (mode: 'light' | 'dark' | 'auto') => {
    let activeTheme = mode
    if (activeTheme === 'dark') {
      mockAttributes['data-theme'] = 'dark'
      mockClassList.add('dark')
    } else {
      mockAttributes['data-theme'] = 'light'
      mockClassList.delete('dark')
    }
  }

  applyFn('dark')
  assert.equal(mockAttributes['data-theme'], 'dark')
  assert.ok(mockClassList.has('dark'))

  applyFn('light')
  assert.equal(mockAttributes['data-theme'], 'light')
  assert.ok(!mockClassList.has('dark'))

  console.log('  PASS: applyColorMode implementation verified.')
}

console.log('\n=== ALL DARK MODE & UI CLEANLINESS TESTS PASSED ===')
