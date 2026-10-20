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
  assert.ok(menuBar.includes('<MobileCommandMenu'), 'Menu bar must select the mobile renderer')
  assert.ok(branch.includes('opens-left'), 'Desktop nested menus must support leftward placement')
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
  assert.ok(editorSrc.includes('layout-fabs'), 'Editor must provide floating action controls for narrow viewports')
  assert.ok(editorSrc.includes('toggle-inspector'), 'Editor must allow toggling inspector drawer')
  assert.ok(editorSrc.includes('layout-scrim'), 'Editor must render touch scrim when overlays are active')

  const headerSrc = fs.readFileSync(path.resolve('src/views/Editor/EditorHeader/index.vue'), 'utf-8')
  const canvasToolSrc = fs.readFileSync(path.resolve('src/views/Editor/CanvasTool/index.vue'), 'utf-8')
  assert.ok(headerSrc.includes("import FloatingRail from '@/components/ui/FloatingRail.vue'"), 'Header must consume shared floating rails')
  assert.ok(canvasToolSrc.includes("import FloatingRail from '@/components/ui/FloatingRail.vue'"), 'Creation toolbar must consume shared floating rails')
  assert.ok(canvasToolSrc.includes('<FloatingRail'), 'Creation toolbar must render as a shared rail')
  assert.ok(canvasToolSrc.includes('scroll-snap-type: x proximity'), 'Narrow toolbar must use scroll snap')

  console.log('  PASS: Editor shell dynamically adapts layout, overlays, and FAB drawers across tiers.')
}

// 3. App Viewport Routing & Overrides
console.log('\n[3/5] Testing App Viewport Device Routing & Overrides...')
{
  const appSrc = fs.readFileSync(path.resolve('src/App.vue'), 'utf-8')

  assert.ok(appSrc.includes('useBreakpoint'), 'App.vue must import breakpoint helper')
  assert.ok(appSrc.includes('uiOverride'), 'App.vue must support ?ui= override for deterministic testing and manual switching')
  assert.ok(appSrc.includes("uiOverride === 'desktop'"), 'App.vue must support ?ui=desktop')
  assert.ok(appSrc.includes("uiOverride === 'mobile'"), 'App.vue must support ?ui=mobile')
  assert.ok(appSrc.includes('const _isPC = computed('), 'App viewport routing must react to resize and orientation changes')
  assert.ok(appSrc.includes('height.value'), 'App viewport routing must consider reactive viewport height')
  assert.ok(appSrc.includes('await saveCurrentProject()'), 'Initial project persistence must be awaited before version history can run')

  console.log('  PASS: App.vue provides responsive device detection and debug overrides.')
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
