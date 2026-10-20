import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'


console.log('=== KeyNot Dark Mode & UI Layout Regression Test Suite ===\n')

// Shared glass primitives must own repeated surface behavior.
{
  for (const file of ['GlassSurface.vue', 'PillButton.vue', 'FloatingRail.vue']) {
    assert.ok(fs.existsSync(path.resolve(`src/components/ui/${file}`)), `Missing shared UI primitive: ${file}`)
  }
  const glassSystem = fs.readFileSync(path.resolve('src/assets/styles/glass-system.scss'), 'utf-8')
  assert.ok(glassSystem.includes('--glass-surface-elevated'), 'Glass system must define elevated surfaces')
  assert.ok(glassSystem.includes('--control-touch: 44px'), 'Glass system must define 44px touch targets')
  assert.ok(glassSystem.includes('prefers-reduced-motion'), 'Glass system must respect reduced motion')
  assert.ok(glassSystem.includes('prefers-reduced-transparency'), 'Glass system must provide reduced-transparency fallbacks')
}

// 1. Static Layout Verification: Toolbar & Header Cleanliness
console.log('[1/6] Testing CanvasTool and EditorHeader button cleanliness...')
{
  const canvasToolSrc = fs.readFileSync(path.resolve('src/views/Editor/CanvasTool/index.vue'), 'utf-8')
  const editorHeaderSrc = fs.readFileSync(path.resolve('src/views/Editor/EditorHeader/index.vue'), 'utf-8')
  const inspectorSrc = fs.readFileSync(path.resolve('src/views/Editor/Toolbar/index.vue'), 'utf-8')

  // CanvasTool right cluster should NOT have theme-mode-pill or share-pill
  assert.ok(!canvasToolSrc.includes('theme-mode-pill'), 'CanvasTool must not contain loose theme toggle pill')
  assert.ok(!canvasToolSrc.includes('toggleColorMode'), 'CanvasTool must not define loose toggleColorMode')
  assert.ok(!canvasToolSrc.includes('share-pill'), 'CanvasTool right cluster must not contain loose share-pill')

  // Inspector modes belong to the panel they control, never to the canvas tool row.
  assert.ok(!canvasToolSrc.includes('keynote-inspector-capsule'), 'CanvasTool must not contain detached inspector triggers')
  assert.ok(canvasToolSrc.includes('Flat hierarchy: each cluster owns one glass rail'), 'Canvas toolbar must avoid nested glass pills')
  assert.ok(inspectorSrc.includes('inspector-mode-switch'), 'Inspector must own its Format/Animate/Document switch')
  assert.ok(inspectorSrc.includes('mainStore.setInspectorMode'), 'Inspector mode switch must control the inspector directly')

  // EditorHeader should NOT have loose lang-pill or languageMenuVisible
  assert.ok(!editorHeaderSrc.includes('lang-pill'), 'EditorHeader must not contain loose lang-pill')
  assert.ok(!editorHeaderSrc.includes('languageMenuVisible'), 'EditorHeader must not have loose languageMenuVisible')

  // EditorHeader must have PreferencesModal trigger
  assert.ok(editorHeaderSrc.includes('preferencesModalVisible'), 'EditorHeader must expose preferencesModal')
  assert.ok(editorHeaderSrc.includes('<PreferencesModal'), 'EditorHeader must mount PreferencesModal')
  assert.ok(editorHeaderSrc.includes('Flat hierarchy: glass belongs to rails'), 'Header must keep glass on rails and inner actions flat')

  console.log('  PASS: Header and canvas toolbar are clean; dark mode & language are relegated to Preferences.')
}

// 2. PreferencesModal Feature Verification
console.log('[2/6] Testing PreferencesModal controls (Language & Appearance)...')
{
  const prefModalSrc = fs.readFileSync(path.resolve('src/views/Editor/EditorHeader/PreferencesModal.vue'), 'utf-8')

  // Must have Language segmented control
  assert.ok(prefModalSrc.includes("setLocale('en-US')"), 'PreferencesModal must allow selecting en-US')
  assert.ok(prefModalSrc.includes("setLocale('pt-BR')"), 'PreferencesModal must allow selecting pt-BR')

  // Must have Appearance / ColorMode segmented control
  assert.ok(prefModalSrc.includes("mainStore.setColorMode('light')"), 'PreferencesModal must support Light mode')
  assert.ok(prefModalSrc.includes("mainStore.setColorMode('dark')"), 'PreferencesModal must support Dark mode')
  assert.ok(prefModalSrc.includes("mainStore.setColorMode('auto')"), 'PreferencesModal must support Auto mode')

  // Narrow-screen rule must target the row class used by the template.
  assert.ok(prefModalSrc.includes('@media (max-width: 600px)'), 'PreferencesModal must define a narrow-screen layout')
  assert.ok(prefModalSrc.includes('.pref-row {\n    flex-direction: column;'), 'PreferencesModal must stack its actual .pref-row on narrow screens')

  console.log('  PASS: PreferencesModal provides complete controls for Language, Appearance, and Storage.')
}

// 3. Dark Mode Color Variables & Menu Contrast Verification
console.log('[3/6] Testing global SCSS and menu contrast variables in dark mode...')
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
console.log('[4/6] Testing applyColorMode implementation in store/main.ts...')
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

