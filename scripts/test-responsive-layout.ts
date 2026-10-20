import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getTier, BREAKPOINTS } from '../src/hooks/useBreakpoint.ts'

console.log('=== KeyNot Responsive Layout & Modernization Test Suite ===\n')

{
  const mobileMenu = fs.readFileSync(path.resolve('src/views/Editor/EditorHeader/MobileCommandMenu.vue'), 'utf-8')
  const sheet = fs.readFileSync(path.resolve('src/components/ui/ResponsiveSheet.vue'), 'utf-8')
  const menuBar = fs.readFileSync(path.resolve('src/views/Editor/EditorHeader/KeynoteMenuBar.vue'), 'utf-8')
  const branch = fs.readFileSync(path.resolve('src/views/Editor/EditorHeader/MenuBranch.vue'), 'utf-8')
  assert.ok(mobileMenu.includes('KEYNOTE_MENUS'), 'Mobile menu must use the shared command registry')
  assert.ok(mobileMenu.includes('navigationPath'), 'Mobile nested menus must use path-based navigation')
  assert.ok(mobileMenu.includes('min-height: var(--control-touch)'), 'Mobile menu rows must meet touch sizing')
  assert.ok(sheet.includes('role="dialog"'), 'Responsive sheet must use dialog semantics')
  assert.ok(sheet.includes('returnFocus'), 'Responsive sheet must restore trigger focus')
  assert.ok(sheet.includes('trapFocus'), 'Responsive sheet must contain keyboard focus')
  assert.ok(menuBar.includes('<MobileCommandMenu'), 'Menu bar must select the mobile renderer')
  assert.ok(menuBar.includes("tier === 'desktop'"), 'Desktop must retain the full File/Edit/Insert menu row')
  assert.ok(menuBar.includes('v-for="menu in resolvedMenus"'), 'Desktop menu labels must come from the shared command registry')
  assert.ok(menuBar.includes('mobile-menu-trigger'), 'Compact layouts must collapse menus into one touch trigger')
  assert.ok(branch.includes('opens-left'), 'Desktop nested menus must support leftward placement')
  assert.ok(branch.includes('@focusin="placeSubmenu'), 'Keyboard focus must also calculate submenu edge placement')
}

// 1. Breakpoint Tier Calculations
console.log('[1/5] Testing Viewport Breakpoint Hierarchy & Tiers...')
{
  assert.equal(BREAKPOINTS.tablet, 768, 'Tablet breakpoint must be 768px')
  assert.equal(BREAKPOINTS.desktop, 1200, 'Desktop breakpoint must be 1200px')

  // Mobile tier (< 768)
  assert.equal(getTier(320), 'mobile', '320px must be mobile')
  assert.equal(getTier(375), 'mobile', '375px (iPhone) must be mobile')
  assert.equal(getTier(767), 'mobile', '767px must be mobile')

  // Tablet tier (768 - 1199)
  assert.equal(getTier(768), 'tablet', '768px (iPad portrait) must be tablet')
  assert.equal(getTier(1024), 'tablet', '1024px (iPad landscape) must be tablet')
  assert.equal(getTier(1199), 'tablet', '1199px must be tablet')

  // Desktop tier (>= 1200)
  assert.equal(getTier(1200), 'desktop', '1200px must be desktop')
  assert.equal(getTier(1440), 'desktop', '1440px (MacBook) must be desktop')
  assert.equal(getTier(2560), 'desktop', '2560px (iMac / 4K) must be desktop')

  console.log('  PASS: Responsive tier boundaries correctly segment mobile (<768), tablet (768-1199), and desktop (>=1200).')
}