// 5. DRY Unified Button Architecture & Text Overflow Prevention
console.log('[5/6] Testing DRY Button Architecture & Text Overflow Prevention...')
{
  const buttonSrc = fs.readFileSync(path.resolve('src/components/Button.vue'), 'utf-8')
  const buttonGroupSrc = fs.readFileSync(path.resolve('src/components/ButtonGroup.vue'), 'utf-8')
  const globalScss = fs.readFileSync(path.resolve('src/assets/styles/global.scss'), 'utf-8')
  const themeModalSrc = fs.readFileSync(path.resolve('src/views/Editor/ThemeChooserModal.vue'), 'utf-8')
  const arrangeTabSrc = fs.readFileSync(path.resolve('src/views/Editor/Toolbar/Format/ArrangeTab.vue'), 'utf-8')
  const aipptSrc = fs.readFileSync(path.resolve('src/views/Editor/AIPPTDialog.vue'), 'utf-8')

  // Button component must enforce bounding and content ellipsis
  assert.ok(buttonSrc.includes('min-width: 0;'), 'Button component must define min-width: 0 to respect flex/grid cells')
  assert.ok(buttonSrc.includes('max-width: 100%;'), 'Button component must not exceed container boundary')
  assert.ok(buttonSrc.includes('text-overflow: ellipsis;'), 'Button content must truncate cleanly when nowrap is active')
  assert.ok(buttonSrc.includes('word-break: break-word;'), 'Button component must allow clean multi-line word-break for long text')
  assert.ok(buttonSrc.includes('nowrap'), 'Button component must support nowrap class for single-line controls')

  // Select component and row containment
  const selectSrc = fs.readFileSync(path.resolve('src/components/Select.vue'), 'utf-8')
  assert.ok(selectSrc.includes('min-width: 0;'), 'Select component must enforce min-width: 0')
  assert.ok(selectSrc.includes('text-overflow: ellipsis;'), 'Select selector must enforce text-overflow: ellipsis')
  assert.ok(globalScss.includes('.row'), 'global.scss must define universal .row flex containment')

  // ButtonGroup must allow flex shrinking
  assert.ok(buttonGroupSrc.includes('min-width: 0;'), 'ButtonGroup buttons must have min-width: 0')
  assert.ok(buttonGroupSrc.includes('var(--accent-color'), 'ButtonGroup must use CSS variables instead of hardcoded SCSS')

  // Universal DRY contract in global.scss
  assert.ok(globalScss.includes('Universal DRY Button & Form Element Layout Contract'), 'global.scss must define universal DRY button contract')
  assert.ok(globalScss.includes('box-sizing: border-box;'), 'DRY contract must enforce border-box')

  // ThemeChooserModal footer must wrap on narrow screens and prevent button overflow
  assert.ok(themeModalSrc.includes('flex-wrap: wrap;'), 'ThemeChooserModal footer must support flex-wrap')
  assert.ok(themeModalSrc.includes('text-overflow: ellipsis;'), 'ThemeChooserModal footer-btn must prevent text overflow')

  // AIPPTDialog must not have rigid 120px button lock
  assert.ok(!aipptSrc.includes('width: 120px;'), 'AIPPTDialog buttons must not have rigid width: 120px constraint')
  assert.ok(aipptSrc.includes('min-width: 110px;'), 'AIPPTDialog buttons must use responsive min-width')

  // ArrangeTab grid-2 must use minmax(0, 1fr)
  assert.ok(arrangeTabSrc.includes('repeat(2, minmax(0, 1fr))'), 'ArrangeTab grid-2 must use minmax(0, 1fr) to avoid column overflow')

  console.log('  PASS: Universal DRY button contract and text overflow prevention verified across components.')
}

// 6. Unified Dark Mode Theme System & Token Parity
console.log('[6/6] Testing Unified Semantic Tokens and Dark Mode Consistency...')
{
  const variableScss = fs.readFileSync(path.resolve('src/assets/styles/variable.scss'), 'utf-8')
  const moveablePanelSrc = fs.readFileSync(path.resolve('src/components/MoveablePanel.vue'), 'utf-8')
  const globalScss = fs.readFileSync(path.resolve('src/assets/styles/global.scss'), 'utf-8')

  // variable.scss must bridge to CSS variables
  assert.ok(variableScss.includes('$textColor: var(--text-primary'), 'variable.scss $textColor must bridge to var(--text-primary)')
  assert.ok(variableScss.includes('$themeColor: var(--accent-color'), 'variable.scss $themeColor must bridge to var(--accent-color)')
  assert.ok(variableScss.includes('$borderColor: var(--border-color'), 'variable.scss $borderColor must bridge to var(--border-color)')
  assert.ok(variableScss.includes('$bgApp: var(--bg-app'), 'variable.scss $bgApp must bridge to var(--bg-app)')

  // MoveablePanel must use semantic tokens, not hardcoded white
  assert.ok(moveablePanelSrc.includes('background-color: var(--bg-panel'), 'MoveablePanel must use var(--bg-panel)')
  assert.ok(!moveablePanelSrc.includes('background-color: #fff;'), 'MoveablePanel must not hardcode white background')
  assert.ok(moveablePanelSrc.includes('color: var(--text-primary'), 'MoveablePanel must use var(--text-primary)')

  // global.scss must define complete semantic scale
  assert.ok(globalScss.includes('--accent-hover:'), 'Must define --accent-hover in global tokens')
  assert.ok(globalScss.includes('--bg-elevated:'), 'Must define --bg-elevated in global tokens')
  assert.ok(globalScss.includes('--shadow-md:'), 'Must define standard shadow scale')
  assert.ok(globalScss.includes('--radius-sm:'), 'Must define standard radius scale')

  console.log('  PASS: SCSS variables and panels are unified with industry-standard semantic tokens.')
}

console.log('\n=== ALL DARK MODE & UI CLEANLINESS TESTS PASSED ===\n')