// 2. Editor Shell Adaptive Architecture
console.log('\n[2/5] Testing Editor Adaptive Layout & Drawer Toggles...')
{
  const editorSrc = fs.readFileSync(path.resolve('src/views/Editor/index.vue'), 'utf-8')

  assert.ok(editorSrc.includes('useBreakpoint'), 'Editor must use responsive breakpoint hook')
  assert.ok(editorSrc.includes('data-tier'), 'Editor root must expose data-tier')
  assert.ok(!editorSrc.includes('layout-fabs'), 'Drawer toggles must live in the toolbar/dock, not in loose FABs')
  assert.ok(editorSrc.includes('layout-scrim'), 'Editor must render touch scrim when overlays are active')
  const overlaySrc = fs.readFileSync(path.resolve('src/hooks/useEditorOverlay.ts'), 'utf-8')
  assert.ok(overlaySrc.includes("type EditorOverlay = 'none' | 'menu' | 'thumbnails' | 'inspector'"), 'Editor must use one typed overlay state')
  assert.ok(editorSrc.includes('openOverlay'), 'Editor must centralize overlay opening')
  assert.ok(editorSrc.includes('Canvas-first floating shell'), 'Editor chrome must float above an edge-to-edge canvas')
  assert.ok(editorSrc.includes('border-radius: var(--radius-panel)'), 'Docked panels must use the shared panel radius')
  assert.ok(editorSrc.includes('--fit-top'), 'Slide must fit the free area between floating chrome')
  assert.ok(editorSrc.includes('closeOverlay'), 'Editor must centralize overlay closing')
  assert.ok(!editorSrc.includes('const inspectorOpen = ref'), 'Independent inspector overlay state must be removed')
  assert.ok(!editorSrc.includes('const thumbnailsOpen = ref'), 'Independent thumbnail overlay state must be removed')

  const headerSrc = fs.readFileSync(path.resolve('src/views/Editor/EditorHeader/index.vue'), 'utf-8')
  const canvasToolSrc = fs.readFileSync(path.resolve('src/views/Editor/CanvasTool/index.vue'), 'utf-8')
  assert.ok(headerSrc.includes("import FloatingRail from '@/components/ui/FloatingRail.vue'"), 'Header must consume shared floating rails')
  assert.ok(headerSrc.includes("import PillButton from '@/components/ui/PillButton.vue'"), 'Header actions must reuse the shared pill button')
  assert.ok(headerSrc.includes('document-row'), 'Document controls and menus must share the first floating row')
  assert.ok(headerSrc.includes('class="save-status-pill"'), 'Document status must be a control inside its parent pill')
  assert.ok(!headerSrc.includes(':deep(.keynote-menu-bar)'), 'Header must not hide the responsive menu component at tablet/mobile widths')
  assert.ok(canvasToolSrc.includes("import FloatingRail from '@/components/ui/FloatingRail.vue'"), 'Creation toolbar must consume shared floating rails')
  assert.ok(canvasToolSrc.includes('<FloatingRail'), 'Creation toolbar must render as a shared rail')
  assert.ok(canvasToolSrc.includes('toolbar-row'), 'Editing tools and playback must occupy the second floating row')
  assert.ok(canvasToolSrc.includes('<FloatingRail class="toolbar-cluster'), 'Second-row tool groups must be independent floating bubbles')
  assert.ok(canvasToolSrc.includes('history-cluster'), 'Undo and redo must remain visible in their own hierarchy bubble')
  assert.ok(!canvasToolSrc.includes('inspector-cluster'), 'Inspector mode controls must not live in the canvas toolbar')
  assert.ok(canvasToolSrc.includes('toggle-inspector') && canvasToolSrc.includes('toggle-thumbnails'), 'Toolbar/dock must own the drawer toggles')
  assert.ok(!editorSrc.includes('padding-top: calc(116px'), 'Canvas must remain edge-to-edge behind floating chrome')

  const inspectorSrc = fs.readFileSync(path.resolve('src/views/Editor/Toolbar/index.vue'), 'utf-8')
  assert.ok(inspectorSrc.includes('inspector-mode-switch'), 'Format, Animate, and Document must live in the inspector they control')
  assert.ok(inspectorSrc.includes('setInspectorMode'), 'Inspector mode switch must directly control its panel')

  const pillButtonSrc = fs.readFileSync(path.resolve('src/components/ui/PillButton.vue'), 'utf-8')
  assert.ok(pillButtonSrc.includes("variant?: 'quiet' | 'glass' | 'accent'"), 'Shared pills must expose quiet, glass and accent variants')
  assert.ok(canvasToolSrc.includes('scroll-snap-type: x proximity'), 'Narrow toolbar must use scroll snap')

  console.log('  PASS: Editor shell dynamically adapts layout, overlays, and FAB drawers across tiers.')
}

// 3. App Viewport Routing & Overrides
console.log('\n[3/5] Testing App Viewport Device Routing & Overrides...')
{
  const appSrc = fs.readFileSync(path.resolve('src/App.vue'), 'utf-8')

  assert.ok(appSrc.includes('<Editor v-else />'), 'Every device must receive the same responsive editor')
  assert.ok(!appSrc.includes('<Mobile'), 'Real touch devices must not route to the legacy mobile interface')
  assert.ok(appSrc.includes('await saveCurrentProject()'), 'Initial project persistence must be awaited before version history can run')

  console.log('  PASS: Touch and desktop share one responsive editor.')
}

// 4. Modal and MoveablePanel Viewport Bounding
console.log('\n[4/5] Testing Modal and MoveablePanel Viewport Constraints...')
{
  const modalSrc = fs.readFileSync(path.resolve('src/components/Modal.vue'), 'utf-8')
  const panelSrc = fs.readFileSync(path.resolve('src/components/MoveablePanel.vue'), 'utf-8')

  assert.ok(modalSrc.includes('100vw - 32px'), 'Modal content width must be constrained within viewport width')
  assert.ok(panelSrc.includes('Math.min(props.width, maxW)'), 'MoveablePanel must clamp width to viewport bounds')

  console.log('  PASS: Modals and floating panels cannot overflow viewport on narrow or mobile screens.')
}

// 5. Safe Area and Viewport Configuration
console.log('\n[5/5] Testing Mobile Safe Area & Viewport-fit Configuration...')
{
  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8')

  assert.ok(indexHtml.includes('viewport-fit=cover'), 'HTML meta viewport must include viewport-fit=cover for safe-area insets')

  console.log('  PASS: Viewport metadata configured for edge-to-edge mobile screens.')
}

console.log('\n=== ALL RESPONSIVE LAYOUT & MODERNIZATION TESTS PASSED ===\n')
